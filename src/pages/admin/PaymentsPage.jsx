import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, formatApiError } from '../../lib/api.js'
import { useAuth } from '../../context/AuthContext.jsx'

function isAdmin(session) {
  return Array.isArray(session?.user?.roles) && session.user.roles.includes('admin')
}

export function PaymentsPage() {
  const { session } = useAuth()
  const [mode, setMode] = useState('test')
  const [method, setMethod] = useState('manual') // manual only (Stripe Connect removed)
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  const [publishableKey, setPublishableKey] = useState('')
  const [secretKey, setSecretKey] = useState('')

  const authHeaders = useMemo(
    () => ({
      Authorization: session?.token ? `Bearer ${session.token}` : '',
    }),
    [session?.token],
  )

  const loadStatus = useCallback(async () => {
    if (!session?.token) return
    setLoading(true)
    setError(null)
    try {
      const res = await api(`/api/stripe/status/${mode}`, {
        headers: authHeaders,
        cache: 'no-store',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(formatApiError(data))
      setStatus(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load status')
    } finally {
      setLoading(false)
    }
  }, [session?.token, mode])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  // Keep manual selected (Connect UI removed).
  useEffect(() => {
    setMethod('manual')
  }, [mode])

  async function saveManual() {
    if (!session?.token) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const res = await api('/api/stripe/manual', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ mode, publishableKey, secretKey }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(formatApiError(data))
      setMessage('Saved manual keys.')
      setSecretKey('')
      await loadStatus()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  // Stripe Connect (OAuth) UI removed.

  async function disconnect() {
    if (!session?.token) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const res = await api('/api/stripe/disconnect', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ mode }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(formatApiError(data))
      setMessage('Disconnected. You can connect again with manual keys.')
      setPublishableKey('')
      setSecretKey('')
      setMethod('manual')
      await loadStatus()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Disconnect failed')
    } finally {
      setSaving(false)
    }
  }


  if (!session?.token) return null
  if (!isAdmin(session)) {
    return (
      <div className="max-w-2xl space-y-2">
        <h1 className="text-2xl font-semibold text-white">Payments</h1>
        <p className="text-slate-400 text-sm">You don’t have access to this page.</p>
      </div>
    )
  }

  /** Only show status for the selected mode (avoids stale Test data when Live is selected). */
  const statusForMode =
    status && status.mode === mode ? status : null

  const modeMismatch = status && status.mode !== mode

  /** One clear line per state — avoids duplicate badges that looked the same every time. */
  const statusLine = (() => {
    if (!statusForMode) {
      if (loading || modeMismatch || !status) {
        return { primary: 'Loading…', detail: null, variant: 'neutral' }
      }
      return { primary: '—', detail: null, variant: 'neutral' }
    }
    const s = statusForMode
    const m = s.mode === 'live' ? 'Live' : 'Test'
    if (!s.isConnected) {
      return {
        primary: `❌ Not connected (${m} mode)`,
        detail: 'Save manual keys for this mode.',
        variant: 'bad',
      }
    }
    // Stripe Connect (OAuth) UI removed; treat OAuth connections as connected.
    if (s.connectionType === 'oauth') {
      return {
        primary: `✅ Connected — ${m} mode`,
        detail: null,
        variant: 'good',
      }
    }
    if (s.connectionType === 'manual') {
      return {
        primary: `✅ Connected via API keys (manual) — ${m} mode`,
        detail: null,
        variant: 'good',
      }
    }
    return {
      primary: `⚠️ Unknown state (${m} mode)`,
      detail: null,
      variant: 'neutral',
    }
  })()

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-white">Stripe payments</h1>
        <p className="mt-1 text-slate-400 text-sm">
          Configure Stripe in Test/Live mode using manual keys.
        </p>
        <p className="mt-2 text-xs text-slate-500 leading-relaxed rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2">
          <strong className="text-slate-300">Manual keys</strong> connect your Stripe account for API calls (subscriptions, charges).
        </p>
      </div>

      {/* Mode switch */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-slate-200 font-medium">Mode</div>
            <div className="text-xs text-slate-500 mt-0.5">Store separate credentials per mode.</div>
          </div>
          <div className="inline-flex rounded-lg border border-slate-700 bg-slate-950/30 p-1">
            {['test', 'live'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={[
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  mode === m ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800',
                ].join(' ')}
              >
                {m === 'test' ? 'Test' : 'Live'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-slate-200 font-medium">Status</div>
          <button
            type="button"
            onClick={loadStatus}
            disabled={loading}
            className="rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
        <div className="space-y-2">
          <p
            className={
              statusLine.variant === 'good'
                ? 'text-sm font-medium text-emerald-300'
                : statusLine.variant === 'bad'
                  ? 'text-sm font-medium text-slate-300'
                  : 'text-sm font-medium text-slate-200'
            }
          >
            {statusLine.primary}
          </p>
          {statusLine.detail ? (
            <p className="text-xs text-slate-500 leading-relaxed">{statusLine.detail}</p>
          ) : null}
          {/* Stripe Connect UI removed */}
        </div>
        {statusForMode?.isConnected ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={disconnect}
              disabled={saving}
              className="text-xs text-amber-400/90 hover:text-amber-300 underline disabled:opacity-50"
            >
              Disconnect Stripe
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            Not connected — enter manual keys below.
          </p>
        )}
      </div>

      {/* Connection method */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-4">
        <div>
          <div className="text-slate-200 font-medium">Connection method</div>
          <div className="text-xs text-slate-500 mt-0.5">
            Manual key setup.
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Publishable key</label>
              <input
                value={publishableKey}
                onChange={(e) => setPublishableKey(e.target.value)}
                placeholder="pk_test_... / pk_live_..."
                className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Secret key</label>
              <input
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="sk_test_... / sk_live_..."
                className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={saveManual}
            disabled={saving || !publishableKey.trim() || !secretKey.trim()}
            className="rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 px-4 py-2 text-sm font-medium"
          >
            {saving ? 'Saving…' : 'Save keys'}
          </button>
          <p className="text-xs text-slate-500">
            Secret keys are encrypted in the database and never sent to the frontend. Keys are validated
            with a real Stripe API call.
          </p>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
    </div>
  )
}

