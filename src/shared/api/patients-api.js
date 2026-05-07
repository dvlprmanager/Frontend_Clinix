import { apiRequest } from '@/utils/api-client'

export async function listAssignableDoctors(search = '') {
  const params = new URLSearchParams()
  if (search?.trim()) params.set('q', search.trim())
  const query = params.toString()
  return apiRequest(`/api/doctor-profiles/lookup/assignable${query ? `?${query}` : ''}`)
}

export async function listDoctorCandidateUsers(search = '') {
  const params = new URLSearchParams()
  if (search?.trim()) params.set('q', search.trim())
  const query = params.toString()
  return apiRequest(`/api/doctor-profiles/lookup/candidates${query ? `?${query}` : ''}`)
}

export async function listDoctorSpecialties() {
  return apiRequest('/api/doctor-profiles/lookup/specialties')
}

export async function getPatientDoctors(patientId) {
  return apiRequest(`/api/patients/${patientId}/doctors`)
}

export async function replacePatientDoctors(patientId, doctorUserIds) {
  return apiRequest(`/api/patients/${patientId}/doctors`, {
    method: 'PUT',
    body: JSON.stringify({
      doctor_user_ids: doctorUserIds,
    }),
  })
}
