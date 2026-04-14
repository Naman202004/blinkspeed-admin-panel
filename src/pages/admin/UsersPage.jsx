export function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Users</h1>
        <p className="mt-1 text-slate-400">
          Manage admin and application users. Wire this to your Nest user APIs when
          ready.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
        <div className="border-b border-slate-800 px-4 py-3">
          <p className="text-sm font-medium text-slate-300">Directory</p>
        </div>
        <div className="p-8 text-center text-sm text-slate-500">
          No user list endpoint connected yet. Add a backend route (e.g.{' '}
          <code className="text-slate-400">GET /api/users</code>) and render a
          table here.
        </div>
      </div>
    </div>
  )
}
