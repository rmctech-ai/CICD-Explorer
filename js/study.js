/* Study tools shared by every Explorer course and the hub:
   - My Mistakes review deck (spaced repetition, shared across all courses on the same origin)
   - Flashcards from cheat sheets, memory hooks and trigger words
   Works with or without LESSONS (the hub only uses the review deck). */
window.STUDY = (function () {
  const KEY = 'explorer-mistakes-v1';
  const DAY = 86400000, STEPS = [0, DAY, 3 * DAY];   // due after: now, +1 day, +3 days; 3 correct reviews = mastered
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const strip = h => { const d = document.createElement('div'); d.innerHTML = h || ''; return d.textContent || ''; };
  const L = i => String.fromCharCode(65 + i);
  const course = () => (document.title.split('·')[0] || 'Explorer').trim();
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } };
  const store = d => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} refreshBadge(); };
  const due = (d = load()) => Object.values(d).filter(m => m.due <= Date.now());

  function css() {
    if (document.getElementById('stCss')) return; const s = document.createElement('style'); s.id = 'stCss'; s.textContent = `
.stdy{position:fixed;inset:0;background:rgba(5,10,25,.5);display:grid;place-items:center;z-index:85;padding:16px}
.stdy .box{background:var(--panel,#fff);color:var(--ink,#111);border:2px solid var(--line,#ddd);border-radius:12px;max-width:620px;width:100%;max-height:88vh;overflow:auto;box-shadow:0 20px 60px rgba(0,0,0,.3)}
.stdy .sh{padding:14px 18px;font-weight:800;letter-spacing:.08em;display:flex;justify-content:space-between;align-items:center;gap:12px;background:color-mix(in srgb,var(--blue,#1d5bd8) 12%,transparent);color:var(--blue,#1d5bd8);border-radius:10px 10px 0 0}
.stdy .sh small{font-size:11px;opacity:.85;white-space:nowrap}
.stdy .sb{padding:14px 18px;font-size:12.5px;line-height:1.55}
.stdy .src{font-size:10.5px;letter-spacing:.08em;color:var(--mute,#667);margin-bottom:6px}
.stdy .src a{color:var(--blue,#1d5bd8)}
.stdy .qq{font-weight:700;margin-bottom:8px;font-size:13px}
.stdy .op{display:block;width:100%;text-align:left;border:1.5px solid var(--line,#ddd);background:transparent;color:inherit;border-radius:6px;padding:8px 10px;margin:5px 0;font:inherit;font-size:12px;cursor:pointer}
.stdy .op:hover:not(:disabled){border-color:var(--blue,#1d5bd8)}
.stdy .op.r{border-color:var(--green,#16a34a);background:color-mix(in srgb,var(--green,#16a34a) 10%,transparent)}
.stdy .op.w{border-color:var(--red,#e11d48);background:color-mix(in srgb,var(--red,#e11d48) 9%,transparent)}
.stdy .fb{margin-top:10px;padding:9px 11px;border-left:3px solid var(--blue,#1d5bd8);background:color-mix(in srgb,var(--blue,#1d5bd8) 6%,transparent);border-radius:0 6px 6px 0}
.stdy .fb b{font-size:10px;letter-spacing:.1em;display:block;color:var(--blue,#1d5bd8);margin-bottom:2px}
.stdy .fb.ok{border-color:var(--green,#16a34a)} .stdy .fb.ok b{color:var(--green,#16a34a)} .stdy .fb.bad{border-color:var(--red,#e11d48)} .stdy .fb.bad b{color:var(--red,#e11d48)}
.stdy .wl{margin:4px 0 0;padding-left:16px} .stdy .wl li{margin:3px 0}
.stdy .row{display:flex;gap:8px;justify-content:flex-end;padding:0 18px 16px;flex-wrap:wrap;align-items:center}
.stdy .row .sp{flex:1;font-size:11px;color:var(--mute,#667)}
.stdy button.bt{border:1.5px solid var(--blue,#1d5bd8);background:var(--blue,#1d5bd8);color:#fff;border-radius:6px;padding:8px 14px;font-weight:700;font-size:11.5px;letter-spacing:.06em;cursor:pointer;font-family:inherit}
.stdy button.bt.gh{background:transparent;color:var(--blue,#1d5bd8)} .stdy button.bt.red{background:var(--red,#e11d48);border-color:var(--red,#e11d48)} .stdy button.bt.grn{background:var(--green,#16a34a);border-color:var(--green,#16a34a)}
.stdy .card{perspective:900px;height:230px;margin:6px 0 4px;cursor:pointer}
.stdy .card .in{position:relative;width:100%;height:100%;transition:transform .45s;transform-style:preserve-3d}
.stdy .card.flip .in{transform:rotateY(180deg)}
.stdy .card .fc{position:absolute;inset:0;backface-visibility:hidden;border:2px solid var(--line,#ddd);border-radius:10px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:16px 20px;overflow:auto}
.stdy .card .front{background:var(--panel,#fff)} .stdy .card .back{transform:rotateY(180deg);background:color-mix(in srgb,var(--blue,#1d5bd8) 6%,var(--panel,#fff));border-color:var(--blue,#1d5bd8)}
.stdy .card .k{font-size:10px;letter-spacing:.12em;color:var(--mute,#667);margin-bottom:8px}
.stdy .card .big{font-size:16px;font-weight:700;line-height:1.4} .stdy .card code{font-size:13.5px;background:color-mix(in srgb,var(--blue,#1d5bd8) 10%,transparent);padding:3px 7px;border-radius:4px;word-break:break-word}
.stdy .card .sm{font-size:12px;margin-top:8px;color:var(--ink,#111);opacity:.85}
.stdy .seg{display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap} .stdy .seg button{border:1.5px solid var(--line,#ddd);background:transparent;color:inherit;border-radius:20px;padding:4px 11px;font:inherit;font-size:11px;cursor:pointer} .stdy .seg button.on{border-color:var(--blue,#1d5bd8);color:var(--blue,#1d5bd8);font-weight:700}
.stdy .bar{height:5px;background:var(--line,#ddd);border-radius:3px;overflow:hidden;margin-bottom:10px} .stdy .bar i{display:block;height:100%;background:var(--blue,#1d5bd8)}
.stdy .empty{text-align:center;padding:16px 0} .stdy .empty .e{font-size:38px}
.tbtn .stb{display:inline-block;min-width:16px;padding:0 4px;margin-left:5px;border-radius:9px;background:var(--red,#e11d48);color:#fff;font-size:10px;line-height:16px;text-align:center}`;
    document.head.appendChild(s);
  }
  let keyH = null;
  function close() { const m = document.querySelector('.stdy'); if (m) m.remove(); if (keyH) document.removeEventListener('keydown', keyH, true); keyH = null; }
  function open(html, onKey) { css(); close(); const m = document.createElement('div'); m.className = 'stdy'; m.innerHTML = `<div class="box" role="dialog" aria-modal="true">${html}</div>`; m.onclick = e => { if (e.target === m) close(); }; document.body.appendChild(m);
    keyH = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; } if (onKey && onKey(e)) { e.preventDefault(); e.stopPropagation(); } }; document.addEventListener('keydown', keyH, true); return m; }

  /* ---------- mistakes ---------- */
  function onAnswer(l, qi, ai) {
    const q = l.quiz[qi]; const id = course() + '|' + l.id + '|' + qi; const d = load();
    if (ai !== q.c) d[id] = { id, course: course(), url: location.origin + location.pathname + '#' + l.id, lesson: l.num + '. ' + l.title, q: q.q, a: q.a, c: q.c, why: q.why, w: q.w || null, streak: 0, due: Date.now(), added: Date.now(), miss: ((d[id] || {}).miss || 0) + 1 };
    else if (d[id]) { d[id].streak = (d[id].streak || 0) + 1; d[id].due = Date.now() + (STEPS[d[id].streak] || DAY); if (d[id].streak >= 3) delete d[id]; }
    store(d);
  }
  function whyOthers(m, picked) {
    if (!m.w) return '';
    const items = m.a.map((a, i) => i === m.c || !m.w[i] ? '' : `<li${i === picked ? ' style="font-weight:700"' : ''}>${L(i)}. ${esc(a)}: ${m.w[i]}</li>`).join('');
    return items ? `<div class="fb"><b>WHY NOT THE OTHERS</b><ul class="wl">${items}</ul></div>` : '';
  }
  function review(all) {
    const d = load(); let queue = (all ? Object.values(d) : due(d)).sort((a, b) => a.due - b.due); const total = queue.length; let done = 0, right = 0;
    if (!total) { const n = Object.keys(d).length;
      open(`<div class="sh">📚 MY MISTAKES<small>${n} saved</small></div><div class="sb"><div class="empty"><div class="e">${n ? '⏳' : '🎯'}</div><p><b>${n ? 'Nothing due right now.' : 'No mistakes saved yet.'}</b></p><p>${n ? `${n} question${n > 1 ? 's are' : ' is'} scheduled for later. Spaced repetition works best when you come back tomorrow.` : 'Every question you miss in any course’s Check Yourself (or the exam simulator) lands here, then comes back after 1 day and 3 days until you get it right 3 times.'}</p></div></div>
        <div class="row">${n ? `<button class="bt gh" data-k="all">REVIEW ALL ${n} NOW</button>` : ''}<button class="bt" data-k="x">CLOSE</button></div>`);
      const a = document.querySelector('.stdy [data-k=all]'); if (a) a.onclick = () => review(true); document.querySelector('.stdy [data-k=x]').onclick = close; return; }
    const show = () => {
      if (!queue.length) { open(`<div class="sh">📚 REVIEW COMPLETE<small>${right} / ${total} correct</small></div><div class="sb"><div class="empty"><div class="e">${right === total ? '🏆' : '💪'}</div><p><b>${right} of ${total} right.</b></p><p>Correct answers move further out (1 day, then 3 days); 3 correct reviews and a question is mastered and removed. Missed ones stay due.</p></div></div><div class="row"><button class="bt" data-k="x">DONE</button></div>`); document.querySelector('.stdy [data-k=x]').onclick = close; refreshBadge(); return; }
      const m = queue[0];
      const el = open(`<div class="sh">📚 MY MISTAKES<small>${done + 1} / ${total}</small></div><div class="sb"><div class="bar"><i style="width:${done / total * 100}%"></i></div>
        <div class="src">${esc(m.course).toUpperCase()} · <a href="${esc(m.url)}">${esc(m.lesson)}</a>${m.miss > 1 ? ` · missed ${m.miss}×` : ''} · streak ${m.streak || 0}/3</div>
        <div class="qq">${esc(m.q)}</div>${m.a.map((a, i) => `<button class="op" data-o="${i}">${L(i)}. ${esc(a)}</button>`).join('')}<div id="stFb"></div></div>
        <div class="row"><span class="sp">Keys: A–D to answer · Enter = next · Esc = close</span><button class="bt" data-k="n" hidden>NEXT →</button></div>`,
        e => { const k = e.key.toUpperCase(); const i = 'ABCDEF'.indexOf(k); if (i >= 0 && i < m.a.length) { const b = document.querySelector(`.stdy .op[data-o="${i}"]`); if (b && !b.disabled) { b.click(); return true; } } if (e.key === 'Enter') { const n = document.querySelector('.stdy [data-k=n]'); if (n && !n.hidden) { n.click(); return true; } } });
      el.querySelectorAll('.op').forEach(b => b.onclick = () => {
        const ai = +b.dataset.o, ok = ai === m.c; el.querySelectorAll('.op').forEach(x => { x.disabled = true; const i = +x.dataset.o; if (i === m.c) x.classList.add('r'); else if (i === ai) x.classList.add('w'); });
        const dd = load(); const cur = dd[m.id] || m;
        if (ok) { right++; cur.streak = (cur.streak || 0) + 1; cur.due = Date.now() + (STEPS[cur.streak] || DAY); if (cur.streak >= 3) delete dd[m.id]; else dd[m.id] = cur; }
        else { cur.streak = 0; cur.due = Date.now(); cur.miss = (cur.miss || 0) + 1; dd[m.id] = cur; }
        store(dd);
        el.querySelector('#stFb').innerHTML = `<div class="fb ${ok ? 'ok' : 'bad'}"><b>${ok ? (cur.streak >= 3 ? '✓ MASTERED, REMOVED FROM YOUR DECK' : `✓ CORRECT · NEXT REVIEW IN ${cur.streak === 1 ? '1 DAY' : '3 DAYS'}`) : `✕ NOT YET · CORRECT: ${L(m.c)}`}</b>${m.why}</div>${whyOthers(m, ai)}`;
        const n = el.querySelector('[data-k=n]'); n.hidden = false; n.focus(); n.onclick = () => { queue.shift(); if (!ok && !all) queue.push(cur); done++; show(); };
      });
    };
    show();
  }

  /* ---------- flashcards ---------- */
  function cards(scope) {
    const LS = window.LESSONS || []; const cur = (location.hash.slice(1).split('/')[0]) || (LS[0] || {}).id;
    const src = scope === 'lesson' ? LS.filter(l => l.id === cur) : LS; const out = [];
    src.forEach(l => {
      (l.cheat || []).forEach(c => out.push({ k: 'WHAT’S THE SYNTAX?', f: esc(c[1]), b: `<code>${esc(c[0])}</code>`, s: `${l.num}. ${l.title}` }));
      (l.steps || []).forEach(st => { if (st.hook) out.push({ k: 'RECALL THE MEMORY HOOK', f: `${esc(st.t)}<div class="sm">${esc(st.sub || '')}</div>`, b: `<div class="big" style="font-size:14px">${st.hook}</div>${st.analogy ? `<div class="sm">💡 ${st.analogy}</div>` : ''}`, s: `${l.num}. ${l.title}` }); });
      if (l.hook) out.push({ k: 'LESSON IN ONE LINE', f: esc(l.title), b: `<div class="big" style="font-size:14px">${l.hook}</div>`, s: `Lesson ${l.num}` });
    });
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
  }
  function flash(scope) {
    scope = scope || 'lesson'; let deck = cards(scope); if (!deck.length) { scope = 'all'; deck = cards('all'); }
    const total = deck.length; let known = 0, seen = 0, flipped = false;
    const show = () => {
      if (!deck.length) { open(`<div class="sh">🃏 FLASHCARDS<small>done</small></div><div class="sb"><div class="empty"><div class="e">🎉</div><p><b>Deck finished: ${total} cards.</b></p><p>${seen - known ? `${seen - known} "again" repeats along the way. ` : ''}Do one deck a day; tiny daily reviews beat long cramming sessions.</p></div></div><div class="row"><button class="bt gh" data-k="r">SHUFFLE AGAIN</button><button class="bt" data-k="x">CLOSE</button></div>`);
        document.querySelector('.stdy [data-k=r]').onclick = () => flash(scope); document.querySelector('.stdy [data-k=x]').onclick = close; return; }
      const c = deck[0]; flipped = false;
      const el = open(`<div class="sh">🃏 FLASHCARDS<small>${total - deck.length + 1} / ${total} · ${known} known</small></div><div class="sb">
        <div class="seg"><button data-s="lesson" class="${scope === 'lesson' ? 'on' : ''}">THIS LESSON</button><button data-s="all" class="${scope === 'all' ? 'on' : ''}">WHOLE COURSE</button></div>
        <div class="bar"><i style="width:${(total - deck.length) / total * 100}%"></i></div>
        <div class="card" id="stCard"><div class="in"><div class="fc front"><div class="k">${c.k}</div><div class="big">${c.f}</div><div class="sm" style="opacity:.6">tap or press Space to flip</div></div>
        <div class="fc back"><div class="k">${esc(c.s)}</div>${c.b}</div></div></div></div>
        <div class="row"><span class="sp">Space = flip · ← again · → knew it</span><button class="bt red" data-k="again" hidden>↺ AGAIN</button><button class="bt grn" data-k="ok" hidden>✓ KNEW IT</button><button class="bt" data-k="flip">FLIP</button></div>`,
        e => { if (e.key === ' ') { doFlip(); return true; } if (flipped && e.key === 'ArrowLeft') { again(); return true; } if (flipped && e.key === 'ArrowRight') { ok(); return true; } });
      const doFlip = () => { flipped = !flipped; el.querySelector('#stCard').classList.toggle('flip', flipped); el.querySelector('[data-k=again]').hidden = el.querySelector('[data-k=ok]').hidden = !flipped; el.querySelector('[data-k=flip]').hidden = flipped; };
      const again = () => { seen++; deck.push(deck.shift()); show(); };
      const ok = () => { seen++; known++; deck.shift(); show(); };
      el.querySelector('#stCard').onclick = doFlip; el.querySelector('[data-k=flip]').onclick = doFlip; el.querySelector('[data-k=again]').onclick = again; el.querySelector('[data-k=ok]').onclick = ok;
      el.querySelectorAll('[data-s]').forEach(b => b.onclick = () => flash(b.dataset.s));
    };
    show();
  }

  /* ---------- header buttons ---------- */
  function refreshBadge() { const b = document.getElementById('stRevBtn'); if (!b) return; const n = due().length; b.innerHTML = `REVIEW${n ? `<span class="stb">${n}</span>` : ''}`; b.title = n ? `${n} mistake(s) due for review` : 'My Mistakes review deck'; }
  function mount() {
    css(); const anchor = document.getElementById('cheatBtn') || document.getElementById('stAnchor'); if (!anchor || document.getElementById('stRevBtn')) return;
    const r = document.createElement('button'); r.className = 'tbtn'; r.id = 'stRevBtn'; r.onclick = () => review(false);
    anchor.parentNode.insertBefore(r, anchor);
    if ((window.LESSONS || []).length) { const f = document.createElement('button'); f.className = 'tbtn'; f.id = 'stFlashBtn'; f.textContent = 'FLASHCARDS'; f.title = 'Flashcards: syntax, memory hooks, analogies'; f.onclick = () => flash('lesson'); anchor.parentNode.insertBefore(f, anchor); }
    refreshBadge(); window.addEventListener('storage', refreshBadge);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
  return { onAnswer, review, flash, due, load, store, whyOthers, refreshBadge };
})();
