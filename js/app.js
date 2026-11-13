/* Linux Explorer — app controller */
(function () {
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const LESSONS = (window.LESSONS || []).sort((a, b) => a.num - b.num);
  const byId = {}; LESSONS.forEach(l => byId[l.id] = l);

  const C = window.COURSE;
  const CATS = C.cats;
  const CAT_TITLE = C.catTitle;
  const KINDS = C.kinds;
  const LAYERS = C.layers;
  const LEVELS = C.levels;
  const KEY = C.key;
  let P = { seen: {}, done: {}, quiz: {}, chall: {}, xp: 0, theme: 'light', last: null };
  try { Object.assign(P, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) {} };

  /* ---------- state ---------- */
  const st = { lesson: LESSONS[0], idx: -1, tab: 'diagram', filter: 'all', playing: false, timer: null, typer: null, drafts: {}, pgOut: '' };

  /* ---------- XP ---------- */
  function addXP(n, why) {
    const before = level().name; P.xp += n; save(); renderXP();
    toast(`+${n} XP · ${why}`);
    const after = level().name; if (after !== before) setTimeout(() => toast(`LEVEL UP → ${after}`), 1400);
  }
  function level() { let cur = LEVELS[0], nxt = null; for (let i = 0; i < LEVELS.length; i++) { if (P.xp >= LEVELS[i][0]) { cur = LEVELS[i]; nxt = LEVELS[i + 1]; } } return { name: cur[1], from: cur[0], to: nxt ? nxt[0] : cur[0] + 1000 }; }
  function renderXP() { const L = level(); $('#lvlName').textContent = L.name; $('#xpNum').textContent = P.xp; $('#xpFill').style.width = Math.min(100, (P.xp - L.from) / (L.to - L.from) * 100) + '%';
    const total = LESSONS.length; const d = LESSONS.filter(l => P.done[l.id]).length; $('#progTxt').textContent = `${d}/${total} · ${Math.round(d / total * 100)}%`; }
  let tt; function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => el.classList.remove('show'), 2200); }

  /* ---------- quiz feedback pop-up ---------- */
  function quizCss() { if (document.getElementById('qpCss')) return; const s = document.createElement('style'); s.id = 'qpCss'; s.textContent = `
.qp{position:fixed;inset:0;background:rgba(5,10,25,.5);display:grid;place-items:center;z-index:80;padding:16px;animation:qpf .15s ease-out}
.qp .box{background:var(--panel);color:var(--ink);border:2px solid var(--line);border-radius:12px;max-width:560px;width:100%;max-height:86vh;overflow:auto;box-shadow:0 20px 60px rgba(0,0,0,.3);animation:qpu .2s ease-out}
.qp .qph{padding:14px 18px;gap:12px;white-space:nowrap;font-weight:800;letter-spacing:.08em;font-size:15px;display:flex;justify-content:space-between;align-items:center;border-radius:10px 10px 0 0}
.qp .qph.qok{background:color-mix(in srgb,var(--green) 16%,transparent);color:var(--green)} .qp .qph.qno{background:color-mix(in srgb,var(--red) 14%,transparent);color:var(--red)} .qp .qph.sum{background:color-mix(in srgb,var(--blue) 12%,transparent);color:var(--blue)}
.qp .qph small{font-size:11px;letter-spacing:.1em;opacity:.85}
.qp .bd{padding:14px 18px;font-size:12.5px;line-height:1.55}
.qp .qq{font-weight:700;margin-bottom:10px}
.qp .ans{border:1.5px solid var(--line);border-radius:6px;padding:7px 10px;margin:6px 0;font-size:12px}
.qp .ans b{font-size:10px;letter-spacing:.1em;display:block;margin-bottom:2px}
.qp .ans.r{border-color:var(--green);background:color-mix(in srgb,var(--green) 9%,transparent)} .qp .ans.r b{color:var(--green)}
.qp .ans.w{border-color:var(--red);background:color-mix(in srgb,var(--red) 8%,transparent)} .qp .ans.w b{color:var(--red)}
.qp .why{margin-top:10px;padding:9px 11px;border-left:3px solid var(--blue);background:color-mix(in srgb,var(--blue) 6%,transparent);border-radius:0 6px 6px 0}
.qp .why b,.qp .hk b{font-size:10px;letter-spacing:.1em;display:block;color:var(--blue);margin-bottom:2px}
.qp .hk{margin-top:8px;padding:9px 11px;border-left:3px solid var(--amber);background:color-mix(in srgb,var(--amber) 10%,transparent);border-radius:0 6px 6px 0}
.qp .hk b{color:#b45309}
.qp .row{display:flex;gap:8px;justify-content:flex-end;padding:0 18px 16px;flex-wrap:wrap}
.qp .row button{border:1.5px solid var(--blue);background:var(--blue);color:#fff;border-radius:6px;padding:8px 14px;font-weight:700;font-size:11.5px;letter-spacing:.06em;cursor:pointer;font-family:inherit}
.qp .row button.gh{background:transparent;color:var(--blue)}
.qp .it{display:flex;gap:8px;padding:7px 0;border-bottom:1px dashed var(--line);font-size:12px}
.qp .it i{font-style:normal;font-weight:800;width:16px} .qp .it .qok{color:var(--green)} .qp .it .qno{color:var(--red)}
.qp .it small{display:block;color:var(--mute);margin-top:2px;font-size:11px}
.qp .score{font-size:30px;font-weight:800;text-align:center;margin:4px 0 2px} .qp .sc2{text-align:center;color:var(--mute);margin-bottom:10px}
@keyframes qpf{from{opacity:0}} @keyframes qpu{from{transform:translateY(12px);opacity:0}}`; document.head.appendChild(s); }
  function qpClose() { const m = document.querySelector('.qp'); if (m) m.remove(); document.removeEventListener('keydown', qpKey, true); }
  function qpKey(e) { if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); const b = document.querySelector('.qp [data-qp=main]'); b ? b.click() : qpClose(); } }
  function qpOpen(html) { quizCss(); qpClose(); const m = document.createElement('div'); m.className = 'qp'; m.innerHTML = `<div class="box" role="dialog" aria-modal="true">${html}</div>`; m.onclick = e => { if (e.target === m) qpClose(); }; document.body.appendChild(m); document.addEventListener('keydown', qpKey, true); const b = m.querySelector('[data-qp=main]'); if (b) b.focus(); return m; }
  const L = i => String.fromCharCode(65 + i);
  function stripTags(h) { const d = document.createElement('div'); d.innerHTML = h || ''; return d.textContent || ''; }
  function qpOthers(q, ai) { if (!q.w) return ''; const li = q.a.map((a, i) => i === q.c || !q.w[i] ? '' : `<li${i === ai ? ' style="font-weight:700"' : ''}>${L(i)}. ${esc(a)}: ${q.w[i]}</li>`).join(''); return li ? `<div class="why" style="border-color:var(--red)"><b style="color:var(--red)">WHY NOT THE OTHERS</b><ul style="margin:3px 0 0;padding-left:16px">${li}</ul></div>` : ''; }
  function quizPop(l, qi, ai) {
    const q = l.quiz[qi], ok = ai === q.c, ans = P.quiz[l.id] || {};
    const allDone = l.quiz.every((_, i) => ans[i] != null);
    const next = l.quiz.findIndex((_, i) => ans[i] == null);
    const m = qpOpen(`<div class="qph ${ok ? 'qok' : 'qno'}">${ok ? '✓ CORRECT' : '✕ NOT QUITE'}<small>QUESTION ${qi + 1} OF ${l.quiz.length}${ok ? ' · +20 XP' : ''}</small></div>
      <div class="bd"><div class="qq">${esc(q.q)}</div>
      ${ok ? `<div class="ans r"><b>YOUR ANSWER ✓</b>${L(ai)}. ${esc(q.a[ai])}</div>` : `<div class="ans w"><b>YOUR ANSWER ✕</b>${L(ai)}. ${esc(q.a[ai])}</div><div class="ans r"><b>CORRECT ANSWER</b>${L(q.c)}. ${esc(q.a[q.c])}</div>`}
      <div class="why"><b>WHY</b>${q.why}</div>${qpOthers(q, ai)}
      ${l.hook ? `<div class="hk"><b>★ REMEMBER</b>${l.hook}</div>` : ''}</div>
      <div class="row">${allDone ? `<button data-qp="main">SEE MY SCORE →</button>` : next >= 0 ? `<button class="gh" data-qp="close">CLOSE</button><button data-qp="main">NEXT QUESTION ↓</button>` : `<button data-qp="main">GOT IT</button>`}</div>`);
    m.querySelector('[data-qp=main]').onclick = () => { qpClose(); if (allDone) quizSummary(l); else if (next >= 0) { const el = document.querySelector(`.q[data-q="${next}"]`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } };
    const c = m.querySelector('[data-qp=close]'); if (c) c.onclick = qpClose;
  }
  function quizSummary(l) {
    const ans = P.quiz[l.id] || {}; const n = l.quiz.length; const right = l.quiz.filter((q, i) => ans[i] === q.c).length;
    const pct = Math.round(right / n * 100); const msg = pct === 100 ? 'Lesson mastered! 🎉' : pct >= 75 ? 'Strong. Review the one you missed.' : pct >= 50 ? 'Getting there. Re-read the steps, then retry.' : 'Re-watch the diagram steps, then retry.';
    const m = qpOpen(`<div class="qph sum">LESSON ${l.num} SCORECARD<small>${esc(l.title).toUpperCase()}</small></div><div class="bd">
      <div class="score" style="color:${pct >= 75 ? 'var(--green)' : pct >= 50 ? '#b45309' : 'var(--red)'}">${right} / ${n}</div><div class="sc2">${pct}% · ${msg}</div>
      ${l.quiz.map((q, i) => { const ok = ans[i] === q.c; return `<div class="it"><i class="${ok ? 'qok' : 'qno'}">${ok ? '✓' : '✕'}</i><div>${esc(q.q)}<small>${ok ? '' : `You: ${L(ans[i])}. ${esc(q.a[ans[i]])} → `}<b>${L(q.c)}. ${esc(q.a[q.c])}</b> · ${esc(stripTags(q.why))}</small></div></div>`; }).join('')}
      </div><div class="row">${right < n ? `<button class="gh" data-qp="retry">↻ RETRY WRONG ONES</button>` : ''}<button data-qp="main">${l.next ? 'CONTINUE' : 'DONE'}</button></div>`);
    m.querySelector('[data-qp=main]').onclick = qpClose;
    const r = m.querySelector('[data-qp=retry]'); if (r) r.onclick = () => { l.quiz.forEach((q, i) => { if (ans[i] !== q.c) delete ans[i]; }); save(); qpClose(); const y = $('#details').scrollTop; renderDetails(); $('#details').scrollTop = y; toast('Wrong answers cleared. Try again!'); };
    if (pct === 100) confetti();
  }
  function confetti() { const cs = ['#1d5bd8', '#16a34a', '#f59e0b', '#7c3aed', '#e11d48']; for (let i = 0; i < 60; i++) { const c = document.createElement('i'); c.className = 'confetti'; c.style.left = Math.random() * 100 + 'vw'; c.style.background = cs[i % 5]; c.style.animationDelay = Math.random() * .5 + 's'; document.body.appendChild(c); setTimeout(() => c.remove(), 2600); } }

  /* ---------- navigation ---------- */
  function go(lessonId, idx, opts) {
    stop(); const l = byId[lessonId] || LESSONS[0]; const changed = l !== st.lesson; st.lesson = l; st.idx = idx == null ? -1 : idx;
    P.last = l.id; save();
    if (st.idx >= 0 && st.idx < l.steps.length) { const s = P.seen[l.id] = P.seen[l.id] || []; if (s.indexOf(st.idx) < 0) { s.push(st.idx); save(); addXP(10, 'step learned'); } }
    if (st.idx === l.steps.length && !P.done[l.id]) { P.done[l.id] = true; save(); addXP(50, 'lesson complete'); confetti(); }
    try { const h = '#' + l.id + (st.idx >= 0 ? '/' + st.idx : ''); if (location.hash !== h) history.replaceState(null, '', h); } catch (e) {}
    if (opts && opts.tab) st.tab = opts.tab;
    renderAll(changed);
  }
  const next = () => { const n = st.lesson.steps.length; if (st.idx < n) go(st.lesson.id, st.idx + 1); else { const i = LESSONS.indexOf(st.lesson); if (LESSONS[i + 1]) go(LESSONS[i + 1].id, -1); } };
  const prev = () => { if (st.idx > -1) go(st.lesson.id, st.idx - 1); };
  function play() { if (st.playing) return stop(); if (st.idx >= st.lesson.steps.length) go(st.lesson.id, -1);
    st.playing = true; updatePlay(); const tick = () => { if (st.idx >= st.lesson.steps.length) return stop(); next(); st.playing = true; updatePlay(); st.timer = setTimeout(tick, 5200 / +$('#speed').value); };
    tick(); }
  function stop() { st.playing = false; clearTimeout(st.timer); updatePlay(); }
  function updatePlay() { const b = $('#playBtn'); const end = st.idx >= st.lesson.steps.length; b.textContent = st.playing ? '❚❚ PAUSE' : end ? '↻ REPLAY' : '▶ PLAY'; $('#stepBtn').disabled = end; }

  /* ---------- render ---------- */
  function renderAll() { renderSidebar(); renderLayers(); renderStage(); renderDetails(); renderFlow(); renderXP(); updatePlay(); }

  function renderLayers() { const L = st.lesson.layer || 4; $('#layers').innerHTML = LAYERS.map((n, i) => `<span class="${i + 1 === L ? 'on' : ''}" title="${n}">${i + 1}</span>`).join(''); $('#layerName').textContent = LAYERS[L - 1]; }

  function renderFilters() {
    $('#filters').innerHTML = CATS.map(([k, n]) => { const c = k === 'all' ? LESSONS.length : LESSONS.filter(l => l.cat === k).length; return `<button data-f="${k}" class="${st.filter === k ? 'on' : ''}">${n}<em>${c}</em></button>`; }).join('');
  }
  function renderSidebar() {
    renderFilters();
    let h = '', lastCat = null;
    LESSONS.filter(l => st.filter === 'all' || l.cat === st.filter).forEach(l => {
      const hd = l.section || CAT_TITLE[l.cat] || l.cat; if (hd !== lastCat) { h += `<div class="cat-h">${hd}</div>`; lastCat = hd; }
      const on = l === st.lesson; const seen = (P.seen[l.id] || []).length; const pct = Math.round(seen / l.steps.length * 100);
      const dot = P.done[l.id] ? 'done' : seen ? 'started' : '';
      h += `<div class="lesson ${on ? 'on' : ''}"><button data-l="${l.id}"><span class="dot ${dot}" style="--p:${pct}%"></span><span><span class="nm"><small>${String(l.num).padStart(2, '0')}</small>${esc(l.title)}</span><span class="sb">${esc(l.short)}</span></span><span class="chev">›</span></button>`;
      if (on) { h += '<div class="steps">' + l.steps.map((s, i) => `<button data-s="${i}" class="${(P.seen[l.id] || []).indexOf(i) >= 0 ? 'seen' : ''} ${st.idx === i ? 'cur' : ''}"><span class="n">${(P.seen[l.id] || []).indexOf(i) >= 0 && st.idx !== i ? '✓' : i + 1}</span><span><b>${esc(s.t.toUpperCase())}</b><span>${esc(s.sub)}</span></span></button>`).join('') + '</div>'; }
      h += '</div>';
    });
    $('#lessonList').innerHTML = h;
    const cur = $('#lessonList .lesson.on'); if (cur && !renderSidebar.scrolled) { cur.scrollIntoView({ block: 'nearest' }); }
  }

  /* stage */
  function renderStage() {
    document.querySelectorAll('#stageTabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === st.tab));
    clearInterval(st.typer);
    const body = $('#stageBody');
    if (st.tab === 'diagram') { Diagram.render(body, st.lesson, Math.min(st.idx, st.lesson.steps.length - 1)); }
    else if (st.tab === 'terminal') renderTerminal(body);
    else renderPlayground(body);
  }
  const PROMPT = `<span class="pu">${esc(C.prompt || '$')}</span> `, CONT = `<span class="pd">${C.prompt === '>>>' ? '...' : '&gt;'}</span> `;
  function codeHTML(c) {
    if (c.f) return `<span class="cm">── ${esc(c.f)} ──</span>\n` + esc(c.c) + '\n' + (C.runFile ? `<span class="pu">$</span> ${esc(C.runFile.replace('{f}', c.f))}\n` : '');
    if (C.prompt !== '>>>') return c.c.split('\n').map((l, i) => (i ? '  ' : PROMPT) + esc(l)).join('\n') + '\n';
    return c.c.split('\n').map((l, i) => (i ? CONT : PROMPT) + esc(l)).join('\n') + '\n';
  }
  function outHTML(c) { if (!c.o) return ''; const bad = C.errRe.test(c.o); return `<span style="color:${bad ? '#ff8fa3' : 'inherit'}">${esc(c.o)}</span>\n`; }
  function renderTerminal(body) {
    const l = st.lesson; const upto = Math.min(st.idx, l.steps.length - 1);
    let old = ''; const cur = [];
    l.steps.forEach((s, i) => { if (i > upto) return; (s.cmds || []).forEach(c => { if (i < upto) old += `<div class="old">${codeHTML(c)}${outHTML(c)}</div>`; else cur.push(c); }); });
    body.innerHTML = `<div class="term" id="termBox"><div class="bar"><i></i><i></i><i></i><span>${esc(C.termTitle || 'terminal')} — ${upto < 0 ? 'press STEP to begin' : 'step ' + (upto + 1)}</span></div><pre>${old}<span id="typing"></span><span class="caret"></span></pre></div>`;
    const tgt = $('#typing'); if (!cur.length) { if (upto < 0) tgt.innerHTML = `<span class="cm"># ${esc(l.title)} — ${esc(l.short)}\n# Press STEP (→) to start running code.</span>\n`; return; }
    let ci = 0, ch = 0, html = ''; const box = $('#termBox');
    st.typer = setInterval(() => {
      const c = cur[ci]; if (!c) { clearInterval(st.typer); return; }
      if (ch <= c.c.length) { const partial = Object.assign({}, c, { c: c.c.slice(0, ch) }); tgt.innerHTML = html + codeHTML(partial).replace(/\n(<span class="pu">\$<\/span>.*\n)?$/, ''); ch += 3; }
      else { html += codeHTML(c) + outHTML(c); tgt.innerHTML = html; ci++; ch = 0; }
      box.scrollTop = box.scrollHeight;
    }, 24);
  }

  const LABAPI = {
    esc, toast, confetti, drafts: st.drafts,
    solved: id => !!P.chall[id],
    solve: id => { if (P.chall[id]) return; P.chall[id] = true; save(); addXP(40, 'challenge solved'); confetti(); const t = document.querySelector('.sbx-task'); if (t) { t.classList.add('ok'); t.querySelector('b').textContent = '✓ CHALLENGE DONE'; } },
    taskBar: l => { const ch = l.challenge; if (!ch) return ''; const ok = P.chall[l.id]; return `<div class="sbx-task ${ok ? 'ok' : ''}"><b>${ok ? '✓ CHALLENGE DONE' : '⚑ CHALLENGE'}</b><span>${esc(ch.task)}</span><button class="hintBtn" onclick="window.__hint()">HINT</button></div>`; }
  };
  window.__hint = () => { const ch = st.lesson.challenge; if (ch) toast('Hint: ' + ch.hint); };

  /* playground: real Python via Pyodide */
  const DEFAULT_CODE = C.defaultCode || '# Real Python runs here. Edit and press RUN (Ctrl+Enter).\nname = "Raul"\nskills = ["AWS", "n8n", "Python"]\nprint(f"Hi {name}! Today you level up: {\', \'.join(skills)}")\n';
  function renderPlayground(body) {
    if (C.lab !== 'python') { const l = st.lesson; return window.LAB.render(body, l, LABAPI); }
    const l = st.lesson, ch = l.challenge, ok = ch && P.chall[l.id];
    const code = st.drafts[l.id] != null ? st.drafts[l.id] : (ch && ch.starter) || DEFAULT_CODE;
    body.innerHTML = `<div class="pg">
      <div class="pgbar"><span class="pgdot" id="pgStatus">${PyRunner.ready() ? '● PYTHON READY' : '○ PYTHON LOADS ON FIRST RUN'}</span>
        <button id="pgRun" class="btn">▶ RUN</button><button id="pgReset" class="btn ghost">RESET</button><button id="pgClear" class="btn ghost">CLEAR OUTPUT</button></div>
      <textarea id="pgCode" spellcheck="false" aria-label="Python code editor">${esc(code)}</textarea>
      <pre id="pgOut" class="pgout">${st.pgOut || '<span class="cm"># Output appears here. Variables survive between runs (like a notebook). RESET clears them.\n# input() always answers "Raul" in this playground.</span>'}</pre>
    </div>` + (ch ? `<div class="sbx-task ${ok ? 'ok' : ''}"><b>${ok ? '✓ CHALLENGE DONE' : '⚑ CHALLENGE'}</b><span>${esc(ch.task)}</span><button id="hintBtn">HINT</button></div>` : '');
    const ta = $('#pgCode');
    ta.oninput = () => { st.drafts[l.id] = ta.value; };
    ta.onkeydown = e => {
      if (e.key === 'Tab') { e.preventDefault(); const p = ta.selectionStart; ta.value = ta.value.slice(0, p) + '    ' + ta.value.slice(ta.selectionEnd); ta.selectionStart = ta.selectionEnd = p + 4; st.drafts[l.id] = ta.value; }
      else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); runCode(); }
      else if (e.key === 'Enter') { const p = ta.selectionStart; const line = ta.value.slice(0, p).split('\n').pop(); let ind = (line.match(/^\s*/) || [''])[0]; if (/:\s*$/.test(line)) ind += '    '; e.preventDefault(); ta.value = ta.value.slice(0, p) + '\n' + ind + ta.value.slice(ta.selectionEnd); ta.selectionStart = ta.selectionEnd = p + 1 + ind.length; st.drafts[l.id] = ta.value; }
      e.stopPropagation();
    };
    $('#pgRun').onclick = runCode;
    $('#pgReset').onclick = async () => { st.drafts[l.id] = null; await PyRunner.reset(); st.pgOut = ''; renderPlayground(body); toast('Code and variables reset'); };
    $('#pgClear').onclick = () => { st.pgOut = ''; $('#pgOut').innerHTML = ''; };
    const hb = $('#hintBtn'); if (hb) hb.onclick = () => toast('Hint: ' + ch.hint);
  }
  async function runCode() {
    const ta = $('#pgCode'); if (!ta) return; const code = ta.value; const outEl = $('#pgOut'); const stEl = $('#pgStatus');
    if (!PyRunner.ready()) { stEl.textContent = '◌ DOWNLOADING PYTHON… (first time only)'; outEl.innerHTML = '<span class="cm"># Loading the Python engine (~10 MB). Next runs are instant.</span>'; }
    $('#pgRun').disabled = true;
    let r; try { r = await PyRunner.run(code); } catch (e) { r = { out: '', err: String(e.message || e) }; }
    $('#pgRun').disabled = false; if (stEl) stEl.textContent = PyRunner.ready() ? '● PYTHON READY' : '✕ PYTHON NOT LOADED';
    st.pgOut = `<span class="cm"># ▶ run at ${new Date().toLocaleTimeString()}</span>\n` + esc(r.out || '') + (r.err ? `<span style="color:#ff8fa3">${esc(r.err)}</span>\n` : (r.out ? '' : '<span class="cm">(no output, ran OK)</span>\n'));
    if ($('#pgOut')) { $('#pgOut').innerHTML = st.pgOut; $('#pgOut').scrollTop = 1e6; }
    if (!r.err) checkChallenge(r.out || '');
  }
  async function checkChallenge(stdout) { const l = st.lesson, ch = l.challenge; if (!ch || P.chall[l.id] || !PyRunner.ready()) return;
    const ok = await PyRunner.check(ch.check, stdout);
    if (ok) { P.chall[l.id] = true; save(); addXP(40, 'challenge solved'); confetti(); const t = document.querySelector('.sbx-task'); if (t) { t.classList.add('ok'); t.querySelector('b').textContent = '✓ CHALLENGE DONE'; } }
    else toast('Ran fine, but the challenge isn’t solved yet. Try the HINT.'); }

  /* details */
  function renderDetails() {
    const l = st.lesson, n = l.steps.length, i = st.idx; let h = '';
    if (i < 0) {
      h += `<div class="dh"><span class="kicker">LESSON ${String(l.num).padStart(2, '0')} · OVERVIEW</span><span class="pill" style="${P.done[l.id] ? '' : 'color:var(--blue)'}">${P.done[l.id] ? 'COMPLETED' : 'READY'}</span></div>`;
      h += `<div class="dt">${esc(l.title)}</div><div class="dsub">${esc(l.short)}</div>`;
      h += `<div class="dbody">${l.overview}</div>`;
      if (l.hook) h += `<div class="card hook"><div class="ch">★ MASTER MEMORY HOOK</div>${l.hook}</div>`;
      if (l.why) h += `<div class="card cloud"><div class="ch">☁ WHY IT MATTERS · CLOUD / DEVOPS / SECURITY</div>${l.why}</div>`;
      h += `<table class="facts"><tr><td>SKILL LEVEL</td><td>${LAYERS[(l.layer || 4) - 1]}</td></tr><tr><td>STEPS</td><td>${n} steps · ~${l.mins || n * 2} min</td></tr><tr><td>KEY SYNTAX</td><td>${(l.cheat || []).slice(0, 6).map(c => `<code>${esc(c[0])}</code>`).join(' ')}</td></tr>${l.challenge ? `<tr><td>HANDS-ON</td><td>${C.handsOn || 'Hands-on lab challenge'} (+40 XP)</td></tr>` : ''}</table>`;
      h += `<div class="btnrow"><button class="btn" data-act="start">▶ START LESSON</button>${P.seen[l.id] && P.seen[l.id].length ? `<button class="btn ghost" data-act="resume">RESUME</button>` : ''}</div>`;
    } else if (i < n) {
      const s = l.steps[i];
      h += `<div class="dh"><h2 style="font-size:14px">STEP DETAILS</h2><button class="back" data-act="overview">‹ OVERVIEW</button></div>`;
      h += `<div class="kicker">STEP ${i + 1} OF ${n}</div><div class="dt">${esc(s.t)}</div><div class="dsub">${esc(s.sub)}</div>`;
      h += `<div class="dbody">${s.body}</div>`;
      if (s.cmd) { const k = KINDS[s.cmd.k || 'var'] || KINDS.var; h += `<div class="card cmd"><div class="ch"><span class="tag" style="background:${k[1]}">${esc(s.cmd.tag || k[0])}</span>${esc(s.cmd.who || '')}</div><pre>${esc(s.cmd.code)}</pre>${s.cmd.note ? `<div class="dbody" style="margin-top:6px;font-size:11px">${s.cmd.note}</div>` : ''}</div>`; }
      if (s.analogy) h += `<div class="card analogy"><div class="ch">◎ ANALOGY</div>${s.analogy}</div>`;
      if (s.hook) h += `<div class="card hook"><div class="ch">★ MEMORY HOOK</div>${s.hook}</div>`;
      if (s.words) h += `<div class="kicker" style="margin-top:4px">TRIGGER WORDS</div><div class="words">${s.words.map(w => `<span>${esc(w)}</span>`).join('')}</div>`;
      if (s.warn) h += `<div class="card warn"><div class="ch">⚠ CAREFUL</div>${s.warn}</div>`;
      if (s.cloud) h += `<div class="card cloud"><div class="ch">☁ IN THE REAL WORLD</div>${s.cloud}</div>`;
      if (s.facts) h += `<table class="facts">${s.facts.map(f => `<tr><td>${esc(f[0])}</td><td>${f[1]}</td></tr>`).join('')}</table>`;
      h += `<div class="btnrow"><button class="btn ghost" data-act="prev">‹ BACK</button><button class="btn" data-act="next">${i === n - 1 ? 'FINISH ✓' : 'NEXT STEP ›'}</button></div>`;
    } else {
      const sm = l.summary || {};
      h += `<div class="dh"><h2 style="font-size:14px">LESSON SUMMARY</h2><button class="back" data-act="overview">‹ OVERVIEW</button></div>`;
      h += `<div class="kicker done">LESSON COMPLETE</div><div class="dt">${esc(sm.title || l.title)}</div><div class="dsub">${esc(sm.sub || '')}</div><div class="dbody">${sm.text || ''}</div>`;
      if (sm.facts) h += `<table class="facts">${sm.facts.map(f => `<tr><td>${esc(f[0])}</td><td>${f[1]}</td></tr>`).join('')}</table>`;
      h += `<div class="card hook"><div class="ch">★ HOOKS TO REMEMBER</div>${l.steps.filter(s => s.hook).map(s => `• ${s.hook}`).join('<br>')}</div>`;
      if (l.quiz) { h += `<div class="kicker" style="margin-top:14px">CHECK YOURSELF · +20 XP EACH</div><div class="quiz">` + l.quiz.map((q, qi) => { const ans = (P.quiz[l.id] || {})[qi];
          return `<div class="q" data-q="${qi}"><p>${qi + 1}. ${esc(q.q)}</p>${q.a.map((a, ai) => `<button data-a="${ai}" ${ans != null ? 'disabled' : ''} class="${ans != null && ai === q.c ? 'right' : ans === ai && ai !== q.c ? 'wrong' : ''}">${String.fromCharCode(65 + ai)}. ${esc(a)}</button>`).join('')}${ans != null ? `<div class="why">${ans === q.c ? '✓ ' : '✗ '}${q.why}</div>` : ''}</div>`; }).join('') + '</div>'; }
      if (l.challenge) h += `<div class="card cmd"><div class="ch"><span class="tag" style="background:#f59e0b">PLAYGROUND</span>${P.chall[l.id] ? 'SOLVED ✓' : '+40 XP'}</div>${esc(l.challenge.task)}<div class="btnrow"><button class="btn" data-act="playground">OPEN PLAYGROUND</button></div></div>`;
      const nl = LESSONS[LESSONS.indexOf(l) + 1];
      if (nl) h += `<div class="next"><div class="kicker">NEXT UP · LESSON ${String(nl.num).padStart(2, '0')}</div><h3>${esc(nl.title)}</h3><p>${l.next || nl.short}</p><button class="btn" data-act="nextlesson">CONTINUE ›</button></div>`;
      else h += `<div class="next"><div class="kicker">YOU FINISHED THE PATH</div><h3>Now build something real</h3><p>${l.next || ''}</p></div>`;
    }
    $('#details').innerHTML = h; $('#details').scrollTop = 0;
  }

  /* flow table */
  function renderFlow() {
    const l = st.lesson, upto = Math.min(st.idx, l.steps.length - 1); let rows = '', no = 0; const kinds = {};
    l.steps.forEach(s => (s.cmds || []).forEach(c => kinds[c.k || 'var'] = 1));
    $('#legend').innerHTML = Object.keys(kinds).map(k => `<span style="--c:${KINDS[k][1]}">${KINDS[k][0]}</span>`).join('');
    l.steps.forEach((s, i) => { if (i > upto) return; (s.cmds || []).forEach(c => { no++; const k = KINDS[c.k || 'var'] || KINDS.var;
      const ls = (c.o || '').split('\n').filter(Boolean); let out = ls[ls.length - 1] || ''; if (/^\s*[\]\})]+\s*$/.test(out)) out = ls[0]; const err = c.x != null ? c.x : C.errRe.test(c.o || '');
      const em = (c.o || '').match(/error occurred \((\w+)\)|(\w+(Error|Exception|Denied|Failed|FAILED))/); const errName = err ? (em ? (em[1] || em[2]) : 'Error') : 'OK';
      rows += `<tr data-s="${i}" class="${i === upto ? 'cur' : ''}"><td><span class="no" style="background:${k[1]}">${no}</span></td><td>+${(no * 0.42).toFixed(2)}s</td><td>${esc(c.f || C.where || 'CLI')}</td><td class="kind" style="color:${k[1]}">${k[0]}</td><td class="cmdc">${esc(c.c.split('\n')[0])}${c.c.includes('\n') ? ' …' : ''}</td><td class="res">${esc(out || '(no output)')}</td><td class="${err ? 'ex1' : 'ex0'}">${esc(errName)}</td></tr>`;}); });
    $('#flowRows').innerHTML = rows; $('#flowEmpty').style.display = rows ? 'none' : 'block';
    const cur = document.querySelector('#flowRows tr.cur:last-child') || document.querySelector('#flowRows tr:last-child'); if (cur) cur.scrollIntoView({ block: 'nearest' });
  }

  /* ---------- search & cheat sheet ---------- */
  const IDX = []; LESSONS.forEach(l => { IDX.push({ l: l.id, i: -1, t: l.title, s: l.short, k: (l.title + ' ' + l.short + ' ' + (l.cheat || []).map(c => c[0] + ' ' + c[1]).join(' ')).toLowerCase() });
    l.steps.forEach((s, i) => IDX.push({ l: l.id, i, t: `${l.title} › ${s.t}`, s: s.sub, k: (s.t + ' ' + s.sub + ' ' + (s.words || []).join(' ') + ' ' + (s.cmds || []).map(c => c.c).join(' ')).toLowerCase() })); });
  let sel = 0, results = [];
  function doSearch(q) { q = q.toLowerCase().trim(); results = q ? IDX.filter(x => q.split(/\s+/).every(w => x.k.indexOf(w) >= 0 || x.t.toLowerCase().indexOf(w) >= 0)).slice(0, 14) : IDX.filter(x => x.i < 0); sel = 0; drawResults(); }
  function drawResults() { $('#searchResults').innerHTML = results.map((r, i) => `<button class="sr ${i === sel ? 'sel' : ''}" data-i="${i}"><b>${esc(r.t)}</b><small>${esc(r.s)}</small></button>`).join('') || '<div class="empty">No match. Try "chmod", "ssh", "logs"…</div>'; }
  function openSearch() { $('#searchModal').hidden = false; const i = $('#searchInput'); i.value = ''; doSearch(''); i.focus(); }
  function pick(r) { $('#searchModal').hidden = true; if (r) go(r.l, r.i); }
  function openCheat() { $('#cheatBox').innerHTML = `<div class="dh"><h2>${esc(C.short.toUpperCase())} CHEAT SHEET</h2><button class="back" id="cheatClose">CLOSE ✕</button></div><div class="cheat-grid">` + LESSONS.map(l => `<div class="cheat"><h4>${String(l.num).padStart(2, '0')} · ${esc(l.title.toUpperCase())}</h4>${l.hook ? `<div class="hk">★ ${l.hook}</div>` : ''}${(l.cheat || []).map(c => `<div class="c"><code>${esc(c[0])}</code><span>${esc(c[1])}</span></div>`).join('')}</div>`).join('') + '</div>';
    $('#cheatModal').hidden = false; $('#cheatClose').onclick = () => $('#cheatModal').hidden = true; }

  /* ---------- events ---------- */
  document.addEventListener('click', e => {
    const t = e.target.closest('button, tr'); if (!t) return;
    if (t.dataset.f) { st.filter = t.dataset.f; renderSidebar(); return; }
    if (t.dataset.l) { go(t.dataset.l, t.dataset.l === st.lesson.id ? st.idx : -1); return; }
    if (t.closest('.steps') && t.dataset.s != null) { go(st.lesson.id, +t.dataset.s); return; }
    if (t.tagName === 'TR' && t.dataset.s != null) { go(st.lesson.id, +t.dataset.s, { tab: 'terminal' }); return; }
    if (t.dataset.tab) { st.tab = t.dataset.tab; renderStage(); return; }
    if (t.dataset.i != null && t.classList.contains('sr')) { pick(results[+t.dataset.i]); return; }
    const a = t.dataset.act;
    if (a === 'start') go(st.lesson.id, 0); else if (a === 'resume') { const s = P.seen[st.lesson.id] || [0]; go(st.lesson.id, Math.min(Math.max(...s) + 1, st.lesson.steps.length)); }
    else if (a === 'next') next(); else if (a === 'prev') prev(); else if (a === 'overview') go(st.lesson.id, -1);
    else if (a === 'nextlesson') { const nl = LESSONS[LESSONS.indexOf(st.lesson) + 1]; if (nl) go(nl.id, -1); }
    else if (a === 'playground') { st.tab = 'playground'; renderStage(); }
    if (t.dataset.a != null) { const qi = +t.closest('.q').dataset.q, ai = +t.dataset.a, l = st.lesson; P.quiz[l.id] = P.quiz[l.id] || {}; if (P.quiz[l.id][qi] != null) return; P.quiz[l.id][qi] = ai; save(); if (ai === l.quiz[qi].c) addXP(20, 'correct answer'); if (window.STUDY) STUDY.onAnswer(l, qi, ai); const y = $('#details').scrollTop; renderDetails(); $('#details').scrollTop = y; quizPop(l, qi, ai); }
  });
  $('#playBtn').onclick = play; $('#stepBtn').onclick = () => { stop(); next(); }; $('#prevBtn').onclick = () => { stop(); prev(); }; $('#resetBtn').onclick = () => go(st.lesson.id, -1);
  $('#searchBtn').onclick = openSearch; $('#cheatBtn').onclick = openCheat; $('#brandHome').onclick = e => { e.preventDefault(); go(LESSONS[0].id, -1); };
  $('#searchInput').oninput = e => doSearch(e.target.value);
  $('#searchInput').onkeydown = e => { if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, results.length - 1); drawResults(); e.preventDefault(); } else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); drawResults(); e.preventDefault(); } else if (e.key === 'Enter') pick(results[sel]); };
  document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', e => { if (e.target === m) m.hidden = true; }));
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); return; }
    if (e.key === 'Escape') { document.querySelectorAll('.modal').forEach(m => m.hidden = true); return; }
    if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName) || !$('#searchModal').hidden) return;
    if (e.key === 'ArrowRight') { stop(); next(); } else if (e.key === 'ArrowLeft') { stop(); prev(); } else if (e.key === ' ') { e.preventDefault(); play(); }
  });
  function setTheme(t) { P.theme = t; save(); try { localStorage.setItem('rmc-theme', t); } catch (e) {} document.documentElement.dataset.theme = t; $('#lightBtn').classList.toggle('on', t === 'light'); $('#darkBtn').classList.toggle('on', t === 'dark'); renderStage(); }
  $('#lightBtn').onclick = () => setTheme('light'); $('#darkBtn').onclick = () => setTheme('dark');

  /* ---------- boot ---------- */
  try { P.theme = localStorage.getItem('rmc-theme') || 'dark'; } catch (e) {}
  document.documentElement.dataset.theme = P.theme; $('#lightBtn').classList.toggle('on', P.theme === 'light'); $('#darkBtn').classList.toggle('on', P.theme === 'dark');
  window.addEventListener('hashchange', () => { const h = (location.hash || '').slice(1).split('/'); if (!byId[h[0]]) return; const i = h[1] != null && h[1] !== '' ? +h[1] : -1; if (h[0] !== st.lesson.id || i !== st.idx) go(h[0], i); });
  const m = (location.hash || '').slice(1).split('/');
  if (m[0] && byId[m[0]]) go(m[0], m[1] != null && m[1] !== '' ? +m[1] : -1);
  else go(P.last && byId[P.last] ? P.last : LESSONS[0].id, -1);
})();
