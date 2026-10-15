import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { relativeTime, fmtDuration, type PipelineStatus } from '../../data/mock'
import { useDB } from '../../data/store'

function StatusBadge({ status }: { status: PipelineStatus }) {
  const map: Record<PipelineStatus, { label: string; color: string; bg: string; border: string }> = {
    failed:    { label: 'Failed',    color: '#f87171', bg: 'rgba(248,113,113,0.1)',  border: 'rgba(248,113,113,0.25)' },
    running:   { label: 'Running',   color: '#7170ff', bg: 'rgba(113,112,255,0.1)', border: 'rgba(113,112,255,0.25)' },
    passing:   { label: 'Passing',   color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)' },
    repairing: { label: 'Repairing', color: '#7170ff', bg: 'rgba(113,112,255,0.1)', border: 'rgba(113,112,255,0.25)' },
  }
  const s = map[status]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', padding: '3px 8px', borderRadius: 5,
      color: s.color, background: s.bg, border: `1px solid ${s.border}`,
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%', background: s.color,
        boxShadow: status === 'running' || status === 'repairing' ? `0 0 6px ${s.color}` : 'none',
      }} />
      {s.label.toUpperCase()}
    </span>
  )
}

const FILTERS: { label: string; value: PipelineStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Failed', value: 'failed' },
  { label: 'Repairing', value: 'repairing' },
  { label: 'Running', value: 'running' },
  { label: 'Passing', value: 'passing' },
]

export default function Pipelines() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<PipelineStatus | 'all'>('all')
  const { pipelines: PIPELINES } = useDB()

  const filtered = filter === 'all' ? PIPELINES : PIPELINES.filter(p => p.status === filter)

  const counts = {
    failed: PIPELINES.filter(p => p.status === 'failed').length,
    running: PIPELINES.filter(p => p.status === 'running').length,
    repairing: PIPELINES.filter(p => p.status === 'repairing').length,
    passing: PIPELINES.filter(p => p.status === 'passing').length,
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 40px' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 590, color: 'var(--fg)', letterSpacing: '-0.03em', marginBottom: 4 }}>
            Pipelines
          </h1>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', letterSpacing: '-0.01em' }}>
            All GitHub Actions runs monitored by Kintsugi
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => navigate('/onboarding')} style={{
          height: 34, padding: '0 14px', borderRadius: 7,
          border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.03)',
          color: 'var(--fg-2)', fontSize: 12.5, fontWeight: 400, letterSpacing: '-0.01em',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          transition: 'border-color 0.2s, color 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; e.currentTarget.style.color = 'var(--fg)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = 'var(--fg-2)' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Connect repo
        </button>
        <button onClick={() => navigate('/app/run')} style={{
          height: 34, padding: '0 14px', borderRadius: 7, border: 'none',
          background: 'var(--accent)', color: '#fff', fontSize: 12.5, fontWeight: 500, letterSpacing: '-0.01em',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4" /></svg>
          Trigger demo run
        </button>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Total runs today', value: PIPELINES.length, color: 'var(--fg)' },
          { label: 'Failed', value: counts.failed, color: '#f87171' },
          { label: 'Repairing', value: counts.repairing, color: '#7170ff' },
          { label: 'Success rate', value: `${Math.round((counts.passing / PIPELINES.length) * 100)}%`, color: '#10b981' },
        ].map(kpi => (
          <div key={kpi.label} style={{
            padding: '16px 20px', borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.07)', background: 'var(--surface)',
          }}>
            <p style={{ fontSize: 11.5, color: 'var(--fg-subtle)', letterSpacing: '-0.01em', marginBottom: 6 }}>{kpi.label}</p>
            <p style={{ fontSize: 26, fontWeight: 590, color: kpi.color, letterSpacing: '-0.04em', lineHeight: 1 }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 12 }}>
        {FILTERS.map(f => {
          const isActive = filter === f.value
          return (
            <button key={f.value} onClick={() => setFilter(f.value)} style={{
              height: 28, padding: '0 12px', borderRadius: 5, border: 'none',
              background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
              color: isActive ? 'var(--fg)' : 'var(--fg-muted)',
              fontSize: 12.5, fontWeight: isActive ? 500 : 400, letterSpacing: '-0.01em',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {f.label}
              {f.value !== 'all' && counts[f.value as keyof typeof counts] > 0 && (
                <span style={{ marginLeft: 5, fontSize: 10.5, color: isActive ? 'var(--fg-muted)' : 'var(--fg-subtle)' }}>
                  {counts[f.value as keyof typeof counts]}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Repository', 'Branch / Commit', 'Status', 'Error', 'Duration', 'Triggered', ''].map(h => (
                <th key={h} style={{
                  padding: '9px 16px', textAlign: 'left', fontSize: 10.5, fontWeight: 500,
                  letterSpacing: '0.07em', color: 'var(--fg-subtle)', textTransform: 'uppercase', whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr
                key={p.id}
                onClick={() => navigate(`/app/pipelines/${p.id}`)}
                style={{
                  borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  cursor: 'pointer', transition: 'background 0.1s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', letterSpacing: '-0.01em' }}>{p.repo}</span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: 'var(--accent-v)' }}>{p.branch}</code>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--fg-subtle)' }}>{p.commitSha} · {p.commitMsg.slice(0, 36)}{p.commitMsg.length > 36 ? '…' : ''}</span>
                  </div>
                </td>
                <td style={{ padding: '12px 16px' }}><StatusBadge status={p.status} /></td>
                <td style={{ padding: '12px 16px' }}>
                  {p.errorType ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: 'var(--fg-muted)' }}>{p.errorType}</code>
                      {p.errorSymbol && <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: 'var(--fg-subtle)' }}>{p.errorSymbol}</code>}
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>–</span>
                  )}
                </td>
                <td style={{ padding: '12px 16px', fontSize: 12.5, color: 'var(--fg-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                  {fmtDuration(p.durationMs)}
                </td>
                <td style={{ padding: '12px 16px', fontSize: 12.5, color: 'var(--fg-subtle)', whiteSpace: 'nowrap' }}>
                  {relativeTime(p.triggeredAt)}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--fg-subtle)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                  </svg>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
