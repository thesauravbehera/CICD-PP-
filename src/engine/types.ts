// ─── Shared engine types ──────────────────────────────────────────────────────

/** Virtual repository: path → file contents */
export type RepoFS = Record<string, string>

export interface BuildResult {
  ok: boolean
  /** CI step that failed, e.g. "npm test (server)" */
  failedStep?: string
  log: string
  testsTotal: number
  testsFailed: number
}

// ── Log parser ────────────────────────────────────────────────────────────────

export type ParserState =
  | 'SCAN'
  | 'NODE_ERROR'
  | 'REQUIRE_STACK'
  | 'STACK_TRACE'
  | 'NPM_ERROR'
  | 'BUNDLER_ERROR'
  | 'JEST_FAILURE'
  | 'JEST_ASSERTION'
  | 'DONE'

export type TokenKind =
  | 'STEP'
  | 'NPM_ERR'
  | 'ENGINE'
  | 'NODE_ERR'
  | 'MODULE_NOT_FOUND'
  | 'REQUIRE_STACK'
  | 'STACK_ITEM'
  | 'STACK_FRAME'
  | 'BUNDLER_UNRESOLVED'
  | 'ECONNREFUSED'
  | 'ENV_MISSING'
  | 'JEST_FAIL'
  | 'JEST_TEST'
  | 'EXPECTED'
  | 'RECEIVED'
  | 'CODE_POINTER'
  | 'TEST_SUMMARY'
  | 'EXIT'
  | 'BLANK'
  | 'TEXT'

export interface Token {
  kind: TokenKind
  line: number
  raw: string
  groups: string[]
}

export interface Transition {
  line: number
  from: ParserState
  to: ParserState
  token: TokenKind
}

export type ErrorKind =
  | 'MODULE_NOT_FOUND'
  | 'UNRESOLVED_IMPORT'
  | 'ENGINE_MISMATCH'
  | 'CONNECTION_REFUSED'
  | 'MISSING_ENV'
  | 'ASSERTION_FAILURE'
  | 'GENERIC_ERROR'

export interface ErrorEvent {
  kind: ErrorKind
  message: string
  step?: string
  symbol?: string
  file?: string
  line?: number
  expected?: string
  received?: string
  testName?: string
  frames: string[]
  evidence: number[]
}

export interface ParseResult {
  tokens: Token[]
  transitions: Transition[]
  events: ErrorEvent[]
  exitCode?: number
}

// ── Root cause ────────────────────────────────────────────────────────────────

export type RootCauseCategory =
  | 'MISSING_DEPENDENCY'
  | 'BROKEN_IMPORT'
  | 'RUNTIME_MISMATCH'
  | 'SERVICE_UNAVAILABLE'
  | 'MISSING_ENV'
  | 'LOGIC_REGRESSION'
  | 'UNKNOWN'

export interface RootCause {
  category: RootCauseCategory
  summary: string
  symbol?: string
  file?: string
  line?: number
  /** Which package (server / client) owns the failure */
  workspace?: 'server' | 'client'
  confidence: number
  signals: string[]
  /** Events judged to be downstream consequences rather than the cause */
  suppressed: string[]
  meta: Record<string, string>
}

// ── Planner ───────────────────────────────────────────────────────────────────

export type Risk = 'low' | 'med' | 'high'

export interface FileEdit {
  path: string
  before: string
  after: string
}

export interface RepairCandidate {
  id: string
  strategy: string
  title: string
  rationale: string
  risk: Risk
  score: number
  features: { label: string; value: number }[]
  edits: FileEdit[]
  diff: string
}

export interface RepairPlan {
  candidates: RepairCandidate[]
}

// ── Verification ──────────────────────────────────────────────────────────────

export type CheckStatus = 'pass' | 'fail' | 'skip'

export interface VerifyCheck {
  id: string
  label: string
  status: CheckStatus
  durationMs: number
  detail: string
}

export interface VerifyAttempt {
  candidateId: string
  image: string
  dockerfile: string
  checks: VerifyCheck[]
  log: string
  passed: boolean
  reasons: string[]
}

export interface Verification {
  attempts: VerifyAttempt[]
  verdict: 'PASS' | 'REJECT'
  acceptedCandidateId?: string
  reasons: string[]
}
