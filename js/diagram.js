/* Diagram engine: graph / tree / perm scenes on a blueprint canvas. */
window.Diagram = (function () {
  const W = 900, H = 470;
  const COL = { green:'#16a34a', amber:'#f59e0b', blue:'#1d5bd8', purple:'#7c3aed', teal:'#0d9488', red:'#e11d48', pink:'#db2777', gray:'#64748b' };
  let raf = null;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  function render(el, lesson, idx) {
    if (raf) cancelAnimationFrame(raf), raf = null;
    const step = idx >= 0 && idx < lesson.steps.length ? lesson.steps[idx] : null;
    const scene = Object.assign({}, lesson.scene || {}, (step && step.scene) || {});
    const type = scene.type || 'graph';
    let body = '';
    if (type === 'tree') body = tree(scene, step, idx);
    else if (type === 'perm') body = perm(scene, step);
    else if (type === 'mem') body = mem(scene, step);
    else body = graph(scene, step, idx);
    el.innerHTML = `<svg class="dg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${body}</svg>`;
    if (type === 'graph') animate(el, scene, step, idx);
  }

  /* ---------------- graph ---------------- */
  function visibleNodes(scene, step, idx) {
    const extra = (step && step.nodes) || [];
    const hide = (step && step.hide) || [];
    return (scene.nodes || []).concat(extra).filter(n => (n.at == null || idx >= n.at) && hide.indexOf(n.id) < 0);
  }
  function graph(scene, step, idx) {
    const nodes = visibleNodes(scene, step, idx);
    const byId = {}; nodes.forEach(n => byId[n.id] = n);
    const focus = (step && step.focus) || [];
    const flow = step && step.flow;
    const labels = (step && step.labels) || {};
    let s = '';
    if (scene.title) s += `<text x="${W/2}" y="40" text-anchor="middle" class="bigtitle" fill="currentColor">${esc(scene.title)}</text>`;
    const edges = ((scene.edges || []).concat((step && step.edges) || [])).filter(e => (e.at == null || idx >= e.at) && byId[e.a] && byId[e.b]);
    edges.forEach(e => {
      const a = byId[e.a], b = byId[e.b];
      const act = flow && ((flow.from === e.a && flow.to === e.b) || (flow.from === e.b && flow.to === e.a));
      const c = act ? COL[flow.color || 'green'] : '';
      s += `<path class="edge ${e.solid ? 'solid' : ''} ${act ? 'act' : ''}" style="${act ? '--fc:' + c : ''}" d="M${a.x} ${a.y} L${b.x} ${b.y}"/>`;
      if (e.label) s += `<text x="${(a.x+b.x)/2}" y="${(a.y+b.y)/2 - 6}" text-anchor="middle" class="nsub">${esc(e.label)}</text>`;
    });
    // flow edge drawn even if not declared
    if (flow && byId[flow.from] && byId[flow.to] && !edges.some(e => (e.a===flow.from&&e.b===flow.to)||(e.a===flow.to&&e.b===flow.from))) {
      const a = byId[flow.from], b = byId[flow.to];
      s += `<path class="edge act" style="--fc:${COL[flow.color||'green']}" d="M${a.x} ${a.y} L${b.x} ${b.y}"/>`;
    }
    nodes.forEach(n => {
      const L = labels[n.id] || {};
      const dim = focus.length && focus.indexOf(n.id) < 0 && !(flow && (flow.from === n.id || flow.to === n.id));
      const ic = (window.ICONS[n.icon] || window.ICONS.box)();
      const sc = n.scale || 1;
      s += `<g class="node ${dim ? 'dim' : ''}" transform="translate(${n.x},${n.y})">`;
      s += `<rect x="-36" y="-36" width="72" height="72" rx="12" fill="var(--panel)" opacity=".85"/>`;
      if (focus.indexOf(n.id) >= 0) s += `<rect class="focus-ring" x="-42" y="-42" width="84" height="84" rx="14"/>`;
      s += `<g transform="scale(${sc})">${ic}</g>`;
      const lab = L.label != null ? L.label : n.label, sub = L.sub != null ? L.sub : n.sub;
      const ly = n.lp === 'top' ? -50 : 54;
      s += `<text y="${ly}" text-anchor="middle" class="nlabel">${esc(lab)}</text>`;
      if (sub) s += `<text y="${ly + 15}" text-anchor="middle" class="nsub">${esc(sub)}</text>`;
      s += `</g>`;
    });
    if (step && step.badge && byId[step.badge.node]) {
      const n = byId[step.badge.node], t = '● ' + step.badge.text, w = t.length * 7 + 18;
      const bc = COL[step.badge.color || 'green'];
      s += `<g class="badge" transform="translate(${n.x - w/2},${n.y - 82})"><rect width="${w}" height="22" rx="4" style="stroke:${bc}"/><text x="9" y="15" style="fill:${bc}">${esc(t)}</text></g>`;
    }
    if (flow && byId[flow.from] && byId[flow.to]) s += token(byId[flow.from], byId[flow.to], flow);
    if (scene.caption || (step && step.caption)) s += `<text x="${W/2}" y="${H-14}" text-anchor="middle" class="caption">${esc((step && step.caption) || scene.caption)}</text>`;
    return s;
  }
  function token(a, b, f) {
    const c = COL[f.color || 'green'];
    const lines = [].concat(f.detail || []);
    const wch = Math.max(f.label.length + 2, ...lines.map(l => l.length)) * 6.6 + 18;
    const h = 22 + lines.length * 14 + 6;
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    let s = `<circle id="tokdot" r="5.5" fill="${c}" stroke="#fff" stroke-width="2" cx="${a.x}" cy="${a.y}"/>`;
    s += `<g class="tok" transform="translate(${mx - wch/2},${my - h - 10})">`;
    s += `<rect width="${wch}" height="${h}" rx="4" fill="var(--panel)" stroke="${c}"/>`;
    s += `<rect width="${wch}" height="19" rx="4" fill="${c}"/><text x="9" y="13.5" class="th">${esc(f.label)}</text>`;
    lines.forEach((l, i) => s += `<text x="9" y="${34 + i*14}">${esc(l)}</text>`);
    s += `</g>`;
    return s;
  }
  function animate(el, scene, step, idx) {
    const f = step && step.flow; if (!f) return;
    const nodes = visibleNodes(scene, step, idx); const a = nodes.find(n => n.id === f.from), b = nodes.find(n => n.id === f.to);
    const dot = el.querySelector('#tokdot'); if (!a || !b || !dot) return;
    const t0 = performance.now(); const dur = 1500;
    const loop = now => {
      let t = ((now - t0) % (dur + 500)) / dur; if (t > 1) t = 1;
      const e = t < .5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2)/2;
      dot.setAttribute('cx', a.x + (b.x - a.x) * e); dot.setAttribute('cy', a.y + (b.y - a.y) * e);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }

  /* ---------------- tree ---------------- */
  function tree(scene, step, idx) {
    const items = (scene.items || []).filter(it => (it[4] == null || idx >= it[4]) && (it[5] == null || idx < it[5]));
    const focus = (step && step.focus) || [];
    const pin = step && step.pin;
    const rowH = Math.min(27, (H - 80) / Math.max(items.length, 1));
    const x0 = 70, y0 = 62, ind = 34;
    let s = '';
    if (scene.title) s += `<text x="${W - 30}" y="40" text-anchor="end" class="bigtitle">${esc(scene.title)}</text>`;
    // connectors
    const lastAt = {};
    items.forEach((it, i) => {
      const d = it[0];
      if (d > 0) {
        let p = i - 1; while (p >= 0 && items[p][0] >= d) p--;
        if (p >= 0) {
          const px = x0 + (d - 1) * ind + 8, py = y0 + p * rowH + 6, cy = y0 + i * rowH;
          s += `<path class="tree-line" d="M${px} ${py} V${cy} H${px + ind - 14}"/>`;
        }
      }
    });
    items.forEach((it, i) => {
      const [d, name, cm, kind] = it;
      const x = x0 + d * ind, y = y0 + i * rowH;
      const f = focus.indexOf(name) >= 0;
      s += `<g class="tree-row ${f ? 'f' : ''}">`;
      if (f) s += `<rect class="band" x="${x - 10}" y="${y - rowH/2 - 2}" width="${W - x - 40}" height="${rowH}" rx="5"/>`;
      if (kind === 'f') s += `<path d="M${x-6} ${y-8}h8l4 4v12h-12z" fill="var(--panel)" stroke="var(--mute)" stroke-width="1.5"/>`;
      else if (kind === 'l') s += `<text x="${x-6}" y="${y+5}" fill="var(--teal)">↪</text>`;
      else s += `<path d="M${x-8} ${y-7}h6l2 2h8v11h-16z" fill="var(--blueSoft)" stroke="var(--blue)" stroke-width="1.5"/>`;
      s += `<text x="${x + 14}" y="${y + 4.5}" font-weight="${f ? 800 : 600}" fill="${kind==='f'?'var(--ink)':'var(--blue)'}">${esc(name)}</text>`;
      if (cm) s += `<text class="cm" x="${Math.max(x + 30 + name.length * 8, 330)}" y="${y + 4}"># ${esc(cm)}</text>`;
      if (pin === name) s += `<g transform="translate(${x - 34},${y})"><path d="M0 0l-12 -8v16z" fill="#e11d48"/><text x="-20" y="-11" text-anchor="end" font-size="10" font-weight="800" fill="#e11d48">YOU</text></g>`;
      s += `</g>`;
    });
    if (step && step.caption) s += `<text x="${W/2}" y="${H-12}" text-anchor="middle" class="caption">${esc(step.caption)}</text>`;
    return s;
  }

  /* ---------------- perm ---------------- */
  function perm(scene, step) {
    const p = Object.assign({}, scene, (step && step.perm) || {});
    const mode = p.mode || '-rw-r--r--';
    const focus = p.focus || '';
    const triples = [mode.slice(1, 4), mode.slice(4, 7), mode.slice(7, 10)];
    const rows = [
      { k:'owner', t:'OWNER', sub:`(${p.owner || 'alice'})`, ic:'user' },
      { k:'group', t:'GROUP', sub:`(${p.group || 'developers'})`, ic:'users' },
      { k:'others', t:'OTHERS', sub:'(everyone else)', ic:'users' }
    ];
    let s = '';
    // ls -l string
    const segs = [[mode[0], 'type', '#64748b'], [triples[0], 'owner', '#1d5bd8'], [triples[1], 'group', '#16a34a'], [triples[2], 'others', '#f59e0b']];
    let sx = 230;
    s += `<text x="70" y="62" class="nsub" font-size="12">ls -l →</text>`;
    segs.forEach(([txt, k, c]) => {
      const on = !focus || focus === k || (focus === 'special' && /[sStT]/.test(txt));
      s += `<text x="${sx}" y="64" font-size="28" font-weight="800" fill="${c}" opacity="${on ? 1 : .3}">${esc(txt)}</text>`;
      s += `<text x="${sx + (txt.length * 17)/2}" y="84" text-anchor="middle" font-size="10" fill="${c}" opacity="${on ? 1 : .35}">${k}</text>`;
      sx += txt.length * 17 + 14;
    });
    s += `<text x="${sx + 8}" y="64" font-size="17" fill="var(--mute)">${esc(p.owner || 'alice')} ${esc(p.group || 'developers')} ${esc(p.file || 'report.txt')}</text>`;
    // file
    s += `<g transform="translate(125,270)"><g transform="scale(1.6)">${window.ICONS[/\/$/.test(p.file||'')?'folder':(/\.sh$/.test(p.file||'')?'script':'file')]()}</g></g>`;
    s += `<g transform="translate(125,270)">${window.ICONS.lock().replace('<g class="ico">','<g class="ico" transform="translate(28,30) scale(.7)">')}</g>`;
    s += `<rect x="58" y="335" width="134" height="32" rx="5" fill="var(--panel)" stroke="var(--blue)" stroke-width="1.5"/><text x="125" y="356" text-anchor="middle" font-weight="800" font-size="14">${esc(p.file || 'report.txt')}</text>`;
    s += `<path d="M175 270H215" class="edge solid" style="stroke:var(--blue)"/>`;
    s += `<path d="M215 160V380" class="edge solid" style="stroke:var(--blue)"/>`;
    rows.forEach((r, i) => {
      const y = 160 + i * 110;
      const on = !focus || focus === r.k || focus === 'special';
      const t = triples[i];
      const dig = (t[0] !== '-' ? 4 : 0) + (t[1] !== '-' ? 2 : 0) + (/[xst]/.test(t[2]) ? 1 : 0);
      s += `<g opacity="${on ? 1 : .32}">`;
      s += `<path d="M215 ${y}H250" class="edge solid" style="stroke:var(--blue)"/>`;
      s += `<rect x="250" y="${y - 38}" width="250" height="76" rx="7" fill="var(--panel)" stroke="var(--blue)" stroke-width="${focus===r.k?2.6:1.5}"/>`;
      s += `<g transform="translate(296,${y}) scale(.75)">${window.ICONS[r.ic]()}</g>`;
      s += `<text x="340" y="${y - 2}" font-size="18" font-weight="800">${r.t}</text><text x="340" y="${y + 18}" class="nsub" font-size="12">${esc(r.sub)}</text>`;
      s += `<path d="M500 ${y}H525" class="edge solid" style="stroke:var(--blue)"/>`;
      ['R', 'W', 'X'].forEach((L, j) => {
        const ch = t[j]; const lit = ch !== '-';
        const lbl = L === 'X' && /[sStT]/.test(ch) ? ch.toUpperCase() === 'S' ? (ch==='s'?'s':'S') : (ch==='t'?'t':'T') : L;
        const col = ['#1d5bd8', '#16a34a', '#f59e0b'][j];
        const x = 525 + j * 84;
        s += `<rect x="${x}" y="${y - 34}" width="76" height="68" rx="7" fill="${lit ? col : 'var(--panel)'}" fill-opacity="${lit ? .14 : 1}" stroke="${lit ? col : 'var(--faint)'}" stroke-width="1.6" ${lit ? '' : 'stroke-dasharray="4 4"'}/>`;
        s += `<text x="${x + 38}" y="${y + 2}" text-anchor="middle" font-size="22" font-weight="800" fill="${lit ? col : 'var(--faint)'}">${lbl}</text>`;
        s += `<text x="${x + 38}" y="${y + 22}" text-anchor="middle" font-size="9.5" fill="${lit ? col : 'var(--faint)'}">${['READ','WRITE','EXECUTE'][j]} ${lit ? '' : '✕'}</text>`;
      });
      s += `<circle cx="${800}" cy="${y}" r="24" fill="var(--blueSoft)" stroke="var(--blue)" stroke-width="1.5"/><text x="800" y="${y + 8}" text-anchor="middle" font-size="22" font-weight="800" fill="var(--blue)">${dig}</text>`;
      s += `<text x="800" y="${y + 40}" text-anchor="middle" class="nsub">${t[0]!=='-'?4:0}+${t[1]!=='-'?2:0}+${/[xst]/.test(t[2])?1:0}</text>`;
      s += `</g>`;
    });
    if (p.note) s += `<rect x="40" y="${H - 44}" width="${W - 80}" height="30" rx="5" fill="var(--hl)" stroke="var(--amber)"/><text x="${W/2}" y="${H - 24}" text-anchor="middle" font-size="12.5" font-weight="700">${esc(p.note)}</text>`;
    return s;
  }


  /* ---------------- mem: names (labels) -> objects ---------------- */
  function mem(scene, step) {
    const m = Object.assign({}, scene.mem || {}, (step && step.mem) || {});
    const frames = m.frames || [], objs = m.objs || [], focus = m.focus || [];
    const TC = { int:'#1d5bd8', float:'#1d5bd8', str:'#16a34a', bool:'#7c3aed', NoneType:'#64748b', list:'#0d9488', dict:'#f59e0b', tuple:'#0891b2', set:'#db2777', function:'#e11d48', object:'#7c3aed' };
    let s = `<text x="60" y="40" class="nsub" font-size="12" font-weight="700" letter-spacing="2">NAMES (labels)</text><text x="470" y="40" class="nsub" font-size="12" font-weight="700" letter-spacing="2">OBJECTS (in memory)</text>`;
    const pos = {}; let y = 62;
    frames.forEach(fr => {
      const h = 22 + fr.names.length * 46 + 8;
      s += `<rect x="40" y="${y}" width="300" height="${h}" rx="8" fill="none" stroke="var(--line)" stroke-width="1.5" stroke-dasharray="5 4"/>`;
      s += `<text x="52" y="${y + 16}" class="nsub" font-weight="700">${esc(fr.t || 'global')}</text>`;
      fr.names.forEach((n, i) => {
        const ny = y + 28 + i * 46; const f = focus.indexOf(n[0]) >= 0;
        s += `<rect x="70" y="${ny}" width="170" height="34" rx="17" fill="${f ? 'var(--hl)' : 'var(--panel)'}" stroke="${f ? '#f59e0b' : 'var(--blue)'}" stroke-width="${f ? 2.4 : 1.6}"/>`;
        s += `<text x="155" y="${ny + 22}" text-anchor="middle" font-size="15" font-weight="800">${esc(n[0])}</text>`;
        (pos.names = pos.names || []).push({ x: 240, y: ny + 17, to: n[1], f });
      });
      y += h + 14;
    });
    const oh = Math.min(70, (H - 90) / Math.max(objs.length, 1) - 10);
    objs.forEach((o, i) => {
      const [id, type, repr] = o; const oy = 62 + i * (oh + 10); const c = TC[type] || '#1d5bd8'; const f = focus.indexOf(id) >= 0;
      pos[id] = { x: 470, y: oy + oh / 2 };
      s += `<rect x="470" y="${oy}" width="390" height="${oh}" rx="8" fill="var(--panel)" stroke="${c}" stroke-width="${f ? 2.8 : 1.6}"/>`;
      s += `<rect x="470" y="${oy}" width="78" height="${oh}" rx="8" fill="${c}" fill-opacity=".14"/>`;
      s += `<text x="509" y="${oy + oh / 2 + 4}" text-anchor="middle" font-size="11" font-weight="800" fill="${c}">${esc(type)}</text>`;
      const r = String(repr); const fs = r.length > 34 ? 11.5 : 15;
      s += `<text x="562" y="${oy + oh / 2 + 5}" font-size="${fs}" font-weight="700">${esc(r.length > 46 ? r.slice(0, 45) + '…' : r)}</text>`;
    });
    (pos.names || []).forEach(n => { const o = pos[n.to]; if (!o) return;
      const c = n.f ? '#f59e0b' : 'var(--blue)';
      s += `<path d="M${n.x} ${n.y} C ${n.x + 110} ${n.y}, ${o.x - 110} ${o.y}, ${o.x - 6} ${o.y}" fill="none" stroke="${c}" stroke-width="${n.f ? 2.6 : 1.6}" ${n.f ? 'class="edge act" style="--fc:#f59e0b"' : ''}/>`;
      s += `<circle cx="${o.x - 6}" cy="${o.y}" r="4" fill="${c}"/>`; });
    if (m.note) s += `<rect x="40" y="${H - 44}" width="${W - 80}" height="30" rx="5" fill="var(--hl)" stroke="var(--amber)"/><text x="${W/2}" y="${H - 24}" text-anchor="middle" font-size="12.5" font-weight="700">${esc(m.note)}</text>`;
    return s;
  }

  return { render, COL };
})();
