import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'connect' | 'repos' | 'plan' | 'done'

interface Repo {
  id: string
  name: string
  private: boolean
  language: string
  lastPush: string
  selected: boolean
}

interface Plan {
  id: string
  name: string
  price: number
  annualPrice: number
  desc: string
  features: string[]
  limit: string
  recommended: boolean
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const GITHUB_REPOS: Repo[] = [
  { id: 'r1', name: 'acme/backend',       private: false, language: 'TypeScript', lastPush: '2h ago',  selected: true  },
  { id: 'r2', name: 'acme/auth-service',  private: true,  language: 'TypeScript', lastPush: '5h ago',  selected: true  },
  { id: 'r3', name: 'acme/frontend',      private: false, language: 'JavaScript', lastPush: '1d ago',  selected: false },
  { id: 'r4', name: 'acme/payments',      private: true,  language: 'TypeScript', lastPush: '3h ago',  selected: true  },
  { id: 'r5', name: 'acme/data-pipeline', private: true,  language: 'Python',     lastPush: '12h ago', selected: false },
  { id: 'r6', name: 'acme/legacy-api',    private: false, language: 'JavaScript', lastPush: '7d ago',  selected: false },
  { id: 'r7', name: 'acme/mobile-app',    private: true,  language: 'TypeScript', lastPush: '2d ago',  selected: false },
  { id: 'r8', name: 'acme/infra',         private: true,  language: 'HCL',        lastPush: '4d ago',  selected: false },
]

const PLANS: Plan[] = [
  {
    id: 'free', name: 'Free', price: 0, annualPrice: 0,
    desc: 'Side projects and solo engineers',
    features: ['1 connected repo', '10 auto-repairs / month', 'Node.js + Python templates', 'Dashboard access', 'Community support'],
    limit: '1 repo',
    recommended: false,
  },
  {
    id: 'team', name: 'Team', price: 49, annualPrice: 39,
    desc: 'Engineering teams shipping daily',
    features: ['Up to 10 repos', '500 auto-repairs / month', 'All 6 repair templates', 'PR reviewer · 4 specialists', 'Analytics: MTTR + approval rate', 'Email support'],
    limit: '10 repos',
    recommended: true,
  },
  {
    id: 'org', name: 'Org', price: 149, annualPrice: 119,
    desc: 'Orgs with high-velocity CI',
    features: ['Unlimited repos', 'Unlimited auto-repairs', 'Cross-repo knowledge base', 'Custom confidence thresholds', 'SSO + audit log', 'Priority support + SLA'],
    limit: 'Unlimited',
    recommended: false,
  },
]

const LANG_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f7df1e',
  Python: '#3572A5',
  HCL: '#844fba',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function LogoMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <polygon points="12,2 20,8.5 17.5,20 6.5,20 4,8.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 2 L13.5 8.5 L12 13 L14 20" stroke="#7170ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        border: `1.5px solid ${done ? 'rgba(16,185,129,0.5)' : active ? 'rgba(113,112,255,0.6)' : 'rgba(255,255,255,0.1)'}`,
        background: done ? 'rgba(16,185,129,0.12)' : active ? 'rgba(113,112,255,0.12)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.25s',
      }}>
        {done ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: active ? '#7170ff' : 'rgba(255,255,255,0.15)', transition: 'all 0.25s' }} />
        )}
      </div>
      <span style={{ fontSize: 11, color: done ? '#10b981' : active ? 'var(--fg)' : 'var(--fg-subtle)', letterSpacing: '-0.01em', whiteSpace: 'nowrap', transition: 'color 0.25s' }}>
        {label}
      </span>
    </div>
  )
}

function StepLine({ done }: { done: boolean }) {
  return (
    <div style={{ flex: 1, height: 1, background: done ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.07)', marginBottom: 22, transition: 'background 0.4s' }} />
  )
}

// ─── Step 1: Connect GitHub ───────────────────────────────────────────────────

function StepConnect({ onNext }: { onNext: () => void }) {
  const [connecting, setConnecting] = useState(false)
  const [connected, setConnected] = useState(false)

  function handleConnect() {
    setConnecting(true)
    setTimeout(() => {
      setConnecting(false)
      setConnected(true)
    }, 1800)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <div style={{
        width: 64, height: 64, borderRadius: 16, marginBottom: 28,
        background: connected ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${connected ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.09)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.3s',
      }}>
        {connected ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="var(--fg-muted)">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
        )}
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 590, color: 'var(--fg)', letterSpacing: '-0.035em', marginBottom: 10 }}>
        {connected ? 'GitHub connected' : 'Connect your GitHub'}
      </h2>
      <p style={{ fontSize: 14, color: 'var(--fg-muted)', letterSpacing: '-0.01em', lineHeight: 1.6, maxWidth: 360, marginBottom: 36 }}>
        {connected
          ? 'Kintsugi is now installed on your organization. Select which repos to monitor next.'
          : 'Install the Kintsugi GitHub App on your organization to start monitoring CI failures and opening repair PRs.'}
      </p>

      {!connected && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 360, marginBottom: 32 }}>
          {[
            { icon: '🔒', text: 'Read-only access to workflow runs' },
            { icon: '📝', text: 'Write access to open PRs on your repos' },
            { icon: '🔔', text: 'Webhook on workflow_run and pull_request events' },
          ].map(item => (
            <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'left' }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span style={{ fontSize: 12.5, color: 'var(--fg-muted)', letterSpacing: '-0.01em' }}>{item.text}</span>
            </div>
          ))}
        </div>
      )}

      {connected ? (
        <button
          onClick={onNext}
          className="k-shine"
          style={{
            height: 42, padding: '0 28px', borderRadius: 8, cursor: 'pointer',
            border: '1px solid rgba(16,185,129,0.45)',
            background: 'linear-gradient(180deg, rgba(16,185,129,0.9) 0%, rgba(5,150,105,0.9) 100%)',
            color: '#fff', fontSize: 14, fontWeight: 500, letterSpacing: '-0.02em',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            boxShadow: '0 0 22px rgba(16,185,129,0.22)',
          }}
        >
          Select repositories
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
        </button>
      ) : (
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="k-shine"
          style={{
            height: 44, padding: '0 28px', borderRadius: 8, cursor: connecting ? 'default' : 'pointer',
            border: '1px solid rgba(255,255,255,0.18)',
            background: connecting
              ? 'rgba(255,255,255,0.05)'
              : 'linear-gradient(180deg, #ffffff 0%, #e7e7e7 48%, #cfcfcf 100%)',
            color: connecting ? 'var(--fg-muted)' : '#111',
            boxShadow: connecting ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.95)',
            fontSize: 14, fontWeight: 500, letterSpacing: '-0.02em',
            display: 'inline-flex', alignItems: 'center', gap: 10,
            transition: 'all 0.2s',
          }}
        >
          {connecting ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Authorizing…
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              Install GitHub App
            </>
          )}
        </button>
      )}
    </div>
  )
}

// ─── Step 2: Select repos ─────────────────────────────────────────────────────

function StepRepos({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [repos, setRepos] = useState(GITHUB_REPOS)
  const [search, setSearch] = useState('')
  const [selectAll, setSelectAll] = useState(false)

  const filtered = repos.filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()))
  const selectedCount = repos.filter(r => r.selected).length

  function toggle(id: string) {
    setRepos(prev => prev.map(r => r.id === id ? { ...r, selected: !r.selected } : r))
  }

  function handleSelectAll() {
    const next = !selectAll
    setSelectAll(next)
    setRepos(prev => prev.map(r => ({ ...r, selected: next })))
  }

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 590, color: 'var(--fg)', letterSpacing: '-0.035em', marginBottom: 8 }}>
        Select repositories
      </h2>
      <p style={{ fontSize: 14, color: 'var(--fg-muted)', letterSpacing: '-0.01em', lineHeight: 1.6, marginBottom: 24 }}>
        Choose which repos Kintsugi should monitor. You can change this anytime in Settings.
      </p>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <svg style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--fg-subtle)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter repositories…"
            style={{ width: '100%', height: 36, padding: '0 12px 0 32px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'var(--fg)', fontSize: 13, letterSpacing: '-0.01em', outline: 'none' }}
          />
        </div>
        <button
          onClick={handleSelectAll}
          style={{ height: 36, padding: '0 14px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'var(--fg-muted)', fontSize: 12.5, cursor: 'pointer', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}
        >
          {selectAll ? 'Deselect all' : 'Select all'}
        </button>
      </div>

      {/* Repo list */}
      <div style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden', marginBottom: 20 }}>
        {filtered.map((repo, i) => (
          <div
            key={repo.id}
            onClick={() => toggle(repo.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px',
              borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              cursor: 'pointer', background: repo.selected ? 'rgba(113,112,255,0.035)' : 'transparent',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (!repo.selected) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
            onMouseLeave={e => { e.currentTarget.style.background = repo.selected ? 'rgba(113,112,255,0.035)' : 'transparent' }}
          >
            {/* Checkbox */}
            <div style={{
              width: 18, height: 18, borderRadius: 5, flexShrink: 0,
              border: `1.5px solid ${repo.selected ? 'rgba(113,112,255,0.7)' : 'rgba(255,255,255,0.18)'}`,
              background: repo.selected ? 'rgba(113,112,255,0.85)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}>
              {repo.selected && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>

            {/* Repo icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--fg-subtle)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              {repo.private
                ? <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>
                : <><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></>}
            </svg>

            {/* Name */}
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500, color: repo.selected ? 'var(--fg)' : 'var(--fg-muted)', letterSpacing: '-0.015em', transition: 'color 0.15s' }}>
              {repo.name}
            </span>

            {/* Language dot */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: LANG_COLORS[repo.language] ?? '#888', flexShrink: 0 }} />
              <span style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}>{repo.language}</span>
            </div>

            {/* Last push */}
            <span style={{ fontSize: 11.5, color: 'var(--fg-subtle)', minWidth: 52, textAlign: 'right' }}>{repo.lastPush}</span>
          </div>
        ))}
      </div>

      {/* Selected count */}
      <p style={{ fontSize: 12.5, color: 'var(--fg-subtle)', marginBottom: 24, letterSpacing: '-0.01em' }}>
        <span style={{ color: selectedCount > 0 ? 'var(--fg-muted)' : 'var(--fg-subtle)', fontWeight: 500 }}>{selectedCount}</span>
        {' '}of {repos.length} repositories selected
      </p>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} style={{ height: 40, padding: '0 18px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: 'var(--fg-muted)', fontSize: 13, cursor: 'pointer', letterSpacing: '-0.01em' }}>
          Back
        </button>
        <button
          onClick={onNext}
          disabled={selectedCount === 0}
          className={selectedCount > 0 ? 'k-shine' : ''}
          style={{
            flex: 1, height: 40, borderRadius: 7, cursor: selectedCount > 0 ? 'pointer' : 'default',
            border: `1px solid ${selectedCount > 0 ? 'rgba(113,112,255,0.5)' : 'rgba(255,255,255,0.06)'}`,
            background: selectedCount > 0 ? 'linear-gradient(180deg, #7170ff 0%, #5e6ad2 50%, #4d5ab8 100%)' : 'rgba(255,255,255,0.02)',
            color: selectedCount > 0 ? '#fff' : 'var(--fg-subtle)',
            fontSize: 13.5, fontWeight: 500, letterSpacing: '-0.02em',
            boxShadow: selectedCount > 0 ? '0 0 20px rgba(113,112,255,0.25)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          {selectedCount > 0 ? `Continue with ${selectedCount} repo${selectedCount > 1 ? 's' : ''}` : 'Select at least 1 repo'}
        </button>
      </div>
    </div>
  )
}

// ─── Step 3: Choose plan ──────────────────────────────────────────────────────

function StepPlan({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [selected, setSelected] = useState('team')
  const [annual, setAnnual] = useState(true)

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 590, color: 'var(--fg)', letterSpacing: '-0.035em', marginBottom: 8 }}>
        Choose your plan
      </h2>
      <p style={{ fontSize: 14, color: 'var(--fg-muted)', letterSpacing: '-0.01em', lineHeight: 1.6, marginBottom: 24 }}>
        Start for free, upgrade when you need more. No credit card required for Free.
      </p>

      {/* Annual toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: 13, color: annual ? 'var(--fg-subtle)' : 'var(--fg)', letterSpacing: '-0.01em' }}>Monthly</span>
        <button
          onClick={() => setAnnual(!annual)}
          style={{
            width: 42, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative',
            background: annual ? 'var(--accent-v)' : 'rgba(255,255,255,0.12)',
            transition: 'background 0.2s',
          }}
        >
          <div style={{
            position: 'absolute', top: 4, left: annual ? 22 : 4,
            width: 16, height: 16, borderRadius: '50%', background: '#fff',
            transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }} />
        </button>
        <span style={{ fontSize: 13, color: annual ? 'var(--fg)' : 'var(--fg-subtle)', letterSpacing: '-0.01em' }}>Annual</span>
        {annual && (
          <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, background: 'rgba(39,166,68,0.12)', border: '1px solid rgba(39,166,68,0.22)', color: '#27a644', fontWeight: 500 }}>
            Save 20%
          </span>
        )}
      </div>

      {/* Plan cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {PLANS.map(plan => {
          const isSelected = selected === plan.id
          return (
            <div
              key={plan.id}
              onClick={() => setSelected(plan.id)}
              style={{
                padding: '18px 20px', borderRadius: 10, cursor: 'pointer',
                border: `1px solid ${isSelected ? 'rgba(113,112,255,0.55)' : 'rgba(255,255,255,0.07)'}`,
                background: isSelected ? 'rgba(113,112,255,0.06)' : 'rgba(255,255,255,0.015)',
                transition: 'all 0.18s',
                position: 'relative',
              }}
            >
              {plan.recommended && (
                <div style={{
                  position: 'absolute', top: -1, right: 16, fontSize: 9.5, fontWeight: 600,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: 'var(--accent-v)', background: 'rgba(113,112,255,0.14)',
                  border: '1px solid rgba(113,112,255,0.32)', borderTop: 'none',
                  padding: '3px 9px 4px', borderRadius: '0 0 5px 5px',
                }}>Popular</div>
              )}

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                {/* Radio */}
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                  border: `1.5px solid ${isSelected ? 'rgba(113,112,255,0.8)' : 'rgba(255,255,255,0.2)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'border-color 0.15s',
                }}>
                  {isSelected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7170ff' }} />}
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
                    <span style={{ fontSize: 15, fontWeight: 590, color: 'var(--fg)', letterSpacing: '-0.02em' }}>{plan.name}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--fg-subtle)', letterSpacing: '-0.01em' }}>{plan.desc}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginTop: 6 }}>
                    {plan.features.slice(0, 3).map(f => (
                      <span key={f} style={{ fontSize: 11.5, color: 'var(--fg-subtle)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={isSelected ? 'var(--accent-v)' : 'var(--fg-subtle)'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Price */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: 24, fontWeight: 590, color: 'var(--fg)', letterSpacing: '-0.04em', lineHeight: 1 }}>
                      ${annual ? plan.annualPrice : plan.price}
                    </span>
                    {plan.price > 0 && <span style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}>/mo</span>}
                  </div>
                  {plan.price === 0 && <span style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}>forever</span>}
                  {annual && plan.price > 0 && (
                    <p style={{ fontSize: 10.5, color: 'var(--fg-subtle)', marginTop: 2 }}>billed annually</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} style={{ height: 40, padding: '0 18px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: 'var(--fg-muted)', fontSize: 13, cursor: 'pointer', letterSpacing: '-0.01em' }}>
          Back
        </button>
        <button
          onClick={onNext}
          className="k-shine"
          style={{
            flex: 1, height: 40, borderRadius: 7, cursor: 'pointer',
            border: '1px solid rgba(113,112,255,0.5)',
            background: 'linear-gradient(180deg, #7170ff 0%, #5e6ad2 50%, #4d5ab8 100%)',
            color: '#fff', fontSize: 13.5, fontWeight: 500, letterSpacing: '-0.02em',
            boxShadow: '0 0 20px rgba(113,112,255,0.25)',
          }}
        >
          {selected === 'free' ? 'Continue with Free' : selected === 'org' ? 'Contact sales' : 'Start 14-day trial'}
        </button>
      </div>

      {selected !== 'free' && (
        <p style={{ fontSize: 11.5, color: 'var(--fg-subtle)', textAlign: 'center', marginTop: 14, letterSpacing: '-0.01em' }}>
          No credit card required for the trial. Cancel anytime.
        </p>
      )}
    </div>
  )
}

// ─── Step 4: Done ─────────────────────────────────────────────────────────────

function StepDone() {
  const navigate = useNavigate()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      {/* Animated checkmark */}
      <div style={{
        width: 72, height: 72, borderRadius: '50%', marginBottom: 28,
        background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.04) 100%)',
        border: '1px solid rgba(16,185,129,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 48px rgba(16,185,129,0.12)',
      }}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <h2 style={{ fontSize: 24, fontWeight: 590, color: 'var(--fg)', letterSpacing: '-0.04em', marginBottom: 12 }}>
        You're all set.
      </h2>
      <p style={{ fontSize: 14.5, color: 'var(--fg-muted)', letterSpacing: '-0.01em', lineHeight: 1.65, maxWidth: 360, marginBottom: 32 }}>
        Kintsugi is now watching your repos. The next failed build will trigger the self-healing loop automatically.
      </p>

      {/* What happens next */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 36 }}>
        {[
          { step: '01', text: 'A build fails in your CI', color: '#f87171' },
          { step: '02', text: 'Kintsugi detects it in <500ms', color: 'var(--accent-v)' },
          { step: '03', text: 'Repair PR appears on GitHub', color: '#10b981' },
        ].map(item => (
          <div key={item.step} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'left' }}>
            <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: 'var(--fg-subtle)', fontWeight: 500, minWidth: 20 }}>{item.step}</code>
            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.06)' }} />
            <span style={{ fontSize: 13, color: 'var(--fg-muted)', letterSpacing: '-0.01em' }}>{item.text}</span>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.color, marginLeft: 'auto' }} />
          </div>
        ))}
      </div>

      <button
        onClick={() => navigate('/app/pipelines')}
        className="k-shine"
        style={{
          width: '100%', height: 44, borderRadius: 8, cursor: 'pointer',
          border: '1px solid rgba(113,112,255,0.5)',
          background: 'linear-gradient(180deg, #7170ff 0%, #5e6ad2 50%, #4d5ab8 100%)',
          color: '#fff', fontSize: 14, fontWeight: 500, letterSpacing: '-0.02em',
          boxShadow: '0 0 24px rgba(113,112,255,0.28)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        Go to dashboard
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>
  )
}

// ─── Onboarding shell ─────────────────────────────────────────────────────────

const STEPS: { id: Step; label: string }[] = [
  { id: 'connect', label: 'Connect' },
  { id: 'repos',   label: 'Repos' },
  { id: 'plan',    label: 'Plan' },
  { id: 'done',    label: 'Done' },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('connect')

  const stepIdx = STEPS.findIndex(s => s.id === step)

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Subtle radial bg */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(113,112,255,0.05) 0%, transparent 70%)', zIndex: 0 }} />
      <div className="k-grain" aria-hidden="true" />

      {/* Top bar */}
      <header style={{
        position: 'relative', zIndex: 10,
        height: 56, padding: '0 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(8,9,10,0.8)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <LogoMark size={18} />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', letterSpacing: '-0.03em' }}>Kintsugi</span>
          <span style={{ fontSize: 13, color: 'var(--fg-subtle)', marginLeft: 4, letterSpacing: '-0.01em' }}>/ Setup</span>
        </div>
        <button
          onClick={() => navigate('/app/pipelines')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, color: 'var(--fg-subtle)', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 5, transition: 'color 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--fg-muted)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--fg-subtle)' }}
        >
          Skip for now
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </header>

      {/* Main content */}
      <div style={{
        position: 'relative', zIndex: 1, flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: 540 }}>
          {/* Progress stepper */}
          {step !== 'done' && (
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 48 }}>
              {STEPS.filter(s => s.id !== 'done').map((s, i, arr) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: i < arr.length - 1 ? 1 : 0 }}>
                  <StepDot
                    active={s.id === step}
                    done={STEPS.findIndex(x => x.id === s.id) < stepIdx}
                    label={s.label}
                  />
                  {i < arr.length - 1 && (
                    <StepLine done={STEPS.findIndex(x => x.id === s.id) < stepIdx} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Step panel */}
          <div style={{
            padding: '36px 40px', borderRadius: 14,
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          }}>
            {step === 'connect' && <StepConnect onNext={() => setStep('repos')} />}
            {step === 'repos'   && <StepRepos   onNext={() => setStep('plan')}  onBack={() => setStep('connect')} />}
            {step === 'plan'    && <StepPlan    onNext={() => setStep('done')}  onBack={() => setStep('repos')} />}
            {step === 'done'    && <StepDone />}
          </div>

          {/* Step indicator text */}
          {step !== 'done' && (
            <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--fg-subtle)', letterSpacing: '-0.01em' }}>
              Step {stepIdx + 1} of 3
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
