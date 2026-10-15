import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'

function LogoMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <polygon points="12,2 20,8.5 17.5,20 6.5,20 4,8.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 2 L13.5 8.5 L12 13 L14 20" stroke="#7170ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.5 8.5 L17.5 10.5" stroke="#7170ff" strokeWidth="1" strokeLinecap="round" opacity="0.65" />
    </svg>
  )
}

const NAV_ITEMS = [
  {
    href: '/app/pipelines', label: 'Pipelines',
    icon: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>),
  },
  {
    href: '/app/run', label: 'Live Run',
    icon: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polygon points="6 4 20 12 6 20 6 4" /></svg>),
  },
  {
    href: '/app/repairs', label: 'Repairs',
    icon: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>),
  },
  {
    href: '/app/knowledge', label: 'Knowledge',
    icon: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4.03 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" /></svg>),
  },
  {
    href: '/app/analytics', label: 'Analytics',
    icon: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>),
  },
]

function SidebarItem({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  const location = useLocation()
  const isActive = location.pathname.startsWith(href)

  return (
    <NavLink
      to={href}
      style={{
        display: 'flex', alignItems: 'center', gap: 9,
        height: 32, padding: '0 10px', borderRadius: 6,
        fontSize: 13, fontWeight: isActive ? 500 : 400,
        letterSpacing: '-0.01em', textDecoration: 'none',
        color: isActive ? 'var(--fg)' : 'var(--fg-muted)',
        background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
        borderLeft: isActive ? '2px solid var(--accent-v)' : '2px solid transparent',
        transition: 'color 0.15s, background 0.15s',
        marginLeft: -2,
      }}
      onMouseEnter={e => {
        if (!isActive) {
          e.currentTarget.style.color = 'var(--fg-2)'
          e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          e.currentTarget.style.color = 'var(--fg-muted)'
          e.currentTarget.style.background = 'transparent'
        }
      }}
    >
      <span style={{ opacity: isActive ? 1 : 0.65 }}>{icon}</span>
      {label}
    </NavLink>
  )
}

export default function AppLayout() {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  function logout() {
    localStorage.removeItem('kintsugi_authed')
    navigate('/login', { replace: true })
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 52 : 220, flexShrink: 0,
        background: 'var(--surface)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.2s ease', overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{
          height: 52, padding: '0 16px', display: 'flex', alignItems: 'center',
          gap: 9, borderBottom: '1px solid rgba(255,255,255,0.05)',
          flexShrink: 0,
        }}>
          <div style={{ flexShrink: 0 }}><LogoMark size={18} /></div>
          {!collapsed && (
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', letterSpacing: '-0.03em', whiteSpace: 'nowrap' }}>
              Kintsugi
            </span>
          )}
          <div style={{ flex: 1 }} />
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{
              width: 24, height: 24, borderRadius: 4, border: 'none',
              background: 'transparent', cursor: 'pointer', color: 'var(--fg-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--fg-muted)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--fg-subtle)' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {collapsed
                ? <><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>
                : <><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></>
              }
            </svg>
          </button>
        </div>

        {/* Org selector */}
        {!collapsed && (
          <div style={{ padding: '10px 12px 6px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <button style={{
              width: '100%', height: 32, padding: '0 10px', borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)',
              display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: 4, background: 'linear-gradient(135deg, #5e6ad2, #7170ff)',
                flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>A</span>
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--fg-2)', letterSpacing: '-0.01em' }}>acme</span>
              <div style={{ flex: 1 }} />
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--fg-subtle)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, padding: collapsed ? '8px 6px' : '8px 12px', overflowY: 'auto' }}>
          {collapsed ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
              {NAV_ITEMS.map(item => {
                const isActive = location.pathname.startsWith(item.href)
                return (
                  <NavLink key={item.href} to={item.href} title={item.label} style={{
                    width: 36, height: 36, borderRadius: 7,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: isActive ? 'var(--accent-v)' : 'var(--fg-muted)',
                    background: isActive ? 'rgba(113,112,255,0.1)' : 'transparent',
                    textDecoration: 'none', transition: 'color 0.15s, background 0.15s',
                  }}>
                    {item.icon}
                  </NavLink>
                )
              })}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <p style={{ fontSize: 10.5, fontWeight: 500, letterSpacing: '0.07em', color: 'var(--fg-subtle)', textTransform: 'uppercase', padding: '4px 10px', marginBottom: 2 }}>
                Workspace
              </p>
              {NAV_ITEMS.map(item => <SidebarItem key={item.href} {...item} />)}
            </div>
          )}
        </nav>

        {/* Bottom: Settings + User */}
        <div style={{
          padding: collapsed ? '8px 6px' : '8px 12px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          {!collapsed ? (
            <>
              <NavLink to="/app/settings" style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 9,
                height: 32, padding: '0 10px', borderRadius: 6,
                fontSize: 13, fontWeight: isActive ? 500 : 400, letterSpacing: '-0.01em',
                textDecoration: 'none',
                color: isActive ? 'var(--fg)' : 'var(--fg-muted)',
                background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
                transition: 'color 0.15s, background 0.15s',
              })}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.65 }}>
                  <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                Settings
              </NavLink>

              {/* User row */}
              <button onClick={logout} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                height: 36, padding: '0 10px', borderRadius: 6,
                border: 'none', background: 'transparent', cursor: 'pointer', width: '100%',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #5e6ad2, #7170ff)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: '#fff' }}>R</span>
                </div>
                <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--fg)', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>raaj</p>
                  <p style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>raaj@acme.dev</p>
                </div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--fg-subtle)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
              <NavLink to="/app/settings" title="Settings" style={{ width: 36, height: 36, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-muted)', textDecoration: 'none' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </NavLink>
              <button onClick={logout} style={{ width: 36, height: 36, borderRadius: 7, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg, #5e6ad2, #7170ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>R</span>
                </div>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
