import { apiRequest } from '@/utils/api-client'
import { openPdfReportViewer } from '@/shared/utils/export-pdf'

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

export async function getInvoicesLookups() {
  return apiRequest('/api/invoices/lookups')
}

export async function listInvoices(query = {}) {
  return apiRequest(`/api/invoices${toQueryString(query)}`)
}

export async function getInvoiceById(id) {
  return apiRequest(`/api/invoices/${id}`)
}

export async function createInvoice(payload) {
  return apiRequest('/api/invoices', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateInvoice(id, payload) {
  return apiRequest(`/api/invoices/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function updateInvoiceStatus(id, invoiceStatusId) {
  return apiRequest(`/api/invoices/${id}/invoice-status`, {
    method: 'PATCH',
    body: JSON.stringify({ invoice_status_id: invoiceStatusId }),
  })
}

export async function patchInvoiceOperationalStatus(id, estatus) {
  return apiRequest(`/api/invoices/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ estatus }),
  })
}

export async function previewInvoicePdf(id) {
  return openPdfReportViewer({
    path: `/api/invoices/${id}/pdf`,
    fallbackFilename: 'factura.pdf',
  })
}
