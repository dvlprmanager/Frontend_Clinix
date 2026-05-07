import { clearAccessToken, getAccessToken, setAccessToken } from './auth-storage.js'

const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3000`
let refreshPromise = null

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const isJson = response.headers.get('content-type')?.includes('application/json')
      const payload = isJson ? await response.json() : null
      if (!response.ok || !payload?.accessToken) {
        clearAccessToken()
        window.dispatchEvent(new CustomEvent('auth:session-expired'))
        const backendMessage = payload?.message || payload?.error?.message
        throw new Error(backendMessage || 'Sesion expirada')
      }

      setAccessToken(payload.accessToken)
      return payload.accessToken
    })().finally(() => {
      refreshPromise = null
    })
  }

  return refreshPromise
}

export async function apiRequest(path, options = {}) {
  const makeRequest = async () => {
    const headers = new Headers(options.headers || {})
    const isFormData = options.body instanceof FormData
    if (!isFormData && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }

    const token = getAccessToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    })

    const isJson = response.headers.get('content-type')?.includes('application/json')
    const payload = isJson ? await response.json() : null
    return { response, payload }
  }

  let { response, payload } = await makeRequest()

  const shouldTryRefresh =
    response.status === 401 &&
    !String(path).startsWith('/api/auth/login') &&
    !String(path).startsWith('/api/auth/refresh') &&
    !String(path).startsWith('/api/auth/logout')

  if (shouldTryRefresh) {
    try {
      await refreshAccessToken()
      ;({ response, payload } = await makeRequest())
    } catch {
      clearAccessToken()
      window.dispatchEvent(new CustomEvent('auth:session-expired'))
    }
  }

  if (!response.ok) {
    const backendMessage = payload?.message || payload?.error?.message
    const error = new Error(backendMessage || `Request failed with status ${response.status}`)
    error.status = response.status
    throw error
  }

  return payload
}

export async function logoutSession() {
  await fetch(`${API_URL}/api/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  })
}
