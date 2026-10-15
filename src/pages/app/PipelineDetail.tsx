import { useParams, useNavigate, Link } from 'react-router-dom'
import { relativeTime, fmtDuration, type StageStatus } from '../../data/mock'
import { useDB } from '../../data/store'

function StageIcon({ status }: { status: StageStatus }) {
  if (status === 'pass') return (
    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: '1.5px solid rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
    </div>
  )
  if (status === 'fail') return (
    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(248,113,113,0.12)', border: '1.5px solid rgba(248,113,113,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
    </div>
  )
  if (status === 'running') return (
    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(113,112,255,0.12)', border: '1.5px solid rgba(113,112,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, animation: 'spin 1.5s linear infinite' }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7170ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
    </div>
  )
  if (status === 'skip') return (
    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', border: '1.5px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--fg-subtle)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
    </div>
  )
  return (
    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', border: '1.5px dashed rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />
    </div>
  )
}

export default function PipelineDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { pipelines: PIPELINES, repairs: REPAIRS } = useDB()
  const pipeline = PIPELINES.find(p => p.id === id)

  if (!pipeline) {
    return (
      <div style={{ padding: 40, color: 'var(--fg-muted)' }}>
        Pipeline not found. <Link to="/app/pipelines" style={{ color: 'var(--accent-v)' }}>Go back</Link>
      </div>
    )
  }

  const repair = pipeline.repairId ? REPAIRS.find(r => r.id === pipeline.repairId) : null

  const statusColor = pipeline.status === 'passing' ? '#10b981' : pipeline.status === 'failed' ? '#f87171' : '#7170ff'

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 40px' }}>
      {/* Back */}
      <button onClick={() => navigate('/app/pipelines')} style={{
        display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--fg-subtle)',
        background: 'none', border: 'none', cursor: 'pointer', marginBottom: 20, padding: 0,
        letterSpacing: '-0.01em', transition: 'color 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.color = 'var(--fg-muted)' }}
      onMouseLeave={e => { e.currentTarget.style.color = 'var(--fg-subtle)' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
        </svg>
        Pipelines
      </button>

      {/* Header */}
      <div style={{ marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 590, color: 'var(--fg)', letterSpacing: '-0.03em' }}>{pipeline.repo}</span>
              <span style={{
                fontSize: 10.5, fontWeight: 500, letterSpacing: '0.05em', padding: '3px 8px', borderRadius: 4,
                color: statusColor,
                background: `${statusColor}18`,
                border: `1px solid ${statusColor}40`,
              }}>
                {pipeline.status.toUpperCase()}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--accent-v)' }}>{pipeline.branch}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: 'var(--fg-subtle)' }}>{pipeline.commitSha}</span>
              <span style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}>{pipeline.commitMsg}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontSize: 12, color: 'var(--fg-subtle)', marginBottom: 2 }}>{relativeTime(pipeline.triggeredAt)}</p>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--fg-muted)' }}>{fmtDuration(pipeline.durationMs)}</p>
          </div>
        </div>
      </div>

      {/* Stage checklist */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
          <p style={{ fontSize: 11.5, fontWeight: 500, letterSpacing: '0.07em', color: 'var(--fg-subtle)', textTransform: 'uppercase' }}>
            Kintsugi loop
          </p>
          <Link to={pipeline.scenarioId ? `/app/run?scenario=${pipeline.scenarioId}` : '/app/run'} style={{ fontSize: 12, color: 'var(--accent-v)', textDecoration: 'none' }}>
            {pipeline.scenarioId ? 'Replay this run →' : 'See it run live →'}
          </Link>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {pipeline.stages.map((stage, i) => (
            <div key={stage.id}>
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '12px 16px', borderRadius: 8,
                background: stage.status === 'running' ? 'rgba(113,112,255,0.04)' : 'transparent',
                border: stage.status === 'running' ? '1px solid rgba(113,112,255,0.15)' : '1px solid transparent',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                  <StageIcon status={stage.status} />
                  {i < pipeline.stages.length - 1 && (
                    <div style={{ width: 1.5, height: 20, background: 'rgba(255,255,255,0.08)', marginTop: 4 }} />
                  )}
                </div>
                <div style={{ flex: 1, paddingTop: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: stage.detail ? 4 : 0 }}>
                    <span style={{
                      fontSize: 13.5, fontWeight: 500, color:
                        stage.status === 'pass' ? 'var(--fg)' :
                        stage.status === 'fail' ? '#f87171' :
                        stage.status === 'running' ? '#7170ff' : 'var(--fg-muted)',
                      letterSpacing: '-0.02em',
                    }}>{stage.label}</span>
                    {stage.durationMs && (
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--fg-subtle)' }}>
                        {fmtDuration(stage.durationMs)}
                      </span>
                    )}
                    {stage.status === 'skip' && (
                      <span style={{ fontSize: 10.5, color: 'var(--fg-subtle)', letterSpacing: '0.04em' }}>SKIPPED</span>
                    )}
                    {stage.status === 'pending' && (
                      <span style={{ fontSize: 10.5, color: 'var(--fg-subtle)', letterSpacing: '0.04em' }}>PENDING</span>
                    )}
                  </div>
                  {stage.detail && (
                    <p style={{ fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.5, letterSpacing: '-0.01em' }}>{stage.detail}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Log excerpt */}
      {pipeline.logExcerpt && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11.5, fontWeight: 500, letterSpacing: '0.07em', color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 10 }}>
            Log excerpt
          </p>
          <div style={{
            borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)',
            background: 'var(--surface)', overflow: 'hidden',
          }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', gap: 5 }}>
                {['#f87171', '#fbbf24', '#34d399'].map(c => (
                  <div key={c} style={{ width: 8, height: 8, borderRadius: '50%', background: c, opacity: 0.6 }} />
                ))}
              </div>
              <span style={{ fontSize: 11, color: 'var(--fg-subtle)', fontFamily: "'JetBrains Mono', monospace" }}>
                {pipeline.repo} / {pipeline.branch} / {pipeline.failedStep ?? 'log'}
              </span>
            </div>
            <pre style={{
              margin: 0, padding: '14px 16px',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 12, lineHeight: 1.7,
              color: 'var(--fg-muted)', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            }}>
              {pipeline.logExcerpt?.split('\n').map((line, i) => {
                const isError = line.toLowerCase().includes('error') || line.toLowerCase().includes('failed')
                return (
                  <span key={i} style={{ display: 'block', color: isError ? '#f87171' : 'var(--fg-muted)', background: isError ? 'rgba(248,113,113,0.05)' : 'transparent', padding: '0 2px' }}>
                    {line}
                  </span>
                )
              })}
            </pre>
          </div>
        </div>
      )}

      {/* Repair card */}
      {repair && (
        <div>
          <p style={{ fontSize: 11.5, fontWeight: 500, letterSpacing: '0.07em', color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 10 }}>
            Kintsugi repair
          </p>
          <div
            onClick={() => navigate(`/app/repairs/${repair.id}`)}
            style={{
              borderRadius: 10, border: '1px solid rgba(113,112,255,0.28)',
              background: 'rgba(113,112,255,0.04)', padding: '20px 22px', cursor: 'pointer',
              transition: 'border-color 0.2s, background 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(113,112,255,0.45)'; e.currentTarget.style.background = 'rgba(113,112,255,0.07)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(113,112,255,0.28)'; e.currentTarget.style.background = 'rgba(113,112,255,0.04)' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: 'var(--accent-v)' }}>
                    {repair.templateId}
                  </code>
                  <span style={{
                    fontSize: 10.5, fontWeight: 500, letterSpacing: '0.04em', padding: '2px 7px', borderRadius: 4,
                    color: repair.outcome === 'proposed' ? '#7170ff' : repair.outcome === 'merged' ? '#10b981' : '#f87171',
                    background: repair.outcome === 'proposed' ? 'rgba(113,112,255,0.12)' : repair.outcome === 'merged' ? 'rgba(16,185,129,0.1)' : 'rgba(248,113,113,0.1)',
                    border: `1px solid ${repair.outcome === 'proposed' ? 'rgba(113,112,255,0.3)' : repair.outcome === 'merged' ? 'rgba(16,185,129,0.25)' : 'rgba(248,113,113,0.25)'}`,
                  }}>
                    {repair.outcome.toUpperCase()}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--fg-muted)', letterSpacing: '-0.01em', lineHeight: 1.5, maxWidth: 500 }}>
                  {repair.explanation}
                </p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ color: repair.confidence >= 0.85 ? '#10b981' : repair.confidence >= 0.7 ? '#d4a804' : '#f87171', fontSize: 22, fontWeight: 590, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 4 }}>
                  {(repair.confidence * 100).toFixed(0)}%
                </p>
                <p style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>confidence</p>
              </div>
            </div>
            {repair.prNumber && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--fg-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><path d="M13 6h3a2 2 0 0 1 2 2v7" /><line x1="6" y1="9" x2="6" y2="21" />
                </svg>
                <span style={{ fontSize: 12.5, color: 'var(--fg-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                  PR #{repair.prNumber} on {repair.repo}{repair.repo === 'demo/todo-mern' ? ' (demo)' : ''}
                </span>
                <span style={{ fontSize: 12, color: 'var(--accent-v)', marginLeft: 4 }}>View repair →</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
