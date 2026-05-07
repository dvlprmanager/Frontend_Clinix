export function hasPermission(session, permission) {
  if (!permission) return true
  const permissions = session?.permissions || []
  return permissions.includes(permission)
}

export function hasAllPermissions(session, requiredPermissions = []) {
  if (!Array.isArray(requiredPermissions) || requiredPermissions.length === 0) return true
  return requiredPermissions.every((permission) => hasPermission(session, permission))
}
