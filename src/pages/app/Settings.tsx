import { useState } from 'react'
import { MOCK_ORG } from '../../data/mock'
import { useDB, saveRepoSettings, setTemplateQuarantine, resetDemoData } from '../../data/store'

type SettingsTab = 'org' | 'repos' | 'billing' | 'templates'

export default function Settings() {
  const [tab, setTab] = useState<SettingsTab>('org')
  const { repos, templates: KB_TEMPLATES } = useDB()
  const [repoSettings, setRepoSettings] = useState<Record<string, { autoRepair: boolean; prReview: boolean }>>(
    Object.fromEntries(repos.map(r => [r.name, { autoRepair: r.autoRepair, prReview: r.prReview }]))
  )
  const [saved, setSaved] = useState(false)
  const [resetDone, setResetDone] = useState(false)

  function save() {
    saveRepoSettings(repos.map(r => ({ ...r, ...repoSettings[r.name] })))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 40px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 18, fontWeight: 590, color: 'var(--fg)', letterSpacing: '-0.03em', marginBottom: 4 }}>Settings</h1>
        <p style={{ fontSize: 13, color: 'var(--fg-muted)', letterSpacing: '-0.01em' }}>
          Manage your organization, connected repos, and billing
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 12 }}>
        {([
          ['org', 'Organization'],
          ['repos', 'Repositories'],
          ['billing', 'Billing'],
          ['templates', 'Templates'],
        ] as [SettingsTab, string][]).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            height: 28, padding: '0 12px', borderRadius: 5, border: 'none',
            background: tab === id ? 'rgba(255,255,255,0.06)' : 'transparent',
            color: tab === id ? 'var(--fg)' : 'var(--fg-muted)',
            fontSize: 12.5, fontWeight: tab === id ? 500 : 400, letterSpacing: '-0.01em', cursor: 'pointer',
          }}>{label}</button>
        ))}
      </div>

      {/* ── Organization ── */}
      {tab === 'org' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Section title="Organization info">
            <Field label="GitHub org" value={`@${MOCK_ORG.login}`} mono />
            <Field label="Plan" value={MOCK_ORG.plan.toUpperCase()} />
            <Field label="Connected repos" value={String(repos.length)} />
          </Section>

          <Section title="Kintsugi configuration">
            <ToggleField
              label="Confidence threshold"
              description="Minimum confidence score required before proposing a PR (0.0–1.0)"
              value="85%"
            />
            <ToggleField
              label="Max repair attempts per run"
              description="Kintsugi will stop after this many attempts per failed run"
              value="3"
            />
            <ToggleField
              label="Daily budget"
              description="Maximum spend on repair operations per day"
              value={`$${(MOCK_ORG.dailyBudgetCents / 100).toFixed(2)}`}
            />
          </Section>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <SaveButton saved={saved} onSave={save} />
          </div>
        </div>
      )}

      {tab === 'org' && (
        <div style={{ marginTop: 16 }}>
          <Section title="Demo data">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <p style={{ fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.5 }}>
                Live runs, approvals and rejections are stored in this browser. Reset to start the demo fresh.
              </p>
              <button onClick={() => { resetDemoData(); setRepoSettings(Object.fromEntries(MOCK_ORG.repos.map(r => [r.name, { autoRepair: r.autoRepair, prReview: r.prReview }]))); setResetDone(true); setTimeout(() => setResetDone(false), 2000) }} style={{
                height: 32, padding: '0 14px', borderRadius: 7, cursor: 'pointer', flexShrink: 0,
                border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.06)',
                color: '#f87171', fontSize: 12.5, fontWeight: 500,
              }}>{resetDone ? 'Reset ✓' : 'Reset demo data'}</button>
            </div>
          </Section>
        </div>
      )}

      {/* ── Repositories ── */}
      {tab === 'repos' && (
        <div>
          <div style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
            <div style={{ padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 90px', gap: 16, alignItems: 'center' }}>
                {['Repository', 'Auto-repair', 'PR review', 'Language'].map(h => (
                  <span key={h} style={{ fontSize: 10.5, fontWeight: 500, letterSpacing: '0.07em', color: 'var(--fg-subtle)', textTransform: 'uppercase' }}>{h}</span>
                ))}
              </div>
            </div>
            {repos.map((repo, i) => {
              const s = repoSettings[repo.name] ?? { autoRepair: repo.autoRepair, prReview: repo.prReview }
              return (
                <div key={repo.name} style={{
                  padding: '16px 20px',
                  borderBottom: i < repos.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 90px', gap: 16, alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', letterSpacing: '-0.01em' }}>{repo.name}</p>
                    </div>
                    <Toggle
                      value={s.autoRepair}
                      onChange={v => setRepoSettings(prev => ({ ...prev, [repo.name]: { ...prev[repo.name], autoRepair: v } }))}
                    />
                    <Toggle
                      value={s.prReview}
                      onChange={v => setRepoSettings(prev => ({ ...prev, [repo.name]: { ...prev[repo.name], prReview: v } }))}
                    />
                    <span style={{
                      fontSize: 11, padding: '2px 7px', borderRadius: 4,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                      color: 'var(--fg-muted)', display: 'inline-block',
                    }}>{repo.lang}</span>
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <SaveButton saved={saved} onSave={save} />
          </div>
        </div>
      )}

      {/* ── Billing ── */}
      {tab === 'billing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Current plan */}
          <div style={{
            borderRadius: 10, border: '1px solid rgba(113,112,255,0.3)', background: 'rgba(113,112,255,0.04)',
            padding: '24px 24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <span style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', color: '#7170ff',
                  textTransform: 'uppercase', display: 'block', marginBottom: 8,
                }}>Current plan</span>
                <p style={{ fontSize: 22, fontWeight: 590, color: 'var(--fg)', letterSpacing: '-0.03em', marginBottom: 4 }}>
                  {String(MOCK_ORG.plan) === 'pro' ? 'Pro' : String(MOCK_ORG.plan) === 'enterprise' ? 'Enterprise' : 'Team'}
                </p>
                <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
                  $99 / month · up to 10 repos · standard support
                </p>
              </div>
              <button onClick={() => window.open('mailto:team@kintsugi.dev?subject=Upgrade%20plan')} style={{
                height: 36, padding: '0 18px', borderRadius: 7,
                background: 'linear-gradient(135deg, #5e6ad2, #7170ff)',
                border: 'none', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                letterSpacing: '-0.01em',
              }}>Upgrade plan</button>
            </div>
          </div>

          {/* Usage */}
          <Section title="Usage this month">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { label: 'Repos connected', used: repos.length, max: 20 },
                { label: 'Repairs proposed', used: 47, max: 200 },
                { label: 'Repair PRs merged', used: 31, max: null },
              ].map(u => (
                <div key={u.label} style={{
                  padding: '14px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <p style={{ fontSize: 11, color: 'var(--fg-subtle)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>{u.label}</p>
                  <p style={{ fontSize: 22, fontWeight: 590, letterSpacing: '-0.04em', color: 'var(--fg)', lineHeight: 1, marginBottom: 6 }}>
                    {u.used}{u.max ? <span style={{ fontSize: 13, color: 'var(--fg-subtle)', fontWeight: 400 }}> / {u.max}</span> : ''}
                  </p>
                  {u.max && (
                    <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                      <div style={{ width: `${(u.used / u.max) * 100}%`, height: '100%', background: 'var(--accent-v)', borderRadius: 2 }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>

          {/* Invoice */}
          <Section title="Recent invoices">
            {[
              { date: 'Aug 1, 2026', amount: '$199.00', status: 'Paid' },
              { date: 'Jul 1, 2026', amount: '$199.00', status: 'Paid' },
              { date: 'Jun 1, 2026', amount: '$199.00', status: 'Paid' },
            ].map((inv, i, arr) => (
              <div key={inv.date} style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0',
                borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}>
                <span style={{ fontSize: 13, color: 'var(--fg-muted)', flex: 1 }}>{inv.date}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'var(--fg)' }}>{inv.amount}</span>
                <span style={{
                  fontSize: 10.5, fontWeight: 500, padding: '2px 7px', borderRadius: 4, letterSpacing: '0.04em',
                  color: '#10b981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                }}>{inv.status.toUpperCase()}</span>
              </div>
            ))}
          </Section>
        </div>
      )}

      {/* ── Templates ── */}
      {tab === 'templates' && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 16, letterSpacing: '-0.01em' }}>
            Manage repair template quarantine. Quarantined templates are excluded from all future repairs.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {KB_TEMPLATES.map(t => (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', borderRadius: 9,
                border: `1px solid ${t.quarantined ? 'rgba(248,113,113,0.25)' : 'rgba(255,255,255,0.07)'}`,
                background: t.quarantined ? 'rgba(248,113,113,0.03)' : 'var(--surface)',
              }}>
                <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: t.quarantined ? '#f87171' : 'var(--accent-v)', minWidth: 120 }}>{t.id}</code>
                <span style={{ fontSize: 13, color: 'var(--fg)', flex: 1, letterSpacing: '-0.01em' }}>{t.name}</span>
                <span style={{
                  fontSize: 10.5, padding: '2px 7px', borderRadius: 4,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                  color: 'var(--fg-muted)',
                }}>{t.language}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--fg-subtle)', minWidth: 40, textAlign: 'right' }}>
                  {(t.successRate * 100).toFixed(0)}%
                </span>
                <button onClick={() => setTemplateQuarantine(t.id, !t.quarantined)} style={{
                  height: 28, padding: '0 12px', borderRadius: 6, cursor: 'pointer',
                  border: `1px solid ${t.quarantined ? 'rgba(16,185,129,0.3)' : 'rgba(248,113,113,0.3)'}`,
                  background: t.quarantined ? 'rgba(16,185,129,0.07)' : 'rgba(248,113,113,0.07)',
                  color: t.quarantined ? '#10b981' : '#f87171',
                  fontSize: 11.5, fontWeight: 500, letterSpacing: '0.03em',
                }}>
                  {t.quarantined ? 'Restore' : 'Quarantine'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', background: 'var(--surface)', overflow: 'hidden' }}>
      <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>
        <p style={{ fontSize: 11.5, fontWeight: 500, letterSpacing: '0.06em', color: 'var(--fg-subtle)', textTransform: 'uppercase' }}>{title}</p>
      </div>
      <div style={{ padding: '4px 20px 12px' }}>{children}</div>
    </div>
  )
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ fontSize: 12.5, color: 'var(--fg-subtle)', flex: '0 0 200px', letterSpacing: '-0.01em' }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--fg)', fontFamily: mono ? "'JetBrains Mono', monospace" : undefined }}>{value}</span>
    </div>
  )
}

function ToggleField({ label, description, value }: { label: string; description: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, color: 'var(--fg)', letterSpacing: '-0.01em', marginBottom: 2 }}>{label}</p>
        <p style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}>{description}</p>
      </div>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'var(--accent-v)',
        background: 'rgba(113,112,255,0.1)', border: '1px solid rgba(113,112,255,0.2)',
        padding: '3px 10px', borderRadius: 5,
      }}>{value}</span>
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 38, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', position: 'relative',
        background: value ? 'var(--accent-v)' : 'rgba(255,255,255,0.1)',
        transition: 'background 0.2s',
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: value ? 19 : 3,
        width: 16, height: 16, borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </button>
  )
}

function SaveButton({ saved, onSave }: { saved: boolean; onSave: () => void }) {
  return (
    <button onClick={onSave} style={{
      height: 34, padding: '0 18px', borderRadius: 7, border: 'none',
      background: saved ? 'rgba(16,185,129,0.15)' : 'linear-gradient(135deg, #5e6ad2, #7170ff)',
      color: saved ? '#10b981' : '#fff',
      fontSize: 13, fontWeight: 500, cursor: 'pointer', letterSpacing: '-0.01em',
      transition: 'all 0.2s',
    }}>
      {saved ? 'Saved ✓' : 'Save changes'}
    </button>
  )
}
