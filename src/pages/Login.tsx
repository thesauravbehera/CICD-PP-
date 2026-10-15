import { Link, useNavigate } from 'react-router-dom'

function LogoMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polygon points="12,2 20,8.5 17.5,20 6.5,20 4,8.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 2 L13.5 8.5 L12 13 L14 20" stroke="#7170ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.5 8.5 L17.5 10.5" stroke="#7170ff" strokeWidth="1" strokeLinecap="round" opacity="0.65" />
    </svg>
  )
}

export default function Login() {
  const navigate = useNavigate()

  function handleLogin() {
    localStorage.setItem('kintsugi_authed', 'true')
    navigate('/onboarding', { replace: true })
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px', position: 'relative', overflow: 'hidden',
    }}>
      {/* Ambient glow */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(94,106,210,0.07) 0%, transparent 70%)',
      }} />

      {/* Card */}
      <div style={{
        position: 'relative', zIndex: 1, width: '100%', maxWidth: 400,
        borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)',
        background: 'var(--surface)',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.04) inset, 0 40px 80px rgba(0,0,0,0.5)',
        overflow: 'hidden',
      }}>
        {/* Top accent line */}
        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(113,112,255,0.5), transparent)' }} />

        <div style={{ padding: '40px 36px 36px' }}>
          {/* Logo */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 36 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              border: '1px solid rgba(113,112,255,0.3)',
              background: 'rgba(113,112,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <LogoMark size={26} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ fontSize: 20, fontWeight: 590, color: 'var(--fg)', letterSpacing: '-0.03em', marginBottom: 6 }}>
                Sign in to Kintsugi
              </h1>
              <p style={{ fontSize: 13.5, color: 'var(--fg-muted)', letterSpacing: '-0.01em' }}>
                Connect your GitHub account to continue.
              </p>
            </div>
          </div>

          {/* GitHub button */}
          <button
            onClick={handleLogin}
            style={{
              width: '100%', height: 44, borderRadius: 8, cursor: 'pointer',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--fg)', fontSize: 14, fontWeight: 500, letterSpacing: '-0.02em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              transition: 'background 0.2s, border-color 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            Continue with GitHub
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0 20px' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
            <span style={{ fontSize: 11, color: 'var(--fg-subtle)', letterSpacing: '0.04em' }}>OR</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          </div>

          {/* Email (placeholder) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label htmlFor="email" style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--fg-muted)', letterSpacing: '-0.01em' }}>
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@company.com"
              style={{
                height: 38, padding: '0 12px', borderRadius: 7,
                border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)',
                color: 'var(--fg)', fontSize: 13.5, letterSpacing: '-0.01em', outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(113,112,255,0.4)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
            />
          </div>

          <button
            onClick={handleLogin}
            style={{
              width: '100%', height: 38, borderRadius: 7, cursor: 'pointer',
              border: '1px solid rgba(113,112,255,0.5)',
              background: 'linear-gradient(180deg, #7170ff 0%, #5e6ad2 52%, #4d5ab8 100%)',
              color: '#fff', fontSize: 13.5, fontWeight: 500, letterSpacing: '-0.02em',
              marginTop: 10,
              boxShadow: '0 1px 0 rgba(255,255,255,0.14) inset, 0 0 14px rgba(113,112,255,0.2)',
              transition: 'filter 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.1)' }}
            onMouseLeave={e => { e.currentTarget.style.filter = '' }}
          >
            Send magic link
          </button>

          <p style={{ marginTop: 20, textAlign: 'center', fontSize: 12, color: 'var(--fg-subtle)', lineHeight: 1.5, letterSpacing: '-0.01em' }}>
            By continuing you agree to Kintsugi's{' '}
            <a href="#" style={{ color: 'var(--fg-muted)', textDecoration: 'none' }}>Terms</a>
            {' '}and{' '}
            <a href="#" style={{ color: 'var(--fg-muted)', textDecoration: 'none' }}>Privacy Policy</a>.
          </p>
        </div>
      </div>

      {/* Back to landing */}
      <Link to="/" style={{
        marginTop: 24, fontSize: 12.5, color: 'var(--fg-subtle)',
        textDecoration: 'none', letterSpacing: '-0.01em',
        display: 'flex', alignItems: 'center', gap: 5,
        transition: 'color 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.color = 'var(--fg-muted)' }}
      onMouseLeave={e => { e.currentTarget.style.color = 'var(--fg-subtle)' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
        </svg>
        Back to kintsugi.dev
      </Link>
    </div>
  )
}
