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

export async function listCatalog(entity, query) {
  return apiRequest(`/api/${entity}${toQueryString(query)}`)
}

export async function createCatalogItem(entity, payload) {
  return apiRequest(`/api/${entity}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateCatalogItem(entity, id, payload) {
  return apiRequest(`/api/${entity}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteCatalogItem(entity, id) {
  return apiRequest(`/api/${entity}/${id}`, {
    method: 'DELETE',
  })
}

export async function patchCatalogItem(entity, id, payload) {
  return apiRequest(`/api/${entity}/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

