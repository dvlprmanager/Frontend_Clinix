import { apiRequest } from '@/utils/api-client'

function toQueryString(params = {}) {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    searchParams.set(key, String(value))
  })
  const encoded = searchParams.toString()
  return encoded ? `?${encoded}` : ''
}

export async function getCashRegisterCurrent() {
  return apiRequest('/api/cash-register/current')
}

export async function listCashRegisterSessions(query = {}) {
  return apiRequest(`/api/cash-register/sessions${toQueryString(query)}`)
}

export async function getCashRegisterReport(query = {}) {
  return apiRequest(`/api/cash-register/report${toQueryString(query)}`)
}

export async function listCashRegisterCuts(query = {}) {
  return apiRequest(`/api/cash-register/cuts${toQueryString(query)}`)
}

export async function openCashRegister(payload) {
  return apiRequest('/api/cash-register/open', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function closeCashRegister(payload) {
  return apiRequest('/api/cash-register/close', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function createCashRegisterCut(payload) {
  return apiRequest('/api/cash-register/cut', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
