/* CI/CD lab: a GitHub Actions workflow simulator + security linter.
   Parses workflow YAML, decides whether an event triggers it, expands matrices, orders jobs by `needs`,
   evaluates `if:` expressions, simulates well-known actions/commands, and reports security findings. */
window.CI = (function () {
  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
  const arr = x => x == null ? [] : Array.isArray(x) ? x : [x];
  const EVENTS = {
    'push:main': { name: 'push', ref: 'refs/heads/main', ref_name: 'main', label: 'push → main' },
    'push:feature': { name: 'push', ref: 'refs/heads/feature/login', ref_name: 'feature/login', label: 'push → feature/login' },
    'pull_request:main': { name: 'pull_request', ref: 'refs/pull/7/merge', ref_name: '7/merge', base_ref: 'main', head_ref: 'feature/login', label: 'pull_request → main', fork: false },
    'pull_request:fork': { name: 'pull_request', ref: 'refs/pull/9/merge', ref_name: '9/merge', base_ref: 'main', head_ref: 'patch-1', label: 'pull_request from fork', fork: true },
    'tag:v1.2.0': { name: 'push', ref: 'refs/tags/v1.2.0', ref_name: 'v1.2.0', tag: true, label: 'push tag v1.2.0' },
    'workflow_dispatch': { name: 'workflow_dispatch', ref: 'refs/heads/main', ref_name: 'main', inputs: { version: '7', environment: 'production' }, label: 'workflow_dispatch (main)' },
    'schedule': { name: 'schedule', ref: 'refs/heads/main', ref_name: 'main', label: 'schedule (cron)' }
  };
  const glob = (pat, s) => new RegExp('^' + String(pat).replace(/[.+^$()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*') + '$').test(s);

  /* ---------- expressions ${{ }} ---------- */
  function tokenize(src) {
    const t = []; let i = 0; const s = String(src);
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c === "'") { let j = i + 1, v = ''; while (j < s.length) { if (s[j] === "'" && s[j + 1] === "'") { v += "'"; j += 2; continue; } if (s[j] === "'") break; v += s[j++]; } t.push({ k: 'str', v }); i = j + 1; continue; }
      const two = s.slice(i, i + 2);
      if (['==', '!=', '&&', '||', '<=', '>='].includes(two)) { t.push({ k: 'op', v: two }); i += 2; continue; }
      if ('()!,<>'.includes(c)) { t.push({ k: 'op', v: c }); i++; continue; }
      const m = s.slice(i).match(/^[A-Za-z_][\w.\-*]*/); if (m) { t.push({ k: 'id', v: m[0] }); i += m[0].length; continue; }
      const n = s.slice(i).match(/^\d+(\.\d+)?/); if (n) { t.push({ k: 'num', v: Number(n[0]) }); i += n[0].length; continue; }
      throw new Error(`Unrecognized expression syntax at "${s.slice(i, i + 10)}"`);
    }
    return t;
  }
  function evalExpr(src, ctx) {
    const t = tokenize(src); let p = 0;
    const peek = () => t[p], eat = v => { if (!t[p] || t[p].v !== v) throw new Error(`Expected "${v}" in expression: ${src}`); p++; };
    const truthy = v => !(v === false || v === null || v === undefined || v === '' || v === 0);
    function primary() {
      const x = t[p++]; if (!x) throw new Error('Unexpected end of expression: ' + src);
      if (x.k === 'str' || x.k === 'num') return x.v;
      if (x.v === '(') { const v = or(); eat(')'); return v; }
      if (x.v === '!') return !truthy(primary());
      if (x.k === 'id') {
        if (x.v === 'true') return true; if (x.v === 'false') return false; if (x.v === 'null') return null;
        if (peek() && peek().v === '(') { p++; const args = []; if (!(peek() && peek().v === ')')) { args.push(or()); while (peek() && peek().v === ',') { p++; args.push(or()); } } eat(')'); return fn(x.v, args); }
        return ctx.lookup(x.v);
      }
      throw new Error(`Unexpected "${x.v}" in expression: ${src}`);
    }
    function fn(name, a) {
      const f = name.toLowerCase(), S = v => v == null ? '' : String(v);
      if (f === 'success') return ctx.status() === 'success'; if (f === 'failure') return ctx.status() === 'failure';
      if (f === 'always') return true; if (f === 'cancelled') return false;
      if (f === 'contains') return Array.isArray(a[0]) ? a[0].map(S).includes(S(a[1])) : S(a[0]).toLowerCase().includes(S(a[1]).toLowerCase());
      if (f === 'startswith') return S(a[0]).toLowerCase().startsWith(S(a[1]).toLowerCase());
      if (f === 'endswith') return S(a[0]).toLowerCase().endsWith(S(a[1]).toLowerCase());
      if (f === 'format') return S(a[0]).replace(/\{(\d+)\}/g, (m, i) => S(a[+i + 1]));
      if (f === 'tojson') return JSON.stringify(a[0]); if (f === 'fromjson') return JSON.parse(S(a[0]));
      if (f === 'hashfiles') return 'a1b2c3d4';
      throw new Error(`Unrecognized function: '${name}'`);
    }
    function cmp() { let l = primary(); while (peek() && ['==', '!=', '<', '>', '<=', '>='].includes(peek().v)) { const o = t[p++].v, r = primary();
      const L = typeof l === 'string' ? l.toLowerCase() : l, R = typeof r === 'string' ? r.toLowerCase() : r;
      l = o === '==' ? L == R : o === '!=' ? L != R : o === '<' ? L < R : o === '>' ? L > R : o === '<=' ? L <= R : L >= R; } return l; }
    function and() { let l = cmp(); while (peek() && peek().v === '&&') { p++; const r = cmp(); l = truthy(l) ? r : l; } return l; }
    function or() { let l = and(); while (peek() && peek().v === '||') { p++; const r = and(); l = truthy(l) ? l : r; } return l; }
    const v = or(); if (p < t.length) throw new Error(`Unexpected "${t[p].v}" in expression: ${src}`); return v;
  }
  const strip = s => { const m = String(s).trim().match(/^\$\{\{([\s\S]*)\}\}$/); return m ? m[1] : String(s); };
  const interp = (s, ctx) => String(s).replace(/\$\{\{([\s\S]*?)\}\}/g, (m, e) => { const v = evalExpr(e, ctx); return v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v); });

  /* ---------- triggers ---------- */
  function triggers(on, ev) {
    let map = {};
    if (typeof on === 'string') map[on] = null; else if (Array.isArray(on)) on.forEach(x => map[x] = null); else if (isObj(on)) map = on; else return [false, 'no "on:" triggers defined'];
    const name = ev.name; if (!(name in map)) return [false, `workflow does not listen to "${name}" events (on: ${Object.keys(map).join(', ')})`];
    const f = map[name] || {};
    if (name === 'push') {
      if (ev.tag) { if (f.tags) return arr(f.tags).some(p => glob(p, ev.ref_name)) ? [true, 'tag matches on.push.tags'] : [false, `tag ${ev.ref_name} doesn't match on.push.tags`];
        if (f.branches || f['branches-ignore']) return [false, 'push filters only list branches, so tag pushes are ignored']; return [true, 'push (no filters)']; }
      if (f.tags && !f.branches) return [false, 'only tags are listed under on.push, branch pushes are ignored'];
      if (f.branches) return arr(f.branches).some(p => glob(p, ev.ref_name)) ? [true, `branch ${ev.ref_name} matches on.push.branches`] : [false, `branch ${ev.ref_name} is not in on.push.branches [${arr(f.branches).join(', ')}]`];
      if (f['branches-ignore'] && arr(f['branches-ignore']).some(p => glob(p, ev.ref_name))) return [false, `branch ${ev.ref_name} is in branches-ignore`];
      return [true, 'push'];
    }
    if (name === 'pull_request' || name === 'pull_request_target') {
      if (f.branches && !arr(f.branches).some(p => glob(p, ev.base_ref))) return [false, `PR base ${ev.base_ref} not in on.${name}.branches`];
      return [true, `${name} into ${ev.base_ref}`];
    }
    return [true, name];
  }

  /* ---------- security lint ---------- */
  function lint(text, wf) {
    const F = []; const add = (sev, msg, fix) => F.push({ sev, msg, fix });
    if (/AKIA[0-9A-Z]{16}/.test(text)) add('CRITICAL', 'Hard-coded AWS access key (AKIA…) in the workflow file', 'Delete it, rotate the key, and use OIDC (aws-actions/configure-aws-credentials with role-to-assume).');
    if (/aws_secret_access_key|AWS_SECRET_ACCESS_KEY:\s*['"]?[A-Za-z0-9/+]{30,}/.test(text) && !/secrets\.AWS_SECRET_ACCESS_KEY/.test(text)) add('CRITICAL', 'Hard-coded AWS secret key', 'Never commit secrets; use OIDC or GitHub secrets.');
    if (/hooks\.slack\.com\/services\/|ghp_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9-]{16,}|xox[bp]-/.test(text)) add('CRITICAL', 'Hard-coded token or webhook URL in the workflow file', 'Store it as a GitHub secret (Settings → Secrets) and reference ${{ secrets.NAME }}.');
    const on = wf.on; const onKeys = typeof on === 'string' ? [on] : Array.isArray(on) ? on : isObj(on) ? Object.keys(on) : [];
    const perms = [wf.permissions].concat(Object.values(wf.jobs || {}).map(j => j && j.permissions));
    if (perms.every(p => p == null)) add('MEDIUM', 'No `permissions:` set; GITHUB_TOKEN gets the repository default (often read/write)', 'Add `permissions: contents: read` at the top and grant more per job only where needed.');
    if (perms.some(p => p === 'write-all')) add('HIGH', '`permissions: write-all` gives every job full write access', 'List only the scopes you need, e.g. contents: read, id-token: write.');
    const uses = []; Object.entries(wf.jobs || {}).forEach(([jid, j]) => arr(j && j.steps).forEach(s => s && s.uses && uses.push([jid, s])));
    uses.forEach(([jid, s]) => { const u = String(s.uses); if (/^\.\/|^docker:\/\//.test(u)) return; const ref = u.split('@')[1];
      if (!ref) add('HIGH', `Action ${u} has no version`, 'Pin to a release tag, or better a full commit SHA.');
      else if (/^(main|master|dev|latest|HEAD)$/i.test(ref)) add('HIGH', `Action ${u} is pinned to a moving branch`, 'Pin to a release tag or a full 40-char commit SHA.'); });
    const injRe = /\$\{\{\s*github\.(event\.(issue|pull_request|comment|review|head_commit|commits|discussion)[\w.\[\]*]*\.(title|body|message|name|email|label|ref)|head_ref)\s*\}\}/;
    Object.entries(wf.jobs || {}).forEach(([jid, j]) => arr(j && j.steps).forEach(s => { if (s && s.run && injRe.test(String(s.run))) add('HIGH', `Script injection risk in job "${jid}": untrusted github.event/head_ref data inside run:`, 'Pass it through env: (e.g. env: TITLE: ${{ github.event.issue.title }}) and use "$TITLE" in the script.');
      if (s && s.run && /echo[^\n]*\$\{\{\s*secrets\./.test(String(s.run))) add('MEDIUM', `Step in "${jid}" echoes a secret`, 'Never print secrets; GitHub masks known secrets but derived values leak.'); }));
    if (onKeys.includes('pull_request_target') && /github\.event\.pull_request\.head\.(sha|ref)/.test(text)) add('CRITICAL', 'pull_request_target + checkout of the PR head runs untrusted fork code with secrets', 'Use pull_request for untrusted code, or never check out the PR head in pull_request_target.');
    if (/secrets\.AWS_ACCESS_KEY_ID/.test(text)) add('MEDIUM', 'Long-lived AWS access keys stored as GitHub secrets', 'Switch to OIDC: permissions id-token: write + role-to-assume.');
    return F;
  }

  /* ---------- simulate steps ---------- */
  function simStep(step, job, st, ctx, opts) {
    const log = []; const u = step.uses ? String(step.uses) : ''; const w = step.with || {};
    const fail = msg => { log.push('##[error]' + msg); return { status: 'failure', log }; };
    if (u) {
      const base = u.split('@')[0];
      if (base === 'actions/checkout') { st.checkedOut = true; log.push(`Syncing repository: rmctech-ai/app @ ${ctx.lookup('github.sha').slice(0, 7)}`); }
      else if (base === 'actions/setup-python') { const v = interp(w['python-version'] || '3.x', ctx); st.tools.python = v; log.push(`Successfully set up CPython (${v})`); if (w.cache) log.push(`Cache restored for ${w.cache}`); }
      else if (base === 'actions/setup-node') { const v = interp(w['node-version'] || 'lts', ctx); st.tools.node = v; log.push(`Node ${v} installed`); }
      else if (base === 'actions/cache') log.push(`Cache key ${interp(w.key || 'cache', ctx)}: restored`);
      else if (base === 'actions/upload-artifact') { st.artifacts[interp(w.name || 'artifact', ctx)] = 1; log.push(`Uploaded artifact "${interp(w.name || 'artifact', ctx)}"`); }
      else if (base === 'actions/download-artifact') { const n = interp(w.name || 'artifact', ctx); if (!opts.artifacts[n]) return fail(`Unable to find any artifacts named "${n}" (upload it in a job listed under needs:)`); log.push(`Downloaded "${n}"`); }
      else if (base === 'aws-actions/configure-aws-credentials') {
        const region = interp(w['aws-region'] || '', ctx); if (!region) return fail('Input required and not supplied: aws-region');
        if (w['role-to-assume']) {
          if (!job.perms['id-token'] || job.perms['id-token'] !== 'write') return fail('Credentials could not be loaded, please check your action inputs: Could not load credentials from any providers (the job needs permissions: id-token: write for OIDC)');
          const role = interp(w['role-to-assume'], ctx); if (!/^arn:aws:iam::\d{12}:role\//.test(role)) return fail(`Invalid role ARN "${role}"`);
          st.aws = { mode: 'oidc', role, region }; log.push(`Assuming role with OIDC: ${role}`); log.push(`Authenticated as assumedRoleId AROA…:GitHubActions (region ${region})`);
        } else if (w['aws-access-key-id']) { const k = interp(w['aws-access-key-id'], ctx); if (!k) return fail('aws-access-key-id resolved to an empty string (secret not set?)'); st.aws = { mode: 'keys', region }; log.push('Configured long-lived access keys (works, but prefer OIDC)'); }
        else return fail('Credentials could not be loaded: provide role-to-assume (OIDC) or access keys');
      }
      else if (base === 'aws-actions/amazon-ecr-login') { if (!st.aws) return fail('Unable to locate credentials (configure-aws-credentials must run first in this job)'); st.ecr = true; st.outputs[step.id || 'login-ecr'] = { registry: '111122223333.dkr.ecr.ap-southeast-1.amazonaws.com' }; log.push('Logged in to 111122223333.dkr.ecr.ap-southeast-1.amazonaws.com'); }
      else if (base === 'docker/build-push-action') { const tags = interp(w.tags || '', ctx); log.push(`Building image ${tags || '(untagged)'}`); if (String(w.push) === 'true') { if (!st.ecr) return fail('denied: requires authentication (log in to the registry first)'); st.pushed = tags; log.push(`Pushed ${tags}`); } }
      else if (base === 'github/codeql-action/init' || base === 'github/codeql-action/analyze') log.push('CodeQL: 0 alerts');
      else if (base === 'aws-actions/aws-cloudformation-github-deploy') { if (!st.aws) return fail('Unable to locate credentials'); st.deployed.push(interp(w.name || 'stack', ctx)); log.push(`Stack ${interp(w.name || 'stack', ctx)} UPDATE_COMPLETE`); }
      else if (/^\.\//.test(u)) log.push(`Running local action ${u}`);
      else log.push(`Running ${u}`);
      return { status: 'success', log };
    }
    if (step.run != null) {
      let script; try { script = interp(step.run, ctx); } catch (e) { return fail(e.message); }
      const lines = script.split('\n').map(s => s.trim()).filter(Boolean);
      for (const line of lines) {
        log.push('$ ' + line);
        const needsCode = /^(pytest|python|pip|npm|cfn-lint|checkov|sam|terraform|docker|make)\b/.test(line);
        if (needsCode && !st.checkedOut) return fail(`${line.split(' ')[0]}: no such file or directory (did you forget actions/checkout?)`);
        if (/^exit\s+[1-9]/.test(line)) return fail(`Process completed with exit code ${line.split(/\s+/)[1]}.`);
        if (/^pytest/.test(line)) { if (opts.failTests) { log.push('FAILED tests/test_invoice.py::test_total - assert 110 == 120'); log.push('1 failed, 11 passed in 0.84s'); return fail('Process completed with exit code 1.'); } log.push('12 passed in 0.81s'); }
        else if (/^pip install/.test(line)) log.push('Successfully installed ' + line.replace(/^pip install\s+/, '').replace(/-r\s+\S+/, 'requirements'));
        else if (/^npm (ci|install)/.test(line)) log.push('added 312 packages in 6s');
        else if (/^npm test/.test(line)) log.push('Tests: 18 passed, 18 total');
        else if (/^ruff|^flake8|^pylint|^npm run lint/.test(line)) log.push('All checks passed!');
        else if (/^cfn-lint/.test(line)) { if (opts.lintFails) { log.push('E3002 Invalid Property Resources/Fn/Properties/Memory'); return fail('Process completed with exit code 2.'); } log.push('(no findings)'); }
        else if (/^checkov/.test(line)) { log.push('Passed checks: 14, Failed checks: 0, Skipped checks: 0'); st.scanned = true; }
        else if (/^(aws |sam deploy|cdk deploy|terraform apply)/.test(line)) {
          if (!st.aws) return fail('Unable to locate credentials. You can configure credentials by running "aws configure". (add aws-actions/configure-aws-credentials before this step)');
          if (/^sam deploy|cloudformation deploy/.test(line)) { const m = line.match(/--stack-name\s+(\S+)/); st.deployed.push(m ? m[1] : 'stack'); log.push(`Successfully created/updated stack - ${m ? m[1] : 'stack'}`); }
          else if (/^aws (ecs|lambda) update/.test(line)) { st.deployed.push(line); log.push('Deployment started'); }
          else log.push('(ok)');
        }
        else if (/^docker build/.test(line)) log.push('Successfully built 3f2a1c9d');
        else if (/^docker push/.test(line)) { if (!st.ecr) return fail('denied: Your authorization token has expired. Reauthenticate and try again.'); st.pushed = line.split(/\s+/)[2]; log.push('pushed ' + st.pushed); }
        else if (/^echo /.test(line)) { const out = line.replace(/^echo\s+/, '').replace(/^["']|["']$/g, ''); const m = out.match(/^(\w+)=(.*?)\s*>>\s*"?\$GITHUB_OUTPUT"?$/); if (m) { (st.outputs[step.id || '_'] = st.outputs[step.id || '_'] || {})[m[1]] = m[2]; log.push(`(output ${m[1]}=${m[2]})`); } else log.push(out); }
      }
      return { status: 'success', log };
    }
    return fail('Every step must have `uses:` or `run:`');
  }

  /* ---------- run workflow ---------- */
  function run(text, evKey, opts) {
    opts = opts || {}; const ev = EVENTS[evKey] || EVENTS['push:main'];
    const R = { ok: false, event: ev, jobs: [], findings: [], triggered: false };
    let wf; try { wf = YAML.parse(text); } catch (e) { R.error = e.message; return R; }
    if (!isObj(wf)) { R.error = 'Invalid workflow file: the root must be a mapping'; return R; }
    if (wf.on == null && wf.true != null) wf.on = wf.true;
    R.wf = wf; R.findings = lint(text, wf);
    if (wf.on == null) { R.error = 'Invalid workflow file: missing required key "on" (what triggers it?)'; return R; }
    if (!isObj(wf.jobs) || !Object.keys(wf.jobs).length) { R.error = 'Invalid workflow file: missing required key "jobs"'; return R; }
    for (const [id, j] of Object.entries(wf.jobs)) {
      if (!isObj(j)) { R.error = `Invalid workflow file: job "${id}" must be a mapping`; return R; }
      if (!j['runs-on'] && !j.uses) { R.error = `Invalid workflow file: job "${id}" is missing "runs-on" (e.g. runs-on: ubuntu-latest)`; return R; }
      if (!j.uses && !Array.isArray(j.steps)) { R.error = `Invalid workflow file: job "${id}" needs a list of steps`; return R; }
      for (const n of arr(j.needs)) if (!wf.jobs[n]) { R.error = `Invalid workflow file: job "${id}" depends on unknown job "${n}"`; return R; }
    }
    const order = [], seen = {}; const visit = (id, path) => { if (seen[id] === 2) return; if (seen[id] === 1) throw new Error(`Invalid workflow file: job dependency cycle ${path.concat(id).join(' → ')}`); seen[id] = 1; arr(wf.jobs[id].needs).forEach(n => visit(n, path.concat(id))); seen[id] = 2; order.push(id); };
    try { Object.keys(wf.jobs).forEach(id => visit(id, [])); } catch (e) { R.error = e.message; return R; }
    const [trig, reason] = triggers(wf.on, ev); R.triggered = trig; R.reason = reason;
    if (!trig) { R.ok = true; return R; }
    const secrets = Object.assign({ GITHUB_TOKEN: '***' }, opts.secrets || { AWS_ACCOUNT_ID: '111122223333' });
    const vars = Object.assign({ AWS_REGION: 'ap-southeast-1' }, opts.vars || {});
    const results = {}; const artifacts = {};
    const topPerms = isObj(wf.permissions) ? wf.permissions : wf.permissions === 'write-all' ? { 'id-token': 'write', contents: 'write' } : {};
    for (const id of order) {
      const j = wf.jobs[id];
      const needsCtx = {}; arr(j.needs).forEach(n => { const r = results[n]; needsCtx[n] = { result: r ? r.status : 'skipped', outputs: r ? r.outputs : {} }; });
      const depsOk = arr(j.needs).every(n => results[n] && results[n].status === 'success');
      const baseCtx = (matrix, jobStatus) => ({
        lookup(path) {
          const g = { event_name: ev.name, ref: ev.ref, ref_name: ev.ref_name, sha: '9f2c1ab7e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9', repository: 'rmctech-ai/app', actor: 'rmctech-ai', base_ref: ev.base_ref || '', head_ref: ev.head_ref || '', run_number: 42, workflow: wf.name || 'workflow',
            event: { inputs: ev.inputs || {}, pull_request: ev.name.startsWith('pull_request') ? { number: 7, title: 'Add login', head: { ref: ev.head_ref, sha: 'abc123' }, base: { ref: ev.base_ref }, head_repo_fork: !!ev.fork } : undefined, head_commit: { message: 'feat: invoices' } } };
          const root = { github: g, matrix: matrix || {}, needs: needsCtx, secrets, vars, inputs: ev.inputs || {}, env: Object.assign({}, wf.env || {}, j.env || {}), runner: { os: 'Linux' }, steps: st ? Object.fromEntries(Object.entries(st.outputs).map(([k, v]) => [k, { outputs: v, outcome: 'success' }])) : {} };
          let v = root; for (const part of path.split('.')) { if (v == null) return null; v = v[part]; } return v == null ? null : v;
        }, status: () => jobStatus });
      let st = null;
      const combos = [];
      const mx = j.strategy && j.strategy.matrix;
      if (isObj(mx)) { const keys = Object.keys(mx).filter(k => k !== 'include' && k !== 'exclude'); let cs = [{}]; keys.forEach(k => { const vals = arr(mx[k]); cs = [].concat(...cs.map(c => vals.map(v => Object.assign({}, c, { [k]: v })))); });
        arr(mx.exclude).forEach(ex => cs = cs.filter(c => !Object.entries(ex).every(([k, v]) => String(c[k]) === String(v)))); arr(mx.include).forEach(inc => cs.push(inc)); combos.push(...cs); }
      else combos.push(null);
      let jobStatus = 'success'; const jobOutputs = {};
      for (const m of combos) {
        const name = (j.name ? String(j.name) : id) + (m ? ` (${Object.values(m).join(', ')})` : '');
        const perms = Object.assign({}, topPerms, isObj(j.permissions) ? j.permissions : j.permissions === 'write-all' ? { 'id-token': 'write', contents: 'write' } : {});
        const J = { id, name, status: 'success', steps: [], needs: arr(j.needs), matrix: m, env: j.environment ? (isObj(j.environment) ? j.environment.name : j.environment) : null, perms };
        st = { checkedOut: false, tools: {}, aws: null, ecr: false, outputs: {}, deployed: [], artifacts: {}, pushed: null };
        let ctx = baseCtx(m, depsOk ? 'success' : 'failure');
        let cond = j.if != null ? strip(j.if) : 'success()';
        let runIt; try { runIt = !!evalExpr(cond, ctx); if (!depsOk && !/always\(\)|failure\(\)/.test(cond)) runIt = false; } catch (e) { R.error = `Job "${id}" if: ${e.message}`; return R; }
        if (!runIt) { J.status = 'skipped'; J.reason = !depsOk ? 'a job it needs did not succeed' : `if: ${cond} was false`; R.jobs.push(J); jobStatus = jobStatus === 'success' ? 'skipped' : jobStatus; continue; }
        if (J.env) J.envNote = `Environment "${J.env}": protection rules apply (required reviewers must approve before this job runs)`;
        let failed = false;
        for (const [i, s] of arr(j.steps).entries()) {
          if (!isObj(s)) { J.steps.push({ name: `step ${i + 1}`, status: 'failure', log: ['##[error]each step must be a mapping'] }); failed = true; break; }
          const sname = s.name ? (() => { try { return interp(s.name, ctx); } catch (e) { return s.name; } })() : (s.uses ? 'Run ' + s.uses : 'Run ' + String(s.run || '').split('\n')[0].slice(0, 50));
          ctx = baseCtx(m, failed ? 'failure' : 'success');
          if (s.if != null) { let ok; try { ok = !!evalExpr(strip(s.if), ctx); } catch (e) { J.steps.push({ name: sname, status: 'failure', log: ['##[error]' + e.message] }); failed = true; break; } if (!ok) { J.steps.push({ name: sname, status: 'skipped', log: [`if: ${strip(s.if)} was false`] }); continue; } }
          else if (failed) { J.steps.push({ name: sname, status: 'skipped', log: ['skipped: a previous step failed'] }); continue; }
          const res = simStep(s, J, st, ctx, Object.assign({}, opts, { artifacts }));
          J.steps.push(Object.assign({ name: sname, uses: s.uses, run: s.run, id: s.id }, res));
          if (res.status === 'failure' && !s['continue-on-error']) failed = true;
        }
        if (failed) { J.status = 'failure'; jobStatus = 'failure'; }
        Object.assign(artifacts, st.artifacts);
        J.aws = st.aws; J.deployed = st.deployed; J.pushed = st.pushed;
        if (isObj(j.outputs)) for (const [k, v] of Object.entries(j.outputs)) { try { jobOutputs[k] = interp(v, baseCtx(m, 'success')); } catch (e) { jobOutputs[k] = ''; } }
        R.jobs.push(J);
      }
      results[id] = { status: jobStatus, outputs: jobOutputs };
    }
    R.ok = true; R.result = R.jobs.some(j => j.status === 'failure') ? 'failure' : 'success';
    return R;
  }
  return { run, EVENTS, evalExpr, lint };
})();

window.LAB = (function () {
  const DEFAULT = `name: CI
on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -r requirements.txt
      - run: pytest
`;
  const SEV = { CRITICAL: 'bad', HIGH: 'bad', MEDIUM: 'skip', LOW: 'skip' };
  function render(body, l, api) {
    const ch = l.challenge || {}; const esc = api.esc;
    const saved = api.drafts[l.id]; const text = saved != null ? saved : (ch.starter != null ? ch.starter : DEFAULT);
    const evOpts = Object.entries(CI.EVENTS).map(([k, e]) => `<option value="${k}" ${k === (ch.event || 'push:main') ? 'selected' : ''}>${esc(e.label)}</option>`).join('');
    body.innerHTML = `<div class="lab cfn"><div class="col"><div class="lh">.github/workflows/ci.yml <span>YAML · edit me</span></div><textarea id="labText" spellcheck="false">${esc(text)}</textarea></div>
      <div class="col"><div class="lh">SIMULATE A RUN</div>
        <label>Event<select id="ciEv">${evOpts}</select></label>
        <div class="btnrow"><button class="btn" id="runBtn">▶ RUN WORKFLOW</button><button class="btn ghost" id="resetBtn">RESET</button></div>
        <div id="labOut" class="labout"><span class="cm">Pick an event (push to main, a pull request, a tag…) and press RUN. The simulator checks triggers, runs jobs in "needs" order, evaluates if: conditions, fakes well-known actions (checkout, setup-python, configure-aws-credentials with OIDC, ECR, docker) and commands (pytest, cfn-lint, checkov, sam deploy, aws …), and lists security findings.</span></div></div></div>` + api.taskBar(l);
    const ta = body.querySelector('#labText');
    ta.oninput = () => api.drafts[l.id] = ta.value;
    ta.onkeydown = e => { if (e.key === 'Tab') { e.preventDefault(); const p = ta.selectionStart; ta.value = ta.value.slice(0, p) + '  ' + ta.value.slice(ta.selectionEnd); ta.selectionStart = ta.selectionEnd = p + 2; }
      else if (e.key === 'Enter') { const p = ta.selectionStart; const line = ta.value.slice(0, p).split('\n').pop(); let ind = (line.match(/^\s*/) || [''])[0]; if (/:\s*$/.test(line)) ind += '  '; e.preventDefault(); ta.value = ta.value.slice(0, p) + '\n' + ind + ta.value.slice(ta.selectionEnd); ta.selectionStart = ta.selectionEnd = p + 1 + ind.length; api.drafts[l.id] = ta.value; }
      e.stopPropagation(); };
    body.querySelectorAll('select').forEach(i => i.onkeydown = e => e.stopPropagation());
    const out = body.querySelector('#labOut');
    body.querySelector('#runBtn').onclick = () => {
      const evKey = body.querySelector('#ciEv').value;
      const r = CI.run(ta.value, evKey, ch);
      let h = '';
      if (r.error) h = `<div class="dec err">✕ ${esc(r.error)}</div><div class="why">GitHub would reject this workflow file before running anything.</div>`;
      else if (!r.triggered) h = `<div class="dec imp">○ NOT TRIGGERED</div><div class="why">${esc(r.reason)}</div>`;
      else {
        h = `<div class="dec ${r.result === 'success' ? 'allow' : 'deny'}">${r.result === 'success' ? '✓ RUN SUCCEEDED' : '✕ RUN FAILED'}</div><div class="why">Triggered by <b>${esc(r.event.label)}</b>: ${esc(r.reason)}</div>`;
        h += r.jobs.map(j => `<div class="lh" style="margin:8px 0 2px">${j.status === 'success' ? '✓' : j.status === 'failure' ? '✕' : '○'} JOB ${esc(j.name)} <span>${j.needs.length ? 'needs: ' + esc(j.needs.join(', ')) : ''}${j.env ? ' · env: ' + esc(j.env) : ''}</span></div>` +
          (j.status === 'skipped' ? `<div class="tr skip">skipped: ${esc(j.reason)}</div>` : (j.envNote ? `<div class="tr skip">⏸ ${esc(j.envNote)}</div>` : '') + j.steps.map(s => `<details class="stp"><summary class="tr ${s.status === 'success' ? 'ok' : s.status === 'failure' ? 'bad' : 'skip'}">${s.status === 'success' ? '✓' : s.status === 'failure' ? '✕' : '○'} ${esc(s.name)}</summary><pre class="slog">${esc(s.log.join('\n'))}</pre></details>`).join(''))).join('');
      }
      if (r.findings && r.findings.length) h += `<div class="lh" style="margin:10px 0 2px">SECURITY FINDINGS (${r.findings.length})</div>` + r.findings.map(f => `<div class="tr ${SEV[f.sev]}"><b>${f.sev}</b> ${esc(f.msg)}<br><i>Fix: ${esc(f.fix)}</i></div>`).join('');
      else if (!r.error) h += `<div class="lh" style="margin:10px 0 2px">SECURITY FINDINGS</div><div class="tr ok">✓ none: nice and tidy</div>`;
      let checkMsg = '';
      if (ch.check) { let res; try { res = ch.check(r, (k, o) => CI.run(ta.value, k, Object.assign({}, ch, o))); } catch (e) { res = 'check error: ' + e.message; }
        if (res === true) { api.solve(l.id); checkMsg = `<div class="dec allow" style="margin-top:6px">✓ Challenge requirements met</div>`; }
        else checkMsg = `<div class="dec imp" style="margin-top:6px;font-size:12px">Challenge: ${esc(typeof res === 'string' ? res : 'not met yet')}</div>`; }
      out.innerHTML = h + checkMsg;
    };
    body.querySelector('#resetBtn').onclick = () => { api.drafts[l.id] = null; render(body, l, api); };
  }
  return { render };
})();
