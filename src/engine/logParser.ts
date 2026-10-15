import type { ErrorEvent, ErrorKind, ParseResult, ParserState, Token, TokenKind, Transition } from './types'

// ─── Lexer: ordered regex rules ───────────────────────────────────────────────
// First matching rule wins. Some rules are only active in certain FSM states
// (e.g. a bare indented path only means "require-stack entry" after
// "Require stack:").

interface Rule {
  kind: TokenKind
  re: RegExp
  only?: ParserState[]
}

export const RULES: Rule[] = [
  { kind: 'STEP', re: /^##\[group\]Run (.+)$/ },
  { kind: 'EXIT', re: /^##\[error\]Process completed with exit code (\d+)/ },
  { kind: 'ENGINE', re: /^npm ERR! engine Not compatible with your version of node\/npm: (.+)@(\S+)$/ },
  { kind: 'ENGINE', re: /^npm ERR! notsup (Required): \{"node":"([^"]+)"\}/ },
  { kind: 'ENGINE', re: /^npm ERR! notsup (Actual):.*"node":"(v[\d.]+)"/ },
  { kind: 'NPM_ERR', re: /^npm ERR! (?:code )?(.*)$/ },
  { kind: 'BUNDLER_UNRESOLVED', re: /Rollup failed to resolve import "([^"]+)" from "([^"]+)"/ },
  { kind: 'MODULE_NOT_FOUND', re: /Cannot find module '([^']+)'(?: from '([^']+)')?/ },
  { kind: 'ECONNREFUSED', re: /(\w+Error): connect ECONNREFUSED ([\d.]+):(\d+)/ },
  { kind: 'ENV_MISSING', re: /Missing required env(?:ironment)? var(?:iable)?:\s*([A-Z0-9_]+)/ },
  { kind: 'REQUIRE_STACK', re: /^\s*Require stack:\s*$/ },
  { kind: 'STACK_ITEM', re: /^\s+([\w./-]+\.\w+)\s*$/, only: ['REQUIRE_STACK'] },
  { kind: 'STACK_FRAME', re: /^\s*at (?:(.+?) \()?([^()\s]+):(\d+):(\d+)\)?$/ },
  { kind: 'JEST_FAIL', re: /^FAIL (\S+)/ },
  { kind: 'JEST_TEST', re: /^\s*● (.+?)(?: › (.+))?$/ },
  { kind: 'EXPECTED', re: /^\s*Expected:\s*(.+)$/ },
  { kind: 'RECEIVED', re: /^\s*Received:\s*(.+)$/ },
  { kind: 'CODE_POINTER', re: /^\s*>\s*(\d+)\s*\|(.*)$/ },
  { kind: 'TEST_SUMMARY', re: /^Tests:\s+(?:(\d+) failed, )?.*?(\d+) total/ },
  { kind: 'NODE_ERR', re: /^\s*((?:[A-Z]\w*)?Error)(?: \[\w+\])?: (.+)$/ },
  { kind: 'BLANK', re: /^\s*$/ },
]

export function lex(raw: string, line: number, state: ParserState): Token {
  for (const r of RULES) {
    if (r.only && !r.only.includes(state)) continue
    const m = r.re.exec(raw)
    if (m) return { kind: r.kind, line, raw, groups: m.slice(1).map(g => g ?? '') }
  }
  return { kind: 'TEXT', line, raw, groups: [] }
}

// ─── FSM ──────────────────────────────────────────────────────────────────────

const OPENERS: Partial<Record<TokenKind, ErrorKind>> = {
  MODULE_NOT_FOUND: 'MODULE_NOT_FOUND',
  ECONNREFUSED: 'CONNECTION_REFUSED',
  ENV_MISSING: 'MISSING_ENV',
  NODE_ERR: 'GENERIC_ERROR',
}

export function parseLog(log: string): ParseResult {
  const lines = log.split('\n')
  const tokens: Token[] = []
  const transitions: Transition[] = []
  const events: ErrorEvent[] = []
  let state = 'SCAN' as ParserState
  let step: string | undefined
  // cast keeps the union type: `cur` is reassigned inside closures, which TS flow analysis can't see
  let cur = null as ErrorEvent | null
  let exitCode: number | undefined

  const go = (to: ParserState, t: Token) => {
    if (to !== state) transitions.push({ line: t.line, from: state, to, token: t.kind })
    state = to
  }
  const open = (kind: ErrorKind, t: Token, patch: Partial<ErrorEvent> = {}) => {
    close()
    cur = { kind, message: t.raw.trim(), step, frames: [], evidence: [t.line], ...patch }
  }
  const close = () => {
    if (cur) events.push(cur)
    cur = null
  }
  const note = (t: Token) => cur?.evidence.push(t.line)
  const frame = (t: Token) => {
    if (!cur) return
    const [, file, ln] = t.groups
    cur.frames.push(`${file}:${ln}`)
    note(t)
    if (!file.includes('node_modules') && !cur.file) {
      cur.file = file
      cur.line = Number(ln)
    }
  }

  /** Handle a token from the neutral SCAN state; shared as the fall-through for other states. */
  const scan = (t: Token) => {
    switch (t.kind) {
      case 'STEP':
        step = t.groups[0]
        return go('SCAN', t)
      case 'ENGINE':
        open('ENGINE_MISMATCH', t)
        applyEngine(t)
        return go('NPM_ERROR', t)
      case 'NPM_ERR':
        open('GENERIC_ERROR', t, { symbol: t.groups[0] })
        return go('NPM_ERROR', t)
      case 'BUNDLER_UNRESOLVED':
        open('UNRESOLVED_IMPORT', t, { symbol: t.groups[0], file: t.groups[1] })
        return go('BUNDLER_ERROR', t)
      case 'JEST_FAIL':
        close()
        return go('JEST_FAILURE', t)
      case 'EXIT':
        close()
        exitCode = Number(t.groups[0])
        return go('DONE', t)
      default:
        if (OPENERS[t.kind]) {
          openNodeError(t)
          return go('NODE_ERROR', t)
        }
    }
  }

  const openNodeError = (t: Token) => {
    const kind = OPENERS[t.kind]!
    if (t.kind === 'MODULE_NOT_FOUND') open(kind, t, { symbol: t.groups[0], file: t.groups[1] || undefined })
    else if (t.kind === 'ECONNREFUSED') open(kind, t, { symbol: `${t.groups[1]}:${t.groups[2]}` })
    else if (t.kind === 'ENV_MISSING') open(kind, t, { symbol: t.groups[0] })
    else open(kind, t)
  }

  const applyEngine = (t: Token) => {
    if (!cur) return
    cur.kind = 'ENGINE_MISMATCH'
    note(t)
    if (t.groups[0] === 'Required') cur.expected = t.groups[1]
    else if (t.groups[0] === 'Actual') cur.received = t.groups[1]
    else {
      cur.symbol = t.groups[0]
      cur.message = t.raw.trim()
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const t = lex(lines[i], i + 1, state)
    tokens.push(t)

    switch (state) {
      case 'SCAN':
        scan(t)
        break

      case 'NPM_ERROR':
        if (t.kind === 'ENGINE') applyEngine(t)
        else if (t.kind === 'NPM_ERR' || t.kind === 'BLANK') note(t)
        else {
          close()
          go('SCAN', t)
          scan(t)
        }
        break

      case 'BUNDLER_ERROR':
        if (t.kind === 'TEXT') note(t)
        else {
          close()
          go('SCAN', t)
          scan(t)
        }
        break

      case 'JEST_FAILURE':
        if (t.kind === 'JEST_TEST') {
          if (/Test suite failed to run/.test(t.groups[0])) break
          open('ASSERTION_FAILURE', t, { testName: [t.groups[0], t.groups[1]].filter(Boolean).join(' › ') })
          go('JEST_ASSERTION', t)
        } else if (OPENERS[t.kind]) {
          openNodeError(t)
          go('NODE_ERROR', t)
        } else if (t.kind === 'TEST_SUMMARY' || t.kind === 'EXIT' || t.kind === 'STEP') {
          go('SCAN', t)
          scan(t)
        }
        break

      case 'NODE_ERROR':
      case 'REQUIRE_STACK':
      case 'STACK_TRACE':
        if (t.kind === 'REQUIRE_STACK') {
          note(t)
          go('REQUIRE_STACK', t)
        } else if (t.kind === 'STACK_ITEM') {
          note(t)
          cur?.frames.push(t.groups[0])
        } else if (t.kind === 'STACK_FRAME') {
          frame(t)
          go('STACK_TRACE', t)
        } else if (t.kind === 'BLANK' || t.kind === 'TEXT') {
          // context lines (code frames, blank separators) stay with the open error
        } else if (t.kind === 'JEST_FAIL') {
          close()
          go('JEST_FAILURE', t)
        } else {
          close()
          go('SCAN', t)
          scan(t)
        }
        break

      case 'JEST_ASSERTION':
        if (t.kind === 'EXPECTED' && cur) {
          cur.expected = t.groups[0]
          note(t)
        } else if (t.kind === 'RECEIVED' && cur) {
          cur.received = t.groups[0]
          note(t)
        } else if (t.kind === 'CODE_POINTER' && cur) {
          cur.line = Number(t.groups[0])
          note(t)
        } else if (t.kind === 'STACK_FRAME') {
          frame(t)
        } else if (t.kind === 'JEST_FAIL') {
          close()
          go('JEST_FAILURE', t)
        } else if (t.kind === 'TEST_SUMMARY' || t.kind === 'EXIT' || t.kind === 'STEP') {
          close()
          go('SCAN', t)
          scan(t)
        }
        break

      case 'DONE':
        break
    }
  }
  close()

  return { tokens, transitions, events: dedupe(events), exitCode }
}

/** Jest repeats a setup failure once per suite — fold identical events together. */
function dedupe(events: ErrorEvent[]): ErrorEvent[] {
  const byKey = new Map<string, ErrorEvent>()
  for (const e of events) {
    const key = `${e.kind}|${e.symbol ?? ''}|${e.message}`
    const prev = byKey.get(key)
    if (prev) prev.evidence.push(...e.evidence)
    else byKey.set(key, { ...e, evidence: [...e.evidence], frames: [...e.frames] })
  }
  return [...byKey.values()]
}
