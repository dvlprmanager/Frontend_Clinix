import { apiRequest } from '@/utils/api-client'

export function getClinicalShareLookups() {
  return apiRequest('/api/clinical-sharing/lookups')
}

export function listClinicalShares(params = {}) {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    searchParams.set(key, String(value))
  })
  const query = searchParams.toString()
  return apiRequest(`/api/clinical-sharing${query ? `?${query}` : ''}`)
}

export function createClinicalShare(payload) {
  return apiRequest('/api/clinical-sharing', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function revokeClinicalShare(id, payload = {}) {
  return apiRequest(`/api/clinical-sharing/${id}/revoke`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function verifyClinicalShareAccess(token, otpCode) {
  return apiRequest(`/api/clinical-sharing/access/${token}/verify`, {
    method: 'POST',
    body: JSON.stringify({ otp_code: otpCode }),
  })
}

export function getClinicalShareAccessData(token) {
  return apiRequest(`/api/clinical-sharing/access/${token}`)
}
