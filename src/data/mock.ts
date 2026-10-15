// ─── Types ────────────────────────────────────────────────────────────────────

export type PipelineStatus = 'failed' | 'running' | 'passing' | 'repairing'
export type RepairOutcome = 'proposed' | 'merged' | 'rejected' | 'expired'
export type StageStatus = 'pass' | 'fail' | 'skip' | 'running' | 'pending'
export type RiskLevel = 'low' | 'med' | 'high'

export interface StageResult {
  id: string
  label: string
  status: StageStatus
  durationMs?: number
  detail?: string
}

export interface Pipeline {
  id: string
  repo: string
  branch: string
  commitSha: string
  commitMsg: string
  author: string
  status: PipelineStatus
  failedStep?: string
  errorType?: string
  errorSymbol?: string
  logExcerpt?: string
  durationMs: number
  triggeredAt: string
  repairId?: string
  /** Live Run scenario that produced this pipeline (demo runs only) */
  scenarioId?: string
  stages: StageResult[]
}

export interface ValidationResult {
  tests: { passed: boolean; durationMs: number; total: number; failed: number; summary: string }
  gitleaks: { passed: boolean; findings: number }
  semgrep: { passed: boolean; findings: number }
}

export interface Repair {
  id: string
  pipelineId: string
  repo: string
  branch: string
  templateId: string
  matchedFailureRepo: string
  matchedFailureDate: string
  similarity: number
  confidence: number
  patch: string
  prNumber?: number
  prUrl?: string
  branchName: string
  outcome: RepairOutcome
  outcomeAt?: string
  outcomeActor?: string
  outcomeReason?: string
  validation: ValidationResult
  attempts: number
  createdAt: string
  explanation: string
}

export interface FailureSignature {
  id: string
  repo: string
  errorType: string
  language: string
  step: string
  symbol?: string
  occurrences: number
  lastSeen: string
  resolvedByTemplateId?: string
  avgConfidence?: number
}

export interface KBTemplate {
  id: string
  name: string
  language: string
  errorTypes: string[]
  risk: RiskLevel
  uses: number
  successRate: number
  quarantined: boolean
}

export interface AnalyticsPoint {
  date: string
  value: number
}

// ─── Pipelines ────────────────────────────────────────────────────────────────

export const PIPELINES: Pipeline[] = [
  {
    id: 'run-001',
    repo: 'acme/backend',
    branch: 'main',
    commitSha: 'a3f8c9d',
    commitMsg: 'feat: add user preferences endpoint',
    author: 'raaj',
    status: 'repairing',
    failedStep: 'install',
    errorType: 'MODULE_NOT_FOUND',
    errorSymbol: 'zod',
    logExcerpt: `> acme-backend@2.1.0 install\n> node scripts/setup.js\n\nerror: Cannot find module 'zod'\nRequire stack:\n  - /workspace/src/validators/user.ts:1:16\n  - /workspace/src/routes/users.ts:3:22\n\nnode:internal/modules/cjs/loader:1039\n  throw err;\n  ^\n\nError: Cannot find module 'zod'\n  at Function.Module._resolveFilename (node:internal/modules/cjs/loader:1039:15)\n  at Function.Module._load (node:internal/modules/cjs/loader:885:27)`,
    durationMs: 47000,
    triggeredAt: '2026-09-03T14:23:00Z',
    repairId: 'rep-001',
    stages: [
      { id: 'build', label: 'Build / Test', status: 'fail', durationMs: 47000, detail: 'install · exit code 1' },
      { id: 'parse', label: 'Log Parser', status: 'pass', durationMs: 38, detail: 'FSM: SCAN → NODE_ERROR → REQUIRE_STACK → STACK_TRACE · MODULE_NOT_FOUND symbol=zod' },
      { id: 'root-cause', label: 'Root Cause', status: 'pass', durationMs: 120, detail: 'MISSING_DEPENDENCY · zod absent from package.json · 94% confidence' },
      { id: 'plan', label: 'AI Repair Planner', status: 'pass', durationMs: 220, detail: 'Top candidate: add-missing-dep · zod@^3.24.1 → dependencies (score 0.86)' },
      { id: 'verify', label: 'Docker Verification', status: 'pass', durationMs: 48200, detail: 'Tests: 127/127 · Gitleaks: clean · Semgrep: clean' },
      { id: 'verdict', label: 'Verdict', status: 'running', detail: 'PASS · opening PR on acme/backend…' },
    ],
  },
  {
    id: 'run-002',
    repo: 'acme/auth-service',
    branch: 'feat/oauth-refresh',
    commitSha: 'b7e12aa',
    commitMsg: 'fix: refresh token rotation on expiry',
    author: 'maya',
    status: 'failed',
    failedStep: 'build',
    errorType: 'TS_ERROR',
    errorSymbol: './handlers/refresh',
    logExcerpt: `> tsc --noEmit\n\nsrc/routes/auth.ts:12:28 - error TS2307: Cannot find module './handlers/refresh' or its corresponding type declarations.\n\n12 import { refreshHandler } from './handlers/refresh';\n                              ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n\nFound 1 error in src/routes/auth.ts:12`,
    durationMs: 23000,
    triggeredAt: '2026-09-03T13:44:00Z',
    repairId: 'rep-002',
    stages: [
      { id: 'build', label: 'Build / Test', status: 'fail', durationMs: 23000, detail: 'tsc --noEmit · TS2307' },
      { id: 'parse', label: 'Log Parser', status: 'pass', durationMs: 31 },
      { id: 'root-cause', label: 'Root Cause', status: 'pass', durationMs: 140, detail: 'BROKEN_IMPORT · ./handlers/refresh · 78% confidence' },
      { id: 'plan', label: 'AI Repair Planner', status: 'pass', durationMs: 310, detail: 'Top candidate: fix-import-path (score 0.64)' },
      { id: 'verify', label: 'Docker Verification', status: 'fail', durationMs: 22800, detail: 'Tests: 41/44 · 3 failing · fix-import-path repair did not resolve all refs' },
      { id: 'verdict', label: 'Verdict', status: 'fail', detail: 'REJECT · escalated to a human, no PR opened' },
    ],
  },
  {
    id: 'run-003',
    repo: 'acme/frontend',
    branch: 'main',
    commitSha: 'c4d901f',
    commitMsg: 'chore: upgrade vite to 8.x',
    author: 'priya',
    status: 'passing',
    durationMs: 94000,
    triggeredAt: '2026-09-03T12:10:00Z',
    stages: [
      { id: 'build', label: 'Build / Test', status: 'pass', durationMs: 94000 },
      { id: 'parse', label: 'Log Parser', status: 'skip' },
      { id: 'root-cause', label: 'Root Cause', status: 'skip' },
      { id: 'plan', label: 'AI Repair Planner', status: 'skip' },
      { id: 'verify', label: 'Docker Verification', status: 'skip' },
      { id: 'verdict', label: 'Verdict', status: 'skip' },
    ],
  },
  {
    id: 'run-004',
    repo: 'acme/payments',
    branch: 'main',
    commitSha: 'e9b3321',
    commitMsg: 'feat: stripe webhook handler v2',
    author: 'daniel',
    status: 'running',
    durationMs: 0,
    triggeredAt: '2026-09-03T14:31:00Z',
    stages: [
      { id: 'build', label: 'Build / Test', status: 'running' },
      { id: 'parse', label: 'Log Parser', status: 'pending' },
      { id: 'root-cause', label: 'Root Cause', status: 'pending' },
      { id: 'plan', label: 'AI Repair Planner', status: 'pending' },
      { id: 'verify', label: 'Docker Verification', status: 'pending' },
      { id: 'verdict', label: 'Verdict', status: 'pending' },
    ],
  },
  {
    id: 'run-005',
    repo: 'acme/backend',
    branch: 'fix/session-expire',
    commitSha: 'f2c7780',
    commitMsg: 'fix: session expiry calculation off-by-one',
    author: 'raaj',
    status: 'failed',
    failedStep: 'test',
    errorType: 'FLAKY_TEST',
    errorSymbol: 'SessionService.expire',
    logExcerpt: `FAIL src/services/__tests__/session.test.ts\n  SessionService\n    ✕ expire() returns correct unix timestamp (38ms)\n\n  ● SessionService › expire() returns correct unix timestamp\n\n    expect(received).toBe(expected)\n\n    Expected: 1725388800\n    Received: 1725388799\n\n      23 |   it('expire() returns correct unix timestamp', () => {\n      24 |     const svc = new SessionService({ ttl: 3600 })\n    > 25 |     expect(svc.expire()).toBe(NOW + 3600)\n         |                         ^\n      26 |   })\n\nTest Suites: 1 failed, 8 passed, 9 total\nTests:       1 failed, 84 passed, 85 total`,
    durationMs: 61000,
    triggeredAt: '2026-09-03T11:05:00Z',
    repairId: 'rep-003',
    stages: [
      { id: 'build', label: 'Build / Test', status: 'fail', durationMs: 61000, detail: 'jest · 1 failed, 84 passed' },
      { id: 'parse', label: 'Log Parser', status: 'pass', durationMs: 29 },
      { id: 'root-cause', label: 'Root Cause', status: 'pass', durationMs: 160, detail: 'FLAKY_TEST · SessionService.expire · 4 flakes in 14 days' },
      { id: 'plan', label: 'AI Repair Planner', status: 'pass', durationMs: 180, detail: 'Top candidate: retry-flaky-test (score 0.71)' },
      { id: 'verify', label: 'Docker Verification', status: 'pass', durationMs: 59800 },
      { id: 'verdict', label: 'Verdict', status: 'pass', durationMs: 1200, detail: 'PASS · PR #447 opened' },
    ],
  },
  {
    id: 'run-006',
    repo: 'acme/data-pipeline',
    branch: 'main',
    commitSha: 'a1b2c3d',
    commitMsg: 'perf: batch insert chunk size 500→2000',
    author: 'sasha',
    status: 'passing',
    durationMs: 142000,
    triggeredAt: '2026-09-03T09:22:00Z',
    stages: [
      { id: 'build', label: 'Build / Test', status: 'pass', durationMs: 142000 },
      { id: 'parse', label: 'Log Parser', status: 'skip' },
      { id: 'root-cause', label: 'Root Cause', status: 'skip' },
      { id: 'plan', label: 'AI Repair Planner', status: 'skip' },
      { id: 'verify', label: 'Docker Verification', status: 'skip' },
      { id: 'verdict', label: 'Verdict', status: 'skip' },
    ],
  },
]

// ─── Repairs ──────────────────────────────────────────────────────────────────

export const REPAIRS: Repair[] = [
  {
    id: 'rep-001',
    pipelineId: 'run-001',
    repo: 'acme/backend',
    branch: 'kintsugi/fix-zod-dep-a3f8c9d',
    templateId: 'add-missing-dep',
    matchedFailureRepo: 'acme/backend',
    matchedFailureDate: '2026-08-28',
    similarity: 0.94,
    confidence: 0.91,
    patch: `--- a/package.json
+++ b/package.json
@@ -14,7 +14,8 @@
   "dependencies": {
     "express": "^4.18.2",
     "helmet": "^7.1.0",
-    "cors": "^2.8.5"
+    "cors": "^2.8.5",
+    "zod": "^3.24.1"
   },
   "devDependencies": {
     "typescript": "^5.7.2",`,
    prNumber: 449,
    prUrl: 'https://github.com/acme/backend/pull/449',
    branchName: 'kintsugi/fix-zod-dep-a3f8c9d',
    outcome: 'proposed',
    validation: {
      tests: { passed: true, durationMs: 48200, total: 127, failed: 0, summary: '127 tests passed in 48.2s' },
      gitleaks: { passed: true, findings: 0 },
      semgrep: { passed: true, findings: 0 },
    },
    attempts: 1,
    createdAt: '2026-09-03T14:24:18Z',
    explanation: "Added `zod@^3.24.1` to `dependencies`. The failing file `src/validators/user.ts` imports it; nothing else in the repo declared it. Latest stable version fetched from registry.npmjs.org.",
  },
  {
    id: 'rep-002',
    pipelineId: 'run-002',
    repo: 'acme/auth-service',
    branch: 'kintsugi/fix-import-b7e12aa',
    templateId: 'fix-import-path',
    matchedFailureRepo: 'acme/backend',
    matchedFailureDate: '2026-09-01',
    similarity: 0.78,
    confidence: 0.72,
    patch: `--- a/src/routes/auth.ts
+++ b/src/routes/auth.ts
@@ -9,7 +9,7 @@
 import { Router } from 'express'
 import { authMiddleware } from '../middleware/auth'
 import { loginHandler } from './handlers/login'
-import { refreshHandler } from './handlers/refresh'
+import { refreshHandler } from './handlers/refresh-token'
 import { logoutHandler } from './handlers/logout'

 const router = Router()`,
    branchName: 'kintsugi/fix-import-b7e12aa',
    outcome: 'proposed',
    validation: {
      tests: { passed: false, durationMs: 22800, total: 44, failed: 3, summary: '3 tests failed — import path fix resolved TSC but runtime refs remain' },
      gitleaks: { passed: true, findings: 0 },
      semgrep: { passed: true, findings: 0 },
    },
    attempts: 1,
    createdAt: '2026-09-03T13:45:42Z',
    explanation: "Corrected import path from `./handlers/refresh` to `./handlers/refresh-token` — the closest filename match found in the codebase via fuzzy search.",
  },
  {
    id: 'rep-003',
    pipelineId: 'run-005',
    repo: 'acme/backend',
    branch: 'kintsugi/retry-session-f2c7780',
    templateId: 'retry-flaky-test',
    matchedFailureRepo: 'acme/backend',
    matchedFailureDate: '2026-09-01',
    similarity: 0.88,
    confidence: 0.85,
    patch: `--- a/src/services/__tests__/session.test.ts
+++ b/src/services/__tests__/session.test.ts
@@ -1,6 +1,8 @@
 import { SessionService } from '../session'

+jest.retryTimes(2)
+
 const NOW = 1725385200

 describe('SessionService', () => {`,
    prNumber: 447,
    prUrl: 'https://github.com/acme/backend/pull/447',
    branchName: 'kintsugi/retry-session-f2c7780',
    outcome: 'merged',
    outcomeAt: '2026-09-03T11:58:00Z',
    outcomeActor: 'raaj',
    validation: {
      tests: { passed: true, durationMs: 59800, total: 85, failed: 0, summary: '85 tests passed (1 retried) in 59.8s' },
      gitleaks: { passed: true, findings: 0 },
      semgrep: { passed: true, findings: 0 },
    },
    attempts: 1,
    createdAt: '2026-09-03T11:06:22Z',
    explanation: "Added `jest.retryTimes(2)` — this test has failed 4 times in the last 14 days, always passing on retry. Matches the flaky-test pattern with 88% similarity to prior occurrences.",
  },
  {
    id: 'rep-004',
    pipelineId: 'run-002',
    repo: 'acme/legacy-api',
    branch: 'kintsugi/bump-node-legacy',
    templateId: 'bump-node-version',
    matchedFailureRepo: 'acme/payments',
    matchedFailureDate: '2026-08-20',
    similarity: 0.82,
    confidence: 0.76,
    patch: `--- a/.nvmrc
+++ b/.nvmrc
@@ -1 +1 @@
-16.20.0
+20.18.0
--- a/package.json
+++ b/package.json
@@ -3,6 +3,6 @@
   "name": "legacy-api",
   "version": "1.8.4",
   "engines": {
-    "node": ">=16.0.0 <17"
+    "node": ">=20.10.0 <21"
   },`,
    branchName: 'kintsugi/bump-node-legacy',
    outcome: 'rejected',
    outcomeAt: '2026-09-02T09:15:00Z',
    outcomeActor: 'daniel',
    outcomeReason: "We're pinned to Node 16 on this service until Q4 migration. Suppressing node-version repairs on acme/legacy-api.",
    validation: {
      tests: { passed: true, durationMs: 34200, total: 56, failed: 0, summary: '56 tests passed in 34.2s' },
      gitleaks: { passed: true, findings: 0 },
      semgrep: { passed: true, findings: 0 },
    },
    attempts: 1,
    createdAt: '2026-09-02T08:44:00Z',
    explanation: "Updated `.nvmrc` from `16.20.0` to `20.18.0` and `engines.node` to `>=20.10.0 <21`. The build failed with `engines.node is incompatible` on the CI runner's Node 20.",
  },
]

// ─── Knowledge base ───────────────────────────────────────────────────────────

export const FAILURE_SIGNATURES: FailureSignature[] = [
  { id: 'sig-001', repo: 'acme/backend', errorType: 'MODULE_NOT_FOUND', language: 'javascript', step: 'install', symbol: 'zod', occurrences: 3, lastSeen: '2026-09-03', resolvedByTemplateId: 'add-missing-dep', avgConfidence: 0.91 },
  { id: 'sig-002', repo: 'acme/auth-service', errorType: 'TS_ERROR', language: 'typescript', step: 'build', symbol: './handlers/refresh', occurrences: 1, lastSeen: '2026-09-03', resolvedByTemplateId: 'fix-import-path', avgConfidence: 0.72 },
  { id: 'sig-003', repo: 'acme/backend', errorType: 'FLAKY_TEST', language: 'javascript', step: 'test', symbol: 'SessionService.expire', occurrences: 4, lastSeen: '2026-09-03', resolvedByTemplateId: 'retry-flaky-test', avgConfidence: 0.85 },
  { id: 'sig-004', repo: 'acme/payments', errorType: 'MODULE_NOT_FOUND', language: 'javascript', step: 'install', symbol: 'dayjs', occurrences: 2, lastSeen: '2026-09-01', resolvedByTemplateId: 'add-missing-dep', avgConfidence: 0.89 },
  { id: 'sig-005', repo: 'acme/frontend', errorType: 'MODULE_NOT_FOUND', language: 'javascript', step: 'build', symbol: '@radix-ui/react-dialog', occurrences: 1, lastSeen: '2026-08-30', resolvedByTemplateId: 'add-missing-dep', avgConfidence: 0.93 },
  { id: 'sig-006', repo: 'acme/data-pipeline', errorType: 'IMPORT_ERROR', language: 'python', step: 'install', symbol: 'pandas', occurrences: 5, lastSeen: '2026-08-28', resolvedByTemplateId: 'add-missing-dep-py', avgConfidence: 0.94 },
  { id: 'sig-007', repo: 'acme/legacy-api', errorType: 'ENGINE_INCOMPATIBLE', language: 'any', step: 'setup', occurrences: 2, lastSeen: '2026-09-02', resolvedByTemplateId: 'bump-node-version', avgConfidence: 0.76 },
  { id: 'sig-008', repo: 'acme/backend', errorType: 'ENV_UNDEFINED', language: 'javascript', step: 'test', symbol: 'STRIPE_SECRET_KEY', occurrences: 1, lastSeen: '2026-08-25', resolvedByTemplateId: 'add-env-var', avgConfidence: 0.80 },
]

export const KB_TEMPLATES: KBTemplate[] = [
  { id: 'add-missing-dep', name: 'Add missing npm dependency', language: 'js/ts', errorTypes: ['MODULE_NOT_FOUND', 'MODULE_NOT_FOUND'], risk: 'low', uses: 11, successRate: 0.91, quarantined: false },
  { id: 'add-missing-dep-py', name: 'Add missing Python dependency', language: 'python', errorTypes: ['ModuleNotFoundError'], risk: 'low', uses: 7, successRate: 0.93, quarantined: false },
  { id: 'fix-import-path', name: 'Fix import path', language: 'js/ts', errorTypes: ['TS_ERROR', 'MODULE_NOT_FOUND'], risk: 'med', uses: 4, successRate: 0.75, quarantined: false },
  { id: 'bump-node-version', name: 'Bump Node.js version', language: 'any', errorTypes: ['ENGINE_INCOMPATIBLE'], risk: 'low', uses: 3, successRate: 0.80, quarantined: false },
  { id: 'add-env-var', name: 'Add missing env var to .env.example', language: 'any', errorTypes: ['ENV_UNDEFINED'], risk: 'low', uses: 2, successRate: 1.0, quarantined: false },
  { id: 'retry-flaky-test', name: 'Add retry wrapper for flaky test', language: 'js/py', errorTypes: ['FLAKY_TEST'], risk: 'med', uses: 5, successRate: 0.88, quarantined: false },
]

// ─── Analytics ────────────────────────────────────────────────────────────────

export const ANALYTICS_MTTR: AnalyticsPoint[] = [
  { date: 'Aug 5', value: 47 }, { date: 'Aug 8', value: 44 }, { date: 'Aug 11', value: 52 },
  { date: 'Aug 14', value: 38 }, { date: 'Aug 17', value: 35 }, { date: 'Aug 20', value: 41 },
  { date: 'Aug 23', value: 28 }, { date: 'Aug 26', value: 24 }, { date: 'Aug 29', value: 31 },
  { date: 'Sep 1', value: 19 }, { date: 'Sep 3', value: 14 },
]

export const ANALYTICS_APPROVAL: AnalyticsPoint[] = [
  { date: 'Aug 5', value: 68 }, { date: 'Aug 8', value: 72 }, { date: 'Aug 11', value: 65 },
  { date: 'Aug 14', value: 78 }, { date: 'Aug 17', value: 81 }, { date: 'Aug 20', value: 79 },
  { date: 'Aug 23', value: 85 }, { date: 'Aug 26', value: 88 }, { date: 'Aug 29', value: 84 },
  { date: 'Sep 1', value: 91 }, { date: 'Sep 3', value: 89 },
]

export const ANALYTICS_KB: AnalyticsPoint[] = [
  { date: 'Aug 5', value: 14 }, { date: 'Aug 8', value: 19 }, { date: 'Aug 11', value: 24 },
  { date: 'Aug 14', value: 27 }, { date: 'Aug 17', value: 33 }, { date: 'Aug 20', value: 38 },
  { date: 'Aug 23', value: 44 }, { date: 'Aug 26', value: 49 }, { date: 'Aug 29', value: 55 },
  { date: 'Sep 1', value: 61 }, { date: 'Sep 3', value: 67 },
]

// ─── Settings mock org ────────────────────────────────────────────────────────

export const MOCK_ORG = {
  login: 'acme',
  plan: 'team' as const,
  repos: [
    { id: 'r1', name: 'acme/backend', lang: 'javascript', autoRepair: true, prReview: true },
    { id: 'r2', name: 'acme/auth-service', lang: 'typescript', autoRepair: true, prReview: false },
    { id: 'r3', name: 'acme/frontend', lang: 'javascript', autoRepair: true, prReview: true },
    { id: 'r4', name: 'acme/payments', lang: 'typescript', autoRepair: true, prReview: true },
    { id: 'r5', name: 'acme/data-pipeline', lang: 'python', autoRepair: true, prReview: false },
    { id: 'r6', name: 'acme/legacy-api', lang: 'javascript', autoRepair: false, prReview: false },
  ],
  dailyBudgetCents: 500,
  stripeCustomerId: 'cus_test_acme',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function fmtDuration(ms: number): string {
  if (ms === 0) return '–'
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

export function confidenceColor(c: number): string {
  if (c >= 0.85) return '#10b981'
  if (c >= 0.7) return '#d4a804'
  return '#f87171'
}

export function statusColor(s: PipelineStatus | RepairOutcome): string {
  switch (s) {
    case 'passing': case 'merged': return '#10b981'
    case 'failed': case 'rejected': return '#f87171'
    case 'running': case 'repairing': case 'proposed': return '#7170ff'
    case 'expired': return '#62666d'
    default: return '#8a8f98'
  }
}
