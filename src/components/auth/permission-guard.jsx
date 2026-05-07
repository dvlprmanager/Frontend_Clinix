import { hasAllPermissions } from '@/utils/permissions'

export function PermissionGuard({ session, requiredPermissions = [], fallback = null, children }) {
  if (!hasAllPermissions(session, requiredPermissions)) {
    return fallback
  }

  return children
}
