import { getAccessToken } from '@/utils/auth-storage'

const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3000`

function getFilenameFromHeaders(headers, fallback = 'reporte.pdf') {
  const contentDisposition = headers.get('content-disposition') || ''
  const match = contentDisposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i)
  if (!match?.[1]) return fallback
  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

async function buildError(response) {
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const payload = await response.json()
    return payload?.message || payload?.error?.message || 'No se pudo generar el PDF'
  }
  const text = await response.text()
  return text || 'No se pudo generar el PDF'
}

export async function downloadPdfReport({ path, fallbackFilename = 'reporte.pdf' }) {
  const token = getAccessToken()
  const response = await fetch(`${API_URL}${path}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(await buildError(response))
  }

  const blob = await response.blob()
  const filename = getFilenameFromHeaders(response.headers, fallbackFilename)
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  window.URL.revokeObjectURL(url)
}

export async function openPdfReportViewer({ path, fallbackFilename = 'reporte.pdf' }) {
  const token = getAccessToken()
  const response = await fetch(`${API_URL}${path}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(await buildError(response))
  }

  const blob = await response.blob()
  const filename = getFilenameFromHeaders(response.headers, fallbackFilename)
  const objectUrl = window.URL.createObjectURL(blob)
  return {
    filename,
    objectUrl,
    dispose: () => window.URL.revokeObjectURL(objectUrl),
  }
}
