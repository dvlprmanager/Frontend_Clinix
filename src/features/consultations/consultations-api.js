import { apiRequest } from '@/utils/api-client'
import { downloadPdfReport, openPdfReportViewer } from '@/shared/utils/export-pdf'
import { downloadExcelReport } from '@/shared/utils/export-excel'

export async function getConsultationsLookups() {
  return apiRequest('/api/consultations/lookups')
}

export async function getPatientConsultationHistory(patientId) {
  return apiRequest(`/api/consultations/patients/${patientId}/history`)
}

export async function getPatientClinicalFiles(patientId) {
  return apiRequest(`/api/consultations/patients/${patientId}/files`)
}

export async function getPatientClinicalFilesPaginated(patientId, query = {}) {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    params.set(key, String(value))
  })
  return apiRequest(`/api/consultations/patients/${patientId}/files${params.toString() ? `?${params.toString()}` : ''}`)
}

export async function getClinicalFileLookups() {
  return apiRequest('/api/consultations/files/lookups')
}

export async function updateClinicalFile(fileId, payload) {
  return apiRequest(`/api/consultations/files/${fileId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function updateClinicalFileStatus(fileId, estatus) {
  return apiRequest(`/api/consultations/files/${fileId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ estatus }),
  })
}

export async function registerClinicalFileAccess(fileId, accessType) {
  return apiRequest(`/api/consultations/files/${fileId}/access`, {
    method: 'POST',
    body: JSON.stringify({ accessType }),
  })
}

export async function listAppointmentsForConsultation(query = {}) {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    params.set(key, String(value))
  })
  return apiRequest(`/api/consultations/appointments${params.toString() ? `?${params.toString()}` : ''}`)
}

export async function getConsultationByAppointment(appointmentId) {
  return apiRequest(`/api/consultations/by-appointment/${appointmentId}`)
}

export async function saveConsultationByAppointment(appointmentId, payload) {
  return apiRequest(`/api/consultations/by-appointment/${appointmentId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function uploadClinicalFileByAppointment(appointmentId, payload) {
  const formData = new FormData()
  if (payload.file) formData.append('file', payload.file)
  if (payload.title) formData.append('title', payload.title)
  if (payload.description) formData.append('description', payload.description)
  if (payload.exam_date) formData.append('exam_date', payload.exam_date)
  if (payload.file_type_id) formData.append('file_type_id', payload.file_type_id)
  if (payload.storage_provider_id) formData.append('storage_provider_id', payload.storage_provider_id)

  return apiRequest(`/api/consultations/by-appointment/${appointmentId}/files`, {
    method: 'POST',
    body: formData,
  })
}

export async function downloadConsultationPrescriptionPdf(appointmentId) {
  return downloadPdfReport({
    path: `/api/consultations/by-appointment/${appointmentId}/report/pdf`,
    fallbackFilename: 'consulta-receta.pdf',
  })
}

export async function downloadConsultationPrescriptionExcel(appointmentId) {
  return downloadExcelReport({
    path: `/api/consultations/by-appointment/${appointmentId}/report/excel`,
    fallbackFilename: 'consulta-receta.xlsx',
  })
}

export async function downloadPrescriptionPdf(appointmentId) {
  return downloadPdfReport({
    path: `/api/consultations/by-appointment/${appointmentId}/prescription/pdf`,
    fallbackFilename: 'receta.pdf',
  })
}

export async function previewPrescriptionPdf(appointmentId) {
  return openPdfReportViewer({
    path: `/api/consultations/by-appointment/${appointmentId}/prescription/pdf`,
    fallbackFilename: 'receta.pdf',
  })
}
