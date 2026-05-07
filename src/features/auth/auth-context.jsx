import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { apiRequest, logoutSession } from '@/utils/api-client'
import { clearAccessToken, getAccessToken, setAccessToken } from '@/utils/auth-storage'
import { logger } from '@/utils/logger'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getAccessToken())
  const [session, setSession] = useState(null)
  const [isSessionLoading, setIsSessionLoading] = useState(Boolean(getAccessToken()))
  const [temporaryPassword, setTemporaryPassword] = useState('')

  const clearSessionState = useCallback(() => {
    clearAccessToken()
    setToken(null)
    setSession(null)
    setTemporaryPassword('')
    setIsSessionLoading(false)
  }, [])

  const loadSession = useCallback(async () => {
    if (!getAccessToken()) {
      setSession(null)
      setIsSessionLoading(false)
      return null
    }

    setIsSessionLoading(true)
    try {
      const data = await apiRequest('/api/auth/me')
      setSession(data.auth)
      return data.auth
    } catch (error) {
      clearSessionState()
      throw error
    } finally {
      setIsSessionLoading(false)
    }
  }, [clearSessionState])

  useEffect(() => {
    if (!token) {
      setSession(null)
      setIsSessionLoading(false)
      return
    }

    loadSession().catch((error) => {
      logger.warn('session_restore_failed', { message: error.message })
      toast.error('No se pudo recuperar la sesion')
    })
  }, [loadSession, token])

  useEffect(() => {
    const onSessionExpired = () => {
      clearSessionState()
      toast.error('Tu sesion expiro, inicia sesion nuevamente')
    }

    window.addEventListener('auth:session-expired', onSessionExpired)
    return () => window.removeEventListener('auth:session-expired', onSessionExpired)
  }, [clearSessionState])

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== 'erp_health_access_token') return
      const nextToken = event.newValue || null
      setToken((currentToken) => (currentToken === nextToken ? currentToken : nextToken))
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const login = useCallback(async ({ clinicCode, username, password }) => {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ clinicCode, username, password }),
    })

    setAccessToken(data.accessToken)
    setToken(data.accessToken)
    setTemporaryPassword(password || '')
    setIsSessionLoading(true)

    if (data.mustChangePassword) {
      toast.info('Debes cambiar tu contraseña temporal para continuar')
    }
    logger.info('login_success', { username, clinicCode })
    toast.success('Sesion iniciada correctamente')

    return data
  }, [])

  const logout = useCallback(async () => {
    await logoutSession().catch(() => null)
    clearSessionState()
    logger.info('logout_success')
    toast.info('Sesion cerrada')
  }, [clearSessionState])

  const changePassword = useCallback(async ({ currentPassword, newPassword }) => {
    const data = await apiRequest('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    })

    if (data?.accessToken) {
      setAccessToken(data.accessToken)
      setToken(data.accessToken)
    }
    setSession((previous) => (previous ? { ...previous, mustChangePassword: false } : previous))
    setTemporaryPassword('')
    toast.success('Contraseña actualizada correctamente')
    return data
  }, [])

  const value = useMemo(
    () => ({
      token,
      session,
      isAuthenticated: Boolean(session),
      isSessionLoading,
      temporaryPassword,
      login,
      logout,
      changePassword,
      refreshSession: loadSession,
    }),
    [token, session, isSessionLoading, temporaryPassword, login, logout, changePassword, loadSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthContext }
