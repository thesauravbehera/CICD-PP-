import { REGISTRY, ciConfig, importsOf, packageName, readPkg } from './mernApp'
import type { ErrorEvent, ErrorKind, ParseResult, RepoFS, RootCause } from './types'

// ─── Root cause engine ────────────────────────────────────────────────────────
// 1. Rank parsed events by causal precedence: an install-time failure explains
//    everything after it; a missing module explains a crashed suite, etc.
// 2. Classify the winning event and corroborate it against the repository
//    (package.json, workflow, import graph) to set confidence.

const PRECEDENCE: Record<ErrorKind, number> = {
  ENGINE_MISMATCH: 0,
  MODULE_NOT_FOUND: 1,
  UNRESOLVED_IMPORT: 1,
  MISSING_ENV: 2,
  CONNECTION_REFUSED: 3,
  ASSERTION_FAILURE: 4,
  GENERIC_ERROR: 5,
}

const SENSITIVE = /SECRET|TOKEN|PASSWORD|PRIVATE|API_KEY/

function workspaceOf(step?: string): 'server' | 'client' | undefined {
  const m = /--prefix (server|client)/.exec(step ?? '')
  return m ? (m[1] as 'server' | 'client') : undefined
}

function repoPath(file: string | undefined, ws?: string): string | undefined {
  if (!file) return undefined
  const stripped = file.replace(/^.*\/todo-mern\/todo-mern\//, '').replace(/^\/workspace\//, '')
  return ws && !stripped.startsWith(`${ws}/`) && !stripped.startsWith('.') ? `${ws}/${stripped}` : stripped
}

export function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return dp[a.length][b.length]
}

const clamp = (n: number) => Math.max(0, Math.min(0.99, Number(n.toFixed(2))))
const lineOf = (src: string, needle: string) => src.split('\n').findIndex(l => l.includes(needle)) + 1

export function analyze(parse: ParseResult, fs: RepoFS): RootCause {
  if (!parse.events.length) {
    return { category: 'UNKNOWN', summary: 'No recognisable error signature in the log.', confidence: 0.2, signals: [], suppressed: [], meta: {} }
  }

  const ranked = [...parse.events].sort((a, b) => PRECEDENCE[a.kind] - PRECEDENCE[b.kind] || a.evidence[0] - b.evidence[0])
  const primary = ranked[0]
  const suppressed = ranked.slice(1).map(e => `${e.kind}: ${e.message}`)
  if (parse.exitCode) suppressed.push(`exit code ${parse.exitCode} (consequence of the primary error)`)
  const repeats = primary.evidence.length

  const rc = classify(primary, fs)
  rc.suppressed = suppressed
  rc.signals.unshift(`primary event on log line ${primary.evidence[0]} (${repeats} evidence lines)`)
  return rc
}

function classify(e: ErrorEvent, fs: RepoFS): RootCause {
  const ws = workspaceOf(e.step)
  const base = { signals: [] as string[], suppressed: [] as string[], meta: {} as Record<string, string>, workspace: ws }

  switch (e.kind) {
    case 'MODULE_NOT_FOUND':
    case 'UNRESOLVED_IMPORT': {
      const spec = e.symbol!
      const file = repoPath(e.file, ws)
      const isBare = !spec.startsWith('.')
      if (isBare) {
        const name = packageName(spec)
        const owner = ws ?? (file?.startsWith('client/') ? 'client' : 'server')
        const pkg = readPkg(fs, owner)
        const declared = { ...pkg.dependencies, ...pkg.devDependencies }
        let confidence = 0.78
        const signals: string[] = []
        if (!declared[name]) {
          confidence += 0.1
          signals.push(`"${name}" is absent from ${owner}/package.json`)
        }
        if (REGISTRY[name]) {
          confidence += 0.06
          signals.push(`"${name}@${REGISTRY[name].version}" exists on the registry`)
        }
        const onlyTests = file ? /tests?\//.test(file) : false
        return {
          ...base,
          workspace: owner,
          category: 'MISSING_DEPENDENCY',
          summary: `${file ?? owner} imports "${name}", but ${owner}/package.json never declares it.`,
          symbol: name,
          file,
          line: file && fs[file] ? importsOf(fs[file]).find(i => i.spec === spec)?.line : e.line,
          confidence: clamp(confidence),
          signals: [...base.signals, ...signals],
          meta: { package: name, section: onlyTests ? 'devDependencies' : 'dependencies' },
        }
      }

      // Relative import: find the file it most likely refers to now
      const importer = file ?? ''
      const dir = importer.split('/').slice(0, -1).join('/')
      const wanted = spec.split('/').pop()!.replace(/\.\w+$/, '')
      const referenced = new Set<string>()
      for (const [path, src] of Object.entries(fs))
        for (const { spec: s } of importsOf(src)) if (s.startsWith('.')) referenced.add(`${path.split('/').slice(0, -1).join('/')}/${s.replace(/^\.\//, '')}`)
      const candidates = Object.keys(fs)
        .filter(p => p.startsWith(dir + '/') && p !== importer && !p.slice(dir.length + 1).includes('/'))
        .map(p => {
          const stem = p.split('/').pop()!.replace(/\.\w+$/, '')
          const sim = 1 - levenshtein(stem.toLowerCase(), wanted.toLowerCase()) / Math.max(stem.length, wanted.length)
          const orphan = !referenced.has(p.replace(/\.\w+$/, ''))
          return { path: p, stem, sim, orphan, score: sim * 0.5 + (orphan ? 0.5 : 0) }
        })
        .sort((a, b) => b.score - a.score)
      const best = candidates[0]
      const signals = [`"${spec}" does not resolve from ${importer}`]
      if (best) {
        signals.push(`closest sibling: ${best.stem} (name similarity ${best.sim.toFixed(2)})`)
        if (best.orphan) signals.push(`${best.path} is imported by nothing — consistent with a rename`)
      }
      return {
        ...base,
        workspace: ws ?? (importer.startsWith('client/') ? 'client' : 'server'),
        category: 'BROKEN_IMPORT',
        summary: best
          ? `${importer} imports "${spec}", which no longer exists. ${best.path} looks like its renamed successor.`
          : `${importer} imports "${spec}", which does not exist.`,
        symbol: spec,
        file: importer,
        line: fs[importer] ? importsOf(fs[importer]).find(i => i.spec === spec)?.line : undefined,
        confidence: clamp(best ? 0.55 + best.score * 0.35 : 0.35),
        signals,
        meta: best ? { replacement: './' + best.stem, replacementPath: best.path } : {},
      }
    }

    case 'ENGINE_MISMATCH': {
      const yml = fs['.github/workflows/ci.yml']
      const { nodeMajor } = ciConfig(fs)
      const required = Math.max(
        ...(['server', 'client'] as const).flatMap(w => {
          const p = readPkg(fs, w)
          return Object.keys({ ...p.dependencies, ...p.devDependencies }).map(n => REGISTRY[n]?.minNode ?? 0)
        }),
      )
      return {
        ...base,
        category: 'RUNTIME_MISMATCH',
        summary: `CI runs Node ${nodeMajor}, but ${e.symbol} requires node ${e.expected}. engine-strict turns this into a hard install failure.`,
        symbol: e.symbol,
        file: '.github/workflows/ci.yml',
        line: lineOf(yml, 'node-version'),
        confidence: clamp(0.9 + (fs['.npmrc']?.includes('engine-strict') ? 0.05 : 0)),
        signals: [`required: node ${e.expected}`, `actual: ${e.received}`, `highest engine floor across both workspaces: Node ${required}`, '.npmrc sets engine-strict=true'],
        meta: { currentNode: String(nodeMajor), requiredNode: String(required) },
      }
    }

    case 'CONNECTION_REFUSED': {
      const { hasMongoService } = ciConfig(fs)
      const port = e.symbol?.split(':')[1]
      const service = port === '27017' ? 'MongoDB' : port === '6379' ? 'Redis' : `port ${port}`
      const signals = [`${e.file ?? 'test setup'} connects to ${e.symbol}`]
      if (!hasMongoService) signals.push('ci.yml declares no `services:` container for it')
      return {
        ...base,
        category: 'SERVICE_UNAVAILABLE',
        summary: `Integration tests need ${service} on ${e.symbol}, but the CI job never starts one.`,
        symbol: service,
        file: '.github/workflows/ci.yml',
        line: lineOf(fs['.github/workflows/ci.yml'], 'steps:'),
        confidence: clamp(hasMongoService ? 0.55 : 0.92),
        signals,
        meta: { service, port: port ?? '' },
      }
    }

    case 'MISSING_ENV': {
      const name = e.symbol!
      const { env } = ciConfig(fs)
      const sensitive = SENSITIVE.test(name)
      const signals = [`config.js throws when ${name} is unset`]
      if (!env[name]) signals.push(`ci.yml env block does not define ${name}`)
      if (sensitive) signals.push(`${name} looks like a credential — must not be committed`)
      const file = 'server/config.js'
      return {
        ...base,
        category: 'MISSING_ENV',
        summary: `Server boot requires ${name}, but neither the workflow nor the repo provides it.`,
        symbol: name,
        file,
        line: lineOf(fs[file], `required('${name}')`),
        confidence: clamp(env[name] ? 0.5 : 0.9),
        signals,
        meta: { variable: name, sensitive: String(sensitive) },
      }
    }

    case 'ASSERTION_FAILURE': {
      const testFile = repoPath(e.file, ws) ?? 'server/tests/todos.test.js'
      const lines = (fs[testFile] ?? '').split('\n')
      const ctx = lines.slice(Math.max(0, (e.line ?? 1) - 3), e.line).join('\n')
      const call = /request\(app\)\.(get|post|put|patch|delete)\('([^']+)'\)/.exec(ctx)
      const method = call?.[1] ?? 'post'
      const route = call?.[2] ?? '/api/todos'
      // find handler that emits the received status
      const handlerFile = Object.keys(fs).find(p => p.startsWith('server/routes/') && new RegExp(`router\\.${method}\\(`).test(fs[p]))
      const handlerLine = handlerFile ? fs[handlerFile].split('\n').findIndex(l => l.includes(`res.status(${e.received})`)) + 1 : 0
      const signals = [`${e.testName}: expected ${e.expected}, received ${e.received}`, `request under test: ${method.toUpperCase()} ${route}`]
      let confidence = 0.68
      if (handlerLine) {
        signals.push(`${handlerFile}:${handlerLine} explicitly responds ${e.received}`)
        confidence += 0.08
      }
      if (method === 'post' && e.expected === '201') {
        signals.push('201 Created is the REST convention for POST — the test encodes the contract')
        confidence += 0.06
      }
      return {
        ...base,
        category: 'LOGIC_REGRESSION',
        summary: `${method.toUpperCase()} ${route} now answers ${e.received}; the test contract expects ${e.expected}.`,
        symbol: `${method.toUpperCase()} ${route}`,
        file: handlerLine ? handlerFile : testFile,
        line: handlerLine || e.line,
        confidence: clamp(confidence),
        signals,
        meta: { expected: e.expected ?? '', received: e.received ?? '', testFile, testLine: String(e.line ?? ''), handlerFile: handlerFile ?? '' },
      }
    }

    default:
      return { ...base, category: 'UNKNOWN', summary: e.message, file: repoPath(e.file, ws), line: e.line, confidence: 0.3, meta: {} }
  }
}
