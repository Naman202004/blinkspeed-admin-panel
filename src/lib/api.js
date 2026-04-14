/** Base URL for the API (no trailing slash). If unset, requests use relative `/api/...` (Vite dev `server.proxy` or same-origin deploy). Set to `http://localhost:3000` if the dev proxy is not forwarding to Nest. */
const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export function apiUrl(path) {
  if (path.startsWith('http')) return path
  return `${API_BASE}${path}`
}

export async function api(path, options = {}) {
  return fetch(apiUrl(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}

export function formatApiError(data) {
  if (Array.isArray(data.message)) return data.message.join(', ')
  if (typeof data.message === 'string') return data.message
  return 'Request failed'
}
