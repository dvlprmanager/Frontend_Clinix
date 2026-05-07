import { apiRequest } from '@/utils/api-client'

function toQueryString(params = {}) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}

export async function getDashboardOverview(params = {}) {
  const query = toQueryString(params)
  return apiRequest(`/api/dashboard/overview${query}`)
}
