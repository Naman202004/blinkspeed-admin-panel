import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const nav = [
  { to: '/', label: 'Dashboard', end: true, icon: '◆' },
  { to: '/users', label: 'Users', icon: '◎' },
  { to: '/oauth', label: 'Social login', icon: '🔗' },
  { to: '/pricing', label: 'Pricing plans', icon: '$' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
]

export function AdminLayout() {
  const navigate = useNavigate()
  const { session, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const linkClass = ({ isActive }) =>
    [
      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
      isActive
        ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
        : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200 border border-transparent',
    ].join(' ')

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Mobile overlay */}
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      {/* Sidebar */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-800 bg-slate-900/95 backdrop-blur-sm transition-transform lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        <div className="flex h-14 items-center gap-2 border-b border-slate-800 px-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-violet-600 text-sm font-bold text-white">
            B
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-white">Blinkspeed</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              Admin
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 p-3">
          {nav.map((item) => (
            <NavLink
              key={item.to + item.label}
              to={item.to}
              end={item.end}
              className={linkClass}
              onClick={() => setMobileOpen(false)}
            >
              <span className="w-5 text-center text-slate-500">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-800 p-3">
          <p className="truncate px-3 text-xs text-slate-500" title={session?.user?.email}>
            {session?.user?.email}
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-2 w-full rounded-lg border border-slate-700 px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-800"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-slate-800 bg-slate-950/90 px-4 backdrop-blur-sm lg:px-8">
          <button
            type="button"
            className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:bg-slate-800 lg:hidden"
            onClick={() => setMobileOpen((o) => !o)}
            aria-expanded={mobileOpen}
            aria-label="Toggle navigation"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="hidden min-w-0 flex-1 lg:block" />
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <span className="hidden truncate sm:inline max-w-[200px]" title={session?.user?.email}>
              {session?.user?.fullName || session?.user?.email}
            </span>
          </div>
        </header>

        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
