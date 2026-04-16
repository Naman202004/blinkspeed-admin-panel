import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, formatApiError } from '../../lib/api.js'
import { useAuth } from '../../context/AuthContext.jsx'

const EMPTY = {
  id: '',
  name: '',
  monthlyPrice: 0,
  yearlyPricePerMonth: 0,
  blurb: '',
  note: '',
  sortOrder: 0,
  active: true,
}

const STRIPE_MODE = import.meta.env.VITE_STRIPE_MODE === 'live' ? 'live' : 'test'

function parsePlanNote(note) {
  const raw = String(note ?? '').trim()
  if (!raw) {
    return {
      meta: {
        mostPopular: false,
        websites: '',
        pageviews: '',
        cdnGB: '',
        teamMembers: '',
      },
      featuresText: '',
      rawNote: '',
    }
  }

  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const meta = {
    mostPopular: false,
    websites: '',
    pageviews: '',
    cdnGB: '',
    teamMembers: '',
  }

  let i = 0
  for (; i < lines.length; i++) {
    const line = lines[i]
    if (line === '---') {
      i++
      break
    }
    if (!line.startsWith('@')) break
    const m = /^@([a-zA-Z0-9_]+)\s*:\s*(.*)$/.exec(line)
    if (!m) break
    const key = m[1]
    const value = m[2]
    if (key === 'mostPopular') meta.mostPopular = /^(1|true|yes)$/i.test(String(value).trim())
    if (key === 'websites') meta.websites = value
    if (key === 'pageviews') meta.pageviews = value
    if (key === 'cdnGB') meta.cdnGB = value
    if (key === 'teamMembers') meta.teamMembers = value
  }

  const featuresText = lines
    .slice(i)
    .map((l) => l.replace(/^\s*[-•]\s*/, '').trim())
    .filter(Boolean)
    .join('\n')

  // Back-compat: old single-line notes become a single feature.
  const rawNote = raw
  if (!featuresText && rawNote && !rawNote.startsWith('@')) {
    return { meta, featuresText: rawNote, rawNote }
  }

  return { meta, featuresText, rawNote }
}

function buildPlanNote(meta, featuresText) {
  const features = String(featuresText ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const header = []
  if (meta?.mostPopular) header.push('@mostPopular:true')
  if (String(meta?.websites ?? '').trim()) header.push(`@websites:${String(meta.websites).trim()}`)
  if (String(meta?.pageviews ?? '').trim()) header.push(`@pageviews:${String(meta.pageviews).trim()}`)
  if (String(meta?.cdnGB ?? '').trim()) header.push(`@cdnGB:${String(meta.cdnGB).trim()}`)
  if (String(meta?.teamMembers ?? '').trim())
    header.push(`@teamMembers:${String(meta.teamMembers).trim()}`)

  if (!header.length) {
    return features.join('\n')
  }
  return [...header, '---', ...features].join('\n')
}

function isAdmin(session) {
  return Array.isArray(session?.user?.roles) && session.user.roles.includes('admin')
}

export function PricingPlansPage() {
  const { session } = useAuth()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState('')
  const [checkoutId, setCheckoutId] = useState('')
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [newPlan, setNewPlan] = useState(EMPTY)
  const [checkoutConfig, setCheckoutConfig] = useState(() => ({
    siteUrl: '',
    siteName: '',
    sitePlatform: 'other',
    yearly: true,
    currency: 'inr',
  }))

  const authHeaders = useMemo(
    () => ({
      Authorization: session?.token ? `Bearer ${session.token}` : '',
    }),
    [session?.token],
  )

  const load = useCallback(async () => {
    if (!session?.token) return
    setError(null)
    setMessage(null)
    setLoading(true)
    try {
      const res = await api('/api/admin/pricing/plans', { headers: authHeaders })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(formatApiError(data))
      setPlans(Array.isArray(data.plans) ? data.plans : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load plans')
    } finally {
      setLoading(false)
    }
  }, [session?.token])

  useEffect(() => {
    load()
  }, [load])

  async function savePlan(id, payload) {
    if (!session?.token) return
    setSavingId(id)
    setError(null)
    setMessage(null)
    try {
      const res = await api(`/api/admin/pricing/plans/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(formatApiError(data))
      setMessage('Saved.')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSavingId('')
    }
  }

  async function choosePlanForCheckout(planId) {
    if (!session?.token) return
    const siteUrl = String(checkoutConfig.siteUrl ?? '').trim()
    const siteName = String(checkoutConfig.siteName ?? '').trim()
    const sitePlatform = String(checkoutConfig.sitePlatform ?? 'other')
    if (!siteUrl || !siteName) {
      setError('Enter a Site URL and Site name in “Test checkout”.')
      return
    }
    setCheckoutId(planId)
    setError(null)
    setMessage(null)
    try {
      const res = await api('/api/stripe/checkout-session', {
        method: 'POST',
        headers: {
          ...authHeaders,
        },
        body: JSON.stringify({
          mode: STRIPE_MODE,
          currency: checkoutConfig.currency,
          planId,
          yearly: !!checkoutConfig.yearly,
          appUrl: window.location.origin,
          siteUrl,
          siteName,
          sitePlatform,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(formatApiError(data))
      if (!data.url) throw new Error('No checkout URL returned')
      window.location.assign(data.url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed')
    } finally {
      setCheckoutId('')
    }
  }

  if (!session?.token) return null

  if (!isAdmin(session)) {
    return (
      <div className="max-w-2xl space-y-2">
        <h1 className="text-2xl font-semibold text-white">Pricing plans</h1>
        <p className="text-slate-400 text-sm">You don’t have access to this page.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-white">Pricing plans</h1>
        <p className="mt-1 text-slate-400 text-sm">
          Edit plan name, prices, and text. This feeds the customer app pricing panel.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-lg border border-slate-700 bg-slate-900/40 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-emerald-400">{message}</p> : null}

      <div className="space-y-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
          <div>
            <h2 className="text-slate-200 font-medium">Test checkout</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Use “Choose” to open Stripe Checkout for a plan.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Site URL</label>
              <input
                value={checkoutConfig.siteUrl}
                onChange={(e) =>
                  setCheckoutConfig((s) => ({ ...s, siteUrl: e.target.value }))
                }
                placeholder="https://example.com"
                className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Site name</label>
              <input
                value={checkoutConfig.siteName}
                onChange={(e) =>
                  setCheckoutConfig((s) => ({ ...s, siteName: e.target.value }))
                }
                placeholder="Shown in Stripe metadata"
                className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Site platform</label>
              <select
                value={checkoutConfig.sitePlatform}
                onChange={(e) =>
                  setCheckoutConfig((s) => ({ ...s, sitePlatform: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="wordpress">WordPress</option>
                <option value="woocommerce">WooCommerce</option>
                <option value="magento">Magento</option>
                <option value="opencart">OpenCart</option>
                <option value="shopify">Shopify</option>
                <option value="custom">Custom HTML / other CMS</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Billing</label>
                <select
                  value={checkoutConfig.yearly ? 'yearly' : 'monthly'}
                  onChange={(e) =>
                    setCheckoutConfig((s) => ({ ...s, yearly: e.target.value === 'yearly' }))
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Currency</label>
                <select
                  value={checkoutConfig.currency}
                  onChange={(e) =>
                    setCheckoutConfig((s) => ({ ...s, currency: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="inr">INR</option>
                  <option value="usd">USD</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {plans.map((p) => (
          <PlanCard
            key={p.id}
            plan={p}
            saving={savingId === p.id}
            choosing={checkoutId === p.id}
            onChoose={() => choosePlanForCheckout(p.id)}
            onSave={(next) => savePlan(p.id, normalizePayload(next))}
          />
        ))}

        {!loading && plans.length === 0 ? (
          <p className="text-sm text-slate-500">No plans found.</p>
        ) : null}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-slate-200 font-medium">Create a new plan</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Use a stable ID like <code className="text-slate-300">pro</code> or{' '}
              <code className="text-slate-300">business</code>.
            </p>
          </div>
          <button
            type="button"
            disabled={!newPlan.id.trim() || savingId === '__new__'}
            onClick={() => savePlan(newPlan.id.trim(), normalizePayload(newPlan))}
            className="rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 px-4 py-2 text-sm font-medium"
          >
            Create / Update
          </button>
        </div>
        <PlanEditor value={newPlan} onChange={setNewPlan} showId />
      </div>
    </div>
  )
}

function normalizePayload(v) {
  return {
    name: String(v.name ?? ''),
    monthlyPrice: Number(v.monthlyPrice ?? 0),
    yearlyPricePerMonth: Number(v.yearlyPricePerMonth ?? 0),
    blurb: String(v.blurb ?? ''),
    note: String(v.note ?? ''),
    sortOrder: Number.isFinite(Number(v.sortOrder)) ? Number(v.sortOrder) : 0,
    active: !!v.active,
  }
}

function PlanCard({ plan, saving, choosing, onChoose, onSave }) {
  const [draft, setDraft] = useState(plan)
  useEffect(() => setDraft(plan), [plan])

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-slate-200 font-medium truncate">
            {plan.name}{' '}
            <span className="text-xs font-normal text-slate-500">({plan.id})</span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Active: {plan.active ? 'Yes' : 'No'} • Sort: {plan.sortOrder ?? 0}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onChoose}
            disabled={choosing || saving}
            className="rounded-lg border border-slate-700 bg-slate-950/40 hover:bg-slate-900 disabled:opacity-50 px-4 py-2 text-sm font-medium text-slate-100"
          >
            {choosing ? 'Opening…' : 'Choose'}
          </button>
          <button
            type="button"
            onClick={() => onSave(draft)}
            disabled={saving || choosing}
            className="rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 px-4 py-2 text-sm font-medium"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <PlanEditor value={draft} onChange={setDraft} />
    </div>
  )
}

function PlanEditor({ value, onChange, showId = false }) {
  const v = value ?? EMPTY
  const parsed = useMemo(() => parsePlanNote(v.note), [v.note])
  const [meta, setMeta] = useState(parsed.meta)
  const [featuresText, setFeaturesText] = useState(parsed.featuresText)

  useEffect(() => {
    setMeta(parsed.meta)
    setFeaturesText(parsed.featuresText)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed.rawNote])

  function commit(nextMeta, nextFeatures) {
    const note = buildPlanNote(nextMeta, nextFeatures)
    onChange({ ...v, note })
  }

  const inputClass =
    'w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500'
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {showId ? (
        <div>
          <label className="block text-xs text-slate-500 mb-1">ID</label>
          <input
            value={v.id}
            onChange={(e) => onChange({ ...v, id: e.target.value })}
            placeholder="e.g. pro"
            className={inputClass}
          />
        </div>
      ) : null}
      <div>
        <label className="block text-xs text-slate-500 mb-1">Name</label>
        <input
          value={v.name}
          onChange={(e) => onChange({ ...v, name: e.target.value })}
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Monthly price</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={v.monthlyPrice}
          onChange={(e) => onChange({ ...v, monthlyPrice: e.target.value })}
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Yearly price (per month)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={v.yearlyPricePerMonth}
          onChange={(e) => onChange({ ...v, yearlyPricePerMonth: e.target.value })}
          className={inputClass}
        />
      </div>
      <div className="sm:col-span-2">
        <label className="block text-xs text-slate-500 mb-1">Blurb</label>
        <input
          value={v.blurb}
          onChange={(e) => onChange({ ...v, blurb: e.target.value })}
          className={inputClass}
        />
      </div>

      <div className="sm:col-span-2 rounded-xl border border-slate-800 bg-slate-950/20 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-slate-200 font-medium">Card options</div>
            <div className="text-xs text-slate-500">
              These fields control the customer pricing cards.
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={!!meta.mostPopular}
              onChange={(e) => {
                const next = { ...meta, mostPopular: e.target.checked }
                setMeta(next)
                commit(next, featuresText)
              }}
              className="h-4 w-4 rounded border-slate-600"
            />
            Most popular badge
          </label>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Websites</label>
            <input
              inputMode="numeric"
              value={meta.websites}
              onChange={(e) => {
                const next = { ...meta, websites: e.target.value }
                setMeta(next)
                commit(next, featuresText)
              }}
              placeholder="e.g. 4"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Team members</label>
            <input
              inputMode="numeric"
              value={meta.teamMembers}
              onChange={(e) => {
                const next = { ...meta, teamMembers: e.target.value }
                setMeta(next)
                commit(next, featuresText)
              }}
              placeholder="e.g. 3"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Pageviews / month</label>
            <input
              inputMode="numeric"
              value={meta.pageviews}
              onChange={(e) => {
                const next = { ...meta, pageviews: e.target.value }
                setMeta(next)
                commit(next, featuresText)
              }}
              placeholder="e.g. 40000"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">CDN traffic (GB) / month</label>
            <input
              inputMode="decimal"
              value={meta.cdnGB}
              onChange={(e) => {
                const next = { ...meta, cdnGB: e.target.value }
                setMeta(next)
                commit(next, featuresText)
              }}
              placeholder="e.g. 25"
              className={inputClass}
            />
          </div>
        </div>

        <div className="mt-3">
          <label className="block text-xs text-slate-500 mb-1">Features (one per line)</label>
          <textarea
            value={featuresText}
            onChange={(e) => {
              const next = e.target.value
              setFeaturesText(next)
              commit(meta, next)
            }}
            placeholder={`All Optimization Modes\nImage Optimization\nCritical CSS`}
            className={inputClass + ' min-h-28'}
          />
          <div className="mt-2 text-[11px] text-slate-500">
            Saved into <span className="text-slate-300">Note</span> automatically.
          </div>
        </div>
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Sort order</label>
        <input
          type="number"
          step="1"
          value={v.sortOrder ?? 0}
          onChange={(e) => onChange({ ...v, sortOrder: e.target.value })}
          className={inputClass}
        />
      </div>
      <div className="flex items-end">
        <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={!!v.active}
            onChange={(e) => onChange({ ...v, active: e.target.checked })}
            className="h-4 w-4 rounded border-slate-600"
          />
          Active
        </label>
      </div>
    </div>
  )
}

