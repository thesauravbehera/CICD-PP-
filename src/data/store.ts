import { useSyncExternalStore } from 'react'
import { FAILURE_SIGNATURES, KB_TEMPLATES, MOCK_ORG, PIPELINES, REPAIRS, type FailureSignature, type KBTemplate, type Pipeline, type Repair, type StageResult } from './mock'
import { REPO_NAME } from '../engine/mernApp'
import type { KintsugiRun } from '../engine/pipeline'
import type { RepairCandidate, Risk, VerifyAttempt } from '../engine/types'

// ─── Client-side database ─────────────────────────────────────────────────────
// Seeded from mock data and persisted to localStorage, so Live Run results,
// approvals and rejections flow through every page and survive reloads.

export interface RepoSetting {
  name: string
  lang: string
  autoRepair: boolean
  prReview: boolean
}

export interface DB {
  version: number
  pipelines: Pipeline[]
  repairs: Repair[]
  signatures: FailureSignature[]
  templates: KBTemplate[]
  repos: RepoSetting[]
}

const KEY = 'kintsugi_db'
const VERSION = 3
const ACTOR = 'raaj'

/** Templates the planner can emit that aren't in the seed KB */
const NEW_TEMPLATES: Record<string, { name: string; language: string; errorTypes: string[]; risk: Risk }> = {
  'restore-module-shim': { name: 'Re-export shim for moved module', language: 'js/ts', errorTypes: ['BROKEN_IMPORT'], risk: 'low' },
  'disable-engine-strict': { name: 'Disable engine-strict', language: 'any', errorTypes: ['RUNTIME_MISMATCH'], risk: 'high' },
  'add-ci-service': { name: 'Add CI service container', language: 'any', errorTypes: ['SERVICE_UNAVAILABLE'], risk: 'low' },
  'use-memory-server': { name: 'Use in-memory MongoDB for tests', language: 'js/ts', errorTypes: ['SERVICE_UNAVAILABLE'], risk: 'med' },
  'add-ci-env': { name: 'Add env var to CI workflow', language: 'any', errorTypes: ['MISSING_ENV'], risk: 'low' },
  'add-ci-secret-ref': { name: 'Wire env var from repo secrets', language: 'any', errorTypes: ['MISSING_ENV'], risk: 'low' },
  'commit-test-secret': { name: 'Commit test value to .env', language: 'any', errorTypes: ['MISSING_ENV'], risk: 'high' },
  'restore-status-code': { name: 'Restore HTTP status contract', language: 'js/ts', errorTypes: ['LOGIC_REGRESSION'], risk: 'med' },
  'update-test-expectation': { name: 'Update test expectation', language: 'js/ts', errorTypes: ['LOGIC_REGRESSION'], risk: 'high' },
}

function seed(): DB {
  const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x))
  return {
    version: VERSION,
    pipelines: clone(PIPELINES),
    repairs: clone(REPAIRS),
    signatures: clone(FAILURE_SIGNATURES),
    templates: [...clone(KB_TEMPLATES), ...Object.entries(NEW_TEMPLATES).map(([id, t]) => ({ id, ...t, uses: 0, successRate: 0, quarantined: false }))],
    repos: [{ name: REPO_NAME, lang: 'javascript', autoRepair: true, prReview: true }, ...MOCK_ORG.repos.map(({ name, lang, autoRepair, prReview }) => ({ name, lang, autoRepair, prReview }))],
  }
}

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const db = JSON.parse(raw) as DB
      if (db.version === VERSION) return db
    }
  } catch {
    // corrupted or unavailable storage — fall back to seed
  }
  return seed()
}

let db: DB = typeof localStorage === 'undefined' ? seed() : load()
const listeners = new Set<() => void>()

function commit(next: DB) {
  db = next
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
  } catch {
    // storage full / private mode — keep in memory
  }
  listeners.forEach(l => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useDB(): DB {
  return useSyncExternalStore(subscribe, () => db, () => db)
}

export function resetDemoData() {
  commit(seed())
}

// ─── Live run → records ───────────────────────────────────────────────────────

const pct = (n: number) => `${Math.round(n * 100)}%`

function logExcerpt(run: KintsugiRun): string | undefined {
  const lines = run.build.log.split('\n')
  const ev = run.parse?.events.flatMap(e => e.evidence) ?? []
  if (!ev.length) return undefined
  const from = Math.max(0, Math.min(...ev) - 3)
  const to = Math.min(lines.length, Math.max(...ev) + 2, from + 28)
  return lines.slice(from, to).filter(l => !l.startsWith('##[')).join('\n')
}

function validationOf(a?: VerifyAttempt): Repair['validation'] {
  const get = (id: string) => a?.checks.find(c => c.id === id)
  const tests = get('tests')
  const total = 12
  const failed = tests?.status === 'pass' ? 0 : Number(/(\d+)\/\d+ tests not passing/.exec(tests?.detail ?? '')?.[1] ?? total)
  const count = (id: string) => (get(id)?.status === 'fail' ? get(id)!.detail.split(';').length : 0)
  return {
    tests: { passed: tests?.status === 'pass', durationMs: tests?.durationMs ?? 0, total, failed, summary: tests?.detail ?? 'not run' },
    gitleaks: { passed: get('gitleaks')?.status !== 'fail', findings: count('gitleaks') },
    semgrep: { passed: get('semgrep')?.status !== 'fail', findings: count('semgrep') },
  }
}

function stagesOf(run: KintsugiRun, prNumber?: number): StageResult[] {
  const { build, parse, rootCause: rc, plan, verification: v } = run
  if (!parse || !rc || !plan || !v) {
    return [
      { id: 'build', label: 'Build / Test', status: 'pass', durationMs: 41000, detail: `${build.testsTotal}/${build.testsTotal} tests passed` },
      ...(['parse', 'root-cause', 'plan', 'verify', 'verdict'] as const).map(id => ({ id, label: LABELS[id], status: 'skip' as const })),
    ]
  }
  const top = plan.candidates[0]
  const verifyMs = v.attempts.reduce((s, a) => s + a.checks.reduce((t, c) => t + c.durationMs, 0), 0)
  const accepted = v.attempts.find(a => a.passed)
  return [
    { id: 'build', label: LABELS.build, status: 'fail', durationMs: 38000, detail: `${build.failedStep} · exit code 1` },
    { id: 'parse', label: LABELS.parse, status: 'pass', durationMs: 20 + parse.tokens.length, detail: `${parse.transitions.length} FSM transitions · ${parse.events.map(e => `${e.kind}${e.symbol ? ` symbol=${e.symbol}` : ''}`).join(', ')}` },
    { id: 'root-cause', label: LABELS['root-cause'], status: 'pass', durationMs: 120, detail: `${rc.category} · ${rc.file ?? rc.symbol ?? ''}${rc.line ? ':' + rc.line : ''} · ${pct(rc.confidence)} confidence` },
    { id: 'plan', label: LABELS.plan, status: top ? 'pass' : 'fail', durationMs: 210, detail: top ? `${plan.candidates.length} candidates · top: ${top.strategy} (score ${top.score.toFixed(2)})` : 'no applicable strategy' },
    {
      id: 'verify', label: LABELS.verify, status: accepted ? 'pass' : 'fail', durationMs: verifyMs,
      detail: accepted ? accepted.checks.map(c => `${c.label}: ${c.status}`).join(' · ') : v.attempts.map(a => `${a.candidateId} failed — ${a.reasons[0]}`).join(' · ') || 'nothing to verify',
    },
    { id: 'verdict', label: LABELS.verdict, status: accepted ? 'pass' : 'fail', detail: accepted ? `PASS · PR #${prNumber} opened — awaiting human review` : 'REJECT · escalated to a human, no PR opened' },
  ]
}

const LABELS = { build: 'Build / Test', parse: 'Log Parser', 'root-cause': 'Root Cause', plan: 'AI Repair Planner', verify: 'Docker Verification', verdict: 'Verdict' } as const

function ensureTemplate(templates: KBTemplate[], c: RepairCandidate): KBTemplate[] {
  if (templates.some(t => t.id === c.strategy)) return templates
  const meta = NEW_TEMPLATES[c.strategy] ?? { name: c.title, language: 'any', errorTypes: [], risk: c.risk }
  return [...templates, { id: c.strategy, ...meta, uses: 0, successRate: 0, quarantined: false }]
}

/** Persist a finished Live Run as a pipeline (+ repair, + KB signature). Returns new record ids. */
export function recordRun(run: KintsugiRun): { pipelineId: string; repairId?: string } {
  const now = new Date().toISOString()
  const stamp = Date.now().toString(36)
  const pipelineId = `run-${stamp}`
  const { rootCause: rc, plan, verification: v } = run
  const accepted = v?.acceptedCandidateId ? plan?.candidates.find(c => c.id === v.acceptedCandidateId) : undefined
  const chosen = accepted ?? plan?.candidates[0]
  const prNumber = accepted ? 500 + db.repairs.filter(r => r.prNumber).length : undefined

  // "Retrieve": nearest prior failure in the KB
  const prior = rc ? db.signatures.find(s => s.errorType === rc.category && s.symbol === rc.symbol) ?? db.signatures.find(s => s.errorType === rc.category) : undefined
  const similarity = !prior ? 0 : prior.symbol === rc?.symbol ? 0.96 : 0.74

  let repairId: string | undefined
  let repairs = db.repairs
  let templates = db.templates
  if (rc && chosen && v) {
    repairId = `rep-${stamp}`
    const lastAttempt = v.attempts.find(a => a.candidateId === chosen.id) ?? v.attempts[v.attempts.length - 1]
    templates = ensureTemplate(templates, chosen)
    repairs = [
      {
        id: repairId,
        pipelineId,
        repo: REPO_NAME,
        branch: `kintsugi/${chosen.strategy}-${run.scenario.commitSha}`,
        branchName: `kintsugi/${chosen.strategy}-${run.scenario.commitSha}`,
        templateId: chosen.strategy,
        matchedFailureRepo: prior?.repo ?? 'no prior match',
        matchedFailureDate: prior?.lastSeen ?? '—',
        similarity,
        confidence: rc.confidence,
        patch: chosen.diff,
        prNumber,
        outcome: accepted ? 'proposed' : 'rejected',
        outcomeAt: accepted ? undefined : now,
        outcomeActor: accepted ? undefined : 'kintsugi-verifier',
        outcomeReason: accepted ? undefined : v.reasons.join(' · '),
        validation: validationOf(lastAttempt),
        attempts: v.attempts.length,
        createdAt: now,
        explanation: `${rc.summary} ${chosen.rationale}`,
      },
      ...repairs,
    ]
  }

  const pipeline: Pipeline = {
    id: pipelineId,
    repo: REPO_NAME,
    branch: 'main',
    commitSha: run.scenario.commitSha,
    commitMsg: run.scenario.commitMsg,
    author: run.scenario.author,
    status: run.verdict === 'GREEN' ? 'passing' : accepted ? 'repairing' : 'failed',
    failedStep: run.build.failedStep,
    errorType: rc?.category,
    errorSymbol: rc?.symbol,
    logExcerpt: logExcerpt(run),
    durationMs: 38000 + (v?.attempts.reduce((s, a) => s + a.checks.reduce((t, c) => t + c.durationMs, 0), 0) ?? 0),
    triggeredAt: now,
    repairId,
    scenarioId: run.scenario.id,
    stages: stagesOf(run, prNumber),
  }

  let signatures = db.signatures
  if (rc) {
    const existing = signatures.find(s => s.repo === REPO_NAME && s.errorType === rc.category && s.symbol === rc.symbol)
    const sig: FailureSignature = {
      id: existing?.id ?? `sig-${stamp}`,
      repo: REPO_NAME,
      errorType: rc.category,
      language: 'javascript',
      step: run.build.failedStep ?? 'build',
      symbol: rc.symbol,
      occurrences: (existing?.occurrences ?? 0) + 1,
      lastSeen: now.slice(0, 10),
      resolvedByTemplateId: accepted?.strategy ?? existing?.resolvedByTemplateId,
      avgConfidence: existing?.avgConfidence ? (existing.avgConfidence * existing.occurrences + rc.confidence) / (existing.occurrences + 1) : rc.confidence,
    }
    signatures = existing ? signatures.map(s => (s.id === existing.id ? sig : s)) : [sig, ...signatures]
  }

  commit({ ...db, pipelines: [pipeline, ...db.pipelines], repairs, signatures, templates })
  return { pipelineId, repairId }
}

// ─── Human decisions ("Learn") ────────────────────────────────────────────────

function learn(templates: KBTemplate[], templateId: string, success: boolean): KBTemplate[] {
  return templates.map(t => {
    if (t.id !== templateId) return t
    const uses = t.uses + 1
    const successRate = (t.successRate * t.uses + (success ? 1 : 0)) / uses
    return { ...t, uses, successRate, quarantined: uses >= 3 && successRate < 0.5 }
  })
}

function settleVerdict(pipelines: Pipeline[], pipelineId: string, merged: boolean, detail: string): Pipeline[] {
  return pipelines.map(p =>
    p.id !== pipelineId
      ? p
      : {
          ...p,
          status: merged ? 'passing' : 'failed',
          stages: p.stages.map(s => (s.id === 'verdict' ? { ...s, status: merged ? 'pass' : 'fail', detail } : s)),
        },
  )
}

export function approveRepair(id: string) {
  const r = db.repairs.find(x => x.id === id)
  if (!r || r.outcome !== 'proposed') return
  const now = new Date().toISOString()
  commit({
    ...db,
    repairs: db.repairs.map(x => (x.id === id ? { ...x, outcome: 'merged', outcomeAt: now, outcomeActor: ACTOR } : x)),
    pipelines: settleVerdict(db.pipelines, r.pipelineId, true, `PASS · PR #${r.prNumber} merged by ${ACTOR}`),
    templates: learn(db.templates, r.templateId, true),
  })
}

export function rejectRepair(id: string, reason: string) {
  const r = db.repairs.find(x => x.id === id)
  if (!r || r.outcome !== 'proposed') return
  const now = new Date().toISOString()
  commit({
    ...db,
    repairs: db.repairs.map(x => (x.id === id ? { ...x, outcome: 'rejected', outcomeAt: now, outcomeActor: ACTOR, outcomeReason: reason || undefined } : x)),
    pipelines: settleVerdict(db.pipelines, r.pipelineId, false, `REJECT · PR #${r.prNumber} closed by ${ACTOR}`),
    templates: learn(db.templates, r.templateId, false),
  })
}

export function saveRepoSettings(repos: RepoSetting[]) {
  commit({ ...db, repos })
}

export function setTemplateQuarantine(id: string, quarantined: boolean) {
  commit({ ...db, templates: db.templates.map(t => (t.id === id ? { ...t, quarantined } : t)) })
}
