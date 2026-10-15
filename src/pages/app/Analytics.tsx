import { useState } from 'react'
import { ANALYTICS_MTTR as MTTR_ALL, ANALYTICS_APPROVAL as APPROVAL_ALL, ANALYTICS_KB as KB_ALL } from '../../data/mock'
import { useDB } from '../../data/store'

type Range = '7d' | '30d' | '90d'

function LineChart({ data, color, label, format, lowerIsBetter }: {
  data: { date: string; value: number }[]
  color: string
  label: string
  format: (v: number) => string
  lowerIsBetter?: boolean
}) {
  // SVG ids can't contain spaces or parens — an invalid url(#…) renders the area fill black
  const gradId = `area-${label.replace(/[^a-zA-Z0-9]+/g, '-')}`
  const W = 480, H = 120, PADX = 40, PADY = 16
  const vals = data.map(d => d.value)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const range = max - min || 1

  const pts = data.map((d, i) => ({
    x: PADX + (i / (data.length - 1)) * (W - PADX * 2),
    y: PADY + ((1 - (d.value - min) / range) * (H - PADY * 2)),
    v: d.value,
    date: d.date,
  }))

  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const areaD = `${pathD} L ${pts[pts.length - 1].x.toFixed(1)} ${H} L ${pts[0].x.toFixed(1)} ${H} Z`

  const latest = vals[vals.length - 1]
  const prev = vals[0]
  const pct = prev === 0 ? 0 : ((latest - prev) / prev) * 100
  const isUp = pct >= 0
  const isGood = lowerIsBetter ? !isUp : isUp

  return (
    <div style={{
      borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', background: 'var(--surface)',
      padding: '20px 22px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 11.5, color: 'var(--fg-subtle)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</p>
          <p style={{ fontSize: 28, fontWeight: 590, color: 'var(--fg)', letterSpacing: '-0.04em', lineHeight: 1 }}>
            {format(latest)}
          </p>
        </div>
        <span style={{
          fontSize: 11.5, fontWeight: 500, padding: '3px 8px', borderRadius: 5,
          color: isGood ? '#10b981' : '#f87171',
          background: isGood ? 'rgba(16,185,129,0.1)' : 'rgba(248,113,113,0.1)',
          border: `1px solid ${isGood ? 'rgba(16,185,129,0.2)' : 'rgba(248,113,113,0.2)'}`,
        }}>
          {isUp ? '+' : ''}{pct.toFixed(1)}%
        </span>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.15" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#${gradId})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} opacity={i === pts.length - 1 ? 1 : 0} />
        ))}
        {/* x axis labels — first and last */}
        <text x={pts[0].x} y={H + 14} textAnchor="middle" fontSize="9" fill="var(--fg-subtle)" fontFamily="'JetBrains Mono', monospace">
          {data[0].date}
        </text>
        <text x={pts[pts.length - 1].x} y={H + 14} textAnchor="middle" fontSize="9" fill="var(--fg-subtle)" fontFamily="'JetBrains Mono', monospace">
          {data[data.length - 1].date}
        </text>
      </svg>
    </div>
  )
}

function BarChart({ data, color, label, format }: {
  data: { date: string; value: number }[]
  color: string
  label: string
  format: (v: number) => string
}) {
  const W = 480, H = 100, PADX = 8, PADY = 12
  const vals = data.map(d => d.value)
  const max = Math.max(...vals) || 1
  const barW = (W - PADX * 2) / data.length - 3

  const latest = vals[vals.length - 1]
  const prev = vals[0]
  const pct = prev === 0 ? 0 : ((latest - prev) / prev) * 100
  const isUp = pct >= 0
  const isGood = isUp

  return (
    <div style={{
      borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', background: 'var(--surface)',
      padding: '20px 22px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 11.5, color: 'var(--fg-subtle)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</p>
          <p style={{ fontSize: 28, fontWeight: 590, color: 'var(--fg)', letterSpacing: '-0.04em', lineHeight: 1 }}>
            {format(latest)}
          </p>
        </div>
        <span style={{
          fontSize: 11.5, fontWeight: 500, padding: '3px 8px', borderRadius: 5,
          color: isGood ? '#10b981' : '#f87171',
          background: isGood ? 'rgba(16,185,129,0.1)' : 'rgba(248,113,113,0.1)',
          border: `1px solid ${isGood ? 'rgba(16,185,129,0.2)' : 'rgba(248,113,113,0.2)'}`,
        }}>
          {isUp ? '+' : ''}{pct.toFixed(1)}%
        </span>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        {data.map((d, i) => {
          const bh = ((d.value / max) * (H - PADY * 2))
          const x = PADX + i * ((W - PADX * 2) / data.length)
          return (
            <rect key={i}
              x={x} y={H - PADY - bh}
              width={barW} height={bh}
              rx="3"
              fill={i === data.length - 1 ? color : `${color}55`}
            />
          )
        })}
      </svg>
    </div>
  )
}

export default function Analytics() {
  const [range, setRange] = useState<Range>('30d')
  const { repairs: REPAIRS, pipelines: PIPELINES, signatures } = useDB()
  const points = range === '7d' ? 3 : MTTR_ALL.length
  const ANALYTICS_MTTR = MTTR_ALL.slice(-points)
  const ANALYTICS_APPROVAL = APPROVAL_ALL.slice(-points)
  // knowledge-base growth: seed series, with today's point reflecting the live KB size
  const kbSeries = KB_ALL.map((p, i) => (i === KB_ALL.length - 1 ? { ...p, value: Math.max(p.value, p.value - 8 + signatures.length) } : p))
  const ANALYTICS_KB = kbSeries.slice(-points)

  const totalRepairs = REPAIRS.length
  const merged = REPAIRS.filter(r => r.outcome === 'merged').length
  const decided = REPAIRS.filter(r => r.outcome === 'merged' || r.outcome === 'rejected').length
  const approvalRate = decided ? ((merged / decided) * 100).toFixed(0) : '0'
  const totalFailed = PIPELINES.filter(p => p.status === 'failed' || p.status === 'repairing').length

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 590, color: 'var(--fg)', letterSpacing: '-0.03em', marginBottom: 4 }}>Analytics</h1>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', letterSpacing: '-0.01em' }}>
            Repair performance and knowledge base growth over time
          </p>
        </div>
        <div style={{ display: 'flex', gap: 3, padding: '3px', borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {(['7d', '30d', '90d'] as Range[]).map(r => (
            <button key={r} onClick={() => setRange(r)} style={{
              height: 26, padding: '0 11px', borderRadius: 5, border: 'none',
              background: range === r ? 'rgba(255,255,255,0.07)' : 'transparent',
              color: range === r ? 'var(--fg)' : 'var(--fg-muted)',
              fontSize: 12, fontWeight: range === r ? 500 : 400, cursor: 'pointer', letterSpacing: '-0.01em',
            }}>{r}</button>
          ))}
        </div>
      </div>

      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Avg MTTR', value: `${ANALYTICS_MTTR[ANALYTICS_MTTR.length - 1].value}m`, sub: 'mean time to repair' },
          { label: 'Approval rate', value: `${approvalRate}%`, sub: 'of proposed repairs' },
          { label: 'Total repairs', value: totalRepairs, sub: 'proposed to date' },
          { label: 'Pipelines healed', value: totalFailed, sub: 'failures intercepted' },
        ].map(kpi => (
          <div key={kpi.label} style={{
            padding: '16px 20px', borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.07)', background: 'var(--surface)',
          }}>
            <p style={{ fontSize: 11.5, color: 'var(--fg-subtle)', letterSpacing: '-0.01em', marginBottom: 6 }}>{kpi.label}</p>
            <p style={{ fontSize: 26, fontWeight: 590, color: 'var(--fg)', letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 4 }}>{kpi.value}</p>
            <p style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <LineChart
          data={ANALYTICS_MTTR}
          color="#7170ff"
          label="MTTR (minutes)"
          format={v => `${v}m`}
          lowerIsBetter
        />
        <LineChart
          data={ANALYTICS_APPROVAL}
          color="#10b981"
          label="Approval rate (%)"
          format={v => `${v}%`}
        />
      </div>

      {/* Charts row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
        <BarChart
          data={ANALYTICS_KB}
          color="#5e6ad2"
          label="KB templates indexed"
          format={v => String(v)}
        />
        {/* Repair outcomes donut */}
        <div style={{
          borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', background: 'var(--surface)',
          padding: '20px 22px',
        }}>
          <p style={{ fontSize: 11.5, color: 'var(--fg-subtle)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 }}>Repair outcomes</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            <DonutChart repairs={{ merged, proposed: REPAIRS.filter(r => r.outcome === 'proposed').length, rejected: REPAIRS.filter(r => r.outcome === 'rejected').length }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Merged', color: '#10b981', count: merged },
                { label: 'Proposed', color: '#7170ff', count: REPAIRS.filter(r => r.outcome === 'proposed').length },
                { label: 'Rejected', color: '#f87171', count: REPAIRS.filter(r => r.outcome === 'rejected').length },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5, color: 'var(--fg-muted)', flex: 1 }}>{item.label}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'var(--fg)', fontWeight: 500 }}>{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <p style={{ fontSize: 11.5, fontWeight: 500, letterSpacing: '0.07em', color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 12 }}>Recent repair activity</p>
        <div style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          {REPAIRS.slice(0, 4).map((r, i) => (
            <div key={r.id} style={{
              display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px',
              borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                background: r.outcome === 'merged' ? '#10b981' : r.outcome === 'proposed' ? '#7170ff' : '#f87171',
              }} />
              <span style={{ fontSize: 13, color: 'var(--fg)', flex: 1, letterSpacing: '-0.01em' }}>{r.repo}</span>
              <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: 'var(--accent-v)' }}>{r.templateId}</code>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: r.confidence >= 0.85 ? '#10b981' : '#d4a804' }}>{(r.confidence * 100).toFixed(0)}%</span>
              <span style={{ fontSize: 12, color: 'var(--fg-subtle)', minWidth: 70, textAlign: 'right' }}>{new Date(r.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function DonutChart({ repairs }: { repairs: { merged: number; proposed: number; rejected: number } }) {
  const total = repairs.merged + repairs.proposed + repairs.rejected || 1
  const cx = 60, cy = 60, r = 44, stroke = 18
  const circ = 2 * Math.PI * r

  const segments = [
    { value: repairs.merged / total, color: '#10b981' },
    { value: repairs.proposed / total, color: '#7170ff' },
    { value: repairs.rejected / total, color: '#f87171' },
  ]

  let offset = 0
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
      {segments.map((seg, i) => {
        const dash = seg.value * circ
        const gap = circ - dash
        const el = (
          <circle key={i}
            cx={cx} cy={cy} r={r}
            fill="none" stroke={seg.color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset * circ}
            transform={`rotate(-90 ${cx} ${cy})`}
            strokeLinecap="butt"
            opacity="0.85"
          />
        )
        offset += seg.value
        return el
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="16" fontWeight="590" fill="var(--fg)" fontFamily="Inter, sans-serif">
        {Math.round((repairs.merged / total) * 100)}%
      </text>
      <text x={cx} y={cy + 13} textAnchor="middle" fontSize="9" fill="var(--fg-subtle)" fontFamily="Inter, sans-serif">
        merged
      </text>
    </svg>
  )
}
