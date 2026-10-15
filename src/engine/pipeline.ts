import { SCENARIOS, runBuild, scenarioRepo, type Scenario } from './mernApp'
import { parseLog } from './logParser'
import { analyze } from './rootCause'
import { plan } from './repairPlanner'
import { verify } from './dockerVerify'
import type { BuildResult, ParseResult, RepairPlan, RepoFS, RootCause, Verification } from './types'

// ─── Kintsugi loop ────────────────────────────────────────────────────────────
//  Demo MERN app → Build/Test → FAILURE → Log Parser (regex + FSM)
//  → Root Cause Engine → AI Repair Planner → Docker Verification → PASS / REJECT

export const STAGES = [
  { id: 'build', label: 'Build / Test', sublabel: 'Demo MERN app' },
  { id: 'parse', label: 'Log Parser', sublabel: 'Regex + FSM' },
  { id: 'root-cause', label: 'Root Cause', sublabel: 'Engine' },
  { id: 'plan', label: 'AI Repair', sublabel: 'Planner' },
  { id: 'verify', label: 'Docker', sublabel: 'Verification' },
  { id: 'verdict', label: 'Verdict', sublabel: 'PASS / REJECT' },
] as const

export type StageId = (typeof STAGES)[number]['id']

export interface KintsugiRun {
  scenario: Scenario
  repo: RepoFS
  build: BuildResult
  parse?: ParseResult
  rootCause?: RootCause
  plan?: RepairPlan
  verification?: Verification
  /** PASS also when the build was green and nothing needed repairing */
  verdict: 'PASS' | 'REJECT' | 'GREEN'
}

/** `quarantined` template ids are never proposed (set from the Knowledge / Settings pages). */
export function runKintsugi(scenarioId: string, quarantined: string[] = []): KintsugiRun {
  const scenario = SCENARIOS.find(s => s.id === scenarioId)!
  const repo = scenarioRepo(scenarioId)
  const build = runBuild(repo)
  if (build.ok) return { scenario, repo, build, verdict: 'GREEN' }

  const parse = parseLog(build.log)
  const rootCause = analyze(parse, repo)
  const repairPlan = plan(rootCause, repo)
  repairPlan.candidates = repairPlan.candidates.filter(c => !quarantined.includes(c.strategy))
  repairPlan.candidates.forEach((c, i) => (c.id = `c${i + 1}`))
  const verification = verify(repo, rootCause, repairPlan.candidates)
  return { scenario, repo, build, parse, rootCause, plan: repairPlan, verification, verdict: verification.verdict }
}

export { SCENARIOS }
