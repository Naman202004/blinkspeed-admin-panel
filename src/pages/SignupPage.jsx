import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export function SignupPage() {
  const navigate = useNavigate()
  const { signup } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      await signup({
        email,
        password,
        fullName: fullName.trim() || undefined,
      })
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-white">Create account</h2>
        <p className="text-slate-400 text-sm mt-1">
          Register a new admin user (stored in your backend database).
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm">
          <span className="text-slate-400">Full name (optional)</span>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            autoComplete="name"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-400">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            autoComplete="email"
            required
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-400">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            autoComplete="new-password"
            minLength={8}
            required
          />
          <span className="text-xs text-slate-500 mt-1 block">
            At least 8 characters
          </span>
        </label>
        <label className="block text-sm">
          <span className="text-slate-400">Confirm password</span>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            autoComplete="new-password"
            required
          />
        </label>
        {error && (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 py-2.5 text-sm font-medium"
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="text-sm text-slate-500 text-center">
        Already have an account?{' '}
        <Link to="/login" className="text-sky-400 hover:text-sky-300 font-medium">
          Sign in
        </Link>
      </p>
    </div>
  )
}
