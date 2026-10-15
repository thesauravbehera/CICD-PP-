import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const VIDEO_SRC =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260818_072341_50851634-bbc3-4c33-9acc-7647d4db44aa.mp4'

// ─── Data ─────────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: 'How it works', href: '#pipeline' },
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
]

const PIPELINE_STAGES = [
  {
    n: '01', id: 'build', label: 'Build / Test', sublabel: 'Demo MERN app',
    desc: "A commit lands on the MERN app. GitHub Actions installs, builds the React client, and runs the Express + Mongo test suite. Red build → Kintsugi wakes up.",
    icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>),
  },
  {
    n: '02', id: 'parse', label: 'Log Parser', sublabel: 'Regex + FSM',
    desc: "Ordered regex rules lex each log line into tokens; a finite-state machine walks them to group stack traces, jest failures and npm errors into typed events.",
    icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>),
  },
  {
    n: '03', id: 'root-cause', label: 'Root Cause', sublabel: 'Engine',
    desc: "Ranks events by causal precedence, suppresses downstream noise, and corroborates the winner against package.json, the workflow and the import graph.",
    icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" /></svg>),
  },
  {
    n: '04', id: 'plan', label: 'AI Repair', sublabel: 'Planner',
    desc: "Generates every viable fix strategy and scores them by confidence, learned prior, risk and patch size. Runs locally — code never leaves the box.",
    icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>),
  },
  {
    n: '05', id: 'verify', label: 'Docker', sublabel: 'Verification',
    desc: "Each candidate is replayed in a sealed container: full build + tests, original-signature check, Gitleaks and Semgrep. No repo secrets inside.",
    icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>),
  },
  {
    n: '06', id: 'verdict', label: 'Verdict', sublabel: 'PASS / REJECT',
    desc: "PASS opens a cited PR for a human to approve. REJECT pushes nothing and escalates with the full trace — and the rejection is remembered.",
    icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></svg>),
  },
]

const FEATURES = [
  { title: 'No LLM in the hot path', desc: 'Local bge-small-en-v1.5 embeddings run on CPU. Typed templates apply fixes deterministically. Zero API calls, zero prompt injection surface.', icon: (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1l22 22M9 9a3 3 0 0 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 11 8 11 8a18.44 18.44 0 0 1-5.13 5.77M6.61 6.61A13.526 13.526 0 0 0 1 12s4 8 11 8a9.74 9.74 0 0 0 5.39-1.61" /></svg>) },
  { title: 'Human in the merge seat', desc: 'Every repair is a PR. Auto-merge is architecturally impossible — the flag exists only so tests can prove the guard holds.', icon: (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>) },
  { title: 'Compounding knowledge base', desc: 'Every approved repair sharpens the ANN index. Failure #50 in your repo is cheaper to fix than failure #5 — the moat grows with usage.', icon: (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>) },
  { title: 'Docker sandbox isolation', desc: 'Fly.io Machines: no host Docker socket, read-only filesystem outside /workspace, network egress limited to package registries.', icon: (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 17.5h7M17.5 14v7" /></svg>) },
  { title: 'Parallel PR reviewer', desc: 'Security, quality, tests, and docs specialists fan out concurrently. An aggregator drops findings below confidence 0.6 before anything posts.', icon: (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>) },
  { title: 'Full citation trail on every PR', desc: "Each PR cites the matched past failure, template applied, validation results, and a composite confidence score. Not a probability — a signal.", icon: (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>) },
]

const TEMPLATES = [
  { id: 'add-missing-dep',    lang: 'js / ts',   fires: "Cannot find module 'X'",                   risk: 'low' },
  { id: 'add-missing-dep-py', lang: 'python',     fires: "ModuleNotFoundError: No module named 'X'", risk: 'low' },
  { id: 'fix-import-path',    lang: 'js / ts',   fires: "Cannot find module './foo'",               risk: 'med' },
  { id: 'bump-node-version',  lang: 'any',        fires: 'engine "node" incompatible with module',   risk: 'low' },
  { id: 'add-env-var',        lang: 'any',        fires: 'undefined env var referenced in test',     risk: 'low' },
  { id: 'retry-flaky-test',   lang: 'js / py',   fires: '3+ historical flakes on same test',        risk: 'med' },
]

const PRICING_TIERS = [
  {
    name: 'Free', desc: 'Side projects and solo engineers.', monthly: 0, annual: 0,
    features: ['1 connected repo', '10 auto-repairs / month', 'Node.js + Python templates', 'Dashboard access', 'Community support'],
    cta: 'Start free', recommended: false,
  },
  {
    name: 'Team', desc: 'Engineering teams shipping daily.', monthly: 49, annual: 39,
    features: ['10 repos', '500 auto-repairs / month', 'All 6 repair templates', 'PR reviewer — 4 specialists', 'Analytics: MTTR + approval rate', 'Reviewer config per repo', 'Email support'],
    cta: 'Start 14-day trial', recommended: true,
  },
  {
    name: 'Org', desc: 'Orgs with high-velocity CI.', monthly: 149, annual: 119,
    features: ['Unlimited repos', 'Unlimited auto-repairs', 'Cross-repo knowledge base', 'Custom confidence thresholds', 'SSO + audit log', 'Dedicated Slack channel', 'SLA + priority support'],
    cta: 'Contact us', recommended: false,
  },
]

const HERO_STATS = [
  {
    label: '4.2M+ pipeline events analyzed',
    icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e8e8e8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>),
  },
  {
    label: '91% avg repair confidence',
    icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e8e8e8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></svg>),
  },
  {
    label: '180+ engineering teams onboarded',
    icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e8e8e8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>),
  },
]

// ─── Logo mark ────────────────────────────────────────────────────────────────
function LogoMark({ size = 20, white = false }: { size?: number; white?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polygon points="12,2 20,8.5 17.5,20 6.5,20 4,8.5" stroke={white ? '#fff' : 'currentColor'} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 2 L13.5 8.5 L12 13 L14 20" stroke={white ? 'rgba(255,255,255,0.6)' : '#7170ff'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Hero viewport ────────────────────────────────────────────────────────────
function HeroViewport({ scrolled }: { scrolled: boolean }) {
  const navigate = useNavigate()

  return (
    <section
      id="hero-viewport"
      style={{
        position: 'relative',
        height: '100svh',
        minHeight: 600,
        overflow: 'hidden',
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Video background ── */}
      <video
        autoPlay muted loop playsInline aria-hidden="true"
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover', zIndex: 0,
        }}
      >
        <source src={VIDEO_SRC} type="video/mp4" />
      </video>

      {/* ── Bottom gradient scrim — text legibility ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.18) 0%, transparent 28%, transparent 42%, rgba(0,0,0,0.78) 100%)',
        }}
      />

      {/* ── Header — transparent over video, darkens on scroll ── */}
      <header
        style={{
          position: 'relative', zIndex: 50, flexShrink: 0,
          padding: '22px 40px 10px',
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          gap: 16,
          background: scrolled ? 'rgba(0,0,0,0.55)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
          transition: 'background 0.4s ease, backdrop-filter 0.4s ease',
        }}
      >
        {/* Logo */}
        <a
          href="#top"
          aria-label="Kintsugi"
          className="appear appear--scale"
          style={{
            '--d': '0.08s',
            display: 'inline-flex', alignItems: 'center', gap: 9,
            justifySelf: 'start', textDecoration: 'none',
            color: '#fff', fontSize: 15.5, fontWeight: 600, letterSpacing: '-0.03em',
          } as React.CSSProperties}
          onAnimationEnd={(e) => e.currentTarget.classList.add('is-in')}
        >
          <LogoMark size={22} white />
          Kintsugi<span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.5)' }}>.dev</span>
        </a>

        {/* Nav pills — Vesper liquid-metal style */}
        <nav id="site-nav" aria-label="Primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {NAV_LINKS.map((link, i) => (
            <a
              key={link.label}
              href={link.href}
              className={`k-nav-pill appear ${i % 2 === 0 ? 'appear--scale' : 'appear--soft'}`}
              style={{
                '--d': `${0.16 + i * 0.12}s`,
                height: 40, padding: '0 18px',
                display: 'inline-flex', alignItems: 'center',
                borderRadius: 7,
                border: '1px solid rgba(198,198,198,0.55)',
                background: 'linear-gradient(105deg, #050505 0%, #2a2a2a 48%, #4a4a4a 100%)',
                color: '#f3f3f3', fontSize: 14, fontWeight: 400, letterSpacing: '-0.01em',
                whiteSpace: 'nowrap', textDecoration: 'none', cursor: 'pointer',
                transition: 'background 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease',
              } as React.CSSProperties}
              onAnimationEnd={(e) => e.currentTarget.classList.add('is-in')}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(105deg, #111 0%, #3a3a3a 45%, #6a6a6a 100%)'
                e.currentTarget.style.borderColor = 'rgba(235,235,235,0.9)'
                e.currentTarget.style.boxShadow = '0 0 18px rgba(200,210,230,0.18)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(105deg, #050505 0%, #2a2a2a 48%, #4a4a4a 100%)'
                e.currentTarget.style.borderColor = 'rgba(198,198,198,0.55)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right — CTA */}
        <div style={{ justifySelf: 'end', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => navigate('/login')}
            className="k-shine appear appear--scale"
            style={{
              '--d': '0.34s',
              height: 40, padding: '0 16px', borderRadius: 6, cursor: 'pointer',
              background: 'linear-gradient(180deg, #ffffff 0%, #e7e7e7 48%, #cfcfcf 100%)',
              color: '#111', border: '1px solid #fff',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.95)',
              fontSize: 13.5, fontWeight: 500, letterSpacing: '-0.02em',
              transition: 'background 0.35s, border-color 0.35s, box-shadow 0.35s',
            } as React.CSSProperties}
            onAnimationEnd={(e) => e.currentTarget.classList.add('is-in')}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(180deg, #fff 0%, #f3f6ff 42%, #d5def2 100%)'
              e.currentTarget.style.borderColor = '#f2f6ff'
              e.currentTarget.style.boxShadow = 'inset 0 1px 0 #fff, 0 0 22px rgba(186,208,255,0.35), 0 8px 18px rgba(255,255,255,0.12)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(180deg, #ffffff 0%, #e7e7e7 48%, #cfcfcf 100%)'
              e.currentTarget.style.borderColor = '#fff'
              e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.95)'
            }}
          >
            Start for Free
          </button>
        </div>
      </header>

      {/* ── Hero copy — bottom-anchored ── */}
      <main
        style={{
          flex: 1, position: 'relative', zIndex: 2,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          padding: '8px 24px 85px',
        }}
      >
        <div
          style={{
            maxWidth: 860, width: '100%',
            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
          }}
        >
          {/* Badge */}
          <div
            className="appear appear--pop"
            style={{ '--d': '0.22s' } as React.CSSProperties}
            onAnimationEnd={(e) => e.currentTarget.classList.add('is-in')}
          >
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              marginBottom: 22, padding: '9px 15px', borderRadius: 5,
              background: 'linear-gradient(90deg, #7d7d7d 0%, #2a2a2a 52%, #0a0a0a 100%)',
              color: '#f2f2f2', fontSize: 12.5, fontWeight: 400, letterSpacing: '-0.01em',
            }}>
              <svg
                width="18" height="20" viewBox="0 0 24 24" fill="white" aria-hidden="true"
                style={{ filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.45))' }}
              >
                <path d="M12 2.6C12.55 2.6 12.88 3.15 13.08 4.7c.62 4.7 1.52 5.6 6.22 6.22 1.55.2 2.1.53 2.1 1.08s-.55.88-2.1 1.08c-4.7.62-5.6 1.52-6.22 6.22-.2 1.55-.53 2.1-1.08 2.1s-.88-.55-1.08-2.1c-.62-4.7-1.52-5.6-6.22-6.22C3.15 12.88 2.6 12.55 2.6 12s.55-.88 2.1-1.08c4.7-.62 5.6-1.52 6.22-6.22C11.12 3.15 11.45 2.6 12 2.6Z" />
              </svg>
              Self-Healing CI/CD Infrastructure
            </div>
          </div>

          {/* H1 — two masked lines */}
          <h1
            style={{
              fontSize: 'clamp(36px, 5.5vw, 64px)',
              fontWeight: 500, lineHeight: 1.12,
              letterSpacing: '-0.045em', color: '#fff',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}
          >
            <span
              className="appear appear--mask"
              style={{
                '--d': '0.42s',
                display: 'block', overflow: 'hidden',
                padding: '0.06em 0.15em 0.14em',
              } as React.CSSProperties}
              onAnimationEnd={(e) => e.currentTarget.classList.add('is-in')}
            >
              Every broken build
            </span>
            <span
              className="appear appear--mask"
              style={{
                '--d': '0.62s',
                display: 'block', overflow: 'hidden',
                padding: '0.06em 0.15em 0.14em',
              } as React.CSSProperties}
              onAnimationEnd={(e) => e.currentTarget.classList.add('is-in')}
            >
              becomes a{' '}
              <em
                className="appear appear--em"
                style={{
                  '--d': '0.72s',
                  fontFamily: '"Instrument Serif", "Times New Roman", Times, serif',
                  fontStyle: 'italic', fontWeight: 400,
                  fontSize: '1.08em', letterSpacing: '-0.03em',
                  color: '#9a9a9a',
                } as React.CSSProperties}
                onAnimationEnd={(e) => e.currentTarget.classList.add('is-in')}
              >
                repair PR.
              </em>
            </span>
          </h1>

          {/* Lede */}
          <p
            className="appear appear--soft"
            style={{
              '--d': '0.82s',
              maxWidth: 470, marginTop: 18,
              color: '#9a9a9a', fontSize: 15.5, fontWeight: 400,
              lineHeight: 1.55, letterSpacing: '-0.015em',
            } as React.CSSProperties}
            onAnimationEnd={(e) => e.currentTarget.classList.add('is-in')}
          >
            Kintsugi watches your GitHub Actions. When a build fails it detects
            the error, retrieves matching past failures, applies a typed fix,
            validates in a Docker sandbox, and opens a PR — without touching an LLM.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 26, flexWrap: 'wrap', justifyContent: 'center' }}>
            {/* Solid white CTA */}
            <button
              onClick={() => navigate('/login')}
              className="k-shine appear appear--btn"
              style={{
                '--d': '0.96s',
                height: 42, padding: '0 18px',
                borderRadius: 6, cursor: 'pointer',
                background: 'linear-gradient(180deg, #ffffff 0%, #e7e7e7 48%, #cfcfcf 100%)',
                color: '#111', border: '1px solid #fff',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.95)',
                fontSize: 13.5, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1,
                display: 'inline-flex', alignItems: 'center', gap: 7,
                transition: 'background 0.35s, border-color 0.35s, box-shadow 0.35s',
              } as React.CSSProperties}
              onAnimationEnd={(e) => e.currentTarget.classList.add('is-in')}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(180deg, #fff 0%, #f3f6ff 42%, #d5def2 100%)'
                e.currentTarget.style.borderColor = '#f2f6ff'
                e.currentTarget.style.boxShadow = 'inset 0 1px 0 #fff, 0 0 26px rgba(186,208,255,0.4), 0 8px 18px rgba(255,255,255,0.14)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(180deg, #ffffff 0%, #e7e7e7 48%, #cfcfcf 100%)'
                e.currentTarget.style.borderColor = '#fff'
                e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.95)'
              }}
            >
              Get early access
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </button>

            {/* Ghost CTA */}
            <a
              href="#pipeline"
              className="k-shine appear appear--side"
              style={{
                '--d': '1.10s',
                height: 42, padding: '0 18px', borderRadius: 6,
                background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(0,0,0,0.5) 46%, rgba(150,170,200,0.1))',
                color: '#fff', border: '1px solid rgba(198,198,198,0.55)',
                backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
                fontSize: 13.5, fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1,
                textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
                transition: 'border-color 0.35s, box-shadow 0.35s',
              } as React.CSSProperties}
              onAnimationEnd={(e) => e.currentTarget.classList.add('is-in')}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(220,230,255,0.8)'
                e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.22), 0 0 24px rgba(170,200,255,0.28)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(198,198,198,0.55)'
                e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.12)'
              }}
            >
              See how it works
            </a>
          </div>
        </div>
      </main>

      {/* ── Stats strip — very bottom of viewport ── */}
      <footer
        style={{
          position: 'relative', zIndex: 2, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 72px 36px',
          color: '#d8d8d8',
        }}
      >
        {HERO_STATS.map((stat, i) => (
          <div
            key={stat.label}
            className="appear appear--stat"
            style={{
              '--d': `${1.12 + i * 0.16}s`,
              display: 'inline-flex', alignItems: 'center', gap: 14,
              fontSize: 13.5, letterSpacing: '-0.015em', whiteSpace: 'nowrap',
            } as React.CSSProperties}
            onAnimationEnd={(e) => e.currentTarget.classList.add('is-in')}
          >
            {stat.icon}
            <span style={{ color: '#d8d8d8' }}>{stat.label}</span>
          </div>
        ))}
      </footer>
    </section>
  )
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────
function Pipeline() {
  const [active, setActive] = useState<string | null>(null)

  return (
    <section id="pipeline" style={{ padding: '88px 40px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 52 }}>
        <p style={{ fontSize: 11.5, fontWeight: 500, letterSpacing: '0.09em', color: 'var(--accent-v)', textTransform: 'uppercase', marginBottom: 10 }}>
          The self-healing loop
        </p>
        <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 590, letterSpacing: '-0.035em', lineHeight: 1.1, color: 'var(--fg)' }}>
          Six stages. Zero humans{' '}
          <em style={{ color: 'var(--fg-muted)', fontStyle: 'italic', fontWeight: 400, fontSize: '0.88em' }}>until the PR is ready.</em>
        </h2>
        <p style={{ marginTop: 12, fontSize: 14, color: 'var(--fg-muted)', letterSpacing: '-0.01em', lineHeight: 1.6, maxWidth: 480 }}>
          Click any stage to expand. Triggered by{' '}
          <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: 'var(--fg-2)', background: 'var(--surface)', padding: '1px 5px', borderRadius: 3 }}>workflow_run</code>{' '}
          failures and{' '}
          <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: 'var(--fg-2)', background: 'var(--surface)', padding: '1px 5px', borderRadius: 3 }}>pull_request</code>{' '}
          opens.
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', overflowX: 'auto', paddingBottom: 8, gap: 0 }}>
        {PIPELINE_STAGES.map((stage, i) => (
          <div key={stage.id} style={{ display: 'flex', alignItems: 'flex-start', flex: i < PIPELINE_STAGES.length - 1 ? '1 1 auto' : '0 0 auto' }}>
            <button
              onClick={() => setActive(active === stage.id ? null : stage.id)}
              style={{
                flex: '0 0 auto', width: 152,
                display: 'flex', flexDirection: 'column', gap: 10,
                padding: '18px 16px', borderRadius: 10, cursor: 'pointer',
                border: `1px solid ${active === stage.id ? 'rgba(113,112,255,0.45)' : 'rgba(255,255,255,0.08)'}`,
                background: active === stage.id ? 'rgba(113,112,255,0.07)' : 'rgba(255,255,255,0.015)',
                textAlign: 'left', transition: 'border-color 0.18s, background 0.18s',
              }}
              onMouseEnter={(e) => { if (active !== stage.id) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' } }}
              onMouseLeave={(e) => { if (active !== stage.id) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.015)' } }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10.5, fontWeight: 500, letterSpacing: '0.08em', color: active === stage.id ? 'var(--accent-v)' : 'var(--fg-subtle)', fontFamily: "'JetBrains Mono', monospace" }}>{stage.n}</span>
                <span style={{ color: active === stage.id ? 'var(--accent-v)' : 'var(--fg-muted)', opacity: 0.8 }}>{stage.icon}</span>
              </div>
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 590, letterSpacing: '-0.022em', color: 'var(--fg)', marginBottom: 2 }}>{stage.label}</p>
                <p style={{ fontSize: 11, color: 'var(--fg-subtle)', letterSpacing: '-0.005em' }}>{stage.sublabel}</p>
              </div>
              <div style={{ overflow: 'hidden', transition: 'max-height 0.28s ease, opacity 0.22s ease', maxHeight: active === stage.id ? 120 : 0, opacity: active === stage.id ? 1 : 0 }}>
                <p style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--fg-muted)', letterSpacing: '-0.01em' }}>{stage.desc}</p>
              </div>
            </button>
            {i < PIPELINE_STAGES.length - 1 && (
              <div style={{ flex: 1, height: 1, minWidth: 12, marginTop: 26, alignSelf: 'flex-start', background: 'linear-gradient(90deg, rgba(113,112,255,0.15), rgba(113,112,255,0.42), rgba(113,112,255,0.15))' }} />
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Features ─────────────────────────────────────────────────────────────────
function Features() {
  return (
    <section id="features" style={{ padding: '0 40px 88px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 80, marginBottom: 52 }}>
        <p style={{ fontSize: 11.5, fontWeight: 500, letterSpacing: '0.09em', color: 'var(--accent-v)', textTransform: 'uppercase', marginBottom: 10 }}>Why Kintsugi</p>
        <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 590, letterSpacing: '-0.03em', color: 'var(--fg)', lineHeight: 1.12 }}>Four hard invariants.</h2>
        <p style={{ marginTop: 10, fontSize: 14.5, color: 'var(--fg-muted)', letterSpacing: '-0.01em', maxWidth: 440, lineHeight: 1.6 }}>Architectural decisions, not configuration options. Violation means a bug.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)', marginBottom: 48 }}>
        {[
          { label: 'Never auto-merge', desc: 'Every repair is a PR a human clicks approve.' },
          { label: 'No LLM in the loop', desc: 'Local templates and local embeddings only.' },
          { label: 'Always cited', desc: 'Every PR cites the matched failure and template.' },
          { label: 'Rejections are stored', desc: 'Every no trains the system to stay quiet.' },
        ].map((inv, i) => (
          <div key={inv.label} style={{ padding: '22px 20px', background: 'var(--surface)', borderRight: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent-v)', flexShrink: 0 }} />
              <p style={{ fontSize: 12.5, fontWeight: 590, color: 'var(--fg)', letterSpacing: '-0.02em' }}>{inv.label}</p>
            </div>
            <p style={{ fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.5, letterSpacing: '-0.01em' }}>{inv.desc}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {FEATURES.map(f => (
          <div key={f.title} className="k-feature-card" style={{ padding: '22px 20px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.012)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-muted)' }}>{f.icon}</div>
            <div>
              <h3 style={{ fontSize: 13.5, fontWeight: 590, color: 'var(--fg)', letterSpacing: '-0.022em', marginBottom: 6 }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.55, letterSpacing: '-0.01em' }}>{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 48, borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)' }}>
          <p style={{ fontSize: 13, fontWeight: 590, color: 'var(--fg)', letterSpacing: '-0.02em' }}>V1 repair templates</p>
          <span style={{ fontSize: 10.5, padding: '3px 9px', borderRadius: 4, fontWeight: 500, letterSpacing: '0.05em', background: 'rgba(39,166,68,0.1)', border: '1px solid rgba(39,166,68,0.22)', color: '#27a644' }}>6 SHIPPING V1</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.008)' }}>
              {['Template ID', 'Language', 'Fires when', 'Risk'].map(h => (
                <th key={h} style={{ padding: '9px 20px', textAlign: 'left', fontSize: 10.5, fontWeight: 500, letterSpacing: '0.07em', color: 'var(--fg-subtle)', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TEMPLATES.map((t, i) => (
              <tr key={t.id} style={{ borderBottom: i < TEMPLATES.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <td style={{ padding: '11px 20px' }}><code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--accent-v)' }}>{t.id}</code></td>
                <td style={{ padding: '11px 20px', fontSize: 12.5, color: 'var(--fg-muted)' }}>{t.lang}</td>
                <td style={{ padding: '11px 20px', fontSize: 11.5, color: 'var(--fg-muted)', fontFamily: "'JetBrains Mono', monospace" }}>{t.fires}</td>
                <td style={{ padding: '11px 20px' }}>
                  <span style={{ fontSize: 10.5, padding: '3px 8px', borderRadius: 4, fontWeight: 500, letterSpacing: '0.04em', background: t.risk === 'low' ? 'rgba(16,185,129,0.1)' : 'rgba(234,179,8,0.1)', border: `1px solid ${t.risk === 'low' ? 'rgba(16,185,129,0.25)' : 'rgba(234,179,8,0.25)'}`, color: t.risk === 'low' ? '#10b981' : '#c9990a' }}>{t.risk.toUpperCase()}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ─── Pricing ──────────────────────────────────────────────────────────────────
function Pricing() {
  const [annual, setAnnual] = useState(true)
  const navigate = useNavigate()

  return (
    <section id="pricing" style={{ padding: '0 40px 88px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 80 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 48, flexWrap: 'wrap', gap: 20 }}>
          <div>
            <p style={{ fontSize: 11.5, fontWeight: 500, letterSpacing: '0.09em', color: 'var(--accent-v)', textTransform: 'uppercase', marginBottom: 10 }}>Pricing</p>
            <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 590, letterSpacing: '-0.032em', color: 'var(--fg)', lineHeight: 1.12 }}>Starts free. Scales with your CI.</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'var(--surface)' }}>
            {['Monthly', 'Annual'].map(label => {
              const isActive = label === 'Annual' ? annual : !annual
              return (
                <button key={label} onClick={() => setAnnual(label === 'Annual')} style={{ height: 30, padding: '0 14px', borderRadius: 5, cursor: 'pointer', border: isActive ? '1px solid rgba(113,112,255,0.32)' : '1px solid transparent', background: isActive ? 'rgba(113,112,255,0.1)' : 'transparent', color: isActive ? 'var(--accent-v)' : 'var(--fg-muted)', fontSize: 12.5, fontWeight: isActive ? 500 : 400, letterSpacing: '-0.01em', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {label}
                  {label === 'Annual' && <span style={{ fontSize: 9.5, padding: '2px 5px', borderRadius: 3, background: 'rgba(39,166,68,0.14)', color: '#27a644', fontWeight: 500, letterSpacing: '0.03em' }}>−20%</span>}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {PRICING_TIERS.map(tier => (
            <div key={tier.name} className={tier.recommended ? 'k-recommended-glow' : ''} style={{ position: 'relative', padding: '26px 24px', borderRadius: 12, border: tier.recommended ? '1px solid rgba(113,112,255,0.48)' : '1px solid rgba(255,255,255,0.08)', background: tier.recommended ? 'rgba(113,112,255,0.045)' : 'rgba(255,255,255,0.012)', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {tier.recommended && (
                <div style={{ position: 'absolute', top: -1, right: 18, fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', color: 'var(--accent-v)', background: 'rgba(113,112,255,0.16)', border: '1px solid rgba(113,112,255,0.38)', borderTop: 'none', padding: '4px 10px 5px', borderRadius: '0 0 6px 6px', textTransform: 'uppercase' }}>Recommended</div>
              )}
              <div>
                <p style={{ fontSize: 15, fontWeight: 590, color: 'var(--fg)', letterSpacing: '-0.022em', marginBottom: 4 }}>{tier.name}</p>
                <p style={{ fontSize: 12.5, color: 'var(--fg-subtle)', letterSpacing: '-0.01em' }}>{tier.desc}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                <span style={{ fontSize: 34, fontWeight: 590, color: 'var(--fg)', letterSpacing: '-0.04em', lineHeight: 1 }}>${annual ? tier.annual : tier.monthly}</span>
                <span style={{ fontSize: 12.5, color: 'var(--fg-muted)', letterSpacing: '-0.01em' }}>{tier.monthly === 0 ? 'forever' : `/ mo${annual ? ', billed annually' : ''}`}</span>
              </div>
              <button
                onClick={() => tier.name !== 'Org' ? navigate('/login') : window.open('mailto:team@kintsugi.dev')}
                className={tier.recommended ? 'k-shine' : ''}
                style={{
                  height: 38, padding: '0 18px', borderRadius: 7, cursor: 'pointer',
                  border: tier.recommended ? '1px solid rgba(113,112,255,0.48)' : '1px solid rgba(255,255,255,0.09)',
                  background: tier.recommended ? 'linear-gradient(180deg, #7170ff 0%, #5e6ad2 52%, #4d5ab8 100%)' : 'rgba(255,255,255,0.03)',
                  color: tier.recommended ? '#fff' : 'var(--fg-2)',
                  fontSize: 13, fontWeight: 500, letterSpacing: '-0.02em',
                  boxShadow: tier.recommended ? '0 0 16px rgba(113,112,255,0.2)' : 'none',
                  transition: 'filter 0.2s, box-shadow 0.2s, border-color 0.2s, color 0.2s',
                }}
                onMouseEnter={(e) => { if (tier.recommended) { e.currentTarget.style.filter = 'brightness(1.1)'; e.currentTarget.style.boxShadow = '0 0 28px rgba(113,112,255,0.36)' } else { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; e.currentTarget.style.color = 'var(--fg)' } }}
                onMouseLeave={(e) => { e.currentTarget.style.filter = ''; e.currentTarget.style.boxShadow = tier.recommended ? '0 0 16px rgba(113,112,255,0.2)' : 'none'; e.currentTarget.style.borderColor = tier.recommended ? 'rgba(113,112,255,0.48)' : 'rgba(255,255,255,0.09)'; if (!tier.recommended) e.currentTarget.style.color = 'var(--fg-2)' }}
              >
                {tier.cta}
              </button>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 9 }}>
                {tier.features.map(feat => (
                  <li key={feat} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--fg-muted)', letterSpacing: '-0.01em' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={tier.recommended ? 'var(--accent-v)' : 'var(--fg-subtle)'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><polyline points="20 6 9 17 4 12" /></svg>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p style={{ marginTop: 22, textAlign: 'center', fontSize: 12.5, color: 'var(--fg-subtle)', letterSpacing: '-0.01em' }}>
          All plans include unlimited PR reviewer comments. Annual savings: Team{' '}
          <strong style={{ color: 'var(--fg-muted)' }}>$120 / yr</strong>, Org{' '}
          <strong style={{ color: 'var(--fg-muted)' }}>$360 / yr</strong>.
        </p>
      </div>
    </section>
  )
}

// ─── Footer CTA ───────────────────────────────────────────────────────────────
function FooterCTA() {
  const navigate = useNavigate()
  return (
    <section style={{ maxWidth: 1120, margin: '0 auto 56px', padding: '0 40px' }}>
      <div style={{
        borderRadius: 14, border: '1px solid rgba(113,112,255,0.22)',
        background: 'linear-gradient(135deg, rgba(94,106,210,0.12) 0%, rgba(8,9,10,0.96) 50%, rgba(113,112,255,0.06) 100%)',
        padding: 'clamp(48px, 7vw, 72px) 48px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center', gap: 18, position: 'relative', overflow: 'hidden',
      }}>
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 60% 65% at 50% 50%, rgba(113,112,255,0.065) 0%, transparent 70%)' }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}>
            <LogoMark size={22} />
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', letterSpacing: '-0.03em' }}>Kintsugi</span>
          </div>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 590, letterSpacing: '-0.04em', lineHeight: 1.08, color: 'var(--fg)' }}>
            Your next red build opens a PR,{' '}
            <em style={{ color: 'var(--accent-v)', fontStyle: 'italic', fontWeight: 400 }}>not a ticket.</em>
          </h2>
          <p style={{ fontSize: 15, color: 'var(--fg-muted)', maxWidth: 400, lineHeight: 1.62, letterSpacing: '-0.01em' }}>
            Install Kintsugi on your GitHub repos in under two minutes. First repair typically arrives within one failed build.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => navigate('/login')}
              id="start"
              className="k-shine"
              style={{
                height: 44, padding: '0 22px', borderRadius: 8, cursor: 'pointer',
                border: '1px solid rgba(113,112,255,0.55)',
                background: 'linear-gradient(180deg, #7170ff 0%, #5e6ad2 52%, #4d5ab8 100%)',
                color: '#fff', fontSize: 14, fontWeight: 500, letterSpacing: '-0.02em',
                display: 'inline-flex', alignItems: 'center', gap: 8,
                boxShadow: '0 1px 0 rgba(255,255,255,0.15) inset, 0 0 26px rgba(113,112,255,0.32)',
                transition: 'filter 0.2s, box-shadow 0.25s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.1)'; e.currentTarget.style.boxShadow = '0 1px 0 rgba(255,255,255,0.22) inset, 0 0 46px rgba(130,143,255,0.46)' }}
              onMouseLeave={(e) => { e.currentTarget.style.filter = ''; e.currentTarget.style.boxShadow = '0 1px 0 rgba(255,255,255,0.15) inset, 0 0 26px rgba(113,112,255,0.32)' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
              Install on GitHub
            </button>
            <a href="#pipeline" style={{ height: 44, padding: '0 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'var(--fg-muted)', fontSize: 13.5, fontWeight: 400, letterSpacing: '-0.02em', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer', transition: 'border-color 0.2s, color 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; e.currentTarget.style.color = 'var(--fg)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--fg-muted)' }}>
              See how it works
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '24px 40px', maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <LogoMark size={15} />
        <span style={{ fontSize: 12.5, color: 'var(--fg-subtle)', letterSpacing: '-0.02em' }}>Kintsugi — self-healing CI/CD</span>
      </div>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {['GitHub', 'Docs', 'Privacy', 'Terms', 'Status'].map(label => (
          <a key={label} href="#" style={{ fontSize: 12, color: 'var(--fg-subtle)', textDecoration: 'none', letterSpacing: '-0.01em', transition: 'color 0.15s' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--fg-muted)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fg-subtle)' }}>{label}</a>
        ))}
      </nav>
      <p style={{ fontSize: 11.5, color: 'var(--fg-subtle)', letterSpacing: '-0.01em' }}>© 2026 Kintsugi. AGPL-3.0.</p>
    </footer>
  )
}

// ─── Landing ──────────────────────────────────────────────────────────────────
export default function Landing() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handler, { passive: true })
    handler()
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // JS animation fallback — add .is-in if CSS animations don't fire
  useEffect(() => {
    let outer = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.querySelectorAll('.appear').forEach(el => {
          const anims = (el as Element & { getAnimations?: () => Animation[] }).getAnimations?.() ?? []
          if (!anims.some(a => a.playState === 'running' || a.playState === 'finished')) {
            el.classList.add('is-in')
          }
        })
      })
    })
    return () => cancelAnimationFrame(outer)
  }, [])

  return (
    <>
      <div className="k-grain" aria-hidden="true" />
      <HeroViewport scrolled={scrolled} />
      <div style={{ background: 'var(--bg)' }}>
        <Pipeline />
        <Features />
        <Pricing />
        <FooterCTA />
        <Footer />
      </div>
    </>
  )
}
