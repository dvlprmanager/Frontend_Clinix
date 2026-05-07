import { apiRequest } from '@/utils/api-client'

export async function getAppointmentsLookups() {
  return apiRequest('/api/appointments/lookups')
}

export async function listAppointments({ page = 1, pageSize = 10, q = '', sortBy = 'start_at', sortDir = 'desc', filters = {} } = {}) {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('pageSize', String(pageSize))
  params.set('sortBy', String(sortBy))
  params.set('sortDir', String(sortDir))
  if (q?.trim()) params.set('q', q.trim())
  if (filters && Object.keys(filters).length > 0) {
    params.set('filters', JSON.stringify(filters))
  }
  return apiRequest(`/api/appointments?${params.toString()}`)
}

export async function listAppointmentsByRange({ dateFrom, dateTo }) {
  const filters = {
    date_from: dateFrom,
    date_to: dateTo,
    estatus: 1,
  }

  const pageSize = 100
  const firstPage = await listAppointments({
    page: 1,
    pageSize,
    sortBy: 'start_at',
    sortDir: 'asc',
    filters,
  })

  const allRows = Array.isArray(firstPage?.data) ? [...firstPage.data] : []
  const totalPages = Math.max(1, Number(firstPage?.meta?.totalPages || 1))

  for (let page = 2; page <= totalPages; page += 1) {
    const nextPage = await listAppointments({
      page,
      pageSize,
      sortBy: 'start_at',
      sortDir: 'asc',
      filters,
    })
    const rows = Array.isArray(nextPage?.data) ? nextPage.data : []
    allRows.push(...rows)
  }

  return {
    data: allRows,
    meta: {
      page: 1,
      pageSize,
      total: allRows.length,
      totalPages,
      hasNext: false,
      hasPrev: false,
      sortBy: 'start_at',
      sortDir: 'asc',
      filters,
    },
  }
}

export async function createAppointment(payload) {
  return apiRequest('/api/appointments', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getAppointmentById(appointmentId) {
  return apiRequest(`/api/appointments/${appointmentId}`)
}

export async function updateAppointment(appointmentId, payload) {
  return apiRequest(`/api/appointments/${appointmentId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function cancelAppointment(appointmentId, cancelReason) {
  return apiRequest(`/api/appointments/${appointmentId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({
      cancel_reason: cancelReason,
    }),
  })
}
