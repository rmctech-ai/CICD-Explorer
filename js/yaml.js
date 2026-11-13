/* Small YAML subset parser (good enough for CloudFormation & GitHub Actions teaching):
   maps, sequences, nested blocks, plain/quoted scalars, numbers/bools/null, flow [..] {..},
   block scalars | and >, comments, and CloudFormation short tags (!Ref, !GetAtt, !Sub, !Join, ...). */
window.YAML = (function () {
  class YErr extends Error { constructor(msg, line) { super(`YAML error (line ${line}): ${msg}`); this.line = line; } }
  function stripComment(s) { let q = null; for (let i = 0; i < s.length; i++) { const c = s[i]; if (q) { if (c === q) q = null; } else if ((c === '"' || c === "'") && /(^|[\s:\[{,-])$/.test(s.slice(0, i).replace(/\s+$/, m => m ? ' ' : ''))) q = c; else if (c === '#' && (i === 0 || /\s/.test(s[i - 1]))) return s.slice(0, i); } return s; }
  function tagWrap(tag, v, line) {
    if (tag === 'Ref') return { Ref: v };
    if (tag === 'GetAtt') { if (typeof v === 'string') { const i = v.indexOf('.'); if (i < 0) throw new YErr('!GetAtt needs Resource.Attribute', line); return { 'Fn::GetAtt': [v.slice(0, i), v.slice(i + 1)] }; } return { 'Fn::GetAtt': v }; }
    if (tag === 'Condition') return { Condition: v };
    return { ['Fn::' + tag]: v };
  }
  function scalar(s, line) {
    s = s.trim();
    const tm = s.match(/^!(\w+)(?:\s+([\s\S]*))?$/);
    if (tm) return tagWrap(tm[1], tm[2] == null ? null : scalar(tm[2], line), line);
    if (s === '' || s === '~' || s === 'null') return null;
    if (s[0] === '[' || s[0] === '{') return flow(s, line);
    if (s[0] === '"') { if (!/"$/.test(s) || s.length < 2) throw new YErr('unclosed double quote', line); return JSON.parse(s); }
    if (s[0] === "'") { if (!/'$/.test(s) || s.length < 2) throw new YErr('unclosed single quote', line); return s.slice(1, -1).replace(/''/g, "'"); }
    if (/^(true|false)$/i.test(s)) return /^true$/i.test(s);
    if (/^-?\d+(\.\d+)?$/.test(s) && !/^0\d/.test(s)) return Number(s);
    return s;
  }
  function flow(s, line) {
    let i = 0;
    const ws = () => { while (i < s.length && /\s/.test(s[i])) i++; };
    function val() { ws(); const c = s[i];
      if (c === '[') { i++; const a = []; ws(); if (s[i] === ']') { i++; return a; } while (i < s.length) { a.push(val()); ws(); if (s[i] === ',') { i++; continue; } if (s[i] === ']') { i++; return a; } throw new YErr('bad flow sequence', line); } throw new YErr('unclosed [', line); }
      if (c === '{') { i++; const o = {}; ws(); if (s[i] === '}') { i++; return o; } while (i < s.length) { ws(); let k = ''; if (s[i] === '"' || s[i] === "'") { const q = s[i++]; while (i < s.length && s[i] !== q) k += s[i++]; i++; } else { while (i < s.length && s[i] !== ':') k += s[i++]; } k = k.trim(); if (s[i] !== ':') throw new YErr('expected : in flow map', line); i++; o[k] = val(); ws(); if (s[i] === ',') { i++; continue; } if (s[i] === '}') { i++; return o; } throw new YErr('bad flow map', line); } throw new YErr('unclosed {', line); }
      if (c === '"' || c === "'") { const q = c; let j = i + 1; while (j < s.length && s[j] !== q) j++; const t = s.slice(i, j + 1); i = j + 1; return scalar(t, line); }
      let j = i, depth = 0; while (j < s.length) { const ch = s[j]; if (ch === '[' || ch === '{') depth++; else if (ch === ']' || ch === '}') { if (depth === 0) break; depth--; } else if (ch === ',' && depth === 0) break; j++; }
      const t = s.slice(i, j); i = j; return scalar(t, line); }
    const v = val(); ws(); if (i < s.length) throw new YErr('unexpected text after flow value', line); return v;
  }
  function parse(text) {
    const raw = String(text).replace(/\t/g, '    ').split('\n');
    const L = [];
    raw.forEach((r, n) => { if (/^---\s*$/.test(r) || /^\.\.\.\s*$/.test(r)) return; const s = stripComment(r); if (!s.trim()) { L.push({ blank: true, n: n + 1, raw: r }); return; } L.push({ ind: s.match(/^ */)[0].length, t: s.trim(), n: n + 1, raw: r }); });
    let i = 0;
    const next = () => { while (i < L.length && L[i].blank) i++; return L[i]; };
    function block(ind) {
      const f = next(); if (!f || f.ind < ind) return null;
      if (f.t === '-' || f.t.startsWith('- ')) return seq(f.ind);
      return map(f.ind);
    }
    function blockScalar(parentInd, style) {
      const out = []; let base = null; i++;
      while (i < L.length) { const ln = L[i]; if (ln.blank) { const ri = ln.raw.match(/^ */)[0].length; if (ln.raw.trim() && ri > parentInd) { if (base == null) base = ri; out.push(ln.raw.slice(base)); } else out.push(''); i++; continue; } if (ln.ind <= parentInd) break; if (base == null) base = ln.ind; out.push(ln.raw.slice(base)); i++; }
      while (out.length && out[out.length - 1] === '') out.pop();
      let s = style[0] === '>' ? out.join(' ').replace(/ {2,}/g, ' ') : out.join('\n');
      if (!/-$/.test(style)) s += '\n'; return s;
    }
    function value(rest, ind, ln) {
      const tm = rest.match(/^!(\w+)$/); if (tm) { i++; return tagWrap(tm[1], block(ind + 1), ln.n); }
      if (/^[|>][-+]?$/.test(rest)) return blockScalar(ind, rest);
      const tb = rest.match(/^!(\w+)\s+([|>][-+]?)$/); if (tb) return tagWrap(tb[1], blockScalar(ind, tb[2]), ln.n);
      i++; return scalar(rest, ln.n);
    }
    function map(ind) {
      const o = {};
      while (true) { const ln = next(); if (!ln || ln.ind < ind) break;
        if (ln.ind > ind) throw new YErr(`unexpected indentation (expected ${ind} spaces, got ${ln.ind}). Check that this line lines up with the keys above it`, ln.n);
        if (ln.t.startsWith('- ') || ln.t === '-') throw new YErr('found a list item "- " where a "key: value" was expected', ln.n);
        const m = ln.t.match(/^("[^"]*"|'[^']*'|[^:]+?):(?:\s+(.*)|)$/);
        if (!m) throw new YErr(`expected "key: value" but found "${ln.t}" (missing colon, or a space after the colon?)`, ln.n);
        let k = m[1]; if (/^["']/.test(k)) k = k.slice(1, -1);
        if (k in o) throw new YErr(`duplicate key "${k}"`, ln.n);
        const rest = (m[2] || '').trim();
        if (rest === '') { i++; const nx = next(); if (nx && (nx.ind > ind || (nx.ind === ind && (nx.t.startsWith('- ') || nx.t === '-')))) o[k] = nx.ind === ind ? seq(ind) : block(nx.ind); else o[k] = null; }
        else o[k] = value(rest, ind, ln);
      }
      return o;
    }
    function seq(ind) {
      const a = [];
      while (true) { const ln = next(); if (!ln || ln.ind < ind) break;
        if (ln.ind > ind) throw new YErr('unexpected indentation inside a list', ln.n);
        if (!(ln.t.startsWith('- ') || ln.t === '-')) break;
        const content = ln.t === '-' ? '' : ln.t.slice(2);
        if (content.trim() === '') { i++; a.push(block(ind + 1)); continue; }
        const isMap = /^("[^"]*"|'[^']*'|[^:\[\{'"!]+?):(\s|$)/.test(content);
        if (isMap) { const off = ind + 2 + (content.length - content.trimStart().length); L[i] = { ind: off, t: content.trim(), n: ln.n, raw: ' '.repeat(off) + content.trim() }; a.push(map(off)); }
        else a.push(value(content.trim(), ind, ln));
      }
      return a;
    }
    const f = next(); if (!f) return null;
    if (f.ind !== 0) throw new YErr('the first line should not be indented', f.n);
    const v = block(0); const left = next(); if (left) throw new YErr(`could not parse "${left.t}" (check indentation)`, left.n);
    return v;
  }
  return { parse };
})();
