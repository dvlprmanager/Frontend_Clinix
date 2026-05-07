const ACCESS_TOKEN_KEY = 'erp_health_access_token'

export function getAccessToken() {
  const localToken = localStorage.getItem(ACCESS_TOKEN_KEY)
  if (localToken) return localToken

  // Backward compatibility: migrate previous sessionStorage token to localStorage.
  const sessionToken = sessionStorage.getItem(ACCESS_TOKEN_KEY)
  if (!sessionToken) return null

  localStorage.setItem(ACCESS_TOKEN_KEY, sessionToken)
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  return sessionToken
}

export function setAccessToken(token) {
  if (!token) {
    clearAccessToken()
    return
  }
  localStorage.setItem(ACCESS_TOKEN_KEY, token)
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
}

export function clearAccessToken() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
}
