import { useMemo, useState } from 'react'
import { StatCard } from '../../components/admin/StatCard.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { api, formatApiError } from '../../lib/api.js'

export function DashboardHomePage() {
  const { session } = useAuth()
  const [loading, setLoading] = useState(false)
  const [apiOk, setApiOk] = useState(null)
  const [error, setError] = useState(null)

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }, [])

  async function verifySession() {
    if (!session?.token) return
    setError(null)
    setLoading(true)
    setApiOk(null)
    try {
      const res = await api('/api/auth/me', {
        headers: { Authorization: `Bearer ${session.token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(formatApiError(data))
      setApiOk(data.user?.email ?? 'OK')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          {greeting}
          {session?.user?.fullName
            ? `, ${session.user.fullName.split(' ')[0]}`
            : ''}
        </h1>
        <p className="mt-1 text-slate-400">
          Here’s a quick overview of your Blinkspeed admin workspace.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Environment"
          value="Development"
          hint="Connect your metrics when APIs are ready"
          icon="◇"
        />
        <StatCard
          title="Account"
          value={session?.user?.email?.split('@')[0] ?? '—'}
          hint="Signed-in user"
          icon="◉"
        />
        <StatCard
          title="API session"
          value={apiOk ? 'Verified' : '—'}
          hint={apiOk ? apiOk : 'Ping /api/auth/me to test'}
          icon="✓"
        />
        <StatCard
          title="Roles"
          value="—"
          hint="RBAC wiring can populate this"
          icon="⚑"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Getting started
          </h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            <li className="flex gap-3">
              <span className="text-sky-400">1.</span>
              Keep the Nest API running on port 3000 (or set{' '}
              <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-sky-300">
                VITE_API_URL
              </code>
              ).
            </li>
            <li className="flex gap-3">
              <span className="text-sky-400">2.</span>
              Add list endpoints (users, roles) and bind real counts to the cards
              above.
            </li>
            <li className="flex gap-3">
              <span className="text-sky-400">3.</span>
              Replace placeholder pages under <strong>Users</strong> and{' '}
              <strong>Settings</strong> with your modules.
            </li>
          </ul>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            API check
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Confirms your JWT is accepted by the backend.
          </p>
          <button
            type="button"
            onClick={verifySession}
            disabled={loading}
            className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? 'Checking…' : 'Verify /api/auth/me'}
          </button>
          {apiOk && !error ? (
            <p className="mt-3 text-xs text-emerald-400/90">
              Session valid for {apiOk}
            </p>
          ) : null}
          {error ? (
            <p className="mt-3 text-xs text-red-400" role="alert">
              {error}
            </p>
          ) : null}
        </section>
      </div>
    </div>
  )
}
