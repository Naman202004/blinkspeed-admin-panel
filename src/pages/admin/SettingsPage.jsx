export function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="mt-1 text-slate-400">
          Organization and admin preferences. Extend with forms backed by your API.
        </p>
      </div>

      <div className="max-w-xl space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <label className="block text-sm">
          <span className="text-slate-400">Display name</span>
          <input
            type="text"
            disabled
            placeholder="Coming soon"
            className="mt-1 w-full cursor-not-allowed rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-slate-500"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-400">Notification email</span>
          <input
            type="email"
            disabled
            placeholder="Coming soon"
            className="mt-1 w-full cursor-not-allowed rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-slate-500"
          />
        </label>
        <p className="text-xs text-slate-500">
          Hook these fields to PATCH endpoints when you add profile settings on the
          backend.
        </p>
      </div>
    </div>
  )
}
