export function StatCard({ title, value, hint, icon }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {title}
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-white">
            {value}
          </p>
          {hint ? (
            <p className="mt-1 text-xs text-slate-500">{hint}</p>
          ) : null}
        </div>
        {icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800/80 text-lg text-slate-400">
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  )
}
