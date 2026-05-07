import { useEffect, useRef } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { hasAllPermissions } from '@/utils/permissions'
import { useAuth } from '@/features/auth/use-auth'

export function getDefaultAuthenticatedRoute(session) {
  const roles = session?.roles || []
  const permissions = session?.permissions || []

  if (roles.includes('ADMIN')) return '/dashboard'
  if (roles.includes('DOCTOR')) return '/dashboard'
  if (roles.includes('RECEPCION')) return '/dashboard'
  if (permissions.includes('REPORTS_READ')) return '/reports'
  if (permissions.includes('PATIENTS_READ')) return '/patients'
  if (permissions.includes('APPOINTMENTS_READ')) return '/appointments'
  if (permissions.includes('BILLING_READ')) return '/invoices'
  if (permissions.includes('CLINICAL_SHARE_READ')) return '/clinical-sharing'
  return '/login'
}

export function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return children
}

export function RequireNoAuth({ children }) {
  const { isAuthenticated, session } = useAuth()
  if (isAuthenticated) {
    if (session?.mustChangePassword) return <Navigate to="/change-password" replace />
    return <Navigate to={getDefaultAuthenticatedRoute(session)} replace />
  }
  return children
}

export function RequirePasswordChange({ children }) {
  const { session } = useAuth()
  if (!session?.mustChangePassword) {
    return <Navigate to={getDefaultAuthenticatedRoute(session)} replace />
  }
  return children
}

export function RedirectIfPasswordChangePending({ children }) {
  const { session } = useAuth()
  if (session?.mustChangePassword) {
    return <Navigate to="/change-password" replace />
  }
  return children
}

export function RequirePermissions({ requiredPermissions = [], children }) {
  const { session } = useAuth()
  const location = useLocation()
  const lastDeniedPathRef = useRef('')

  if (!hasAllPermissions(session, requiredPermissions)) {
    if (lastDeniedPathRef.current !== location.pathname) {
      lastDeniedPathRef.current = location.pathname
      setTimeout(() => {
        toast.error('No tienes permiso para acceder a esta sección')
      }, 0)
    }
    return <Navigate to={getDefaultAuthenticatedRoute(session)} replace />
  }

  return children
}

export function RequireRoles({ requiredRoles = [], children }) {
  const { session } = useAuth()
  const location = useLocation()
  const lastDeniedPathRef = useRef('')
  const roles = session?.roles || []
  const hasRole = requiredRoles.some((role) => roles.includes(role))

  if (!hasRole) {
    if (lastDeniedPathRef.current !== location.pathname) {
      lastDeniedPathRef.current = location.pathname
      setTimeout(() => {
        toast.error('No tienes permiso para acceder a esta sección')
      }, 0)
    }
    return <Navigate to={getDefaultAuthenticatedRoute(session)} replace />
  }

  return children
}
