# Kintsugi — self-healing CI/CD (demo)

When a build fails, Kintsugi works out why, proposes a fix, proves the fix in a sandbox, and opens a PR for a human to approve.

```
Demo MERN App → Build / Test → FAILURE → Log Parser (Regex + FSM)
  → Root Cause Engine → AI Repair Planner → Docker Verification → PASS / REJECT
```

This is a front-end demo: the whole loop runs in the browser against a small virtual MERN todo app. There is no backend. Data (runs, repairs, approvals) is stored in your browser's localStorage.

## Try it

1. Open the site and click **Sign in with GitHub** (no real auth — it just enters the app).
2. Go to **Live Run**, pick a failure scenario, and click **Run pipeline**.
3. Follow the verdict link to review the repair, then **Approve** or **Reject** it. Pipelines, Knowledge and Analytics update accordingly.

Six scenarios ship with the demo: missing dependency, renamed component, MongoDB unreachable, Node version mismatch, API status regression (all PASS), and a missing secret (REJECT — the safe fix can't be verified without secrets, and the unsafe one is caught by gitleaks).

## How the loop works

| Stage | Code | What it does |
|---|---|---|
| Build / Test | `src/engine/mernApp.ts` | Interprets the virtual repo like its GitHub Actions workflow: npm engine checks, Vite import resolution, env vars, MongoDB reachability, Jest assertions. |
| Log Parser | `src/engine/logParser.ts` | Ordered regex rules turn log lines into tokens; a finite-state machine groups them into typed error events. |
| Root Cause | `src/engine/rootCause.ts` | Ranks events by causal precedence, sets downstream noise aside, and checks the guess against the repo to score confidence. |
| AI Repair Planner | `src/engine/repairPlanner.ts` | Generates candidate fixes and ranks them by confidence × strategy prior × risk × patch size. Runs locally. |
| Docker Verification | `src/engine/dockerVerify.ts` | Replays each candidate in a simulated sandbox (no repo secrets): build + tests, original-error check, gitleaks- and semgrep-style scans. |
| Verdict | `src/engine/pipeline.ts` | PASS proposes a PR (never auto-merged); REJECT escalates to a human. |

## Development

```bash
pnpm install
pnpm dev        # http://localhost:8443
pnpm build
```

Deployment to GitHub Pages runs from `.github/workflows/deploy.yml` on every push to `main`.
