import { useCallback, useEffect, useState } from 'react'
import { api, formatApiError } from '../../lib/api.js'
import { useAuth } from '../../context/AuthContext.jsx'

const LABELS = {
  google: 'Google',
  linkedin: 'LinkedIn',
  github: 'GitHub',
  facebook: 'Facebook',
}

const emptyForms = () =>
  Object.fromEntries(
    Object.keys(LABELS).map((k) => [k, { clientId: '', clientSecret: '' }]),
  )

export function OauthSettingsPage() {
  const { session } = useAuth()
  const [toggles, setToggles] = useState({})
  const [hints, setHints] = useState({})
  const [forms, setForms] = useState(emptyForms)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [notice, setNotice] = useState(null)
  const [redirectUrls, setRedirectUrls] = useState({})

  const authHeaders = {
    Authorization: session?.token ? `Bearer ${session.token}` : '',
  }

  const load = useCallback(async () => {
    if (!session?.token) return
    setError(null)
    setLoading(true)
    try {
      const res = await api('/api/admin/oauth-providers', { headers: authHeaders })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(formatApiError(data))
      setToggles(data.providers ?? {})
      setHints(data.credentialHints ?? {})
      setRedirectUrls(data.redirectUrls ?? {})
      setForms(emptyForms())
      setNotice(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [session?.token])

  useEffect(() => {
    load()
  }, [load])

  function setForm(provider, field, value) {
    setForms((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], [field]: value },
    }))
  }

  async function save() {
    if (!session?.token) return
    setSaving(true)
    setMessage(null)
    setError(null)
    setNotice(null)
    try {
      const body = {
        google: !!toggles.google,
        linkedin: !!toggles.linkedin,
        github: !!toggles.github,
        facebook: !!toggles.facebook,
      }
      const credentials = {}
      for (const id of Object.keys(LABELS)) {
        const f = forms[id]
        if (!f) continue
        const c = {}
        if (f.clientId.trim() !== '') c.clientId = f.clientId.trim()
        if (f.clientSecret.trim() !== '') c.clientSecret = f.clientSecret.trim()
        if (Object.keys(c).length > 0) credentials[id] = c
      }
      if (Object.keys(credentials).length > 0) {
        body.credentials = credentials
      }

      const res = await api('/api/admin/oauth-providers', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(formatApiError(data))
      setToggles(data.providers ?? toggles)
      setHints(data.credentialHints ?? hints)
      setRedirectUrls(data.redirectUrls ?? {})
      setForms(emptyForms())
      setMessage('Saved.')
      if (data.notice) setNotice(data.notice)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function clearStoredKeys(provider) {
    if (!session?.token) return
    setSaving(true)
    setError(null)
    setMessage(null)
    setNotice(null)
    try {
      const res = await api('/api/admin/oauth-providers', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          credentials: {
            [provider]: { clientId: '', clientSecret: '' },
          },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(formatApiError(data))
      setHints(data.credentialHints ?? {})
      setRedirectUrls(data.redirectUrls ?? {})
      setMessage(`Cleared ${LABELS[provider] ?? provider} keys.`)
      if (data.notice) setNotice(data.notice)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setSaving(false)
    }
  }

  function toggle(key) {
    setToggles((prev) => ({ ...prev, [key]: !prev?.[key] }))
  }

  if (!session?.token) {
    return null
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold text-white">Customer social login</h1>
        <p className="mt-1 text-slate-400 text-sm">
          Turn providers on or off for the customer app, and store OAuth Client ID and Client Secret
          here. Secrets are encrypted using <code className="text-slate-300">JWT_SECRET</code> (or
          optionally <code className="text-slate-300">OAUTH_CREDENTIALS_KEY</code> as 64 hex chars).
          Google, GitHub, Facebook, and LinkedIn pick up dashboard keys on the next sign-in (no API
          restart). Restart the API after editing <code className="text-slate-300">.env</code> on disk.
          If Google shows &quot;The OAuth client was deleted&quot; (401 deleted_client), that
          Client ID was removed in Google Cloud Console — create a new OAuth 2.0 Client ID there,
          add the redirect URL below to it, then paste the new ID and secret here and save.
        </p>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading…</p>
      ) : (
        <div className="space-y-4">
          {Object.keys(LABELS).map((key) => {
            const hint = hints[key] ?? {}
            return (
              <div
                key={key}
                className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-200 font-medium">{LABELS[key]}</span>
                  <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                    <span>Show on login</span>
                    <input
                      type="checkbox"
                      checked={!!toggles?.[key]}
                      onChange={() => toggle(key)}
                      className="h-4 w-4 rounded border-slate-600"
                    />
                  </label>
                </div>
                {redirectUrls[key] ? (
                  <p className="text-[11px] leading-snug text-slate-500 break-all font-mono">
                    <span className="font-sans text-slate-400">Redirect URL: </span>
                    {redirectUrls[key]}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2 text-xs">
                  {hint.hasClientId ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                      Client ID saved
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      No Client ID in dashboard
                    </span>
                  )}
                  {hint.hasClientSecret ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                      Client secret saved
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      No client secret in dashboard
                    </span>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-1">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Client ID</label>
                    <input
                      type="text"
                      autoComplete="off"
                      value={forms[key]?.clientId ?? ''}
                      onChange={(e) => setForm(key, 'clientId', e.target.value)}
                      placeholder="Paste Client ID to save or replace"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Client secret</label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={forms[key]?.clientSecret ?? ''}
                      onChange={(e) => setForm(key, 'clientSecret', e.target.value)}
                      placeholder="Leave blank to keep existing; enter new to replace"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>
                {hint.hasClientId || hint.hasClientSecret ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => clearStoredKeys(key)}
                    className="text-xs text-amber-400/90 hover:text-amber-300 underline disabled:opacity-50"
                  >
                    Remove dashboard-stored ID and secret for {LABELS[key]}
                  </button>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
      {notice ? (
        <p className="text-sm text-amber-200/90 border border-amber-800/50 rounded-lg px-3 py-2 bg-amber-950/30">
          {notice}
        </p>
      ) : null}

      <button
        type="button"
        onClick={save}
        disabled={saving || loading}
        className="rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 px-4 py-2 text-sm font-medium"
      >
        {saving ? 'Saving…' : 'Save settings & keys'}
      </button>

      <p className="text-xs text-slate-500">
        You can set <code className="text-slate-400">GOOGLE_CLIENT_ID</code> and similar in{' '}
        <code className="text-slate-400">.env</code>; restart the API after editing{' '}
        <code className="text-slate-400">.env</code>. If both dashboard and <code className="text-slate-400">.env</code>{' '}
        define a key, the latest dashboard save is applied when a user starts OAuth. Remove stale
        keys from <code className="text-slate-400">.env</code> if they point to a deleted Google/Facebook
        client. Register each redirect URL in the provider console (API base:{' '}
        <code className="text-slate-400">PUBLIC_API_URL</code> / port 3000 locally).
      </p>
    </div>
  )
}
