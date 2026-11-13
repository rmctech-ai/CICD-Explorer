/* ============ 07 IaC PIPELINE ============ */
LESSONS.push({
  id: 'iac-pipeline', num: 7, cat: 'aws', layer: 4, mins: 15,
  title: 'Deploy IaC from a Pipeline', short: 'lint → scan → deploy CloudFormation/SAM',
  overview: `<p>Infrastructure changes deserve the same pipeline as code: <b>validate</b> (cfn-lint), <b>scan</b> (Checkov/cfn-guard), <b>preview</b> (change set or <code>terraform plan</code> posted to the PR), then <b>deploy</b> from main with OIDC. Humans review the diff, the pipeline does the clicking.</p>`,
  hook: `<b>"Lint it, scan it, preview it, then ship it."</b>`,
  why: `This is the daily workflow of cloud/platform engineers and a must-have portfolio project. It turns IaC Explorer's skills into a safe, automated process.`,
  scene: { type: 'graph', nodes: [
    { id: 'pr', x: 100, y: 240, icon: 'code', label: 'PR: template.yaml', sub: 'infra change' },
    { id: 'lint', x: 320, y: 110, icon: 'search', label: 'cfn-lint', sub: 'valid?' },
    { id: 'scan', x: 320, y: 370, icon: 'shield', label: 'checkov', sub: 'secure?', at: 1 },
    { id: 'plan', x: 560, y: 240, icon: 'list', label: 'Change set / plan', sub: 'comment on PR', at: 2 },
    { id: 'deploy', x: 780, y: 240, icon: 'pipe', label: 'deploy (main)', sub: 'OIDC · sam deploy', at: 2 },
    { id: 'stack', x: 920, y: 400, icon: 'cloud', label: 'raul-app stack', sub: 'UPDATE_COMPLETE', at: 3 }
  ], edges: [{ a: 'pr', b: 'lint' }, { a: 'pr', b: 'scan' }, { a: 'lint', b: 'plan' }, { a: 'scan', b: 'plan' }, { a: 'plan', b: 'deploy' }, { a: 'deploy', b: 'stack' }] },
  steps: [
    { t: 'Validate', sub: 'cfn-lint / terraform validate',
      body: `<p><code>pip install cfn-lint</code> then <code>cfn-lint template.yaml</code> catches invalid properties, bad references and deprecated runtimes in seconds, before any AWS call. For Terraform: <code>terraform fmt -check</code> and <code>terraform validate</code>.</p>`,
      analogy: `A <b>grammar check</b> on the blueprint.`,
      hook: `<b>Invalid templates never reach AWS.</b>`,
      words: ['cfn-lint', 'terraform validate', 'fmt', 'fail fast'],
      flow: { from: 'pr', to: 'lint', label: 'LINT', detail: ['(no findings)'], color: 'blue' }, focus: ['pr', 'lint'],
      cmds: [{ c: 'cfn-lint template.yaml', o: 'E3002 Additional properties are not allowed (\'Memory\' was unexpected)\ntemplate.yaml:24:7', k: 'err' }] },
    { t: 'Scan', sub: 'Policy as code',
      body: `<p><code>checkov -f template.yaml</code> (or <code>-d .</code>) flags public buckets, open security groups, wildcard IAM, missing encryption. Fail the job on HIGH findings; allow documented suppressions for accepted risks. Upload results as SARIF to show them in the PR's Security tab.</p>`,
      analogy: `The <b>building inspector</b> checks the blueprint before construction starts.`,
      hook: `<b>Scan in the PR, not after the breach.</b>`,
      words: ['checkov', 'cfn-guard', 'SARIF', 'suppressions', 'policy as code'],
      flow: { from: 'pr', to: 'scan', label: 'SCAN', detail: ['Passed checks: 14, Failed checks: 0'], color: 'purple' }, focus: ['pr', 'scan'],
      cmds: [{ c: 'checkov -f template.yaml --compact', o: 'Passed checks: 14, Failed checks: 0, Skipped checks: 0', k: 'tool' }] },
    { t: 'Preview the change', sub: 'Change set or plan in the PR',
      body: `<p>On pull requests, create a change set without executing (<code>sam deploy --no-execute-changeset</code> or <code>aws cloudformation deploy --no-execute-changeset</code>) or run <code>terraform plan</code>, and post the summary as a PR comment. Reviewers see "Modify InvoicesTable, Replacement: True" before merging.</p>`,
      analogy: `The contractor's <b>quote</b>, attached to the work order.`,
      hook: `<b>Review the diff, not just the code.</b>`,
      words: ['change set', '--no-execute-changeset', 'terraform plan', 'PR comment', 'Replacement'],
      flow: { from: 'plan', to: 'deploy', label: 'PREVIEW', detail: ['Add ErrorsAlarm · Modify FnRole'], color: 'amber' }, focus: ['lint', 'scan', 'plan'],
      cmds: [{ c: 'sam deploy --stack-name raul-app --no-execute-changeset --no-fail-on-empty-changeset', o: 'CloudFormation stack changeset\n---------------------------------\nOperation   LogicalResourceId   ResourceType              Replacement\n+ Add       ErrorsAlarm         AWS::CloudWatch::Alarm    N/A\n* Modify    FnRole              AWS::IAM::Role            False', k: 'tool' }] },
    { t: 'Deploy from main', sub: 'OIDC + needs + if',
      body: `<p>The deploy job <code>needs: validate</code>, runs only on push to main, assumes the OIDC role and runs <code>sam deploy --no-confirm-changeset --no-fail-on-empty-changeset</code> (or <code>aws cloudformation deploy</code>). CloudFormation handles ordering and rollback; the pipeline just triggers it.</p>`,
      analogy: `Once the quote is approved, the <b>crew starts work</b>, and only the licensed crew.`,
      hook: `<b>validate → (main only) → OIDC → deploy.</b>`,
      words: ['sam deploy', 'aws cloudformation deploy', '--no-confirm-changeset', 'rollback', 'OIDC role'],
      flow: { from: 'deploy', to: 'stack', label: 'DEPLOY', detail: ['Successfully created/updated stack - raul-app'], color: 'green' }, focus: ['deploy', 'stack'],
      cmds: [{ c: 'sam deploy --stack-name raul-app --no-confirm-changeset --no-fail-on-empty-changeset --capabilities CAPABILITY_IAM', o: 'Successfully created/updated stack - raul-app in ap-southeast-1', k: 'tool' }] },
    { t: 'Drift & environments', sub: 'Keep reality = code',
      body: `<p>Deploy the same template to <b>dev</b> automatically and <b>prod</b> behind an environment approval, with parameters per environment. Run scheduled drift detection (or <code>terraform plan</code> nightly) and alert if someone clicked in the console.</p>`,
      analogy: `A <b>nightly inventory check</b> against the blueprint.`,
      hook: `<b>Same template, per-env params, nightly drift check.</b>`,
      words: ['multi-environment', 'parameter overrides', 'drift detection', 'schedule'],
      flow: { from: 'stack', to: 'plan', label: 'DRIFT', detail: ['nightly: IN_SYNC ✓'], color: 'teal' },
      cmds: [{ c: 'on:\n  schedule:\n    - cron: "0 18 * * *"   # 02:00 Manila\njobs:\n  drift:\n    steps:\n      - run: aws cloudformation detect-stack-drift --stack-name raul-app', f: 'drift.yml', o: '', k: 'yaml' }] }
  ],
  summary: { title: 'Your infrastructure ships through a pipeline', sub: 'Lint · scan · preview · deploy · drift', text: `<p>On PRs: cfn-lint, Checkov and a change-set/plan preview posted for review. On main: a deploy job that needs validation, assumes an OIDC role and runs sam/cloudformation deploy. Promote dev → prod with environments, and check drift on a schedule.</p>` },
  quiz: [
    { q: 'Preview a CloudFormation change in a PR:', a: ['--no-execute-changeset', 'delete-stack', 'checkov', 'terraform destroy'], c: 0, why: 'Creates but doesn’t run the change set.' },
    { q: 'Tool that flags public S3 buckets in templates:', a: ['pytest', 'checkov', 'ruff', 'curl'], c: 1, why: 'IaC security scanner.' },
    { q: 'Deploy should run…', a: ['On every PR', 'After validation, from main', 'Before lint', 'Manually only'], c: 1, why: 'needs + if.' },
    { q: 'Detect console changes nightly:', a: ['Drift detection on a schedule', 'Matrix', 'Cache', 'Artifacts'], c: 0, why: 'schedule + detect-stack-drift.' }
  ],
  challenge: { task: 'Build the IaC pipeline: job "validate" (checkout, pip install cfn-lint checkov, cfn-lint template.yaml, checkov -f template.yaml) and job "deploy" that needs validate, runs only on push to main, uses OIDC (id-token: write, role-to-assume arn:aws:iam::111122223333:role/github-deploy) and runs sam deploy --stack-name raul-app. On a PR only validate runs; if cfn-lint fails, deploy is skipped.',
    hint: Y('name: Infra', 'on:', '  push:', '    branches: [main]', '  pull_request:', '    branches: [main]', 'permissions:', '  contents: read', 'jobs:', '  validate:', '    runs-on: ubuntu-latest', '    steps:', '      - uses: actions/checkout@v4', '      - run: pip install cfn-lint checkov', '      - run: cfn-lint template.yaml', '      - run: checkov -f template.yaml', '  deploy:', '    needs: validate', "    if: github.ref == 'refs/heads/main' && github.event_name == 'push'", '    runs-on: ubuntu-latest', '    permissions:', '      id-token: write', '      contents: read', '    steps:', '      - uses: actions/checkout@v4', '      - uses: aws-actions/configure-aws-credentials@v4', '        with:', '          role-to-assume: arn:aws:iam::111122223333:role/github-deploy', '          aws-region: ap-southeast-1', '      - run: sam deploy --stack-name raul-app --no-confirm-changeset --no-fail-on-empty-changeset'),
    starter: Y('name: Infra', 'on:', '  push:', '    branches: [main]', '  pull_request:', '    branches: [main]', 'permissions:', '  contents: read', 'jobs:', '  deploy:', '    runs-on: ubuntu-latest', '    steps:', '      - uses: actions/checkout@v4', '      - run: sam deploy --stack-name raul-app --no-confirm-changeset'),
    check: (r, run) => { if (r.error) return r.error; const m = run('push:main');
      const v = JOBS(m, 'validate')[0]; if (!v) return 'add a "validate" job';
      if (!v.steps.some(s => /cfn-lint\s+\S/.test(s.run || '')) || !v.steps.some(s => /checkov/.test(s.run || ''))) return 'validate must run cfn-lint and checkov';
      if (!RAN(m, 'validate')) return 'validate must pass (open its steps)';
      const d = JOBS(m, 'deploy')[0]; if (!d || d.status !== 'success') return 'deploy must succeed on push to main (needs OIDC credentials before sam deploy)';
      if (!d.aws || d.aws.mode !== 'oidc') return 'deploy must use OIDC (role-to-assume)'; if (!d.deployed.includes('raul-app')) return 'deploy the raul-app stack';
      if (JOBS(run('pull_request:main'), 'deploy').some(j => j.status !== 'skipped')) return 'deploy must not run on pull requests';
      return JOBS(run('push:main', { lintFails: true }), 'deploy').every(j => j.status === 'skipped') ? true : 'when cfn-lint fails, deploy must be skipped (needs: validate)'; } },
  next: `Not everything is Lambda + CloudFormation. Next: <b>containers</b>: build a Docker image, scan it, and push it to Amazon ECR tagged with the commit SHA.`,
  cheat: [['cfn-lint template.yaml', 'validate'], ['checkov -f template.yaml', 'scan'], ['sam deploy --no-execute-changeset', 'preview'], ['sam deploy --no-confirm-changeset --no-fail-on-empty-changeset', 'CI deploy'], ['needs: validate + if: main', 'gate'], ['schedule: cron + detect-stack-drift', 'drift']]
});

/* ============ 08 CONTAINERS & ECR ============ */
LESSONS.push({
  id: 'containers', num: 8, cat: 'aws', layer: 4, mins: 15,
  title: 'Containers: Docker → ECR → ECS', short: 'Build, tag, scan, push, deploy',
  overview: `<p>For container workloads (ECS/Fargate, EKS, Lambda container images) the pipeline <b>builds a Docker image</b>, <b>tags</b> it immutably with the commit SHA, <b>scans</b> it for CVEs, <b>pushes</b> it to <b>Amazon ECR</b>, then updates the service to the new image.</p>`,
  hook: `<b>"Build → tag with SHA → scan → push → roll out."</b>`,
  why: `Most companies run containers somewhere. Knowing how images flow from Git to ECS is core cloud-engineer knowledge and a common take-home task.`,
  scene: { type: 'graph', nodes: [
    { id: 'src', x: 100, y: 240, icon: 'code', label: 'Dockerfile', sub: 'app source' },
    { id: 'build', x: 320, y: 240, icon: 'box', label: 'docker build', sub: 'image layers' },
    { id: 'scan', x: 320, y: 420, icon: 'shield', label: 'Image scan', sub: 'Trivy / ECR', at: 3 },
    { id: 'ecr', x: 570, y: 240, icon: 'pkg', label: 'Amazon ECR', sub: 'raul-app:9f2c1ab', at: 1 },
    { id: 'ecs', x: 820, y: 240, icon: 'server', label: 'ECS service', sub: 'rolling update', at: 2 }
  ], edges: [{ a: 'src', b: 'build' }, { a: 'build', b: 'scan' }, { a: 'build', b: 'ecr' }, { a: 'ecr', b: 'ecs' }] },
  steps: [
    { t: 'Images & Dockerfiles', sub: 'App + runtime in one package',
      body: `<p>A <b>Dockerfile</b> builds an image layer by layer: base image, dependencies, your code, the start command. Small base images (python:3.12-slim, distroless) mean fewer CVEs and faster pulls. Use multi-stage builds and run as a <b>non-root</b> user.</p>`,
      analogy: `An image is a <b>shipping container</b> packed with everything the app needs.`,
      hook: `<b>Slim base, pinned deps, non-root user.</b>`,
      words: ['Dockerfile', 'image', 'layer', 'multi-stage build', 'non-root', 'distroless'],
      flow: { from: 'src', to: 'build', label: 'BUILD', detail: ['FROM python:3.12-slim'], color: 'blue' }, focus: ['src', 'build'],
      cmds: [{ c: 'FROM python:3.12-slim\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\nCOPY . .\nUSER 1000\nCMD ["python", "-m", "app"]', f: 'Dockerfile', o: '', k: 'yaml' }] },
    { t: 'Authenticate to ECR', sub: 'OIDC + amazon-ecr-login',
      body: `<p>After <code>configure-aws-credentials</code> (OIDC), <code>aws-actions/amazon-ecr-login@v2</code> logs Docker into your registry and exposes <code>steps.login-ecr.outputs.registry</code> (e.g. <code>111122223333.dkr.ecr.ap-southeast-1.amazonaws.com</code>). Pushing without login fails with <i>denied: requires authentication</i>.</p>`,
      analogy: `Show your <b>badge at the warehouse gate</b> before unloading.`,
      hook: `<b>creds → ecr-login → push.</b>`,
      words: ['ECR', 'amazon-ecr-login', 'registry', 'docker login', 'repository'],
      flow: { from: 'build', to: 'ecr', label: 'LOGIN', detail: ['Logged in to 111122223333.dkr.ecr…'], color: 'purple' }, focus: ['build', 'ecr'],
      cmds: [{ c: 'aws ecr get-login-password | docker login --username AWS --password-stdin 111122223333.dkr.ecr.ap-southeast-1.amazonaws.com', o: 'Login Succeeded', k: 'cli' }] },
    { t: 'Tag with the commit SHA', sub: 'Immutable, traceable tags',
      body: `<p>Tag images with <code>&#36;{{ github.sha }}</code> so every image maps to exactly one commit and you can roll back by redeploying an older SHA. Avoid relying on <code>:latest</code>. Enable ECR <b>tag immutability</b> so a tag can't be overwritten.</p>`,
      analogy: `A <b>serial number</b> stamped on each container, never re-used.`,
      hook: `<b>SHA tags = traceable + rollback-able.</b>`,
      words: ['image tag', 'github.sha', 'tag immutability', ':latest', 'digest'],
      flow: { from: 'ecr', to: 'ecs', label: 'TAG', detail: ['raul-app:9f2c1ab7e4d3…'], color: 'amber' }, focus: ['ecr'],
      cmds: [{ c: 'aws ecr put-image-tag-mutability --repository-name raul-app --image-tag-mutability IMMUTABLE', o: '{\n    "imageTagMutability": "IMMUTABLE"\n}', k: 'cli' }] },
    { t: 'Scan the image', sub: 'CVEs before deploy',
      body: `<p>Scan images in CI (<b>Trivy</b>, Grype) and in the registry (<b>ECR enhanced scanning</b> via Amazon Inspector, continuously re-scanned when new CVEs appear). Fail on CRITICAL vulnerabilities with a fix available; generate an <b>SBOM</b> for the supply-chain record.</p>`,
      analogy: `<b>Customs inspection</b> before the container leaves port.`,
      hook: `<b>Scan in CI and keep scanning in ECR.</b>`,
      words: ['Trivy', 'ECR enhanced scanning', 'Amazon Inspector', 'CVE', 'SBOM'],
      flow: { from: 'build', to: 'scan', label: 'SCAN', detail: ['0 CRITICAL · 2 MEDIUM'], color: 'red' }, focus: ['build', 'scan'],
      cmds: [{ c: 'trivy image --severity CRITICAL,HIGH --exit-code 1 raul-app:9f2c1ab', o: 'raul-app:9f2c1ab (debian 12.7)\nTotal: 0 (HIGH: 0, CRITICAL: 0)', k: 'tool' }] },
    { t: 'Roll out to ECS', sub: 'New task definition revision',
      body: `<p>Render a new task definition with the new image (<code>aws-actions/amazon-ecs-render-task-definition</code>) and deploy it (<code>amazon-ecs-deploy-task-definition</code>, <code>wait-for-service-stability: true</code>). ECS does a <b>rolling update</b> by default, with a deployment circuit breaker to roll back if new tasks fail health checks.</p>`,
      analogy: `Swap containers on the ship <b>one at a time</b>, keeping it afloat.`,
      hook: `<b>New task def → rolling update → circuit breaker.</b>`,
      words: ['ECS', 'task definition', 'rolling update', 'circuit breaker', 'Fargate'],
      flow: { from: 'ecr', to: 'ecs', label: 'ROLL OUT', detail: ['raul-app:42 → 4/4 tasks healthy'], color: 'green' }, focus: ['ecr', 'ecs'],
      cmds: [{ c: 'aws ecs update-service --cluster raul --service raul-app --force-new-deployment --query "service.deployments[0].rolloutState"', o: '"IN_PROGRESS"', k: 'cli' }] }
  ],
  summary: { title: 'You can ship containers', sub: 'Dockerfile · ECR login · SHA tags · scan · ECS rollout', text: `<p>Build slim, non-root images; log in to ECR after OIDC; tag with the commit SHA and make tags immutable; scan in CI and in ECR; roll out a new ECS task definition with health checks and the circuit breaker.</p>` },
  quiz: [
    { q: 'Best image tag for traceability:', a: [':latest', ':${{ github.sha }}', ':prod', ':v'], c: 1, why: 'One image per commit.' },
    { q: 'Pushing to ECR without login gives…', a: ['Success', 'denied: requires authentication', 'A new repo', 'A scan'], c: 1, why: 'Run amazon-ecr-login first.' },
    { q: 'Prevent a tag from being overwritten:', a: ['Tag immutability', 'Lifecycle policy', 'Scanning', 'Replication'], c: 0, why: 'IMMUTABLE repositories.' },
    { q: 'ECS default deployment type:', a: ['Blue/green', 'Rolling update', 'Canary', 'Recreate'], c: 1, why: 'Rolling, with optional circuit breaker.' }
  ],
  challenge: { task: 'Fix the image pipeline: assume the OIDC role, log in to ECR with aws-actions/amazon-ecr-login@v2 (id: login-ecr), then build and push with docker/build-push-action@v6 (push: true) tagged ${{ steps.login-ecr.outputs.registry }}/raul-app:${{ github.sha }}.',
    hint: Y('name: Image', 'on:', '  push:', '    branches: [main]', 'permissions:', '  contents: read', '  id-token: write', 'jobs:', '  image:', '    runs-on: ubuntu-latest', '    steps:', '      - uses: actions/checkout@v4', '      - uses: aws-actions/configure-aws-credentials@v4', '        with:', '          role-to-assume: arn:aws:iam::111122223333:role/github-ecr-push', '          aws-region: ap-southeast-1', '      - id: login-ecr', '        uses: aws-actions/amazon-ecr-login@v2', '      - uses: docker/build-push-action@v6', '        with:', '          push: true', '          tags: ${{ steps.login-ecr.outputs.registry }}/raul-app:${{ github.sha }}'),
    starter: Y('name: Image', 'on:', '  push:', '    branches: [main]', 'permissions:', '  contents: read', 'jobs:', '  image:', '    runs-on: ubuntu-latest', '    steps:', '      - uses: actions/checkout@v4', '      - uses: docker/build-push-action@v6', '        with:', '          push: true', '          tags: raul-app:latest'),
    check: r => { if (r.error) return r.error; const j = JOBS(r, 'image')[0]; if (!j) return 'keep the image job'; if (j.status !== 'success') return 'the job must succeed (open the failing step)';
      if (!j.aws || j.aws.mode !== 'oidc') return 'use OIDC (role-to-assume) for AWS credentials';
      return j.pushed && /^111122223333\.dkr\.ecr\.ap-southeast-1\.amazonaws\.com\/raul-app:9f2c1ab7/.test(j.pushed) ? true : 'tag must be ${{ steps.login-ecr.outputs.registry }}/raul-app:${{ github.sha }} (got ' + j.pushed + ')'; } },
  next: `You can ship. But how do you ship <b>safely</b>, without downtime, and undo a bad release in seconds? Next: <b>deployment strategies and rollback</b>.`,
  cheat: [['FROM python:3.12-slim · USER 1000', 'good Dockerfile'], ['amazon-ecr-login@v2 (id: login-ecr)', 'ECR auth'], ['${{ steps.login-ecr.outputs.registry }}', 'registry URL'], [':${{ github.sha }}', 'immutable tag'], ['trivy image --exit-code 1', 'scan gate'], ['amazon-ecs-deploy-task-definition', 'roll out']]
});

/* ============ 09 DEPLOY STRATEGIES ============ */
LESSONS.push({
  id: 'strategies', num: 9, cat: 'aws', layer: 5, mins: 14,
  title: 'Deployment Strategies & Rollback', short: 'Rolling, blue/green, canary, flags',
  overview: `<p>How you release matters as much as what you release. <b>Rolling</b> replaces instances gradually; <b>blue/green</b> stands up a full new copy and switches traffic; <b>canary</b> sends a small percentage first and watches alarms; <b>feature flags</b> decouple deploy from release. And always have a one-click <b>rollback</b>.</p>`,
  hook: `<b>"Small blast radius, fast rollback."</b>`,
  why: `Change failure rate and time-to-restore (DORA) depend on release strategy. Interviewers ask "how would you deploy with zero downtime?" constantly.`,
  scene: { type: 'graph', nodes: [
    { id: 'users', x: 100, y: 240, icon: 'users', label: 'Users', sub: '100% traffic' },
    { id: 'lb', x: 320, y: 240, icon: 'api', label: 'Router', sub: 'ALB / alias / API' },
    { id: 'blue', x: 580, y: 110, icon: 'server', label: 'v41 (blue)', sub: 'current' },
    { id: 'green', x: 580, y: 380, icon: 'server', label: 'v42 (green)', sub: 'new', at: 1 },
    { id: 'alarm', x: 830, y: 240, icon: 'bell', label: 'Alarms', sub: 'errors, latency', at: 2 }
  ], edges: [{ a: 'users', b: 'lb' }, { a: 'lb', b: 'blue' }, { a: 'lb', b: 'green' }, { a: 'green', b: 'alarm' }] },
  steps: [
    { t: 'Rolling', sub: 'Replace a few at a time',
      body: `<p>Update instances/tasks in batches (ECS default, EC2 Auto Scaling instance refresh). No extra capacity cost, but old and new versions run side by side for a while, and rollback means rolling again.</p>`,
      analogy: `Replacing <b>one bulb at a time</b> in a string of lights.`,
      hook: `<b>Cheap, gradual, mixed versions.</b>`,
      words: ['rolling update', 'minimumHealthyPercent', 'maximumPercent', 'instance refresh'],
      flow: { from: 'lb', to: 'blue', label: 'ROLLING', detail: ['2/4 tasks on v42'], color: 'blue' }, focus: ['lb', 'blue'],
      cmds: [{ c: 'aws ecs describe-services --cluster raul --services raul-app --query "services[0].deployments[].[taskDefinition,runningCount]" --output text', o: 'raul-app:42\t2\nraul-app:41\t2', k: 'cli' }] },
    { t: 'Blue/green', sub: 'Two full environments, flip the switch',
      body: `<p>Deploy v42 (green) alongside v41 (blue), test green, then switch all traffic. Rollback = switch back instantly. Costs double capacity during the switch. CodeDeploy does blue/green for ECS and Lambda; for databases, schema changes must stay backward compatible.</p>`,
      analogy: `Two <b>stages</b>: the band sets up on stage B while stage A plays, then the lights swing over.`,
      hook: `<b>Instant switch, instant rollback, double cost briefly.</b>`,
      words: ['blue/green', 'CodeDeploy', 'traffic switch', 'backward-compatible schema'],
      flow: { from: 'lb', to: 'green', label: 'SWITCH', detail: ['100% → green'], color: 'green' }, focus: ['lb', 'blue', 'green'],
      cmds: [{ c: 'aws deploy create-deployment --application-name raul-app --deployment-group-name prod --revision file://appspec.json', o: '{\n    "deploymentId": "d-7F3A1B2C"\n}', k: 'cli' }] },
    { t: 'Canary', sub: 'A few users first',
      body: `<p>Send 5–10% of traffic to the new version for N minutes while <b>CloudWatch alarms</b> watch error rate and latency. Healthy → shift 100%. Alarm → automatic rollback. Lambda aliases + CodeDeploy (<code>Canary10Percent5Minutes</code>) or API Gateway canary settings make this easy.</p>`,
      analogy: `The <b>canary in the coal mine</b>: a small early warning before everyone walks in.`,
      hook: `<b>10% + alarms → 100% or rollback.</b>`,
      words: ['canary', 'linear', 'Canary10Percent5Minutes', 'alarm rollback', 'progressive delivery'],
      flow: { from: 'green', to: 'alarm', label: 'WATCH', detail: ['10% on v42 · errors 0.1% ✓'], color: 'amber' }, focus: ['green', 'alarm'],
      cmds: [{ c: 'aws lambda update-alias --function-name raul-api --name prod --function-version 41 --routing-config AdditionalVersionWeights={"42"=0.1}', o: '{\n    "Name": "prod",\n    "FunctionVersion": "41",\n    "RoutingConfig": {"AdditionalVersionWeights": {"42": 0.1}}\n}', k: 'cli' }] },
    { t: 'Feature flags', sub: 'Deploy ≠ release',
      body: `<p>Ship code dark, behind a flag (AWS AppConfig, LaunchDarkly, a DynamoDB toggle), then turn it on for 1% of users, a beta group, or one customer. Kill switch = flip the flag, no redeploy. Clean up old flags or they become tech debt.</p>`,
      analogy: `The new room is built, but the <b>door stays locked</b> until you're ready.`,
      hook: `<b>Deploy anytime, release when ready.</b>`,
      words: ['feature flag', 'AppConfig', 'kill switch', 'dark launch', 'progressive rollout'],
      flow: { from: 'users', to: 'lb', label: 'FLAG', detail: ['newCheckout = on for beta users'], color: 'purple' },
      cmds: [{ c: 'aws appconfig get-latest-configuration --configuration-token $TOKEN out.json && cat out.json', o: '{"newCheckout": {"enabled": true, "percent": 5}}', k: 'cli' }] },
    { t: 'Rollback on demand', sub: 'workflow_dispatch with inputs',
      body: `<p>Keep a manual <b>rollback workflow</b>: <code>on: workflow_dispatch</code> with an input like <code>version</code>, which redeploys a known-good version (Lambda version number, image SHA, stack parameter). Practice it before you need it at 2am. The lab's <b>workflow_dispatch</b> event sends <code>inputs.version = 7</code>.</p>`,
      analogy: `A <b>big red "undo" button</b> that's been tested.`,
      hook: `<b>A rollback you've never run is a rollback you don't have.</b>`,
      words: ['rollback', 'workflow_dispatch', 'inputs', 'known-good version', 'runbook'],
      flow: { from: 'alarm', to: 'lb', label: 'ROLLBACK', detail: ['alias prod → version 7'], color: 'red' }, focus: ['alarm', 'lb', 'blue'],
      cmds: [{ c: 'gh workflow run rollback.yml -f version=7', o: '✓ Created workflow_dispatch event for rollback.yml at main', k: 'gh' }] }
  ],
  summary: { title: 'You can release with confidence', sub: 'Rolling · blue/green · canary · flags · rollback', text: `<p>Rolling is cheap and gradual; blue/green switches instantly between full environments; canary exposes a small slice with alarm-driven rollback; feature flags separate deploy from release. Keep a tested manual rollback workflow with inputs.</p>` },
  quiz: [
    { q: 'Instant rollback by switching traffic back:', a: ['Rolling', 'Blue/green', 'Recreate', 'Matrix'], c: 1, why: 'Old environment still running.' },
    { q: 'Expose 10% of traffic first and watch alarms:', a: ['Canary', 'Blue/green', 'Rolling', 'Feature freeze'], c: 0, why: 'Progressive with auto-rollback.' },
    { q: 'Turn a feature off without redeploying:', a: ['Feature flag', 'New image', 'Delete stack', 'Matrix'], c: 0, why: 'Kill switch.' },
    { q: 'Manual workflow with a version input:', a: ['schedule', 'workflow_dispatch', 'pull_request', 'push'], c: 1, why: 'Run workflow button + inputs.' }
  ],
  challenge: { task: 'Create a manual rollback workflow: on workflow_dispatch with a required input "version"; job "rollback" (OIDC role arn:aws:iam::111122223333:role/github-deploy, region ap-southeast-1) runs aws lambda update-alias --function-name raul-api --name prod --function-version ${{ inputs.version }}. Run it with the workflow_dispatch event (version = 7).',
    event: 'workflow_dispatch',
    hint: Y('name: Rollback', 'on:', '  workflow_dispatch:', '    inputs:', '      version:', '        description: Lambda version to route prod to', '        required: true', 'permissions:', '  id-token: write', '  contents: read', 'jobs:', '  rollback:', '    runs-on: ubuntu-latest', '    environment: production', '    steps:', '      - uses: aws-actions/configure-aws-credentials@v4', '        with:', '          role-to-assume: arn:aws:iam::111122223333:role/github-deploy', '          aws-region: ap-southeast-1', '      - run: aws lambda update-alias --function-name raul-api --name prod --function-version ${{ inputs.version }}'),
    starter: Y('name: Rollback', 'on:', '  push:', '    branches: [main]', 'permissions:', '  contents: read', 'jobs:', '  rollback:', '    runs-on: ubuntu-latest', '    steps:', '      - run: aws lambda update-alias --function-name raul-api --name prod --function-version 41'),
    check: (r, run) => { if (r.error) return r.error; const d = run('workflow_dispatch'); if (!d.triggered) return 'listen to workflow_dispatch: ' + d.reason;
      const inp = ((d.wf.on || {}).workflow_dispatch || {}).inputs || {}; if (!inp.version) return 'declare inputs: version: under workflow_dispatch';
      const j = JOBS(d, 'rollback')[0]; if (!j || j.status !== 'success') return 'the rollback job must succeed (credentials first!)';
      if (!j.aws || j.aws.mode !== 'oidc') return 'use OIDC credentials';
      return j.deployed.some(x => /update-alias.*--function-version 7\b/.test(x)) ? true : 'use ${{ inputs.version }} in the update-alias command'; } },
  next: `Your pipeline holds the keys to production, which makes it a juicy target. Next: <b>supply-chain security</b>: pinning actions, least-privilege tokens, Dependabot and signing.`,
  cheat: [['rolling', 'gradual, cheap'], ['blue/green', 'flip, instant rollback'], ['canary + alarms', 'progressive'], ['feature flags', 'deploy ≠ release'], ['on: workflow_dispatch: inputs:', 'manual rollback'], ['${{ inputs.version }}', 'use input']]
});
