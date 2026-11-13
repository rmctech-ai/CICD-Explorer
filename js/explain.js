window.EXPLAIN = {
"what-is-cicd": [
 ["Continuous Deployment ships every change that passes the pipeline to production automatically, with no human approval. Continuous Delivery keeps it always deployable but adds a manual release gate.", ["Manual releases are the opposite of continuous deployment.", null, "Nightly builds are scheduled CI, not deployment.", "Stopping at staging with a manual gate is continuous delivery."]],
 ["Run fast, cheap checks (lint, unit tests) first so broken changes fail in seconds, before slower tests and deploys spend time and money.", ["Production deploys come last, after every check passes.", null, "Load tests are slow; run them later or nightly.", "Manual QA is slow and shouldn't block quick feedback."]],
 ["The four DORA metrics are deployment frequency, lead time for changes, change failure rate and time to restore service.", ["Lines of code measures size, not delivery performance.", null, "Branch count isn't a DORA metric.", "CPU usage is an infrastructure metric."]],
 ["CI runs builds and tests on every push or PR, so you learn within minutes whether a change broke something, while it's still fresh in your mind.", ["Runners are a means, not the benefit; minutes can cost money.", null, "CI usually means more automated tests, not fewer.", "CI is about automation, not manual deploys."]]
],
"triggers": [
 ["For pull_request, branches filters on the base (target) branch, so this runs for PRs opened into main, whatever the source branch is called.", ["The source branch is filtered with a different approach (head_ref checks).", null, "Tags use the tags: filter on push.", "Paths use the paths: filter."]],
 ["Jobs run in parallel on separate runners unless needs: creates a dependency between them.", ["Order only exists when you add needs.", null, "Both jobs run.", "Each job gets its own fresh runner VM."]],
 ["workflow_dispatch adds a \"Run workflow\" button (and API trigger) with optional typed inputs, which is perfect for manual deploys or rollbacks.", ["schedule runs on cron times.", null, "release runs when a GitHub release is published.", "push runs on commits."]],
 ["github.ref is the full reference, refs/heads/main for branches (refs/tags/v1.0 for tags). github.ref_name gives just main.", ["That's github.ref_name.", null, "origin/main is a local git remote name.", "HEAD isn't what GitHub puts in github.ref."]]
],
"needs-if": [
 ["A job with needs: test runs only if test succeeds; otherwise it's skipped (unless its if: uses always() or failure()).", ["Dependents require success by default.", null, "GitHub doesn't retry failed jobs automatically.", "The job definition stays; it just doesn't run."]],
 ["if: failure() is true when any earlier step or needed job has failed, which is perfect for alerts or cleanup.", ["always() runs whether it failed or not.", null, "continue-on-error lets a step fail without failing the job.", "needs orders jobs; it isn't a step condition."]],
 ["Files move between jobs with actions/upload-artifact and download-artifact, because each job runs on a fresh VM.", ["Outputs pass small strings, not files.", null, "Env vars don't carry files between VMs.", "Secrets are for credentials."]],
 ["Gate deploys on both the event and branch: only pushes to main deploy; pull requests just test.", ["needs orders jobs but doesn't stop PR runs.", null, "runs-on picks the runner OS.", "permissions scopes the token."]]
],
"testing": [
 ["A matrix creates one job per combination; two Python versions means two jobs running in parallel.", ["The matrix multiplies jobs.", null, "Matrix values create jobs, not steps.", "It definitely creates jobs."]],
 ["Including hashFiles('requirements.txt') in the cache key means the cache is reused until dependencies change, then rebuilt.", ["Dates bust the cache daily for no reason.", null, "A random key never hits the cache.", "The run number changes every run."]],
 ["Required status checks in branch protection (or rulesets) block merging until CI passes; without them CI is just advisory.", ["More tests don't block merges by themselves.", null, "Caching speeds things up.", "A matrix broadens testing."]],
 ["The test pyramid has many fast unit tests at the base, fewer integration tests, and few slow end-to-end tests at the top.", ["E2E tests are the few at the top.", null, "Manual tests should be rare.", "Load tests are specialized and few."]]
],
"secrets": [
 ["Bots scrape public repos within minutes, so revoke or rotate the key first. Deleting the commit doesn't help; it stays in history and forks.", ["History, forks and caches still contain it.", null, "It may already have been harvested.", "Ignoring a leaked key invites abuse."]],
 ["Non-sensitive configuration like AWS_REGION belongs in variables (vars.AWS_REGION), which are visible in logs and easy to change.", ["Secrets are for sensitive values; masking a Region adds friction.", null, "Hard-coding makes changes harder.", "Artifacts are build outputs."]],
 ["Environments with required reviewers pause the job until an approver clicks approve, and environment secrets are released only after that.", ["A matrix multiplies jobs.", null, "Caching speeds up builds.", "needs orders jobs; it doesn't require approval."]],
 ["Workflows triggered by pull requests from forks don't get repository secrets (and get a read-only token), so a malicious PR can't steal them.", ["Fork PRs don't receive secrets by default.", null, "The token is read-only for forks.", "Not a real rule."]]
],
"oidc": [
 ["The job needs permissions: id-token: write to request GitHub's signed OIDC token, which it exchanges for AWS credentials.", ["contents: write lets it push code, which isn't needed for OIDC.", null, "actions: write manages workflows.", "packages: read reads packages."]],
 ["The sub claim condition (repo:owner/repo:ref:refs/heads/main) pins which repo and branch can assume the role. Without it, any GitHub repository could.", ["Without it the role is wide open.", null, "OIDC still works, dangerously.", "Any repo, not just forks, could assume it."]],
 ["STS returns temporary role credentials, by default for about one hour, and nothing long-lived is stored in GitHub.", ["Nothing permanent is issued.", null, "No passwords are involved.", "SSH keys aren't used."]],
 ["configure-aws-credentials calls sts:AssumeRoleWithWebIdentity, exchanging the OIDC token for role credentials.", ["GetSessionToken is for IAM users, often with MFA.", null, "AssumeRoleWithSAML is for SAML federation.", "GetFederationToken is for IAM users creating federated sessions."]]
],
"iac-pipeline": [
 ["--no-execute-changeset creates the change set (the diff) without running it, so reviewers can see Add/Modify/Remove and replacements in the PR.", [null, "delete-stack destroys everything.", "checkov scans security; it doesn't preview changes.", "terraform destroy deletes Terraform resources."]],
 ["Checkov scans CloudFormation, Terraform, Kubernetes and Dockerfiles for misconfigurations like public buckets or open security groups.", ["pytest runs Python tests.", null, "ruff lints Python code.", "curl makes HTTP requests."]],
 ["Deploy only after lint, scan and plan succeed, and only from main (needs + if), so nothing unreviewed reaches AWS.", ["PRs should validate, not deploy.", null, "Lint must pass first.", "Automation from main is safer than manual deploys."]],
 ["A scheduled workflow running detect-stack-drift nightly catches manual console changes early.", [null, "A matrix runs variations of jobs.", "Caching speeds up builds.", "Artifacts store files."]]
],
"containers": [
 ["Tagging with the commit SHA makes every image traceable to exactly one commit and enables precise rollback.", [":latest is mutable and unclear.", null, ":prod gets overwritten on every release.", "A fixed tag isn't traceable."]],
 ["ECR requires authentication: run aws-actions/amazon-ecr-login (after configure-aws-credentials) before docker push.", ["Unauthenticated pushes are denied.", null, "Repositories aren't created on push by default.", "Scanning is separate."]],
 ["IMMUTABLE tag settings reject pushes that would overwrite an existing tag, so a SHA tag always means the same image.", [null, "Lifecycle policies expire old images.", "Scanning finds CVEs.", "Replication copies images to other Regions."]],
 ["ECS services use rolling updates by default, replacing tasks gradually with an optional deployment circuit breaker for automatic rollback.", ["Blue/green requires CodeDeploy (or the ECS blue/green option).", null, "Canary needs blue/green-style deployment tooling.", "Recreate isn't the ECS default."]]
],
"strategies": [
 ["Blue/green keeps the old environment running, so rollback is just switching traffic back, which takes seconds.", ["Rolling rollback means rolling again, which is slower.", null, "Recreate has downtime and no instant rollback.", "A matrix is a CI concept."]],
 ["A canary sends a small percentage of traffic to the new version first, watches alarms, then shifts the rest or rolls back automatically.", [null, "Blue/green shifts all traffic at once.", "Rolling replaces instances gradually without a traffic split.", "A freeze stops deploys."]],
 ["Feature flags separate deploy from release: code ships switched off, and you turn it on or off at runtime without a deploy.", [null, "A new image is a redeploy.", "Deleting the stack is destructive.", "A matrix is for CI jobs."]],
 ["workflow_dispatch with inputs gives a manual run button where you type the version, ideal for rollbacks.", ["schedule can't take inputs.", null, "pull_request runs on PR activity.", "push runs on commits."]]
],
"supply-chain": [
 ["A full 40-character commit SHA can't be moved, unlike tags or branches that an attacker with repo access could repoint.", ["@main changes with every commit.", "@latest isn't even a valid ref for most actions.", null, "No version means it won't resolve."]],
 ["Put untrusted data in env: and reference \"$TITLE\" in the script, so the shell treats it as data, not code to execute.", ["Quoting doesn't stop injection, because the expression is expanded before the shell runs.", null, "pull_request_target is more dangerous (it has secrets).", "Base64 doesn't address the root cause."]],
 ["Set permissions: contents: read at the top and grant more (like id-token: write) only in the jobs that need it.", ["write-all gives every job full write access.", null, "admin isn't a token scope.", "You can and should set permissions."]],
 ["Dependabot's github-actions ecosystem opens PRs to update action versions and SHA pins.", ["npm updates JavaScript packages.", null, "docker updates image tags.", "That ecosystem name doesn't exist."]]
],
"security-gates": [
 ["Static Application Security Testing reads your source code for dangerous patterns; Bandit (Python) and CodeQL are SAST tools.", ["Dependency scanners check libraries you import.", null, "Container scanners check images.", "Secret managers store secrets."]],
 ["pip-audit checks your Python dependencies against vulnerability databases (CVEs/GHSA), which is software composition analysis.", [null, "Port scanning is network testing.", "YAML linting is different.", "Slow tests are a performance issue."]],
 ["deploy: needs: [security] means a failed scan job stops the deploy job from running, which makes it a real gate.", ["continue-on-error ignores failures.", null, "always() runs even after failures.", "A schedule doesn't gate deploys."]],
 ["Start in report-only mode (soft-fail) to see findings without blocking, fix the backlog, then switch to blocking.", ["Disabling hides problems.", null, "Scanning once a week leaves gaps.", "PRs are where scanning helps most."]]
],
"pipeline-ops": [
 ["CodeBuild reads buildspec.yml (phases: install, pre_build, build, post_build). CodeDeploy uses appspec.yml.", ["workflow.yml is a GitHub Actions convention.", null, "appspec.yml is for CodeDeploy.", "Jenkinsfile is for Jenkins."]],
 ["on: workflow_call makes a workflow reusable; other workflows call it with uses: org/repo/.github/workflows/x.yml@ref.", [null, "repository_dispatch is an external trigger via API.", "uses: ./ calls a local action, not a workflow.", "needs orders jobs."]],
 ["concurrency: group puts runs with the same group key in a queue (optionally canceling older ones), so two deploys never overlap.", ["Timeouts stop long jobs.", null, "continue-on-error ignores failures.", "A matrix multiplies jobs."]],
 ["Change failure rate (percentage of deployments causing failures) is one of the four DORA metrics.", ["Lines of code isn't a DORA metric.", null, "File counts aren't DORA metrics.", "Runner CPU is infrastructure."]]
]
};

/* merge into the lessons (loaded after lessons, before app.js) */
(function (E) { (window.LESSONS || []).forEach(l => { const x = E[l.id]; if (!x || !l.quiz) return; x.forEach((e, i) => { const q = l.quiz[i]; if (!q || !e) return; if (e[0]) q.why = e[0]; if (e[1]) q.w = e[1]; }); }); })(window.EXPLAIN || {});
