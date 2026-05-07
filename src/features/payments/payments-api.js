import { apiRequest } from '@/utils/api-client'

function toQueryString(params = {}) {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    if (key === 'filters' && typeof value === 'object') {
      searchParams.set('filters', JSON.stringify(value))
      return
    }
    searchParams.set(key, String(value))
  })
  const encoded = searchParams.toString()
  return encoded ? `?${encoded}` : ''
}

export async function getPaymentsLookups() {
  return apiRequest('/api/payments/lookups')
}

export async function listPayments(query = {}) {
  return apiRequest(`/api/payments${toQueryString(query)}`)
}

export async function createPayment(payload) {
  return apiRequest('/api/payments', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updatePayment(id, payload) {
  return apiRequest(`/api/payments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function patchPaymentStatus(id, estatus) {
  return apiRequest(`/api/payments/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ estatus }),
  })
}
