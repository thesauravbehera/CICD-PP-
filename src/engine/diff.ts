import type { FileEdit, RepoFS } from './types'

// ─── Minimal unified diff (LCS over lines) ────────────────────────────────────

type Op = { t: ' ' | '-' | '+'; s: string; a: number; b: number }

function ops(a: string[], b: string[]): Op[] {
  const n = a.length
  const m = b.length
  const lcs = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1])
  const out: Op[] = []
  let i = 0
  let j = 0
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) out.push({ t: ' ', s: a[i], a: i++, b: j++ })
    else if (i < n && (j >= m || lcs[i + 1][j] >= lcs[i][j + 1])) out.push({ t: '-', s: a[i], a: i++, b: j })
    else out.push({ t: '+', s: b[j], a: i, b: j++ })
  }
  return out
}

export function unifiedDiff(edit: FileEdit, context = 3): string {
  const a = edit.before === '' ? [] : edit.before.replace(/\n$/, '').split('\n')
  const b = edit.after === '' ? [] : edit.after.replace(/\n$/, '').split('\n')
  const all = ops(a, b)
  const changed = all.map((o, k) => (o.t !== ' ' ? k : -1)).filter(k => k >= 0)
  if (!changed.length) return ''

  const header = [`--- ${edit.before === '' ? '/dev/null' : 'a/' + edit.path}`, `+++ ${edit.after === '' ? '/dev/null' : 'b/' + edit.path}`]
  const hunks: string[] = []
  let k = 0
  while (k < changed.length) {
    const start = Math.max(0, changed[k] - context)
    let end = Math.min(all.length - 1, changed[k] + context)
    while (k + 1 < changed.length && changed[k + 1] - context <= end + 1) end = Math.min(all.length - 1, changed[++k] + context)
    k++
    const slice = all.slice(start, end + 1)
    const aLen = slice.filter(o => o.t !== '+').length
    const bLen = slice.filter(o => o.t !== '-').length
    const aStart = slice.find(o => o.t !== '+')?.a ?? all[start].a
    const bStart = slice.find(o => o.t !== '-')?.b ?? all[start].b
    hunks.push(`@@ -${aLen ? aStart + 1 : aStart},${aLen} +${bLen ? bStart + 1 : bStart},${bLen} @@`, ...slice.map(o => o.t + o.s))
  }
  return [...header, ...hunks].join('\n')
}

export function applyEdits(fs: RepoFS, edits: FileEdit[]): { fs: RepoFS; conflicts: string[] } {
  const next = { ...fs }
  const conflicts: string[] = []
  for (const e of edits) {
    if ((fs[e.path] ?? '') !== e.before) conflicts.push(e.path)
    if (e.after === '') delete next[e.path]
    else next[e.path] = e.after
  }
  return { fs: next, conflicts }
}

/** Lines added / removed by a set of edits, tagged with their file. */
export function changedLines(edits: FileEdit[]) {
  const added: { path: string; s: string }[] = []
  const removed: { path: string; s: string }[] = []
  for (const e of edits) {
    const a = e.before === '' ? [] : e.before.split('\n')
    const b = e.after === '' ? [] : e.after.split('\n')
    for (const o of ops(a, b)) {
      if (o.t === '+') added.push({ path: e.path, s: o.s })
      if (o.t === '-') removed.push({ path: e.path, s: o.s })
    }
  }
  return { added, removed }
}
