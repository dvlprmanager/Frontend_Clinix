import { apiRequest } from '@/utils/api-client'

export async function listRoles() {
  return apiRequest('/api/access/roles')
}

export async function listPermissions() {
  return apiRequest('/api/access/permissions')
}

export async function getUserAccess(userId) {
  return apiRequest(`/api/access/users/${userId}`)
}

export async function updateUserRoles(userId, roleCodes) {
  return apiRequest(`/api/access/users/${userId}/roles`, {
    method: 'PUT',
    body: JSON.stringify({ roleCodes }),
  })
}

export async function updateUserPermissions(userId, permissions) {
  return apiRequest(`/api/access/users/${userId}/permissions`, {
    method: 'PUT',
    body: JSON.stringify({ permissions }),
  })
}

export async function getRolePermissions(roleId) {
  return apiRequest(`/api/access/roles/${roleId}/permissions`)
}

export async function updateRolePermissions(roleId, permissionCodes) {
  return apiRequest(`/api/access/roles/${roleId}/permissions`, {
    method: 'PUT',
    body: JSON.stringify({ permissionCodes }),
  })
}
