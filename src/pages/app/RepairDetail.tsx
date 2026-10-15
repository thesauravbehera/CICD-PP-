import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { relativeTime, confidenceColor, type Repair } from '../../data/mock'
import { useDB, approveRepair, rejectRepair } from '../../data/store'

type Tab = 'overview' | 'diff' | 'validation'

function DiffViewer({ patch }: { patch: string }) {
  const lines = patch.split('\n')
  return (
    <div style={{
      borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)',
      background: 'var(--surface)', overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.015)',
      }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['#f87171', '#fbbf24', '#34d399'].map(c => (
            <div key={c} style={{ width: 8, height: 8, borderRadius: '50%', background: c, opacity: 0.5 }} />
          ))}
        </div>
        <span style={{ fontSize: 11, color: 'var(--fg-subtle)', fontFamily: "'JetBrains Mono', monospace" }}>unified diff</span>
      </div>
      <pre style={{ margin: 0, padding: 0, overflowX: 'auto' }}>
        {lines.map((line, i) => {
          let bg = 'transparent'
          let color = 'var(--fg-muted)'
          if (line.startsWith('+++') || line.startsWith('---')) { color = 'var(--fg-subtle)'; }
          else if (line.startsWith('@@')) { bg = 'rgba(113,112,255,0.06)'; color = '#7170ff'; }
          else if (line.startsWith('+')) { bg = 'rgba(16,185,129,0.07)'; color = '#34d399'; }
          else if (line.startsWith('-')) { bg = 'rgba(248,113,113,0.07)'; color = '#f87171'; }
          return (
            <div key={i} style={{
              display: 'block', padding: '1px 16px',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, lineHeight: 1.8,
              background: bg, color,
              userSelect: 'text',
            }}>
              {line || ' '}
            </div>
          )
        })}
      </pre>
    </div>
  )
}

function ValidationResult({ validation }: { validation: Repair['validation'] }) {
  const checks = [
    {
      label: 'Test suite',
      passed: validation.tests.passed,
      detail: validation.tests.summary,
      duration: `${(validation.tests.durationMs / 1000).toFixed(1)}s`,
    },
    {
      label: 'Gitleaks secret scan',
      passed: validation.gitleaks.passed,
      detail: validation.gitleaks.findings === 0 ? 'No secrets detected' : `${validation.gitleaks.findings} finding(s)`,
      duration: null,
    },
    {
      label: 'Semgrep static analysis',
      passed: validation.semgrep.passed,
      detail: validation.semgrep.findings === 0 ? 'No issues found' : `${validation.semgrep.findings} finding(s)`,
      duration: null,
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {checks.map(check => (
        <div key={check.label} style={{
          padding: '16px 18px', borderRadius: 8,
          border: `1px solid ${check.passed ? 'rgba(16,185,129,0.2)' : 'rgba(248,113,113,0.2)'}`,
          background: check.passed ? 'rgba(16,185,129,0.04)' : 'rgba(248,113,113,0.04)',
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
            background: check.passed ? 'rgba(16,185,129,0.12)' : 'rgba(248,113,113,0.12)',
            border: `1.5px solid ${check.passed ? 'rgba(16,185,129,0.4)' : 'rgba(248,113,113,0.4)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
          }}>
            {check.passed ? (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--fg)', letterSpacing: '-0.02em' }}>{check.label}</span>
              {check.duration && (
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--fg-subtle)' }}>{check.duration}</span>
              )}
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--fg-muted)', letterSpacing: '-0.01em' }}>{check.detail}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function RepairDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('overview')
  const [outcome, setOutcome] = useState<'proposed' | 'approved' | 'rejected' | null>(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const { repairs: REPAIRS } = useDB()
  const repair = REPAIRS.find(r => r.id === id)
  if (!repair) return (
    <div style={{ padding: 40, color: 'var(--fg-muted)' }}>
      Repair not found. <button onClick={() => navigate('/app/repairs')} style={{ color: 'var(--accent-v)', background: 'none', border: 'none', cursor: 'pointer' }}>Go back</button>
    </div>
  )

  const currentOutcome = outcome ?? repair.outcome
  const confColor = confidenceColor(repair.confidence)

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'diff', label: 'Diff' },
    { id: 'validation', label: 'Validation' },
  ]

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 40px' }}>
      {/* Back */}
      <button onClick={() => navigate('/app/repairs')} style={{
        display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--fg-subtle)',
        background: 'none', border: 'none', cursor: 'pointer', marginBottom: 20, padding: 0,
        letterSpacing: '-0.01em', transition: 'color 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.color = 'var(--fg-muted)' }}
      onMouseLeave={e => { e.currentTarget.style.color = 'var(--fg-subtle)' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
        </svg>
        Repairs
      </button>

      {/* Header */}
      <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
              <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, color: 'var(--accent-v)', fontWeight: 500 }}>
                {repair.templateId}
              </code>
              <span style={{ fontSize: 14, color: 'var(--fg-muted)' }}>on</span>
              <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--fg)', letterSpacing: '-0.02em' }}>{repair.repo}</span>
            </div>
            <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--fg-subtle)' }}>{repair.branch}</code>
          </div>

          {/* Confidence */}
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: 32, fontWeight: 590, letterSpacing: '-0.05em', color: confColor, lineHeight: 1 }}>
              {(repair.confidence * 100).toFixed(0)}%
            </div>
            <p style={{ fontSize: 10.5, color: 'var(--fg-subtle)', marginTop: 3, letterSpacing: '0.04em' }}>CONFIDENCE</p>
          </div>
        </div>

        {/* Meta row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 14, flexWrap: 'wrap' }}>
          {[
            { label: 'Similarity', value: `${(repair.similarity * 100).toFixed(0)}%`, mono: true },
            { label: 'Matched from', value: `${repair.matchedFailureRepo} · ${repair.matchedFailureDate}`, mono: false },
            { label: 'Attempts', value: String(repair.attempts), mono: true },
            { label: 'Created', value: relativeTime(repair.createdAt), mono: false },
          ].map(m => (
            <div key={m.label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <p style={{ fontSize: 10.5, color: 'var(--fg-subtle)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{m.label}</p>
              <p style={{ fontSize: 12.5, color: 'var(--fg-muted)', fontFamily: m.mono ? "'JetBrains Mono', monospace" : 'inherit', letterSpacing: '-0.01em' }}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Action buttons — only for proposed */}
        {(currentOutcome === 'proposed' || repair.outcome === 'proposed') && outcome === null && (
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button
              onClick={() => { approveRepair(repair.id); setOutcome('approved') }}
              style={{
                height: 36, padding: '0 18px', borderRadius: 7, cursor: 'pointer',
                border: '1px solid rgba(16,185,129,0.4)',
                background: 'rgba(16,185,129,0.08)',
                color: '#10b981', fontSize: 13, fontWeight: 500, letterSpacing: '-0.01em',
                transition: 'background 0.2s, border-color 0.2s',
                display: 'flex', alignItems: 'center', gap: 7,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.14)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.6)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.08)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.4)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              Approve repair PR
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              style={{
                height: 36, padding: '0 18px', borderRadius: 7, cursor: 'pointer',
                border: '1px solid rgba(248,113,113,0.3)',
                background: 'rgba(248,113,113,0.06)',
                color: '#f87171', fontSize: 13, fontWeight: 500, letterSpacing: '-0.01em',
                transition: 'background 0.2s, border-color 0.2s',
                display: 'flex', alignItems: 'center', gap: 7,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.1)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.5)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.06)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.3)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              Reject
            </button>
          </div>
        )}

        {/* Post-action state */}
        {outcome === 'approved' && (
          <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 8, background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <p style={{ fontSize: 13, color: '#10b981', letterSpacing: '-0.01em' }}>
              Repair approved and PR #{repair.prNumber} merged. Pipeline marked passing; template success rate updated.
            </p>
          </div>
        )}
        {outcome === 'rejected' && (
          <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 8, background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.2)' }}>
            <p style={{ fontSize: 13, color: '#f87171', letterSpacing: '-0.01em' }}>
              Rejected and stored. Similar findings on <code style={{ fontFamily: 'monospace' }}>{repair.repo}</code> will be suppressed.
            </p>
          </div>
        )}

        {/* Merged / rejected from data */}
        {repair.outcome === 'merged' && outcome === null && (
          <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 8, background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            <p style={{ fontSize: 13, color: '#10b981', letterSpacing: '-0.01em' }}>
              Merged by <strong>{repair.outcomeActor}</strong> · {relativeTime(repair.outcomeAt!)}
            </p>
          </div>
        )}
        {repair.outcome === 'rejected' && outcome === null && (
          <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 8, background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.2)' }}>
            <p style={{ fontSize: 13, color: '#f87171', letterSpacing: '-0.01em', marginBottom: 4 }}>
              Rejected by <strong>{repair.outcomeActor}</strong> · {relativeTime(repair.outcomeAt!)}
            </p>
            {repair.outcomeReason && <p style={{ fontSize: 12.5, color: 'var(--fg-muted)', lineHeight: 1.5 }}>{repair.outcomeReason}</p>}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 12 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            height: 30, padding: '0 14px', borderRadius: 5, border: 'none',
            background: tab === t.id ? 'rgba(255,255,255,0.06)' : 'transparent',
            color: tab === t.id ? 'var(--fg)' : 'var(--fg-muted)',
            fontSize: 13, fontWeight: tab === t.id ? 500 : 400, letterSpacing: '-0.01em',
            cursor: 'pointer', transition: 'all 0.15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Explanation */}
          <div style={{
            padding: '18px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)', background: 'var(--surface)',
          }}>
            <p style={{ fontSize: 11.5, fontWeight: 500, letterSpacing: '0.07em', color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 8 }}>
              What the template did
            </p>
            <p style={{ fontSize: 13.5, color: 'var(--fg-2)', lineHeight: 1.65, letterSpacing: '-0.01em' }}>{repair.explanation}</p>
          </div>

          {/* Citation trail */}
          <div style={{
            padding: '18px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)', background: 'var(--surface)',
          }}>
            <p style={{ fontSize: 11.5, fontWeight: 500, letterSpacing: '0.07em', color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 14 }}>
              Citation trail
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Matched failure', value: `${repair.matchedFailureRepo} · ${repair.matchedFailureDate}` },
                { label: 'Template applied', value: repair.templateId },
                { label: 'ANN similarity', value: `${(repair.similarity * 100).toFixed(0)}% cosine distance` },
                { label: 'Composite confidence', value: `${(repair.confidence * 100).toFixed(0)}% — similarity + validation + security signals` },
              ].map(c => (
                <div key={c.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <span style={{ fontSize: 12, color: 'var(--fg-subtle)', width: 130, flexShrink: 0, paddingTop: 1 }}>{c.label}</span>
                  <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: 'var(--fg-muted)' }}>{c.value}</code>
                </div>
              ))}
            </div>
          </div>

          {repair.prNumber && !repair.prUrl && (
            <div style={{ padding: '14px 18px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', fontSize: 13, color: 'var(--fg-muted)' }}>
              PR #{repair.prNumber} on <code style={{ fontFamily: "'JetBrains Mono', monospace" }}>{repair.branchName}</code> — demo repo, not pushed to GitHub.
            </div>
          )}
          {repair.prNumber && repair.prUrl && (
            <a href={repair.prUrl} target="_blank" rel="noopener noreferrer" style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '14px 18px', borderRadius: 8,
              border: '1px solid rgba(113,112,255,0.25)', background: 'rgba(113,112,255,0.04)',
              textDecoration: 'none', transition: 'border-color 0.2s, background 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(113,112,255,0.4)'; e.currentTarget.style.background = 'rgba(113,112,255,0.07)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(113,112,255,0.25)'; e.currentTarget.style.background = 'rgba(113,112,255,0.04)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-v)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><path d="M13 6h3a2 2 0 0 1 2 2v7" /><line x1="6" y1="9" x2="6" y2="21" />
              </svg>
              <span style={{ fontSize: 13.5, color: 'var(--accent-v)', letterSpacing: '-0.01em' }}>
                View PR #{repair.prNumber} on GitHub →
              </span>
            </a>
          )}
        </div>
      )}

      {tab === 'diff' && <DiffViewer patch={repair.patch} />}
      {tab === 'validation' && <ValidationResult validation={repair.validation} />}

      {/* Reject modal */}
      {showRejectModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }} onClick={() => setShowRejectModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: 420, borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.1)', background: 'var(--surface)',
            padding: '24px', display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 590, color: 'var(--fg)', letterSpacing: '-0.03em' }}>Reject this repair</h3>
            <p style={{ fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.55 }}>
              Add a reason — it will be stored and used to suppress similar findings on <strong style={{ color: 'var(--fg-2)' }}>{repair.repo}</strong>.
            </p>
            <div>
              <label htmlFor="reject-reason" style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 6, display: 'block' }}>
                Reason (optional)
              </label>
              <textarea
                id="reject-reason"
                rows={3}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="e.g. We handle this manually via our Makefile."
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 7,
                  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)',
                  color: 'var(--fg)', fontSize: 13, lineHeight: 1.55, letterSpacing: '-0.01em',
                  outline: 'none', resize: 'vertical', fontFamily: 'inherit',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { rejectRepair(repair.id, rejectReason.trim()); setOutcome('rejected'); setShowRejectModal(false) }}
                style={{
                  height: 36, padding: '0 18px', borderRadius: 7, cursor: 'pointer', flex: 1,
                  border: '1px solid rgba(248,113,113,0.4)', background: 'rgba(248,113,113,0.1)',
                  color: '#f87171', fontSize: 13, fontWeight: 500, letterSpacing: '-0.01em',
                }}
              >Reject repair</button>
              <button
                onClick={() => setShowRejectModal(false)}
                style={{
                  height: 36, padding: '0 16px', borderRadius: 7, cursor: 'pointer',
                  border: '1px solid rgba(255,255,255,0.08)', background: 'transparent',
                  color: 'var(--fg-muted)', fontSize: 13, letterSpacing: '-0.01em',
                }}
              >Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
