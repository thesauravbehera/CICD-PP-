import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { recordRun, useDB } from '../../data/store'
import { SCENARIOS, STAGES, runKintsugi, type KintsugiRun } from '../../engine/pipeline'
import { REPO_NAME } from '../../engine/mernApp'
import type { CheckStatus, RepairCandidate, Risk, VerifyAttempt } from '../../engine/types'
import { fmtDuration } from '../../data/mock'

type NodeStatus = 'pending' | 'running' | 'pass' | 'fail' | 'skip'

const MONO = "'JetBrains Mono', monospace"
const STAGE_DELAY = [1300, 900, 800, 1000, 1700, 600]
const C = { pass: '#10b981', fail: '#f87171', run: '#7170ff', warn: '#d4a804' }

const label = (text: string) => (
  <p style={{ fontSize: 11.5, fontWeight: 500, letterSpacing: '0.07em', color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 10 }}>{text}</p>
)

function Pill({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 10.5, fontWeight: 500, letterSpacing: '0.05em', padding: '2px 8px', borderRadius: 4, color, background: `${color}18`, border: `1px solid ${color}40`, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

const fmtMs = (ms: number) => (ms < 1000 ? `${ms}ms` : fmtDuration(ms))
const riskColor = (r: Risk) => (r === 'low' ? C.pass : r === 'med' ? C.warn : C.fail)
const checkColor = (s: CheckStatus) => (s === 'pass' ? C.pass : s === 'fail' ? C.fail : 'var(--fg-subtle)')

// ─── Flow diagram ─────────────────────────────────────────────────────────────

function FlowNode({ stage, status, failure }: { stage: (typeof STAGES)[number]; status: NodeStatus; failure?: boolean }) {
  const color = status === 'pass' ? C.pass : status === 'fail' ? C.fail : status === 'running' ? C.run : 'rgba(255,255,255,0.12)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', flex: '1 1 0', minWidth: 0 }}>
      <div
        style={{
          flex: 1, minWidth: 0, padding: '12px 12px', borderRadius: 9,
          border: `1px solid ${status === 'pending' ? 'rgba(255,255,255,0.08)' : color + '66'}`,
          background: status === 'pending' ? 'rgba(255,255,255,0.015)' : `${color}0d`,
          transition: 'border-color 0.25s, background 0.25s',
          boxShadow: status === 'running' ? `0 0 0 3px ${C.run}1f` : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 12.5, fontWeight: 590, color: status === 'pending' ? 'var(--fg-muted)' : 'var(--fg)', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stage.label}</span>
          <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: status === 'pending' || status === 'skip' ? 'rgba(255,255,255,0.15)' : color, animation: status === 'running' ? 'k-pulse 1s ease-in-out infinite' : 'none' }} />
        </div>
        <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{stage.sublabel}</span>
      </div>
      {stage.id !== 'verdict' && (
        <div style={{ width: 52, flexShrink: 0, position: 'relative', display: 'flex', alignItems: 'center' }}>
          {failure && (
            <span style={{ position: 'absolute', bottom: 'calc(50% + 5px)', left: '50%', transform: 'translateX(-50%)', fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', color: C.fail, fontFamily: MONO, padding: '1px 3px', borderRadius: 3, background: 'var(--bg)', border: `1px solid ${C.fail}55` }}>
              FAILURE
            </span>
          )}
          <div style={{ width: '100%', height: 1, background: failure ? `${C.fail}88` : 'rgba(113,112,255,0.35)' }} />
        </div>
      )}
    </div>
  )
}

// ─── Building blocks ──────────────────────────────────────────────────────────

function Panel({ n, title, status, right, children, innerRef }: { n: number; title: string; status: NodeStatus; right?: React.ReactNode; children: React.ReactNode; innerRef?: React.Ref<HTMLDivElement> }) {
  const color = status === 'pass' ? C.pass : status === 'fail' ? C.fail : C.run
  return (
    <div ref={innerRef} style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', background: 'var(--surface)', overflow: 'hidden', animation: 'k-fade-in 0.35s ease' }}>
      <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, color }}>{String(n).padStart(2, '0')}</span>
        <span style={{ fontSize: 13.5, fontWeight: 590, color: 'var(--fg)', letterSpacing: '-0.02em' }}>{title}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>{right}</div>
      </div>
      <div style={{ padding: '16px 18px' }}>{children}</div>
    </div>
  )
}

function LogView({ text, highlight, maxHeight = 320 }: { text: string; highlight?: Set<number>; maxHeight?: number }) {
  return (
    <pre style={{ margin: 0, maxHeight, overflow: 'auto', borderRadius: 7, border: '1px solid rgba(255,255,255,0.06)', background: 'var(--bg)', padding: '10px 0', fontFamily: MONO, fontSize: 11.5, lineHeight: 1.65 }}>
      {text.split('\n').map((l, i) => {
        const hit = highlight?.has(i + 1)
        return (
          <span key={i} style={{ display: 'flex', background: hit ? 'rgba(248,113,113,0.08)' : 'transparent' }}>
            <span style={{ width: 40, flexShrink: 0, textAlign: 'right', paddingRight: 12, color: 'var(--fg-subtle)', opacity: 0.6, userSelect: 'none' }}>{i + 1}</span>
            <span style={{ color: hit ? C.fail : l.startsWith('##[') ? 'var(--fg-subtle)' : 'var(--fg-muted)', whiteSpace: 'pre', paddingRight: 14 }}>{l || ' '}</span>
          </span>
        )
      })}
    </pre>
  )
}

function DiffView({ diff }: { diff: string }) {
  return (
    <pre style={{ margin: 0, overflow: 'auto', borderRadius: 7, border: '1px solid rgba(255,255,255,0.06)', background: 'var(--bg)', padding: '10px 14px', fontFamily: MONO, fontSize: 11.5, lineHeight: 1.65 }}>
      {diff.split('\n').map((l, i) => {
        const color = l.startsWith('+++') || l.startsWith('---') ? 'var(--fg-2)' : l.startsWith('@@') ? C.run : l.startsWith('+') ? C.pass : l.startsWith('-') ? C.fail : 'var(--fg-muted)'
        const bg = l.startsWith('+') && !l.startsWith('+++') ? 'rgba(16,185,129,0.07)' : l.startsWith('-') && !l.startsWith('---') ? 'rgba(248,113,113,0.07)' : 'transparent'
        return <span key={i} style={{ display: 'block', color, background: bg, whiteSpace: 'pre' }}>{l || ' '}</span>
      })}
    </pre>
  )
}

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.round(value * 100)}%`, background: color, transition: 'width 0.6s ease' }} />
    </div>
  )
}

function Toggle({ open, onClick, children }: { open: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 12, color: 'var(--accent-v)', letterSpacing: '-0.01em' }}>
      {open ? '▾' : '▸'} {children}
    </button>
  )
}

// ─── Stage panels ─────────────────────────────────────────────────────────────

function CandidateCard({ c, rank, outcome }: { c: RepairCandidate; rank: number; outcome?: VerifyAttempt }) {
  const [open, setOpen] = useState(rank === 0)
  return (
    <div style={{ borderRadius: 8, border: `1px solid ${rank === 0 ? 'rgba(113,112,255,0.3)' : 'rgba(255,255,255,0.07)'}`, background: rank === 0 ? 'rgba(113,112,255,0.04)' : 'transparent', padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, color: 'var(--fg-subtle)', paddingTop: 2 }}>#{rank + 1}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <code style={{ fontFamily: MONO, fontSize: 12, color: 'var(--accent-v)' }}>{c.strategy}</code>
            <Pill color={riskColor(c.risk)}>{c.risk.toUpperCase()} RISK</Pill>
            {outcome && <Pill color={outcome.passed ? C.pass : C.fail}>{outcome.passed ? 'VERIFIED' : 'FAILED VERIFY'}</Pill>}
            {!outcome && rank > 0 && <Pill color="#62666d">NOT TRIED</Pill>}
          </div>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', letterSpacing: '-0.015em', marginBottom: 4 }}>{c.title}</p>
          <p style={{ fontSize: 12.5, color: 'var(--fg-muted)', lineHeight: 1.55 }}>{c.rationale}</p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontSize: 20, fontWeight: 590, letterSpacing: '-0.04em', lineHeight: 1, color: c.score >= 0.6 ? C.pass : c.score >= 0.4 ? C.warn : C.fail }}>{c.score.toFixed(2)}</p>
          <p style={{ fontSize: 10.5, color: 'var(--fg-subtle)', marginTop: 3 }}>plan score</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, margin: '12px 0 10px 26px' }}>
        {c.features.map(f => (
          <div key={f.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--fg-subtle)', marginBottom: 4, gap: 6 }}>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.label}</span>
              <span style={{ fontFamily: MONO }}>{f.value.toFixed(2)}</span>
            </div>
            <Bar value={f.value} color="rgba(113,112,255,0.7)" />
          </div>
        ))}
      </div>
      <div style={{ marginLeft: 26 }}>
        <Toggle open={open} onClick={() => setOpen(!open)}>patch ({c.edits.length} file{c.edits.length > 1 ? 's' : ''})</Toggle>
        {open && <div style={{ marginTop: 8 }}><DiffView diff={c.diff} /></div>}
      </div>
    </div>
  )
}

function AttemptCard({ a, c }: { a: VerifyAttempt; c?: RepairCandidate }) {
  const [showLog, setShowLog] = useState(false)
  const [showDocker, setShowDocker] = useState(false)
  return (
    <div style={{ borderRadius: 8, border: `1px solid ${a.passed ? 'rgba(16,185,129,0.25)' : 'rgba(248,113,113,0.25)'}`, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: MONO, fontSize: 11, color: 'var(--fg-subtle)' }}>{a.candidateId}</span>
        <code style={{ fontFamily: MONO, fontSize: 12, color: 'var(--accent-v)' }}>{c?.strategy}</code>
        <span style={{ fontFamily: MONO, fontSize: 11, color: 'var(--fg-subtle)' }}>{a.image}</span>
        <span style={{ marginLeft: 'auto' }}><Pill color={a.passed ? C.pass : C.fail}>{a.passed ? 'PASS' : 'FAIL'}</Pill></span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
        {a.checks.map(ch => (
          <div key={ch.id} style={{ padding: '9px 11px', borderRadius: 7, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: checkColor(ch.status) }} />
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg)' }}>{ch.label}</span>
              <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 10.5, color: 'var(--fg-subtle)' }}>{fmtMs(ch.durationMs)}</span>
            </div>
            <p style={{ fontSize: 11.5, color: ch.status === 'fail' ? C.fail : 'var(--fg-muted)', lineHeight: 1.45 }}>{ch.detail}</p>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        <Toggle open={showDocker} onClick={() => setShowDocker(!showDocker)}>Dockerfile</Toggle>
        <Toggle open={showLog} onClick={() => setShowLog(!showLog)}>container log</Toggle>
      </div>
      {showDocker && <div style={{ marginTop: 8 }}><LogView text={a.dockerfile} maxHeight={200} /></div>}
      {showLog && <div style={{ marginTop: 8 }}><LogView text={a.log} maxHeight={280} /></div>}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LiveRun() {
  const [params] = useSearchParams()
  const initial = SCENARIOS.find(s => s.id === params.get('scenario'))?.id ?? SCENARIOS[0].id
  const [scenarioId, setScenarioId] = useState(initial)
  const [run, setRun] = useState<KintsugiRun | null>(null)
  const [saved, setSaved] = useState<{ pipelineId: string; repairId?: string } | null>(null)
  const { templates } = useDB()
  const [revealed, setRevealed] = useState(0)
  const latest = useRef<HTMLDivElement>(null)
  const running = run !== null && revealed < STAGES.length

  useEffect(() => {
    if (!run || revealed >= STAGES.length) return
    const stop = run.verdict === 'GREEN' && revealed >= 1
    const t = setTimeout(() => setRevealed(stop ? STAGES.length : revealed + 1), STAGE_DELAY[revealed])
    return () => clearTimeout(t)
  }, [run, revealed])

  useEffect(() => {
    if (revealed > 0) latest.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [revealed])

  const start = () => {
    const result = runKintsugi(scenarioId, templates.filter(t => t.quarantined).map(t => t.id))
    setRun(result)
    setSaved(recordRun(result))
    setRevealed(0)
  }

  const finalStatus = (i: number): NodeStatus => {
    if (!run) return 'pending'
    if (run.verdict === 'GREEN') return i === 0 ? 'pass' : 'skip'
    if (i === 0) return 'fail'
    if (i === 4) return run.verdict === 'PASS' ? 'pass' : 'fail'
    if (i === 5) return run.verdict === 'PASS' ? 'pass' : 'fail'
    return 'pass'
  }
  const status = (i: number): NodeStatus => (!run ? 'pending' : i < revealed ? finalStatus(i) : i === revealed ? 'running' : 'pending')

  const evidence = useMemo(() => new Set(run?.parse?.events.flatMap(e => e.evidence) ?? []), [run])
  const candidateById = (id: string) => run?.plan?.candidates.find(c => c.id === id)
  const accepted = run?.verification?.acceptedCandidateId ? candidateById(run.verification.acceptedCandidateId) : undefined
  const tokenCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const t of run?.parse?.tokens ?? []) if (t.kind !== 'TEXT' && t.kind !== 'BLANK') counts[t.kind] = (counts[t.kind] ?? 0) + 1
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [run])

  const ref = (i: number) => (i === revealed - 1 ? latest : undefined)

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 40px 80px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <h1 style={{ fontSize: 20, fontWeight: 590, letterSpacing: '-0.035em', color: 'var(--fg)' }}>Live run</h1>
          <Pill color={C.run}>DEMO MERN APP</Pill>
        </div>
        <p style={{ fontSize: 13, color: 'var(--fg-muted)', letterSpacing: '-0.01em', lineHeight: 1.55, maxWidth: 640 }}>
          Break <code style={{ fontFamily: MONO, fontSize: 12, color: 'var(--fg-2)' }}>{REPO_NAME}</code> with a real commit, then watch the loop run end to end:
          the log is lexed by regex and walked by a state machine, the root-cause engine checks its guess against the repo, the planner ranks fixes,
          and each candidate is replayed in a sandboxed container before a verdict.
        </p>
      </div>

      {/* Scenario picker */}
      {label('Failure scenario')}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
        {SCENARIOS.map(s => {
          const active = s.id === scenarioId
          return (
            <button
              key={s.id}
              onClick={() => !running && setScenarioId(s.id)}
              disabled={running}
              style={{
                textAlign: 'left', padding: '13px 14px', borderRadius: 9, cursor: running ? 'default' : 'pointer',
                border: `1px solid ${active ? 'rgba(113,112,255,0.45)' : 'rgba(255,255,255,0.07)'}`,
                background: active ? 'rgba(113,112,255,0.07)' : 'rgba(255,255,255,0.012)',
                opacity: running && !active ? 0.5 : 1, transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 590, color: 'var(--fg)', letterSpacing: '-0.02em' }}>{s.title}</span>
                <span style={{ fontFamily: MONO, fontSize: 10.5, color: 'var(--fg-subtle)' }}>{s.commitSha}</span>
              </div>
              <p style={{ fontFamily: MONO, fontSize: 11, color: 'var(--accent-v)', marginBottom: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.commitMsg}</p>
              <p style={{ fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.45 }}>{s.blurb}</p>
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <button
          onClick={start}
          disabled={running}
          style={{
            padding: '9px 18px', borderRadius: 7, border: 'none', cursor: running ? 'default' : 'pointer',
            background: running ? 'rgba(113,112,255,0.35)' : 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 500, letterSpacing: '-0.01em',
          }}
        >
          {running ? 'Running…' : run ? 'Run again' : 'Run pipeline'}
        </button>
        {run && !running && (
          <span style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}>
            Finished · verdict{' '}
            <strong style={{ color: run.verdict === 'REJECT' ? C.fail : C.pass }}>{run.verdict === 'GREEN' ? 'PASS (build green)' : run.verdict}</strong>
          </span>
        )}
      </div>

      {/* Flow */}
      {label('Kintsugi loop')}
      <div style={{ display: 'flex', alignItems: 'stretch', marginBottom: 28 }}>
        {STAGES.map((s, i) => (
          <FlowNode key={s.id} stage={s} status={status(i)} failure={i === 0 && !!run && revealed > 0 && run.verdict !== 'GREEN'} />
        ))}
      </div>

      {/* Panels */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {run && revealed > 0 && (
          <Panel n={1} title="Build / Test" status={finalStatus(0)} innerRef={ref(0)}
            right={<>
              <span style={{ fontFamily: MONO, fontSize: 11, color: 'var(--fg-subtle)' }}>{run.scenario.commitSha} · {run.scenario.author}</span>
              <Pill color={run.build.ok ? C.pass : C.fail}>{run.build.ok ? 'GREEN' : `FAILED · ${run.build.failedStep}`}</Pill>
            </>}>
            <LogView text={run.build.log} highlight={evidence} />
          </Panel>
        )}

        {run?.parse && revealed > 1 && (
          <Panel n={2} title="Log Parser — regex lexer + finite-state machine" status="pass" innerRef={ref(1)}
            right={<Pill color={C.pass}>{run.parse.events.length} EVENT{run.parse.events.length === 1 ? '' : 'S'}</Pill>}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 18 }}>
              <div>
                {label(`FSM transitions (${run.parse.transitions.length})`)}
                <div style={{ maxHeight: 260, overflow: 'auto', borderRadius: 7, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: MONO, fontSize: 11 }}>
                    <tbody>
                      {run.parse.transitions.map((t, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '5px 10px', color: 'var(--fg-subtle)', width: 44 }}>L{t.line}</td>
                          <td style={{ padding: '5px 4px', color: 'var(--fg-muted)' }}>{t.from}</td>
                          <td style={{ padding: '5px 4px', color: 'var(--fg-subtle)' }}>→</td>
                          <td style={{ padding: '5px 4px', color: t.to === 'DONE' ? 'var(--fg-subtle)' : 'var(--accent-v)' }}>{t.to}</td>
                          <td style={{ padding: '5px 10px', color: 'var(--fg-subtle)', textAlign: 'right' }}>{t.token}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  {tokenCounts.map(([k, n]) => (
                    <span key={k} style={{ fontFamily: MONO, fontSize: 10.5, color: 'var(--fg-muted)', padding: '2px 7px', borderRadius: 4, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>{k} ×{n}</span>
                  ))}
                </div>
              </div>
              <div>
                {label('Extracted events')}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {run.parse.events.map((e, i) => (
                    <div key={i} style={{ padding: '10px 12px', borderRadius: 7, border: '1px solid rgba(248,113,113,0.2)', background: 'rgba(248,113,113,0.04)' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                        <Pill color={C.fail}>{e.kind}</Pill>
                        {e.symbol && <code style={{ fontFamily: MONO, fontSize: 11.5, color: 'var(--fg-2)' }}>{e.symbol}</code>}
                      </div>
                      <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '3px 10px', fontSize: 11.5, fontFamily: MONO }}>
                        {([
                          ['step', e.step],
                          ['location', e.file && `${e.file.replace(/^.*todo-mern\/todo-mern\//, '')}${e.line ? ':' + e.line : ''}`],
                          ['expected', e.expected],
                          ['received', e.received],
                          ['test', e.testName],
                          ['frames', e.frames.length ? String(e.frames.length) : undefined],
                          ['evidence', `${e.evidence.length} lines`],
                        ] as const).filter(([, v]) => v).map(([k, v]) => (
                          <div key={k} style={{ display: 'contents' }}>
                            <dt style={{ color: 'var(--fg-subtle)' }}>{k}</dt>
                            <dd style={{ color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Panel>
        )}

        {run?.rootCause && revealed > 2 && (
          <Panel n={3} title="Root Cause Engine" status="pass" innerRef={ref(2)} right={<Pill color={C.run}>{run.rootCause.category}</Pill>}>
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, color: 'var(--fg)', letterSpacing: '-0.015em', lineHeight: 1.5, marginBottom: 8 }}>{run.rootCause.summary}</p>
                {run.rootCause.file && (
                  <code style={{ fontFamily: MONO, fontSize: 12, color: 'var(--accent-v)' }}>
                    {run.rootCause.file}{run.rootCause.line ? `:${run.rootCause.line}` : ''}
                  </code>
                )}
                <div style={{ marginTop: 14 }}>
                  {label('Corroborating signals')}
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {run.rootCause.signals.map(s => (
                      <li key={s} style={{ fontSize: 12.5, color: 'var(--fg-muted)', display: 'flex', gap: 8 }}>
                        <span style={{ color: C.pass }}>✓</span>{s}
                      </li>
                    ))}
                  </ul>
                </div>
                {run.rootCause.suppressed.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    {label('Suppressed as downstream')}
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {run.rootCause.suppressed.map(s => (
                        <li key={s} style={{ fontSize: 12, color: 'var(--fg-subtle)', fontFamily: MONO }}>– {s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div style={{ width: 150, flexShrink: 0, textAlign: 'right' }}>
                <p style={{ fontSize: 30, fontWeight: 590, letterSpacing: '-0.04em', lineHeight: 1, color: run.rootCause.confidence >= 0.85 ? C.pass : run.rootCause.confidence >= 0.7 ? C.warn : C.fail }}>
                  {(run.rootCause.confidence * 100).toFixed(0)}%
                </p>
                <p style={{ fontSize: 11, color: 'var(--fg-subtle)', margin: '4px 0 8px' }}>confidence</p>
                <Bar value={run.rootCause.confidence} color={run.rootCause.confidence >= 0.85 ? C.pass : C.warn} />
              </div>
            </div>
          </Panel>
        )}

        {run?.plan && revealed > 3 && (
          <Panel n={4} title="AI Repair Planner" status="pass" innerRef={ref(3)}
            right={<span style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}>{run.plan.candidates.length} candidates · runs locally, no code leaves the box</span>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {run.plan.candidates.length === 0 && <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>No strategy applies to this root cause.</p>}
              {run.plan.candidates.map((c, i) => (
                <CandidateCard key={c.id} c={c} rank={i} outcome={revealed > 4 ? run.verification?.attempts.find(a => a.candidateId === c.id) : undefined} />
              ))}
            </div>
          </Panel>
        )}

        {run?.verification && revealed > 4 && (
          <Panel n={5} title="Docker Verification" status={finalStatus(4)} innerRef={ref(4)}
            right={<span style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}>read-only rootfs · registry-only egress · no repo secrets</span>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {run.verification.attempts.map(a => <AttemptCard key={a.candidateId} a={a} c={candidateById(a.candidateId)} />)}
            </div>
          </Panel>
        )}

        {run && revealed > 5 && (
          <div ref={latest} style={{
            borderRadius: 10, padding: '22px 24px', animation: 'k-fade-in 0.35s ease',
            border: `1px solid ${run.verdict === 'REJECT' ? 'rgba(248,113,113,0.35)' : 'rgba(16,185,129,0.35)'}`,
            background: run.verdict === 'REJECT' ? 'rgba(248,113,113,0.06)' : 'rgba(16,185,129,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
              <span style={{ fontSize: 26, fontWeight: 650, letterSpacing: '-0.03em', color: run.verdict === 'REJECT' ? C.fail : C.pass, fontFamily: MONO }}>
                {run.verdict === 'GREEN' ? 'PASS' : run.verdict}
              </span>
              <span style={{ fontSize: 13.5, color: 'var(--fg)', letterSpacing: '-0.015em' }}>
                {run.verdict === 'GREEN' && 'Build and tests are green — nothing to repair.'}
                {run.verdict === 'PASS' && accepted && <>Repair <code style={{ fontFamily: MONO, color: 'var(--accent-v)' }}>{accepted.strategy}</code> verified. PR ready for human review on <code style={{ fontFamily: MONO, color: 'var(--accent-v)' }}>kintsugi/{accepted.strategy}-{run.scenario.commitSha}</code>.</>}
                {run.verdict === 'REJECT' && 'No candidate survived verification. Nothing is pushed; the failure is escalated with the full trace.'}
              </span>
            </div>
            {run.verification && (
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {run.verification.reasons.map(r => (
                  <li key={r} style={{ fontSize: 12.5, color: 'var(--fg-muted)', fontFamily: MONO }}>· {r}</li>
                ))}
              </ul>
            )}
            {run.verdict === 'PASS' && (
              <p style={{ fontSize: 12, color: 'var(--fg-subtle)', marginTop: 10 }}>Never auto-merged — a human approves every repair.</p>
            )}
            {saved && (
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                {saved.repairId && (
                  <Link to={`/app/repairs/${saved.repairId}`} style={{ height: 32, padding: '0 14px', borderRadius: 7, display: 'inline-flex', alignItems: 'center', background: 'var(--accent)', color: '#fff', fontSize: 12.5, fontWeight: 500, textDecoration: 'none' }}>
                    {run.verdict === 'PASS' ? 'Review repair PR →' : 'View rejected repair →'}
                  </Link>
                )}
                <Link to={`/app/pipelines/${saved.pipelineId}`} style={{ height: 32, padding: '0 14px', borderRadius: 7, display: 'inline-flex', alignItems: 'center', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--fg-2)', fontSize: 12.5, textDecoration: 'none' }}>
                  Open pipeline
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
