window.COURSE = {
 "short": "CI/CD",
 "key": "cicd-explorer-v1",
 "prompt": "$",
 "termTitle": "terminal",
 "where": "CI",
 "lab": "cicd",
 "handsOn": "Workflow Simulator challenge",
 "errRe": "##\\[error\\]|error occurred|Error:|Found \\d+ errors?|^E\\d{4} |failed(?! checks: 0)|Issue:|vulnerab",
 "cats": [
  [
   "all",
   "ALL"
  ],
  [
   "core",
   "BASICS"
  ],
  [
   "build",
   "BUILD & TEST"
  ],
  [
   "aws",
   "DEPLOY TO AWS"
  ],
  [
   "sec",
   "SECURITY"
  ],
  [
   "ops",
   "OPERATIONS"
  ]
 ],
 "catTitle": {
  "core": "CI/CD BASICS",
  "build": "BUILD, TEST & SECRETS",
  "aws": "DEPLOY TO AWS",
  "sec": "DEVSECOPS",
  "ops": "PIPELINE OPERATIONS"
 },
 "kinds": {
  "yaml": [
   "WORKFLOW",
   "#7c3aed"
  ],
  "gh": [
   "GITHUB",
   "#1f2937"
  ],
  "git": [
   "GIT",
   "#f05032"
  ],
  "cli": [
   "AWS CLI",
   "#1d5bd8"
  ],
  "tool": [
   "TOOLING",
   "#0d9488"
  ],
  "err": [
   "FAILURE",
   "#e11d48"
  ]
 },
 "layers": [
  "WORKFLOWS",
  "JOBS & TESTS",
  "SECRETS & AUTH",
  "SHIPPING",
  "SECURITY",
  "OPERATIONS"
 ],
 "levels": [
  [
   0,
   "MANUAL DEPLOYER"
  ],
  [
   150,
   "WORKFLOW WRITER"
  ],
  [
   400,
   "TEST AUTOMATOR"
  ],
  [
   800,
   "PIPELINE BUILDER"
  ],
  [
   1300,
   "RELEASE ENGINEER"
  ],
  [
   2000,
   "DEVSECOPS ENGINEER"
  ],
  [
   2900,
   "PLATFORM ARCHITECT"
  ]
 ]
};
COURSE.errRe = new RegExp(COURSE.errRe, "i");
