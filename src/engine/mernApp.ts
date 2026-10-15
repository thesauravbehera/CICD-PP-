import type { BuildResult, RepoFS } from './types'

// ─── Demo MERN app ────────────────────────────────────────────────────────────
// A small todo app (MongoDB · Express · React · Node) held as a virtual file
// tree. `runBuild` interprets the repo the way its GitHub Actions workflow
// would, so a patch genuinely changes the outcome of a re-run.

export const REPO_NAME = 'demo/todo-mern'
const RUNNER_ROOT = '/home/runner/work/todo-mern/todo-mern'

/** Mock npm registry: latest version + minimum Node major from `engines` */
export const REGISTRY: Record<string, { version: string; minNode?: number; engines?: string }> = {
  express: { version: '4.19.2' },
  mongoose: { version: '8.5.1', minNode: 16, engines: '>=16.20.1' },
  cors: { version: '2.8.5' },
  dotenv: { version: '16.4.5' },
  jsonwebtoken: { version: '9.0.2' },
  zod: { version: '3.23.8' },
  jest: { version: '29.7.0' },
  supertest: { version: '7.0.0' },
  'mongodb-memory-server': { version: '10.0.0', minNode: 16, engines: '>=16.20.1' },
  react: { version: '18.3.1' },
  'react-dom': { version: '18.3.1' },
  axios: { version: '1.7.2' },
  vite: { version: '5.4.2', minNode: 18, engines: '^18.0.0 || >=20.0.0' },
  '@vitejs/plugin-react': { version: '4.3.1', minNode: 14 },
}

const NODE_BUILTINS = new Set(['fs', 'path', 'http', 'https', 'crypto', 'os', 'url', 'util', 'events', 'stream'])

export const NODE_FULL_VERSION: Record<number, string> = {
  16: 'v16.20.2',
  18: 'v18.20.4',
  20: 'v20.17.0',
  22: 'v22.9.0',
}

function pkgJson(obj: unknown): string {
  return JSON.stringify(obj, null, 2) + '\n'
}

const CI_YML = `name: ci
on: [push, pull_request]

jobs:
  build-test:
    runs-on: ubuntu-latest
    env:
      NODE_ENV: test
      MONGO_URI: mongodb://localhost:27017/todos_test
    services:
      mongo:
        image: mongo:7
        ports:
          - 27017:27017
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci --prefix server
      - run: npm ci --prefix client
      - run: npm run build --prefix client
      - run: npm test --prefix server
`

const BASE_FS: RepoFS = {
  '.github/workflows/ci.yml': CI_YML,
  '.npmrc': 'engine-strict=true\n',
  'server/package.json': pkgJson({
    name: 'todo-server',
    version: '1.0.0',
    main: 'index.js',
    scripts: { start: 'node index.js', test: 'jest --runInBand' },
    dependencies: {
      cors: '^2.8.5',
      dotenv: '^16.4.5',
      express: '^4.19.2',
      jsonwebtoken: '^9.0.2',
      mongoose: '^8.5.1',
    },
    devDependencies: { jest: '^29.7.0', supertest: '^7.0.0' },
  }),
  'server/config.js': `require('dotenv').config()

function required(name) {
  const value = process.env[name]
  if (!value) throw new Error(\`Missing required env var: \${name}\`)
  return value
}

module.exports = {
  port: process.env.PORT || 5000,
  mongoUri: required('MONGO_URI'),
}
`,
  'server/index.js': `const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const config = require('./config')
const todos = require('./routes/todos')
const auth = require('./routes/auth')

const app = express()
app.use(cors())
app.use(express.json())
app.use('/api/todos', todos)
app.use('/api/auth', auth)

if (require.main === module) {
  mongoose.connect(config.mongoUri).then(() => app.listen(config.port))
}

module.exports = app
`,
  'server/models/Todo.js': `const mongoose = require('mongoose')

const TodoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    done: { type: Boolean, default: false },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Todo', TodoSchema)
`,
  'server/routes/todos.js': `const router = require('express').Router()
const Todo = require('../models/Todo')

router.get('/', async (req, res) => {
  const todos = await Todo.find().sort({ createdAt: -1 })
  res.json(todos)
})

router.post('/', async (req, res) => {
  const todo = await Todo.create({ title: req.body.title })
  res.status(201).json(todo)
})

router.patch('/:id', async (req, res) => {
  const todo = await Todo.findByIdAndUpdate(req.params.id, req.body, { new: true })
  res.json(todo)
})

module.exports = router
`,
  'server/routes/auth.js': `const router = require('express').Router()
const jwt = require('jsonwebtoken')

router.post('/token', (req, res) => {
  const token = jwt.sign({ sub: req.body.user }, process.env.JWT_SECRET || 'dev', { expiresIn: '1h' })
  res.json({ token })
})

module.exports = router
`,
  'server/tests/setup.js': `const mongoose = require('mongoose')
const config = require('../config')

beforeAll(async () => {
  await mongoose.connect(config.mongoUri)
})

afterAll(async () => {
  await mongoose.connection.dropDatabase()
  await mongoose.disconnect()
})
`,
  'server/tests/todos.test.js': `require('./setup')
const request = require('supertest')
const app = require('../index')

describe('Todos API', () => {
  it('creates a todo', async () => {
    const res = await request(app).post('/api/todos').send({ title: 'Ship Kintsugi' })
    expect(res.status).toBe(201)
    expect(res.body.title).toBe('Ship Kintsugi')
  })

  it('lists todos', async () => {
    const res = await request(app).get('/api/todos')
    expect(res.status).toBe(200)
    expect(res.body.length).toBeGreaterThan(0)
  })
})
`,
  'client/package.json': pkgJson({
    name: 'todo-client',
    private: true,
    version: '1.0.0',
    type: 'module',
    scripts: { dev: 'vite', build: 'vite build' },
    dependencies: { axios: '^1.7.2', react: '^18.3.1', 'react-dom': '^18.3.1' },
    devDependencies: { '@vitejs/plugin-react': '^4.3.1', vite: '^5.4.2' },
  }),
  'client/src/main.jsx': `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
`,
  'client/src/api.js': `import axios from 'axios'

const http = axios.create({ baseURL: '/api' })

export const fetchTodos = () => http.get('/todos').then(r => r.data)
export const createTodo = title => http.post('/todos', { title }).then(r => r.data)
`,
  'client/src/App.jsx': `import { useEffect, useState } from 'react'
import { fetchTodos, createTodo } from './api'
import TodoList from './components/TodoList'

export default function App() {
  const [todos, setTodos] = useState([])
  const [title, setTitle] = useState('')

  useEffect(() => { fetchTodos().then(setTodos) }, [])

  async function add(e) {
    e.preventDefault()
    const todo = await createTodo(title)
    setTodos([todo, ...todos])
    setTitle('')
  }

  return (
    <main>
      <form onSubmit={add}><input value={title} onChange={e => setTitle(e.target.value)} /></form>
      <TodoList todos={todos} />
    </main>
  )
}
`,
  'client/src/components/TodoList.jsx': `import TodoItem from './TodoItem'

export default function TodoList({ todos }) {
  return <ul>{todos.map(t => <TodoItem key={t._id} todo={t} />)}</ul>
}
`,
  'client/src/components/TodoItem.jsx': `export default function TodoItem({ todo }) {
  return <li className={todo.done ? 'done' : ''}>{todo.title}</li>
}
`,
}

// ─── Failure scenarios ────────────────────────────────────────────────────────

export interface Scenario {
  id: string
  title: string
  commitSha: string
  commitMsg: string
  author: string
  blurb: string
  mutate: (fs: RepoFS) => RepoFS
}

function edit(fs: RepoFS, path: string, from: string, to: string): RepoFS {
  if (!fs[path].includes(from)) throw new Error(`scenario edit failed: ${path}`)
  return { ...fs, [path]: fs[path].replace(from, to) }
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'missing-dep',
    title: 'Missing dependency',
    commitSha: '4e1a9c2',
    commitMsg: 'feat(api): validate todo payloads with zod',
    author: 'maya',
    blurb: 'Server route imports zod, but it was never added to server/package.json.',
    mutate: fs =>
      edit(
        edit(fs, 'server/routes/todos.js', `const Todo = require('../models/Todo')\n`, `const { z } = require('zod')\nconst Todo = require('../models/Todo')\n\nconst TodoInput = z.object({ title: z.string().min(1) })\n`),
        'server/routes/todos.js',
        `const todo = await Todo.create({ title: req.body.title })`,
        `const { title } = TodoInput.parse(req.body)\n  const todo = await Todo.create({ title })`,
      ),
  },
  {
    id: 'broken-import',
    title: 'Renamed component',
    commitSha: 'b83d0f7',
    commitMsg: 'refactor(ui): rename TodoItem → TodoCard',
    author: 'priya',
    blurb: 'TodoItem.jsx was renamed to TodoCard.jsx; TodoList still imports the old path.',
    mutate: fs => {
      const next = { ...fs }
      next['client/src/components/TodoCard.jsx'] = fs['client/src/components/TodoItem.jsx'].replace('function TodoItem', 'function TodoCard')
      delete next['client/src/components/TodoItem.jsx']
      return next
    },
  },
  {
    id: 'no-mongo',
    title: 'MongoDB unreachable',
    commitSha: '91cc4ab',
    commitMsg: 'ci: simplify workflow',
    author: 'daniel',
    blurb: 'The services: block was dropped from ci.yml, so integration tests have no MongoDB.',
    mutate: fs =>
      edit(fs, '.github/workflows/ci.yml', `    services:\n      mongo:\n        image: mongo:7\n        ports:\n          - 27017:27017\n`, ''),
  },
  {
    id: 'node-engine',
    title: 'Node version mismatch',
    commitSha: '2fd71e0',
    commitMsg: 'ci: pin node to match prod image',
    author: 'sasha',
    blurb: 'CI was pinned to Node 16, but the client toolchain (vite 5) needs Node 18+.',
    mutate: fs => edit(fs, '.github/workflows/ci.yml', 'node-version: 20', 'node-version: 16'),
  },
  {
    id: 'status-regression',
    title: 'API status regression',
    commitSha: '7a0be53',
    commitMsg: 'fix(api): return created todo directly',
    author: 'raaj',
    blurb: 'POST /api/todos now answers 200 instead of 201; the integration test catches it.',
    mutate: fs => edit(fs, 'server/routes/todos.js', 'res.status(201).json(todo)', 'res.status(200).json(todo)'),
  },
  {
    id: 'missing-secret',
    title: 'Missing secret',
    commitSha: 'c5e2d18',
    commitMsg: 'feat(auth): require JWT_SECRET at boot',
    author: 'maya',
    blurb: 'Config now requires JWT_SECRET, which CI never provides. Safe fixes cannot be verified.',
    mutate: fs =>
      edit(
        edit(fs, 'server/config.js', `  mongoUri: required('MONGO_URI'),\n`, `  mongoUri: required('MONGO_URI'),\n  jwtSecret: required('JWT_SECRET'),\n`),
        'server/routes/auth.js',
        `process.env.JWT_SECRET || 'dev'`,
        `require('../config').jwtSecret`,
      ),
  },
]

export function scenarioRepo(id: string): RepoFS {
  const s = SCENARIOS.find(x => x.id === id)
  if (!s) throw new Error(`unknown scenario ${id}`)
  return s.mutate({ ...BASE_FS })
}

// ─── Repo helpers (shared with root-cause + planner) ─────────────────────────

export function readPkg(fs: RepoFS, ws: 'server' | 'client') {
  return JSON.parse(fs[`${ws}/package.json`]) as {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
    [k: string]: unknown
  }
}

export function writePkg(pkg: unknown): string {
  return pkgJson(pkg)
}

export function ciConfig(fs: RepoFS) {
  const yml = fs['.github/workflows/ci.yml'] ?? ''
  const nodeMajor = Number(/node-version:\s*'?(\d+)/.exec(yml)?.[1] ?? 20)
  const env: Record<string, string> = {}
  for (const m of yml.matchAll(/^\s+([A-Z][A-Z0-9_]*):\s*(.+)$/gm)) env[m[1]] = m[2].trim()
  const hasMongoService = /services:\s*\n\s+mongo:\s*\n\s+image:\s*mongo/.test(yml)
  return { nodeMajor, env, hasMongoService }
}

export function packageName(spec: string): string {
  const parts = spec.split('/')
  return spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]
}

export function importsOf(src: string): { spec: string; line: number }[] {
  const out: { spec: string; line: number }[] = []
  src.split('\n').forEach((l, i) => {
    for (const m of l.matchAll(/require\('([^']+)'\)|from '([^']+)'/g)) out.push({ spec: m[1] ?? m[2], line: i + 1 })
  })
  return out
}

const EXTS = ['', '.js', '.jsx', '.ts', '.tsx', '/index.js']

export function resolveRelative(fs: RepoFS, fromFile: string, spec: string): string | null {
  const dir = fromFile.split('/').slice(0, -1)
  for (const seg of spec.split('/')) {
    if (seg === '..') dir.pop()
    else if (seg !== '.') dir.push(seg)
  }
  const base = dir.join('/')
  for (const ext of EXTS) if (fs[base + ext] !== undefined) return base + ext
  return null
}

function isBare(spec: string) {
  return !spec.startsWith('.') && !spec.startsWith('/')
}

/** Walk the import graph from an entry; return first unresolved import with the chain that reached it. */
function findUnresolved(fs: RepoFS, ws: 'server' | 'client', entry: string) {
  const pkg = readPkg(fs, ws)
  const declared = { ...pkg.dependencies, ...pkg.devDependencies }
  const queue: { file: string; chain: string[] }[] = [{ file: entry, chain: [entry] }]
  const seen = new Set<string>()
  while (queue.length) {
    const { file, chain } = queue.shift()!
    if (seen.has(file)) continue
    seen.add(file)
    for (const { spec, line } of importsOf(fs[file])) {
      if (isBare(spec)) {
        const name = packageName(spec)
        if (NODE_BUILTINS.has(name) || declared[name]) continue
        return { spec, file, line, chain }
      }
      const target = resolveRelative(fs, file, spec)
      if (!target) return { spec, file, line, chain }
      queue.push({ file: target, chain: [...chain, target] })
    }
  }
  return null
}

// ─── CI interpreter ───────────────────────────────────────────────────────────

const SERVER_SUITES: { file: string; tests: string[] }[] = [
  { file: 'tests/todos.test.js', tests: ['creates a todo', 'lists todos'] },
  { file: 'tests/auth.test.js', tests: ['issues a token', 'rejects empty user', 'token expires in 1h', 'signs with configured secret'] },
  { file: 'tests/todo.model.test.js', tests: ['requires title', 'trims title', 'defaults done=false', 'adds timestamps', 'toggles done', 'rejects empty title'] },
]
const TOTAL_TESTS = SERVER_SUITES.reduce((n, s) => n + s.tests.length, 0)

export interface BuildOptions {
  /** Repository secrets visible to the run. The verification sandbox gets none. */
  secrets?: Record<string, string>
  runner?: 'github-actions' | 'docker'
}

export function runBuild(fs: RepoFS, opts: BuildOptions = {}): BuildResult {
  const out: string[] = []
  const ci = ciConfig(fs)
  const nodeFull = NODE_FULL_VERSION[ci.nodeMajor] ?? `v${ci.nodeMajor}.0.0`
  const root = opts.runner === 'docker' ? '/workspace' : RUNNER_ROOT
  const fail = (step: string, testsFailed = 0): BuildResult => {
    out.push('##[error]Process completed with exit code 1.')
    return { ok: false, failedStep: step, log: out.join('\n'), testsTotal: TOTAL_TESTS, testsFailed }
  }

  out.push('##[group]Run actions/checkout@v4', `Syncing repository: ${REPO_NAME}`, '##[endgroup]')
  out.push('##[group]Run actions/setup-node@v4', `Attempting to download ${ci.nodeMajor}.x...`, `Found in cache @ /opt/hostedtoolcache/node/${nodeFull.slice(1)}/x64`, '##[endgroup]')

  // npm ci — engine-strict check per workspace
  for (const ws of ['server', 'client'] as const) {
    out.push(`##[group]Run npm ci --prefix ${ws}`)
    const pkg = readPkg(fs, ws)
    const deps = { ...pkg.dependencies, ...pkg.devDependencies }
    for (const name of Object.keys(deps)) {
      const meta = REGISTRY[name]
      if (!meta) {
        out.push('npm ERR! code E404', `npm ERR! 404 Not Found - GET https://registry.npmjs.org/${name} - Not found`)
        return fail(`npm ci (${ws})`)
      }
      if (fs['.npmrc']?.includes('engine-strict=true') && meta.minNode && ci.nodeMajor < meta.minNode) {
        out.push(
          'npm ERR! code EBADENGINE',
          'npm ERR! engine Unsupported engine',
          `npm ERR! engine Not compatible with your version of node/npm: ${name}@${meta.version}`,
          `npm ERR! notsup Required: {"node":"${meta.engines}"}`,
          `npm ERR! notsup Actual:   {"npm":"8.19.4","node":"${nodeFull}"}`,
          '',
          'npm ERR! A complete log of this run can be found in:',
          `npm ERR!     /home/runner/.npm/_logs/${ws}-debug-0.log`,
        )
        return fail(`npm ci (${ws})`)
      }
    }
    out.push(`added ${ws === 'server' ? 412 : 287} packages, and audited ${ws === 'server' ? 413 : 288} packages in ${ws === 'server' ? 6 : 4}s`, '', 'found 0 vulnerabilities', '##[endgroup]')
  }

  // Client build (vite)
  out.push('##[group]Run npm run build --prefix client', '', '> todo-client@1.0.0 build', '> vite build', '', 'vite v5.4.2 building for production...', 'transforming...')
  const clientMiss = findUnresolved(fs, 'client', 'client/src/main.jsx')
  if (clientMiss) {
    out.push(
      `✓ ${clientMiss.chain.length + 27} modules transformed.`,
      'x Build failed in 412ms',
      'error during build:',
      `[vite]: Rollup failed to resolve import "${clientMiss.spec}" from "${root}/${clientMiss.file}".`,
      'This is most likely unintended because it can break your application at runtime.',
      'If you do want to externalize this module explicitly add it to',
      '`build.rollupOptions.external`',
    )
    return fail('npm run build (client)')
  }
  out.push('✓ 34 modules transformed.', 'dist/index.html                   0.46 kB │ gzip:  0.30 kB', 'dist/assets/index-DiwrgTda.js   187.12 kB │ gzip: 61.04 kB', '✓ built in 1.21s', '##[endgroup]')

  // Server tests (jest)
  out.push('##[group]Run npm test --prefix server', '', '> todo-server@1.0.0 test', '> jest --runInBand', '')
  const suiteFailed = (lines: string[]) => {
    for (const s of SERVER_SUITES) out.push(`FAIL ${s.file}`, '  ● Test suite failed to run', '', ...lines.map(l => '    ' + l), '')
    out.push(`Test Suites: ${SERVER_SUITES.length} failed, ${SERVER_SUITES.length} total`, `Tests:       0 total`, 'Ran all test suites.')
    return fail('npm test (server)', TOTAL_TESTS)
  }
  const strip = (p: string) => p.replace(/^server\//, '')

  const serverMiss = findUnresolved(fs, 'server', 'server/tests/todos.test.js')
  if (serverMiss) {
    return suiteFailed([
      `Cannot find module '${serverMiss.spec}' from '${strip(serverMiss.file)}'`,
      '',
      'Require stack:',
      ...[...serverMiss.chain].reverse().map(f => '  ' + strip(f)),
      '',
      `  at Resolver._throwModNotFoundError (node_modules/jest-resolve/build/resolver.js:427:11)`,
      `  at Object.<anonymous> (${strip(serverMiss.file)}:${serverMiss.line}:1)`,
    ])
  }

  // Environment: workflow env + server/.env (dotenv), secrets resolved from opts
  const env: Record<string, string> = {}
  for (const [k, v] of Object.entries(ci.env)) {
    const secret = /\$\{\{\s*secrets\.([A-Z0-9_]+)\s*\}\}/.exec(v)
    env[k] = secret ? opts.secrets?.[secret[1]] ?? '' : v
  }
  for (const m of (fs['server/.env'] ?? '').matchAll(/^([A-Z][A-Z0-9_]*)=(.*)$/gm)) env[m[1]] ??= m[2]
  const config = fs['server/config.js']
  const configLines = config.split('\n')
  for (const m of config.matchAll(/required\('([A-Z0-9_]+)'\)/g)) {
    if (!env[m[1]]) {
      const throwLine = configLines.findIndex(l => l.includes('throw new Error')) + 1
      const callLine = configLines.findIndex(l => l.includes(`required('${m[1]}')`)) + 1
      return suiteFailed([
        `Error: Missing required env var: ${m[1]}`,
        '',
        `  at required (config.js:${throwLine}:21)`,
        `  at Object.<anonymous> (config.js:${callLine}:14)`,
        `  at Object.<anonymous> (tests/setup.js:2:16)`,
      ])
    }
  }

  // MongoDB reachability
  const setup = fs['server/tests/setup.js']
  const usesMemoryServer = setup.includes('MongoMemoryServer')
  if (!usesMemoryServer && !ci.hasMongoService) {
    const connectLine = setup.split('\n').findIndex(l => l.includes('mongoose.connect')) + 1
    return suiteFailed([
      'MongooseServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017',
      '',
      '  at _handleConnectionErrors (node_modules/mongoose/lib/connection.js:897:11)',
      '  at NativeConnection.openUri (node_modules/mongoose/lib/connection.js:848:11)',
      `  at Object.<anonymous> (tests/setup.js:${connectLine}:3)`,
    ])
  }

  // Assertions: compare POST /api/todos status against the test's expectation
  const route = fs['server/routes/todos.js']
  const test = fs['server/tests/todos.test.js']
  const actual = /router\.post[\s\S]*?res\.status\((\d+)\)/.exec(route)?.[1] ?? '200'
  const testLines = test.split('\n')
  const expectIdx = testLines.findIndex(l => /expect\(res\.status\)\.toBe\(\d+\)/.test(l))
  const expected = /toBe\((\d+)\)/.exec(testLines[expectIdx])?.[1]
  const passLines = (s: { file: string; tests: string[] }, failIdx = -1) => [
    `${failIdx >= 0 ? 'FAIL' : 'PASS'} ${s.file}`,
    ...s.tests.map((t, i) => `    ${i === failIdx ? '✕' : '✓'} ${t} (${12 + i * 7} ms)`),
  ]
  if (expected && expected !== actual) {
    const col = testLines[expectIdx].indexOf('.toBe(') + 2
    out.push(...passLines(SERVER_SUITES[0], 0), '')
    out.push(
      '  ● Todos API › creates a todo',
      '',
      '    expect(received).toBe(expected) // Object.is equality',
      '',
      `    Expected: ${expected}`,
      `    Received: ${actual}`,
      '',
      `      ${expectIdx} |${testLines[expectIdx - 1] ? ' ' + testLines[expectIdx - 1] : ''}`,
      `    > ${expectIdx + 1} | ${testLines[expectIdx]}`,
      `         | ${' '.repeat(col - 1)}^`,
      `      ${expectIdx + 2} | ${testLines[expectIdx + 1]}`,
      '',
      `      at Object.toBe (tests/todos.test.js:${expectIdx + 1}:${col})`,
      '',
    )
    out.push(...passLines(SERVER_SUITES[1]), ...passLines(SERVER_SUITES[2]), '')
    out.push(`Test Suites: 1 failed, ${SERVER_SUITES.length - 1} passed, ${SERVER_SUITES.length} total`, `Tests:       1 failed, ${TOTAL_TESTS - 1} passed, ${TOTAL_TESTS} total`, 'Ran all test suites.')
    return fail('npm test (server)', 1)
  }

  for (const s of SERVER_SUITES) out.push(...passLines(s))
  out.push('', `Test Suites: ${SERVER_SUITES.length} passed, ${SERVER_SUITES.length} total`, `Tests:       ${TOTAL_TESTS} passed, ${TOTAL_TESTS} total`, 'Ran all test suites.', '##[endgroup]')
  return { ok: true, log: out.join('\n'), testsTotal: TOTAL_TESTS, testsFailed: 0 }
}
