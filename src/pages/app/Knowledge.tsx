import { useState } from 'react'
import { useDB } from '../../data/store'

type KBTab = 'signatures' | 'templates'

export default function Knowledge() {
  const [tab, setTab] = useState<KBTab>('signatures')
  const [search, setSearch] = useState('')
  const { signatures: FAILURE_SIGNATURES, templates: KB_TEMPLATES } = useDB()

  const filteredSigs = FAILURE_SIGNATURES.filter(s =>
    !search || s.errorType.toLowerCase().includes(search.toLowerCase()) ||
    s.repo.toLowerCase().includes(search.toLowerCase()) ||
    (s.symbol ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 40px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 18, fontWeight: 590, color: 'var(--fg)', letterSpacing: '-0.03em', marginBottom: 4 }}>Knowledge Base</h1>
        <p style={{ fontSize: 13, color: 'var(--fg-muted)', letterSpacing: '-0.01em' }}>
          Failure signatures and repair templates indexed by Kintsugi
        </p>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Indexed signatures', value: FAILURE_SIGNATURES.length },
          { label: 'Active templates', value: KB_TEMPLATES.filter(t => !t.quarantined).length },
          { label: 'Total template uses', value: KB_TEMPLATES.reduce((s, t) => s + t.uses, 0) },
          { label: 'Avg success rate', value: `${Math.round(KB_TEMPLATES.reduce((s, t) => s + t.successRate, 0) / Math.max(1, KB_TEMPLATES.length) * 100)}%` },
        ].map(kpi => (
          <div key={kpi.label} style={{
            padding: '16px 20px', borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.07)', background: 'var(--surface)',
          }}>
            <p style={{ fontSize: 11.5, color: 'var(--fg-subtle)', letterSpacing: '-0.01em', marginBottom: 6 }}>{kpi.label}</p>
            <p style={{ fontSize: 26, fontWeight: 590, color: 'var(--fg)', letterSpacing: '-0.04em', lineHeight: 1 }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs + search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 12 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {([['signatures', 'Failure signatures'], ['templates', 'Repair templates']] as [KBTab, string][]).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              height: 28, padding: '0 12px', borderRadius: 5, border: 'none',
              background: tab === id ? 'rgba(255,255,255,0.06)' : 'transparent',
              color: tab === id ? 'var(--fg)' : 'var(--fg-muted)',
              fontSize: 12.5, fontWeight: tab === id ? 500 : 400, letterSpacing: '-0.01em', cursor: 'pointer',
            }}>{label}</button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        {tab === 'signatures' && (
          <div style={{ position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--fg-subtle)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search signatures…"
              style={{
                height: 32, padding: '0 10px 0 30px', borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)',
                color: 'var(--fg)', fontSize: 12.5, letterSpacing: '-0.01em', outline: 'none', width: 200,
              }}
            />
          </div>
        )}
      </div>

      {/* Signatures table */}
      {tab === 'signatures' && (
        <div style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Error type', 'Symbol', 'Repo', 'Language', 'Step', 'Occurrences', 'Template', 'Avg conf.'].map(h => (
                  <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 10.5, fontWeight: 500, letterSpacing: '0.07em', color: 'var(--fg-subtle)', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredSigs.map((sig, i) => (
                <tr key={sig.id} style={{ borderBottom: i < filteredSigs.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <td style={{ padding: '11px 16px' }}>
                    <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#f87171' }}>{sig.errorType}</code>
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    {sig.symbol ? <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: 'var(--accent-v)' }}>{sig.symbol}</code> : <span style={{ color: 'var(--fg-subtle)', fontSize: 12 }}>–</span>}
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: 12.5, color: 'var(--fg-muted)' }}>{sig.repo}</td>
                  <td style={{ padding: '11px 16px' }}>
                    <span style={{
                      fontSize: 11, padding: '2px 7px', borderRadius: 4, fontWeight: 400,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                      color: 'var(--fg-muted)',
                    }}>{sig.language}</span>
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: 'var(--fg-subtle)' }}>{sig.step}</code>
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 32, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                        <div style={{ width: `${Math.min(100, sig.occurrences * 20)}%`, height: '100%', background: 'var(--accent-v)', borderRadius: 2 }} />
                      </div>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--fg-muted)' }}>{sig.occurrences}</span>
                    </div>
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    {sig.resolvedByTemplateId ? (
                      <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: 'var(--fg-muted)' }}>{sig.resolvedByTemplateId}</code>
                    ) : <span style={{ color: 'var(--fg-subtle)', fontSize: 12 }}>–</span>}
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    {sig.avgConfidence ? (
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: sig.avgConfidence >= 0.85 ? '#10b981' : sig.avgConfidence >= 0.7 ? '#d4a804' : '#f87171' }}>
                        {(sig.avgConfidence * 100).toFixed(0)}%
                      </span>
                    ) : <span style={{ color: 'var(--fg-subtle)', fontSize: 12 }}>–</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Templates */}
      {tab === 'templates' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {KB_TEMPLATES.map(t => (
            <div key={t.id} style={{
              padding: '20px 20px', borderRadius: 10,
              border: `1px solid ${t.quarantined ? 'rgba(248,113,113,0.25)' : 'rgba(255,255,255,0.07)'}`,
              background: t.quarantined ? 'rgba(248,113,113,0.03)' : 'var(--surface)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                <div>
                  <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: t.quarantined ? '#f87171' : 'var(--accent-v)', fontWeight: 500, display: 'block', marginBottom: 4 }}>{t.id}</code>
                  <p style={{ fontSize: 13, color: 'var(--fg)', letterSpacing: '-0.02em' }}>{t.name}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                  <span style={{
                    fontSize: 10.5, padding: '2px 7px', borderRadius: 4, fontWeight: 500, letterSpacing: '0.04em',
                    background: t.risk === 'low' ? 'rgba(16,185,129,0.1)' : t.risk === 'med' ? 'rgba(212,168,4,0.1)' : 'rgba(248,113,113,0.1)',
                    border: `1px solid ${t.risk === 'low' ? 'rgba(16,185,129,0.25)' : t.risk === 'med' ? 'rgba(212,168,4,0.25)' : 'rgba(248,113,113,0.25)'}`,
                    color: t.risk === 'low' ? '#10b981' : t.risk === 'med' ? '#d4a804' : '#f87171',
                  }}>{t.risk.toUpperCase()}</span>
                  {t.quarantined && <span style={{ fontSize: 10.5, color: '#f87171', letterSpacing: '0.04em' }}>QUARANTINED</span>}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontSize: 10.5, color: 'var(--fg-subtle)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 3 }}>Language</p>
                  <p style={{ fontSize: 12.5, color: 'var(--fg-muted)', fontFamily: "'JetBrains Mono', monospace" }}>{t.language}</p>
                </div>
                <div>
                  <p style={{ fontSize: 10.5, color: 'var(--fg-subtle)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 3 }}>Uses</p>
                  <p style={{ fontSize: 12.5, color: 'var(--fg-muted)', fontFamily: "'JetBrains Mono', monospace" }}>{t.uses}</p>
                </div>
                <div>
                  <p style={{ fontSize: 10.5, color: 'var(--fg-subtle)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 3 }}>Success rate</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 48, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                      <div style={{ width: `${t.successRate * 100}%`, height: '100%', background: t.successRate >= 0.85 ? '#10b981' : '#d4a804', borderRadius: 2 }} />
                    </div>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--fg-muted)' }}>
                      {(t.successRate * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: 10.5, color: 'var(--fg-subtle)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 5 }}>Error types</p>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {[...new Set(t.errorTypes)].map(et => (
                    <code key={et} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--fg-muted)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', padding: '2px 7px', borderRadius: 4 }}>{et}</code>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
