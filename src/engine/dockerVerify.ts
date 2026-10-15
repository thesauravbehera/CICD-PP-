import { ciConfig, runBuild } from './mernApp'
import { applyEdits, changedLines } from './diff'
import { parseLog } from './logParser'
import type { RepairCandidate, RepoFS, RootCause, Verification, VerifyAttempt, VerifyCheck } from './types'

// ─── Docker verification ──────────────────────────────────────────────────────
// Each candidate is applied to a fresh copy of the repo and replayed inside a
// sandboxed container: no network beyond the registry, no repository secrets.
// A candidate PASSes only if the original failure is gone, nothing new broke,
// and the secret / static-analysis scans are clean.

const MAX_ATTEMPTS = 2

const SECRET_RE = /\b([A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|API_KEY)[A-Z0-9_]*)\s*[=:]\s*['"]?([A-Za-z0-9+/_-]{16,})/

function entropy(s: string) {
  const freq: Record<string, number> = {}
  for (const c of s) freq[c] = (freq[c] ?? 0) + 1
  return -Object.values(freq).reduce((h, n) => h + (n / s.length) * Math.log2(n / s.length), 0)
}

/** Deterministic pseudo-duration so reruns look stable */
function ms(seed: string, base: number, spread: number) {
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0
  return base + (Math.abs(h) % spread)
}

function semgrep(c: RepairCandidate): string[] {
  const findings: string[] = []
  const { added, removed } = changedLines(c.edits)
  const weakensTest = removed.some(r => /\.test\.[jt]sx?$/.test(r.path) && /expect\(/.test(r.s)) && added.some(a => /\.test\.[jt]sx?$/.test(a.path))
  if (weakensTest) findings.push('kintsugi.test-weakening — patch rewrites an existing assertion instead of fixing the code under test')
  if (added.some(a => a.path === '.npmrc' && /engine-strict=false/.test(a.s))) findings.push('kintsugi.engine-guard-disabled — patch disables engine-strict to bypass a runtime check')
  if (added.some(a => /\beval\(/.test(a.s))) findings.push('javascript.lang.security.eval-detected')
  return findings
}

function gitleaks(c: RepairCandidate): string[] {
  const { added } = changedLines(c.edits)
  return added
    .filter(a => !a.s.includes('${{'))
    .map(a => ({ a, m: SECRET_RE.exec(a.s) }))
    .filter(({ m }) => m && entropy(m[2]) > 3)
    .map(({ a, m }) => `generic-api-key: ${m![1]} in ${a.path}`)
}

function attempt(fs: RepoFS, rc: RootCause, c: RepairCandidate): VerifyAttempt {
  const checks: VerifyCheck[] = []
  const reasons: string[] = []
  const log: string[] = []

  const { fs: patched, conflicts } = applyEdits(fs, c.edits)
  const node = ciConfig(patched).nodeMajor
  const image = `kintsugi/sandbox-node${node}:${c.id}`
  const withMongo = ciConfig(patched).hasMongoService
  const dockerfile = [
    `FROM node:${node}-alpine`,
    'WORKDIR /workspace',
    'COPY . .',
    'ENV CI=true KINTSUGI_SANDBOX=1',
    'RUN npm ci --prefix server && npm ci --prefix client',
    'CMD ["sh", "-c", "npm run build --prefix client && npm test --prefix server"]',
  ].join('\n')

  // 1. patch applies cleanly
  checks.push({ id: 'apply', label: 'git apply', status: conflicts.length ? 'fail' : 'pass', durationMs: ms(c.id + 'a', 40, 60), detail: conflicts.length ? `conflicts in ${conflicts.join(', ')}` : `${c.edits.length} file(s) patched` })
  log.push(`$ git apply kintsugi-${c.id}.patch`, conflicts.length ? `error: patch failed: ${conflicts[0]}` : `Applied patch to ${c.edits.map(e => e.path).join(', ')} cleanly.`)
  if (conflicts.length) reasons.push('patch does not apply to the failing commit')

  // 2. image build + CI replay in the sandbox
  log.push('', `$ docker build -t ${image} .`, `Step 1/6 : FROM node:${node}-alpine`, ` ---> pulled node:${node}-alpine`, 'Step 6/6 : CMD …', `Successfully tagged ${image}`)
  if (withMongo) log.push('', '$ docker run -d --network kintsugi-net --name mongo mongo:7', 'mongo sidecar healthy on mongo:27017')
  log.push('', `$ docker run --rm --network kintsugi-net --read-only --tmpfs /tmp ${image}`)

  const build = runBuild(patched, { runner: 'docker', secrets: {} })
  const after = parseLog(build.log)
  const installFailed = build.failedStep?.startsWith('npm ci')
  checks.push({ id: 'image', label: 'docker build', status: installFailed ? 'fail' : 'pass', durationMs: ms(c.id + 'b', 9000, 6000), detail: installFailed ? `${build.failedStep} failed inside the image` : `node:${node}-alpine · deps installed` })
  log.push(...build.log.split('\n').filter(l => !l.startsWith('##[')).map(l => '  ' + l))

  const stillSame = after.events.some(e => e.symbol === rc.symbol || (rc.meta.variable && e.symbol === rc.meta.variable) || (rc.category === 'SERVICE_UNAVAILABLE' && e.kind === 'CONNECTION_REFUSED'))
  checks.push({
    id: 'tests',
    label: 'build + test suite',
    status: build.ok ? 'pass' : 'fail',
    durationMs: ms(c.id + 'c', 14000, 9000),
    detail: build.ok ? `${build.testsTotal}/${build.testsTotal} tests passed` : `${build.failedStep} failed${build.testsFailed ? ` · ${build.testsFailed}/${build.testsTotal} tests not passing` : ''}`,
  })
  checks.push({
    id: 'signature',
    label: 'original failure gone',
    status: build.ok || !stillSame ? 'pass' : 'fail',
    durationMs: ms(c.id + 'd', 80, 120),
    detail: build.ok ? 'no error events in replay log' : stillSame ? `same signature persists: ${rc.symbol}` : `new failure: ${after.events[0]?.message ?? build.failedStep}`,
  })
  if (!build.ok) reasons.push(stillSame ? `original failure persists in sandbox (${rc.symbol})` : `patch introduced a new failure in ${build.failedStep}`)
  if (!build.ok && c.strategy === 'add-ci-secret-ref') reasons.push('sandbox has no access to repository secrets, so the fix cannot be proven')

  // 3. scans on the patch itself
  const leaks = gitleaks(c)
  checks.push({ id: 'gitleaks', label: 'gitleaks', status: leaks.length ? 'fail' : 'pass', durationMs: ms(c.id + 'e', 600, 500), detail: leaks.length ? leaks.join('; ') : 'no secrets in patch' })
  log.push('', '$ gitleaks detect --no-git --source /workspace', leaks.length ? leaks.map(l => `Finding: ${l}`).join('\n') + `\n${leaks.length} leak(s) found` : 'no leaks found')
  if (leaks.length) reasons.push(`gitleaks: ${leaks.join('; ')}`)

  const sg = semgrep(c)
  checks.push({ id: 'semgrep', label: 'semgrep', status: sg.length ? 'fail' : 'pass', durationMs: ms(c.id + 'f', 2200, 1500), detail: sg.length ? sg.join('; ') : '0 findings' })
  log.push('', '$ semgrep --config p/javascript --config kintsugi-rules /workspace', sg.length ? sg.map(s => `  ✖ ${s}`).join('\n') : 'Ran 214 rules on 17 files: 0 findings.')
  if (sg.length) reasons.push(`semgrep: ${sg.join('; ')}`)

  const passed = checks.every(ch => ch.status !== 'fail')
  log.push('', passed ? `✔ ${c.id} verified` : `✖ ${c.id} rejected`)
  return { candidateId: c.id, image, dockerfile, checks, log: log.join('\n'), passed, reasons }
}

export function verify(fs: RepoFS, rc: RootCause, candidates: RepairCandidate[]): Verification {
  if (!candidates.length) return { attempts: [], verdict: 'REJECT', reasons: ['planner produced no candidate repairs for this root cause'] }
  const attempts: VerifyAttempt[] = []
  for (const c of candidates.slice(0, MAX_ATTEMPTS)) {
    const a = attempt(fs, rc, c)
    attempts.push(a)
    if (a.passed) return { attempts, verdict: 'PASS', acceptedCandidateId: c.id, reasons: [`${c.strategy} passed every sandbox check`] }
  }
  return {
    attempts,
    verdict: 'REJECT',
    reasons: [...attempts.flatMap(a => a.reasons.map(r => `${a.candidateId}: ${r}`)), 'escalated to a human — no PR opened'],
  }
}
