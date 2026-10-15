import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { relativeTime, type RepairOutcome } from '../../data/mock'
import { useDB } from '../../data/store'

const OUTCOME_STYLE: Record<RepairOutcome, { color: string; bg: string; border: string }> = {
  proposed: { color: '#7170ff', bg: 'rgba(113,112,255,0.1)', border: 'rgba(113,112,255,0.25)' },
  merged:   { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)' },
  rejected: { color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)' },
  expired:  { color: '#62666d', bg: 'rgba(98,102,109,0.1)',  border: 'rgba(98,102,109,0.2)' },
}

const FILTERS: { label: string; value: RepairOutcome | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Proposed', value: 'proposed' },
  { label: 'Merged', value: 'merged' },
  { label: 'Rejected', value: 'rejected' },
]

function ConfidencePill({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = value >= 0.85 ? '#10b981' : value >= 0.7 ? '#d4a804' : '#f87171'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 48, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color }}>{pct}%</span>
    </div>
  )
}

export default function Repairs() {
  const { repairs: REPAIRS } = useDB()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<RepairOutcome | 'all'>('all')

  const filtered = filter === 'all' ? REPAIRS : REPAIRS.filter(r => r.outcome === filter)

  const counts = {
    proposed: REPAIRS.filter(r => r.outcome === 'proposed').length,
    merged: REPAIRS.filter(r => r.outcome === 'merged').length,
    rejected: REPAIRS.filter(r => r.outcome === 'rejected').length,
    expired: REPAIRS.filter(r => r.outcome === 'expired').length,
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 40px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 18, fontWeight: 590, color: 'var(--fg)', letterSpacing: '-0.03em', marginBottom: 4 }}>Repairs</h1>
        <p style={{ fontSize: 13, color: 'var(--fg-muted)', letterSpacing: '-0.01em' }}>
          All repair PRs proposed by Kintsugi
        </p>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Total repairs', value: REPAIRS.length, color: 'var(--fg)' },
          { label: 'Proposed', value: counts.proposed, color: '#7170ff' },
          { label: 'Merged', value: counts.merged, color: '#10b981' },
          { label: 'Approval rate', value: `${REPAIRS.length ? Math.round((counts.merged / REPAIRS.length) * 100) : 0}%`, color: '#10b981' },
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

      {/* Filter */}
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
              {['Repository', 'Template', 'Confidence', 'Similarity', 'Status', 'PR', 'Created', ''].map(h => (
                <th key={h} style={{
                  padding: '9px 16px', textAlign: 'left', fontSize: 10.5, fontWeight: 500,
                  letterSpacing: '0.07em', color: 'var(--fg-subtle)', textTransform: 'uppercase',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => {
              const os = OUTCOME_STYLE[r.outcome]
              return (
                <tr key={r.id}
                  onClick={() => navigate(`/app/repairs/${r.id}`)}
                  style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    cursor: 'pointer', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', letterSpacing: '-0.01em', marginBottom: 2 }}>{r.repo}</p>
                      <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: 'var(--fg-subtle)' }}>{r.branch}</code>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--accent-v)' }}>{r.templateId}</code>
                  </td>
                  <td style={{ padding: '12px 16px' }}><ConfidencePill value={r.confidence} /></td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--fg-muted)' }}>
                      {(r.similarity * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: 10.5, fontWeight: 500, letterSpacing: '0.04em', padding: '3px 8px', borderRadius: 5,
                      color: os.color, background: os.bg, border: `1px solid ${os.border}`,
                    }}>
                      {r.outcome.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {r.prNumber ? (
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--fg-muted)' }}>
                        #{r.prNumber}
                      </span>
                    ) : <span style={{ color: 'var(--fg-subtle)', fontSize: 12 }}>–</span>}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12.5, color: 'var(--fg-subtle)', whiteSpace: 'nowrap' }}>
                    {relativeTime(r.createdAt)}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--fg-subtle)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                    </svg>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
