window.LESSONS = window.LESSONS || [];
window.Y = (...l) => l.join('\n') + '\n';
window.JOBS = (r, id) => (r.jobs || []).filter(j => j.id === id);
window.RAN = (r, id) => JOBS(r, id).length > 0 && JOBS(r, id).every(j => j.status === 'success');
window.FIND = (r, re) => (r.findings || []).filter(f => re.test(f.sev + ' ' + f.msg));
window.PIPE = { type: 'graph', nodes: [
  { id: 'dev', x: 90, y: 240, icon: 'laptop', label: 'git push', sub: 'commit / PR' },
  { id: 'gh', x: 290, y: 240, icon: 'code', label: 'GitHub', sub: 'repo + workflow file' },
  { id: 'ci', x: 500, y: 110, icon: 'gear', label: 'CI: build & test', sub: 'every push / PR', at: 1 },
  { id: 'sec', x: 500, y: 380, icon: 'shield', label: 'Scan', sub: 'lint · SAST · IaC', at: 2 },
  { id: 'cd', x: 720, y: 240, icon: 'pipe', label: 'CD: deploy', sub: 'dev → prod', at: 1 },
  { id: 'aws', x: 900, y: 240, icon: 'cloud', label: 'AWS', sub: 'Lambda · ECS · CFN', at: 3 }
], edges: [{ a: 'dev', b: 'gh' }, { a: 'gh', b: 'ci' }, { a: 'gh', b: 'sec' }, { a: 'ci', b: 'cd' }, { a: 'sec', b: 'cd' }, { a: 'cd', b: 'aws' }] };

/* ============ 01 WHAT IS CI/CD ============ */
LESSONS.push({
  id: 'what-is-cicd', num: 1, cat: 'core', layer: 1, mins: 11,
  title: 'What is CI/CD?', short: 'Automate build, test and deploy',
  overview: `<p><b>Continuous Integration (CI)</b>: every push is automatically built and tested, so problems surface in minutes, not at release time. <b>Continuous Delivery</b>: every passing change is ready to release with one click. <b>Continuous Deployment</b>: every passing change goes to production automatically. A <b>pipeline</b> is the automated path from commit to running software.</p>`,
  hook: `<b>"Commit → Build → Test → Scan → Deploy → Monitor."</b>`,
  why: `Cloud engineers own pipelines: they ship IaC, Lambdas and containers. Pipelines are also a major security boundary (they hold deploy credentials), which makes them central to DevSecOps and Cloud Security roles.`,
  scene: PIPE,
  steps: [
    { t: 'The problem CI solves', sub: '"Works on my machine"',
      body: `<p>Without CI, people merge big batches of changes, test manually, and discover conflicts and bugs late. With CI, a robot runs the same build and tests on <b>every</b> push in a clean environment, and a red ✕ appears on the commit within minutes.</p>`,
      analogy: `A <b>spell-checker that runs as you type</b>, instead of a proofreader at the end of the book.`,
      hook: `<b>Small changes, tested every time.</b>`,
      words: ['continuous integration', 'clean environment', 'fast feedback', 'merge conflicts'],
      flow: { from: 'dev', to: 'gh', label: 'PUSH', detail: ['feat: add invoices endpoint'], color: 'blue' }, focus: ['dev', 'gh'],
      cmds: [{ c: 'git push origin feature/invoices', o: 'To github.com:rmctech-ai/app.git\n * [new branch]      feature/invoices -> feature/invoices', k: 'git' }] },
    { t: 'Delivery vs deployment', sub: 'One click vs zero clicks',
      body: `<p><b>Continuous Delivery</b>: the pipeline produces a release-ready artifact and deploys to staging; a human approves production. <b>Continuous Deployment</b>: no human gate, every green build reaches production (needs strong tests, monitoring and fast rollback).</p>`,
      analogy: `Delivery = the meal is <b>plated and waiting at the pass</b>; deployment = the waiter <b>carries it out automatically</b>.`,
      hook: `<b>Delivery: ready to ship. Deployment: shipped.</b>`,
      words: ['continuous delivery', 'continuous deployment', 'approval gate', 'release'],
      flow: { from: 'ci', to: 'cd', label: 'PROMOTE', detail: ['staging ✓ → prod (approve)'], color: 'purple' }, focus: ['ci', 'cd'],
      cmds: [{ c: 'gh run list --limit 3', o: 'STATUS  TITLE                  WORKFLOW  BRANCH  EVENT  ELAPSED\n✓       feat: invoices          CI/CD     main    push   2m14s\n✓       fix: totals rounding    CI/CD     main    push   2m02s\nX       wip: refactor           CI/CD     wip     push   41s', k: 'gh' }] },
    { t: 'Pipeline stages', sub: 'Build → test → scan → deploy',
      body: `<p>Typical stages: <b>build</b> (install deps, compile, package), <b>test</b> (unit, then integration), <b>scan</b> (lint, SAST, dependency CVEs, IaC checks), <b>deploy</b> (dev → staging → prod), <b>verify</b> (smoke tests, alarms). Fail fast: cheap checks first.</p>`,
      analogy: `An <b>assembly line with quality checks</b> at each station; a faulty part never reaches the customer.`,
      hook: `<b>Cheap checks first, expensive ones later.</b>`,
      words: ['pipeline', 'stage', 'build', 'test', 'scan', 'fail fast', 'smoke test'],
      flow: { from: 'gh', to: 'sec', label: 'SCAN', detail: ['ruff · pytest · checkov'], color: 'amber' }, focus: ['gh', 'ci', 'sec'],
      cmds: [{ c: 'gh run view --log | head -5', o: 'test  Set up job      Runner: ubuntu-latest\ntest  Run pytest      12 passed in 0.81s\nscan  Run checkov     Passed checks: 14, Failed checks: 0\ndeploy Run sam deploy  Successfully created/updated stack - raul-app', k: 'gh' }] },
    { t: 'Tools', sub: 'GitHub Actions and friends',
      body: `<p><b>GitHub Actions</b> (used in this course's lab), GitLab CI, Jenkins, CircleCI, and AWS-native <b>CodePipeline + CodeBuild + CodeDeploy</b> (lesson 12). Concepts transfer: triggers, jobs, steps, runners, secrets, artifacts, environments.</p>`,
      analogy: `Different <b>brands of assembly line</b>, same factory principles.`,
      hook: `<b>Triggers · jobs · steps · runners · secrets.</b>`,
      words: ['GitHub Actions', 'GitLab CI', 'Jenkins', 'CodePipeline', 'CodeBuild'],
      flow: { from: 'cd', to: 'aws', label: 'DEPLOY', detail: ['sam deploy → raul-app'], color: 'green' }, focus: ['cd', 'aws'],
      cmds: [{ c: 'ls .github/workflows/', o: 'ci.yml  deploy.yml', k: 'git' }] },
    { t: 'DORA metrics', sub: 'How good is your delivery?',
      body: `<p>The four <b>DORA</b> metrics: <b>deployment frequency</b>, <b>lead time for changes</b>, <b>change failure rate</b>, <b>time to restore</b>. Good pipelines push all four in the right direction: deploy often, fast, rarely broken, quickly fixed.</p><p>Now open the <b>Pipeline Simulator</b> tab: write a workflow and run it against a push.</p>`,
      analogy: `A <b>fitness tracker</b> for your team's delivery habits.`,
      hook: `<b>Often · fast · rarely broken · quickly fixed.</b>`,
      words: ['DORA', 'deployment frequency', 'lead time', 'change failure rate', 'MTTR'],
      flow: { from: 'aws', to: 'dev', label: 'FEEDBACK', detail: ['✓ deployed in 2m14s'], color: 'teal' },
      cmds: [{ c: 'gh run list --workflow ci.yml --json conclusion --limit 50 | jq "[.[] | select(.conclusion==\\"failure\\")] | length"', o: '3', k: 'gh' }] }
  ],
  summary: { title: 'You know what CI/CD is', sub: 'CI · delivery · deployment · stages · DORA', text: `<p>CI builds and tests every change automatically. Continuous delivery keeps every green build releasable (human approves prod); continuous deployment ships automatically. Pipelines run build → test → scan → deploy → verify, cheapest checks first. DORA metrics measure how well it works.</p>` },
  quiz: [
    { q: 'Continuous Deployment means…', a: ['Manual releases', 'Every passing change goes to prod automatically', 'Nightly builds', 'Only staging'], c: 1, why: 'No human gate.' },
    { q: 'Which runs first in a good pipeline?', a: ['Prod deploy', 'Fast lint and unit tests', 'Load tests', 'Manual QA'], c: 1, why: 'Fail fast and cheap.' },
    { q: 'A DORA metric:', a: ['Lines of code', 'Change failure rate', 'Number of branches', 'CPU usage'], c: 1, why: 'One of the four key metrics.' },
    { q: 'CI primarily gives…', a: ['Free servers', 'Fast feedback on every change', 'Fewer tests', 'Manual deploys'], c: 1, why: 'Problems found in minutes.' }
  ],
  challenge: { task: 'Make this workflow valid and green on a push to main: job "test" needs runs-on: ubuntu-latest, and its steps must check out the code (actions/checkout@v4) before installing requirements and running pytest.',
    hint: Y('name: CI', 'on: push', 'permissions:', '  contents: read', 'jobs:', '  test:', '    runs-on: ubuntu-latest', '    steps:', '      - uses: actions/checkout@v4', '      - uses: actions/setup-python@v5', '        with:', '          python-version: "3.12"', '      - run: pip install -r requirements.txt', '      - run: pytest'),
    starter: Y('name: CI', 'on: push', 'permissions:', '  contents: read', 'jobs:', '  test:', '    steps:', '      - uses: actions/setup-python@v5', '        with:', '          python-version: "3.12"', '      - run: pip install -r requirements.txt', '      - run: pytest'),
    check: r => { if (r.error) return 'fix the workflow error first: ' + r.error; if (!r.triggered) return 'it must run on push'; if (!RAN(r, 'test')) return 'job "test" must succeed (open the failing step to read why)';
      return JOBS(r, 'test')[0].steps.some(s => s.run && /pytest/.test(s.run) && s.status === 'success') ? true : 'run pytest in the test job'; } },
  next: `Your first pipeline runs on every push. Next: the anatomy of <b>GitHub Actions</b>: events, filters, jobs, steps, runners and actions, and how to run only when it matters.`,
  cheat: [['.github/workflows/ci.yml', 'where workflows live'], ['on: push', 'trigger'], ['runs-on: ubuntu-latest', 'runner'], ['- uses: actions/checkout@v4', 'get the code'], ['- run: pytest', 'shell command'], ['gh run list / gh run view --log', 'inspect runs']]
});

/* ============ 02 TRIGGERS ============ */
LESSONS.push({
  id: 'triggers', num: 2, cat: 'core', layer: 1, mins: 13,
  title: 'GitHub Actions Anatomy & Triggers', short: 'Events, filters, jobs, steps, runners',
  overview: `<p>A <b>workflow</b> (YAML in <code>.github/workflows/</code>) runs when an <b>event</b> happens: push, pull_request, a tag, a schedule, a manual dispatch. It contains <b>jobs</b> that run on <b>runners</b> (fresh VMs) and each job has <b>steps</b>: either <code>uses:</code> a reusable <b>action</b> or <code>run:</code> shell commands.</p>`,
  hook: `<b>"Event → workflow → jobs → steps."</b>`,
  why: `Getting triggers right avoids two classic problems: deploying from feature branches by accident, and wasting runner minutes on every push.`,
  scene: { type: 'graph', nodes: [
    { id: 'ev', x: 100, y: 240, icon: 'bell', label: 'Event', sub: 'push · pull_request · tag' },
    { id: 'wf', x: 320, y: 240, icon: 'code', label: 'Workflow', sub: 'on: + filters' },
    { id: 'job', x: 550, y: 110, icon: 'box', label: 'Job', sub: 'runs-on: ubuntu-latest', at: 2 },
    { id: 'run', x: 550, y: 380, icon: 'server', label: 'Runner', sub: 'fresh VM per job', at: 3 },
    { id: 'step', x: 800, y: 240, icon: 'list', label: 'Steps', sub: 'uses: · run:', at: 3 }
  ], edges: [{ a: 'ev', b: 'wf' }, { a: 'wf', b: 'job' }, { a: 'job', b: 'run' }, { a: 'job', b: 'step' }] },
  steps: [
    { t: 'Events', sub: 'What starts a run',
      body: `<p>Common events: <code>push</code>, <code>pull_request</code>, <code>workflow_dispatch</code> (manual button with inputs), <code>schedule</code> (cron, UTC), <code>release</code>, <code>workflow_call</code> (reusable workflows). <code>on: [push, pull_request]</code> listens to both.</p>`,
      analogy: `Events are <b>doorbells</b>: each one rings a different workflow.`,
      hook: `<b>push · pull_request · dispatch · schedule.</b>`,
      words: ['on:', 'push', 'pull_request', 'workflow_dispatch', 'schedule', 'workflow_call'],
      flow: { from: 'ev', to: 'wf', label: 'EVENT', detail: ['pull_request opened → base main'], color: 'blue' }, focus: ['ev', 'wf'],
      cmds: [{ c: 'on:\n  push:\n  pull_request:\n  workflow_dispatch:\n  schedule:\n    - cron: "0 0 * * 1"   # Mondays 00:00 UTC', f: 'ci.yml', o: '', k: 'yaml' }] },
    { t: 'Filters', sub: 'branches, tags, paths',
      body: `<p>Narrow events with filters: <code>push: branches: [main]</code>, <code>tags: ['v*']</code>, <code>paths: ['src/**']</code>, <code>branches-ignore</code>. For <code>pull_request</code>, <code>branches</code> filters on the <b>base</b> (target) branch. Globs: <code>*</code> within a segment, <code>**</code> across slashes.</p>`,
      analogy: `A <b>mail filter</b>: only letters from these senders go in this folder.`,
      hook: `<b>push filters the pushed branch; PR filters the target.</b>`,
      words: ['branches', 'tags', 'paths', 'branches-ignore', 'glob'],
      flow: { from: 'ev', to: 'wf', label: 'FILTER', detail: ['feature/login ∉ [main] → not triggered'], color: 'amber' }, focus: ['wf'],
      cmds: [{ c: 'on:\n  push:\n    branches: [main]\n    tags: ["v*"]\n  pull_request:\n    branches: [main]', f: 'ci.yml', o: '', k: 'yaml' }] },
    { t: 'Jobs & runners', sub: 'Parallel by default',
      body: `<p>Each job runs on a <b>fresh runner</b>: <code>ubuntu-latest</code>, <code>windows-latest</code>, <code>macos-latest</code>, larger runners, or <b>self-hosted</b> (your own machines/containers, which you must secure). Jobs run <b>in parallel</b> unless you add <code>needs:</code> (lesson 3). Nothing is shared between jobs except artifacts, caches and outputs.</p>`,
      analogy: `Each job gets a <b>brand-new clean kitchen</b>: no dirty dishes from the last cook.`,
      hook: `<b>New VM per job. Parallel unless needs:.</b>`,
      words: ['job', 'runner', 'ubuntu-latest', 'self-hosted runner', 'ephemeral'],
      flow: { from: 'wf', to: 'job', label: 'JOB', detail: ['test → ubuntu-latest'], color: 'purple' }, focus: ['wf', 'job'],
      cmds: [{ c: 'jobs:\n  lint:\n    runs-on: ubuntu-latest\n    steps: [...]\n  test:\n    runs-on: ubuntu-latest\n    steps: [...]', f: 'ci.yml', o: '', k: 'yaml' }] },
    { t: 'Steps: uses vs run', sub: 'Actions and shell',
      body: `<p><code>uses: actions/setup-python@v5</code> runs a published <b>action</b> with <code>with:</code> inputs. <code>run: pytest -q</code> runs shell commands (multi-line with <code>|</code>). Steps share the job's filesystem and env, so they run in order and a failure skips the rest (unless <code>if: always()</code>).</p>`,
      analogy: `<b>uses</b> is a <b>kitchen gadget</b>; <b>run</b> is doing it by hand.`,
      hook: `<b>uses: someone's action@version. run: your shell.</b>`,
      words: ['uses', 'with', 'run', 'action', 'marketplace', 'composite action'],
      flow: { from: 'job', to: 'step', label: 'STEPS', detail: ['checkout → setup-python → pytest'], color: 'green' }, focus: ['job', 'step'],
      cmds: [{ c: '- uses: actions/setup-python@v5\n  with:\n    python-version: "3.12"\n    cache: pip\n- run: |\n    pip install -r requirements.txt\n    pytest -q', f: 'ci.yml', o: '', k: 'yaml' }] },
    { t: 'Contexts & expressions', sub: '${{ github.ref }}',
      body: `<p><code>&#36;{{ }}</code> expressions read <b>contexts</b>: <code>github.ref</code> (refs/heads/main), <code>github.event_name</code>, <code>github.sha</code>, <code>secrets.X</code>, <code>vars.X</code>, <code>matrix.x</code>, <code>needs.job.outputs.x</code>, <code>inputs.x</code>. Functions: <code>success()</code>, <code>failure()</code>, <code>always()</code>, <code>contains()</code>, <code>startsWith()</code>.</p>`,
      analogy: `Contexts are the <b>dashboard readings</b> the pipeline can glance at.`,
      hook: `<b>github · secrets · vars · matrix · needs · inputs.</b>`,
      words: ['${{ }}', 'contexts', 'github.ref', 'github.event_name', 'github.sha', 'expressions'],
      flow: { from: 'run', to: 'step', label: 'CONTEXT', detail: ['github.ref = refs/heads/main'], color: 'teal' }, focus: ['run', 'step'],
      cmds: [{ c: '- run: echo "Deploying ${{ github.sha }} from ${{ github.ref_name }}"', f: 'ci.yml', o: 'Deploying 9f2c1ab… from main', k: 'yaml' }] }
  ],
  summary: { title: 'You can read any workflow', sub: 'Events · filters · jobs · runners · steps · contexts', text: `<p>Workflows run on events (<code>on:</code>) narrowed by branches/tags/paths filters. Jobs run in parallel on fresh runners; steps run in order with <code>uses:</code> (actions) or <code>run:</code> (shell). Expressions read contexts like <code>github.ref</code>, <code>secrets</code>, <code>matrix</code>, <code>needs</code>.</p>` },
  quiz: [
    { q: '`pull_request: branches: [main]` filters on…', a: ['The PR’s source branch', 'The base (target) branch', 'Tags', 'Paths'], c: 1, why: 'PRs into main.' },
    { q: 'Two jobs without needs: run…', a: ['In order', 'In parallel', 'Never', 'On the same VM'], c: 1, why: 'Parallel by default.' },
    { q: 'Run a workflow manually with inputs:', a: ['schedule', 'workflow_dispatch', 'release', 'push'], c: 1, why: 'Shows a "Run workflow" button.' },
    { q: 'github.ref on a push to main is…', a: ['main', 'refs/heads/main', 'origin/main', 'HEAD'], c: 1, why: 'Use github.ref_name for "main".' }
  ],
  challenge: { task: 'Tighten the triggers: the workflow must run on pushes to main and on pull requests targeting main, but NOT on pushes to feature branches or tags. Test each event in the dropdown.',
    hint: Y('name: CI', 'on:', '  push:', '    branches: [main]', '  pull_request:', '    branches: [main]', 'permissions:', '  contents: read', 'jobs:', '  test:', '    runs-on: ubuntu-latest', '    steps:', '      - uses: actions/checkout@v4', '      - run: pytest'),
    starter: Y('name: CI', 'on: [push, pull_request]', 'permissions:', '  contents: read', 'jobs:', '  test:', '    runs-on: ubuntu-latest', '    steps:', '      - uses: actions/checkout@v4', '      - run: pytest'),
    check: (r, run) => { if (r.error) return r.error; const t = k => run(k).triggered;
      if (!t('push:main')) return 'push to main must trigger it'; if (!t('pull_request:main')) return 'pull requests into main must trigger it';
      if (t('push:feature')) return 'push to feature/login still triggers it: add branches: [main] under push';
      if (t('tag:v1.2.0')) return 'tag pushes still trigger it'; return true; } },
  next: `Now make jobs depend on each other: test must pass before deploy, and deploy only from main. Next: <b>needs, if conditions, outputs and artifacts</b>.`,
  cheat: [['on: push: branches: [main]', 'only main'], ['pull_request: branches: [main]', 'PRs into main'], ['tags: ["v*"]', 'release tags'], ['paths: ["src/**"]', 'only when files change'], ['${{ github.ref_name }}', 'branch name'], ['workflow_dispatch:', 'manual run']]
});

/* ============ 03 NEEDS & IF ============ */
LESSONS.push({
  id: 'needs-if', num: 3, cat: 'core', layer: 2, mins: 14,
  title: 'Job Dependencies, Conditions & Artifacts', short: 'needs, if, outputs, artifacts',
  overview: `<p><code>needs:</code> orders jobs (deploy waits for test) and skips dependents when a job fails. <code>if:</code> runs a job or step only when a condition is true (e.g. only on main). <b>Outputs</b> pass small values between jobs; <b>artifacts</b> pass files (a built zip, a test report).</p>`,
  hook: `<b>"needs = wait for; if = only when."</b>`,
  why: `This is the core of every deploy pipeline: never deploy untested code, never deploy from a feature branch, and build once then deploy the same artifact everywhere.`,
  scene: { type: 'graph', nodes: [
    { id: 'build', x: 120, y: 240, icon: 'box', label: 'build', sub: 'upload artifact' },
    { id: 'test', x: 360, y: 240, icon: 'search', label: 'test', sub: 'needs: build' },
    { id: 'dev', x: 600, y: 120, icon: 'cloud', label: 'deploy-dev', sub: 'needs: test', at: 1 },
    { id: 'prod', x: 840, y: 120, icon: 'shield', label: 'deploy-prod', sub: 'if: main', at: 1 },
    { id: 'art', x: 600, y: 390, icon: 'pkg', label: 'artifact', sub: 'app.zip', at: 4 }
  ], edges: [{ a: 'build', b: 'test' }, { a: 'test', b: 'dev' }, { a: 'dev', b: 'prod' }, { a: 'build', b: 'art' }, { a: 'art', b: 'dev' }] },
  steps: [
    { t: 'needs:', sub: 'Order and gate jobs',
      body: `<p><code>needs: test</code> (or a list) makes a job wait and only run if all its needs <b>succeeded</b>. A failed test means deploy is <b>skipped</b>. Jobs without needs still run in parallel.</p>`,
      analogy: `"<b>No dessert until you finish your vegetables.</b>"`,
      hook: `<b>Failed need = skipped job.</b>`,
      words: ['needs', 'dependency graph', 'skipped', 'fan-in'],
      flow: { from: 'build', to: 'test', label: 'NEEDS', detail: ['test waits for build'], color: 'blue' }, focus: ['build', 'test'],
      cmds: [{ c: 'jobs:\n  test:\n    runs-on: ubuntu-latest\n    steps: [...]\n  deploy:\n    needs: test\n    runs-on: ubuntu-latest\n    steps: [...]', f: 'ci.yml', o: '', k: 'yaml' }] },
    { t: 'if: conditions', sub: 'Only on main, only on push',
      body: `<p><code>if: github.ref == 'refs/heads/main' &amp;&amp; github.event_name == 'push'</code> keeps deploy jobs off pull requests and feature branches. Job-level <code>if</code> needs no <code>&#36;{{ }}</code>. Status functions: <code>always()</code> (run even after failure, e.g. notify), <code>failure()</code> (only when something failed).</p>`,
      analogy: `A <b>"staff only"</b> sign on the door.`,
      hook: `<b>Deploy if main AND push.</b>`,
      words: ['if:', 'github.ref', 'github.event_name', 'always()', 'failure()', 'success()'],
      flow: { from: 'dev', to: 'prod', label: 'IF', detail: ['refs/heads/main && push → run'], color: 'purple' }, focus: ['dev', 'prod'],
      cmds: [{ c: '  deploy:\n    needs: test\n    if: github.ref == \'refs/heads/main\' && github.event_name == \'push\'\n    runs-on: ubuntu-latest', f: 'ci.yml', o: '', k: 'yaml' }] },
    { t: 'Notify on failure', sub: 'if: failure()',
      body: `<p>A step or job with <code>if: failure()</code> runs only when an earlier step failed, which is perfect for a Slack alert. <code>if: always()</code> uploads test reports whatever happens. <code>continue-on-error: true</code> lets an optional step fail without failing the job.</p>`,
      analogy: `A <b>smoke alarm</b>: silent normally, loud only when there's a problem.`,
      hook: `<b>failure() alerts, always() cleans up.</b>`,
      words: ['failure()', 'always()', 'continue-on-error', 'notifications'],
      flow: { from: 'test', to: 'dev', label: 'FAIL?', detail: ['tests failed → deploy skipped, alert sent'], color: 'red' }, focus: ['test', 'dev'],
      cmds: [{ c: '- name: Alert Slack\n  if: failure()\n  run: curl -X POST -d \'{"text":"CI failed on ${{ github.ref_name }}"}\' ${{ secrets.SLACK_WEBHOOK_URL }}', f: 'ci.yml', o: '', k: 'yaml' }] },
    { t: 'Job outputs', sub: 'Pass small values',
      body: `<p>A step writes <code>echo "version=1.4.2" &gt;&gt; "$GITHUB_OUTPUT"</code>; the job declares <code>outputs: version: &#36;{{ steps.ver.outputs.version }}</code>; later jobs read <code>needs.build.outputs.version</code>. Use for versions, image tags, flags, not files.</p>`,
      analogy: `A <b>sticky note handed to the next shift</b>.`,
      hook: `<b>$GITHUB_OUTPUT → outputs: → needs.job.outputs.x.</b>`,
      words: ['GITHUB_OUTPUT', 'outputs', 'steps.id.outputs', 'needs.job.outputs'],
      flow: { from: 'test', to: 'prod', label: 'OUTPUT', detail: ['version=1.4.2'], color: 'amber' },
      cmds: [{ c: '- id: ver\n  run: echo "version=1.4.2" >> "$GITHUB_OUTPUT"', f: 'ci.yml', o: '', k: 'yaml' }] },
    { t: 'Artifacts', sub: 'Build once, deploy many',
      body: `<p><code>actions/upload-artifact</code> saves files from one job; <code>actions/download-artifact</code> fetches them in a later job (which must <code>needs:</code> it). Build the package <b>once</b> and promote the <b>same</b> artifact through dev, staging and prod, so what you tested is what you ship.</p>`,
      analogy: `Bake <b>one cake</b>, take photos for the menu, and serve that same cake.`,
      hook: `<b>Build once, promote the same bits.</b>`,
      words: ['upload-artifact', 'download-artifact', 'build once', 'promotion', 'retention-days'],
      flow: { from: 'art', to: 'dev', label: 'ARTIFACT', detail: ['app.zip → deploy-dev'], color: 'green' }, focus: ['build', 'art', 'dev'],
      cmds: [{ c: '- uses: actions/upload-artifact@v4\n  with:\n    name: app\n    path: dist/app.zip', f: 'ci.yml', o: '', k: 'yaml' }] }
  ],
  summary: { title: 'You can build gated pipelines', sub: 'needs · if · failure()/always() · outputs · artifacts', text: `<p><code>needs</code> orders jobs and skips dependents on failure. <code>if</code> restricts jobs/steps (deploy only on push to main). <code>failure()</code>/<code>always()</code> handle alerts and cleanup. Outputs pass values; artifacts pass files, so you build once and promote the same artifact.</p>` },
  quiz: [
    { q: 'If "test" fails, a job with needs: test is…', a: ['Run anyway', 'Skipped', 'Retried', 'Deleted'], c: 1, why: 'Dependents need success.' },
    { q: 'Run a step only when something failed:', a: ['if: always()', 'if: failure()', 'continue-on-error', 'needs'], c: 1, why: 'failure() is true after a failure.' },
    { q: 'Pass a built zip from build to deploy:', a: ['Outputs', 'Artifacts', 'Env vars', 'Secrets'], c: 1, why: 'Files go in artifacts.' },
    { q: 'Keep deploy off pull requests:', a: ['needs: test', "if: github.event_name == 'push' && github.ref == 'refs/heads/main'", 'runs-on', 'permissions'], c: 1, why: 'Condition on event and ref.' }
  ],
  challenge: { task: 'Gate the deploy: job "deploy" must need "test" and run only for a push to main (not for pull requests). If tests fail, deploy must be skipped. (The checker also runs a pull request and a failing-test scenario.)',
    hint: Y('name: CI/CD', 'on:', '  push:', '    branches: [main]', '  pull_request:', '    branches: [main]', 'permissions:', '  contents: read', 'jobs:', '  test:', '    runs-on: ubuntu-latest', '    steps:', '      - uses: actions/checkout@v4', '      - run: pytest', '  deploy:', '    needs: test', "    if: github.ref == 'refs/heads/main' && github.event_name == 'push'", '    runs-on: ubuntu-latest', '    steps:', '      - uses: actions/checkout@v4', '      - run: echo "deploying ${{ github.sha }}"'),
    starter: Y('name: CI/CD', 'on:', '  push:', '    branches: [main]', '  pull_request:', '    branches: [main]', 'permissions:', '  contents: read', 'jobs:', '  test:', '    runs-on: ubuntu-latest', '    steps:', '      - uses: actions/checkout@v4', '      - run: pytest', '  deploy:', '    runs-on: ubuntu-latest', '    steps:', '      - uses: actions/checkout@v4', '      - run: echo "deploying ${{ github.sha }}"'),
    check: (r, run) => { if (r.error) return r.error; const m = run('push:main'); if (!RAN(m, 'deploy')) return 'on push to main, deploy should run and succeed';
      if ((m.wf.jobs.deploy.needs || '') !== 'test' && ![].concat(m.wf.jobs.deploy.needs || []).includes('test')) return 'deploy must have needs: test';
      if (JOBS(run('pull_request:main'), 'deploy').some(j => j.status !== 'skipped')) return 'on a pull request, deploy must be skipped (add an if: condition)';
      return JOBS(run('push:main', { failTests: true }), 'deploy').every(j => j.status === 'skipped') ? true : 'when tests fail, deploy must be skipped'; } },
  next: `Now make "test" actually trustworthy: unit tests, linting, a <b>matrix</b> of Python versions and <b>caching</b> for speed.`,
  cheat: [['needs: test', 'wait & gate'], ["if: github.ref == 'refs/heads/main'", 'only main'], ['if: failure() / always()', 'alerts / cleanup'], ['echo "k=v" >> "$GITHUB_OUTPUT"', 'step output'], ['needs.build.outputs.k', 'read it'], ['upload-artifact / download-artifact', 'pass files']]
});
