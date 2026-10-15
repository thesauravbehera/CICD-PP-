import { REGISTRY, readPkg, writePkg } from './mernApp'
import { changedLines, unifiedDiff } from './diff'
import type { FileEdit, RepairCandidate, RepairPlan, RepoFS, Risk, RootCause } from './types'

// ─── AI repair planner ────────────────────────────────────────────────────────
// Generates every strategy that could plausibly address the root cause, then
// ranks them with a small scoring model:
//   score = rootCauseConfidence × strategyPrior × riskWeight × patchSizeWeight
// Strategy priors stand in for learned acceptance rates. Runs locally; source
// code never leaves the box.

const PRIORS: Record<string, number> = {
  'add-missing-dep': 0.96,
  'fix-import-path': 0.92,
  'restore-module-shim': 0.7,
  'bump-node-version': 0.94,
  'disable-engine-strict': 0.5,
  'add-ci-service': 0.93,
  'use-memory-server': 0.8,
  'add-ci-env': 0.9,
  'add-ci-secret-ref': 0.9,
  'commit-test-secret': 0.62,
  'restore-status-code': 0.86,
  'update-test-expectation': 0.45,
}

const RISK_WEIGHT: Record<Risk, number> = { low: 1, med: 0.88, high: 0.6 }

interface Draft {
  strategy: string
  title: string
  rationale: string
  risk: Risk
  edits: FileEdit[]
}

const set = (fs: RepoFS, path: string, after: string): FileEdit => ({ path, before: fs[path] ?? '', after })
const replaceLine = (src: string, line: number, from: string, to: string) =>
  src
    .split('\n')
    .map((l, i) => (i === line - 1 ? l.replace(from, to) : l))
    .join('\n')

function drafts(rc: RootCause, fs: RepoFS): Draft[] {
  const ci = '.github/workflows/ci.yml'
  switch (rc.category) {
    case 'MISSING_DEPENDENCY': {
      const ws = rc.workspace ?? 'server'
      const name = rc.meta.package
      const section = rc.meta.section as 'dependencies' | 'devDependencies'
      const version = REGISTRY[name]?.version
      if (!version) return []
      const pkg = readPkg(fs, ws)
      const deps = { ...(pkg[section] ?? {}), [name]: `^${version}` }
      pkg[section] = Object.fromEntries(Object.entries(deps).sort(([a], [b]) => a.localeCompare(b)))
      return [
        {
          strategy: 'add-missing-dep',
          title: `Add ${name}@^${version} to ${ws}/package.json`,
          rationale: `${rc.file} requires "${name}". Declaring it under ${section} with the latest stable range makes \`npm ci\` install it.`,
          risk: 'low',
          edits: [set(fs, `${ws}/package.json`, writePkg(pkg))],
        },
      ]
    }

    case 'BROKEN_IMPORT': {
      const { replacement, replacementPath } = rc.meta
      if (!replacement || !rc.file) return []
      const importer = rc.file
      const dir = importer.split('/').slice(0, -1).join('/')
      const oldStem = rc.symbol!.split('/').pop()!
      const ext = replacementPath.slice(replacementPath.lastIndexOf('.'))
      return [
        {
          strategy: 'fix-import-path',
          title: `Point import at ${replacement}`,
          rationale: `Rewrite "${rc.symbol}" → "${replacement}" in ${importer}. The target is the orphaned file left behind by the rename.`,
          risk: 'med',
          edits: [set(fs, importer, fs[importer].replace(`'${rc.symbol}'`, `'${replacement}'`))],
        },
        {
          strategy: 'restore-module-shim',
          title: `Re-create ${oldStem} as a re-export shim`,
          rationale: `Keep the old path alive with a one-line re-export so every caller resolves. Leaves a compatibility file behind.`,
          risk: 'low',
          edits: [set(fs, `${dir}/${oldStem}${ext}`, `export { default } from '${replacement}'\n`)],
        },
      ]
    }

    case 'RUNTIME_MISMATCH': {
      const need = Number(rc.meta.requiredNode)
      const target = [20, 22].find(v => v >= need) ?? need
      return [
        {
          strategy: 'bump-node-version',
          title: `Bump CI to Node ${target} (LTS)`,
          rationale: `Every dependency's engine floor is ≤ Node ${need}. Node ${target} is the lowest active LTS that satisfies all of them.`,
          risk: 'low',
          edits: [set(fs, ci, fs[ci].replace(/node-version:\s*'?\d+'?/, `node-version: ${target}`))],
        },
        {
          strategy: 'disable-engine-strict',
          title: 'Turn off engine-strict in .npmrc',
          rationale: 'Lets install proceed on the old runtime. Hides the incompatibility rather than fixing it.',
          risk: 'high',
          edits: [set(fs, '.npmrc', (fs['.npmrc'] ?? '').replace('engine-strict=true', 'engine-strict=false'))],
        },
      ]
    }

    case 'SERVICE_UNAVAILABLE': {
      const block = `    services:\n      mongo:\n        image: mongo:7\n        ports:\n          - 27017:27017\n`
      const pkg = readPkg(fs, 'server')
      pkg.devDependencies = Object.fromEntries(
        Object.entries({ ...pkg.devDependencies, 'mongodb-memory-server': `^${REGISTRY['mongodb-memory-server'].version}` }).sort(([a], [b]) => a.localeCompare(b)),
      )
      return [
        {
          strategy: 'add-ci-service',
          title: 'Add a mongo:7 service container to the CI job',
          rationale: 'Tests connect to localhost:27017. A `services:` container is the standard way to provide it in GitHub Actions.',
          risk: 'low',
          edits: [set(fs, ci, fs[ci].replace('    steps:\n', block + '    steps:\n'))],
        },
        {
          strategy: 'use-memory-server',
          title: 'Switch test setup to mongodb-memory-server',
          rationale: 'Removes the external dependency entirely by booting an in-process MongoDB per test run. Touches test code and adds a devDependency.',
          risk: 'med',
          edits: [
            set(fs, 'server/package.json', writePkg(pkg)),
            set(
              fs,
              'server/tests/setup.js',
              `const mongoose = require('mongoose')\nconst { MongoMemoryServer } = require('mongodb-memory-server')\n\nlet mongod\n\nbeforeAll(async () => {\n  mongod = await MongoMemoryServer.create()\n  await mongoose.connect(mongod.getUri())\n})\n\nafterAll(async () => {\n  await mongoose.disconnect()\n  await mongod.stop()\n})\n`,
            ),
          ],
        },
      ]
    }

    case 'MISSING_ENV': {
      const name = rc.meta.variable
      const lines = fs[ci].split('\n')
      const envAt = lines.findIndex(l => l === '    env:')
      let insertAt = envAt + 1
      while (insertAt < lines.length && /^ {6}\S/.test(lines[insertAt])) insertAt++
      const withEnv = (value: string) => [...lines.slice(0, insertAt), `      ${name}: ${value}`, ...lines.slice(insertAt)].join('\n')
      if (rc.meta.sensitive !== 'true') {
        return [{ strategy: 'add-ci-env', title: `Define ${name} in the CI env block`, rationale: `${name} is not sensitive; a fixed test value is fine.`, risk: 'low', edits: [set(fs, ci, withEnv('test'))] }]
      }
      return [
        {
          strategy: 'add-ci-secret-ref',
          title: `Wire ${name} from repository secrets`,
          rationale: `Reference \${{ secrets.${name} }} in the workflow. Correct and safe, but needs a maintainer to create the secret.`,
          risk: 'low',
          edits: [set(fs, ci, withEnv(`\${{ secrets.${name} }}`))],
        },
        {
          strategy: 'commit-test-secret',
          title: `Commit a test value for ${name} in server/.env`,
          rationale: `Satisfies config.js immediately via dotenv. Puts a credential-shaped value in git.`,
          risk: 'high',
          edits: [set(fs, 'server/.env', `${fs['server/.env'] ?? ''}${name}=f3a9c1e07b5d4e2a9c8b7f6e5d4c3b2a\n`)],
        },
      ]
    }

    case 'LOGIC_REGRESSION': {
      const { expected, received, handlerFile, testFile, testLine } = rc.meta
      const out: Draft[] = []
      if (handlerFile && rc.line) {
        out.push({
          strategy: 'restore-status-code',
          title: `Restore ${expected} in ${handlerFile.split('/').pop()}`,
          rationale: `The handler was changed to respond ${received}. The test, and REST convention, say ${expected}. Fix the code, not the contract.`,
          risk: 'med',
          edits: [set(fs, handlerFile, replaceLine(fs[handlerFile], rc.line, `res.status(${received})`, `res.status(${expected})`))],
        })
      }
      out.push({
        strategy: 'update-test-expectation',
        title: `Change the test to expect ${received}`,
        rationale: 'Makes the suite green by accepting the new behaviour. Weakens the API contract.',
        risk: 'high',
        edits: [set(fs, testFile, replaceLine(fs[testFile], Number(testLine), `toBe(${expected})`, `toBe(${received})`))],
      })
      return out
    }

    default:
      return []
  }
}

export function plan(rc: RootCause, fs: RepoFS): RepairPlan {
  const candidates: RepairCandidate[] = drafts(rc, fs).map((d, i) => {
    const { added, removed } = changedLines(d.edits)
    const size = added.length + removed.length
    const prior = PRIORS[d.strategy] ?? 0.5
    const sizeWeight = Math.max(0.7, 1 - 0.015 * size)
    const score = rc.confidence * prior * RISK_WEIGHT[d.risk] * sizeWeight
    return {
      id: `c${i + 1}`,
      ...d,
      score: Number(score.toFixed(3)),
      features: [
        { label: 'root-cause confidence', value: rc.confidence },
        { label: 'strategy prior', value: prior },
        { label: `risk (${d.risk})`, value: RISK_WEIGHT[d.risk] },
        { label: `patch size (${size} lines)`, value: Number(sizeWeight.toFixed(2)) },
      ],
      diff: d.edits.map(e => unifiedDiff(e)).join('\n'),
    }
  })
  candidates.sort((a, b) => b.score - a.score)
  candidates.forEach((c, i) => (c.id = `c${i + 1}`))
  return { candidates }
}
