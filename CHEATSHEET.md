# CI/CD Cheat Sheet

_Auto-generated from the CI/CD Explorer lessons. One master memory hook + the key commands per lesson._

## 01 · What is CI/CD?

> ★ "Commit → Build → Test → Scan → Deploy → Monitor."

| Command | What it does |
|---|---|
| `.github/workflows/ci.yml` | where workflows live |
| `on: push` | trigger |
| `runs-on: ubuntu-latest` | runner |
| `- uses: actions/checkout@v4` | get the code |
| `- run: pytest` | shell command |
| `gh run list / gh run view --log` | inspect runs |

**Memory hooks:**

- **The problem CI solves**: Small changes, tested every time.
- **Delivery vs deployment**: Delivery: ready to ship. Deployment: shipped.
- **Pipeline stages**: Cheap checks first, expensive ones later.
- **Tools**: Triggers · jobs · steps · runners · secrets.
- **DORA metrics**: Often · fast · rarely broken · quickly fixed.

## 02 · GitHub Actions Anatomy & Triggers

> ★ "Event → workflow → jobs → steps."

| Command | What it does |
|---|---|
| `on: push: branches: [main]` | only main |
| `pull_request: branches: [main]` | PRs into main |
| `tags: ["v*"]` | release tags |
| `paths: ["src/**"]` | only when files change |
| `${{ github.ref_name }}` | branch name |
| `workflow_dispatch:` | manual run |

**Memory hooks:**

- **Events**: push · pull_request · dispatch · schedule.
- **Filters**: push filters the pushed branch; PR filters the target.
- **Jobs & runners**: New VM per job. Parallel unless needs:.
- **Steps: uses vs run**: uses: someone's action@version. run: your shell.
- **Contexts & expressions**: github · secrets · vars · matrix · needs · inputs.

## 03 · Job Dependencies, Conditions & Artifacts

> ★ "needs = wait for; if = only when."

| Command | What it does |
|---|---|
| `needs: test` | wait & gate |
| `if: github.ref == 'refs/heads/main'` | only main |
| `if: failure() / always()` | alerts / cleanup |
| `echo "k=v" >> "$GITHUB_OUTPUT"` | step output |
| `needs.build.outputs.k` | read it |
| `upload-artifact / download-artifact` | pass files |

**Memory hooks:**

- **needs:**: Failed need = skipped job.
- **if: conditions**: Deploy if main AND push.
- **Notify on failure**: failure() alerts, always() cleans up.
- **Job outputs**: $GITHUB_OUTPUT → outputs: → needs.job.outputs.x.
- **Artifacts**: Build once, promote the same bits.

## 04 · Testing in CI: Lint, Tests, Matrix, Cache

> ★ "Lint, test, matrix, cache, require."

| Command | What it does |
|---|---|
| `pytest -q --cov --cov-fail-under=80` | tests + coverage |
| `ruff check .` | lint |
| `strategy: matrix: python-version: [...]` | matrix |
| `${{ matrix.python-version }}` | use it |
| `cache: pip` | faster installs |
| `required status checks` | merge gate |

**Memory hooks:**

- **The test pyramid**: Unit wide, integration some, E2E few.
- **Lint & format**: Lint is the cheapest bug you'll ever fix.
- **Matrix builds**: matrix = copy the job for each value.
- **Caching**: Key on the lockfile hash.
- **Required checks**: Required checks turn CI into a gate.

## 05 · Secrets, Variables & Environments

> ★ "Secrets hidden, vars visible, environments guarded."

| Command | What it does |
|---|---|
| `${{ secrets.NAME }}` | secret |
| `${{ vars.NAME }}` | variable |
| `env: X: ${{ secrets.X }}` | scope to a step |
| `environment: production` | gate + scoped secrets |
| `gh secret set NAME` | CLI |
| `rotate first, then clean history` | leak response |

**Memory hooks:**

- **Never in the file**: Committed = compromised. Rotate first.
- **Using secrets**: Scope to one step via env:. Never echo.
- **Variables**: Sensitive → secrets. Everything else → vars.
- **Environments**: environment: production = gated + scoped.
- **GITHUB_TOKEN**: Short-lived beats long-lived. Always.

## 06 · OIDC: Keyless Deploys to AWS

> ★ "No keys to leak if there are no keys."

| Command | What it does |
|---|---|
| `permissions: id-token: write` | allow OIDC |
| `configure-aws-credentials@v4 role-to-assume:` | assume role |
| `token.actions.githubusercontent.com:sub` | pin repo/branch |
| `:aud = sts.amazonaws.com` | pin audience |
| `AssumeRoleWithWebIdentity` | STS call |
| `one role per repo/env` | least privilege |

**Memory hooks:**

- **Why keys are bad**: Keys live forever; OIDC creds die in an hour.
- **Identity provider (once)**: One provider per account, then roles per repo.
- **The trust policy**: Always pin aud AND sub.
- **The workflow side**: id-token: write → configure-aws-credentials → deploy.
- **Least privilege for deploy roles**: Per repo, per env, minimal, audited.

## 07 · Deploy IaC from a Pipeline

> ★ "Lint it, scan it, preview it, then ship it."

| Command | What it does |
|---|---|
| `cfn-lint template.yaml` | validate |
| `checkov -f template.yaml` | scan |
| `sam deploy --no-execute-changeset` | preview |
| `sam deploy --no-confirm-changeset --no-fail-on-empty-changeset` | CI deploy |
| `needs: validate + if: main` | gate |
| `schedule: cron + detect-stack-drift` | drift |

**Memory hooks:**

- **Validate**: Invalid templates never reach AWS.
- **Scan**: Scan in the PR, not after the breach.
- **Preview the change**: Review the diff, not just the code.
- **Deploy from main**: validate → (main only) → OIDC → deploy.
- **Drift & environments**: Same template, per-env params, nightly drift check.

## 08 · Containers: Docker → ECR → ECS

> ★ "Build → tag with SHA → scan → push → roll out."

| Command | What it does |
|---|---|
| `FROM python:3.12-slim · USER 1000` | good Dockerfile |
| `amazon-ecr-login@v2 (id: login-ecr)` | ECR auth |
| `${{ steps.login-ecr.outputs.registry }}` | registry URL |
| `:${{ github.sha }}` | immutable tag |
| `trivy image --exit-code 1` | scan gate |
| `amazon-ecs-deploy-task-definition` | roll out |

**Memory hooks:**

- **Images & Dockerfiles**: Slim base, pinned deps, non-root user.
- **Authenticate to ECR**: creds → ecr-login → push.
- **Tag with the commit SHA**: SHA tags = traceable + rollback-able.
- **Scan the image**: Scan in CI and keep scanning in ECR.
- **Roll out to ECS**: New task def → rolling update → circuit breaker.

## 09 · Deployment Strategies & Rollback

> ★ "Small blast radius, fast rollback."

| Command | What it does |
|---|---|
| `rolling` | gradual, cheap |
| `blue/green` | flip, instant rollback |
| `canary + alarms` | progressive |
| `feature flags` | deploy ≠ release |
| `on: workflow_dispatch: inputs:` | manual rollback |
| `${{ inputs.version }}` | use input |

**Memory hooks:**

- **Rolling**: Cheap, gradual, mixed versions.
- **Blue/green**: Instant switch, instant rollback, double cost briefly.
- **Canary**: 10% + alarms → 100% or rollback.
- **Feature flags**: Deploy anytime, release when ready.
- **Rollback on demand**: A rollback you've never run is a rollback you don't have.

## 10 · Supply-Chain Security for Pipelines

> ★ "Pin, Permit, Pass-through, Protect, Patch": pin actions, minimal permissions, pass untrusted input through env, protect secrets, patch with Dependabot.

| Command | What it does |
|---|---|
| `uses: owner/action@<sha>  # vX` | pin |
| `permissions: contents: read` | least privilege |
| `env: TITLE: ${{ github.event.pull_request.title }}` | no injection |
| `package-ecosystem: github-actions` | Dependabot pins |
| `secret scanning + push protection` | stop leaks |
| `avoid pull_request_target + PR checkout` | fork safety |

**Memory hooks:**

- **The threat model**: Whoever controls CI controls prod.
- **Pin actions to a SHA**: @main never. @v4 OK for official. @SHA for third-party.
- **Least-privilege GITHUB_TOKEN**: Read by default, write by exception, per job.
- **Script injection**: Untrusted &#36;{{ }} never inside run:. Env it.
- **Secrets & Dependabot**: OIDC for AWS, secrets for the rest, Dependabot for freshness.

## 11 · Security Scanning Gates (DevSecOps)

> ★ "Code, Deps, Secrets, Infra, Image": C-D-S-I-I, "Can Developers Ship It Insecurely? No."

| Command | What it does |
|---|---|
| `bandit -r src` | Python SAST |
| `github/codeql-action` | deep SAST |
| `pip-audit -r requirements.txt` | dependency CVEs |
| `gitleaks detect` | secret scan |
| `checkov -d infra` | IaC scan |
| `deploy: needs: [test, security]` | the gate |

**Memory hooks:**

- **Shift left**: Left = early = cheap.
- **SAST: your code**: SAST reads code without running it.
- **Dependencies & secrets**: Audit what you import; leak-check what you commit.
- **IaC & containers**: Report-only first, then block.
- **Make it a gate**: needs: security + required check = real gate.

## 12 · Pipeline Ops: CodePipeline, Reuse & DORA

> ★ DORA = "Frequent, Fast, Few failures, Fixed fast": deploy frequency, lead time, change failure rate, time to restore.

| Command | What it does |
|---|---|
| `buildspec.yml phases` | CodeBuild |
| `on: workflow_call` | reusable workflow |
| `uses: org/repo/.github/workflows/x.yml@v1` | call it |
| `concurrency: group: deploy-${{ github.ref }}` | one at a time |
| `timeout-minutes: 20` | no zombie jobs |
| `DORA: frequency · lead time · CFR · MTTR` | measure |

**Memory hooks:**

- **GitHub Actions vs CodePipeline**: Code on GitHub → Actions. Everything must stay in AWS → CodePipeline.
- **buildspec.yml**: phases: install → pre_build → build → post_build.
- **Reusable workflows**: workflow_call = function for pipelines.
- **Concurrency & timeouts**: concurrency for order, timeout-minutes for sanity.
- **DORA metrics**: Frequent, Fast, Few failures, Fixed fast.

