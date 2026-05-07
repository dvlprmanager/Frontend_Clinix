import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CatalogPage } from '@/shared/components/catalog/catalog-page'
import { patientsCatalogConfig } from '@/features/patients/patients.config'
import { AssignPatientDoctorsDialog } from '@/features/patients/assign-patient-doctors-dialog'
import { listAssignableDoctors, replacePatientDoctors } from '@/shared/api/patients-api'
import { createCatalogItem } from '@/shared/api/catalog-api'
import { hasPermission } from '@/utils/permissions'
import { useAuth } from '@/features/auth/use-auth'

export function PatientsPage({ session }) {
  const auth = useAuth()
  const resolvedSession = session || auth?.session
  const canManagePatients = hasPermission(resolvedSession, 'PATIENTS_WRITE')
  const roleCodes = Array.isArray(resolvedSession?.roles) ? resolvedSession.roles : []
  const hideDoctorsColumn = roleCodes.includes('DOCTOR') || roleCodes.includes('RECEPCION')
  const doctorsQuery = useQuery({
    queryKey: ['doctor-profiles', 'assignable'],
    queryFn: () => listAssignableDoctors(),
    enabled: canManagePatients,
  })
  const assignableDoctors = doctorsQuery.data?.data || []

  const config = useMemo(() => {
    const doctorField = {
      name: 'doctor_user_id',
      label: 'Doctor asignado',
      type: 'select',
      required: assignableDoctors.length > 0,
      requiredMessage: 'Debes asignar un doctor al registrar paciente',
      hideOnEdit: true,
      options: assignableDoctors.map((doctor) => ({
        value: doctor.user_id,
        label: `${`${doctor.nombres || ''} ${doctor.apellidos || ''}`.trim() || doctor.username}${doctor.specialty_name ? ` • ${doctor.specialty_name}` : ''}`,
      })),
      placeholder: assignableDoctors.length > 0 ? 'Selecciona doctor' : 'No hay doctores activos',
    }

    return {
      ...patientsCatalogConfig,
      columns: hideDoctorsColumn
        ? patientsCatalogConfig.columns.filter((column) => column.key !== 'assigned_doctors')
        : patientsCatalogConfig.columns,
      formFields: [...patientsCatalogConfig.formFields, doctorField],
      customCreate: async (values) => {
        const { doctor_user_id: doctorUserId, ...patientPayload } = values
        const response = await createCatalogItem('patients', patientPayload)
        const patientId = response?.data?.id || response?.id
        if (patientId && doctorUserId) {
          await replacePatientDoctors(patientId, [doctorUserId])
        }
      },
      renderCustomRowActions: canManagePatients
        ? (record) => (
            <AssignPatientDoctorsDialog
              patientId={record.id}
              patientLabel={`${record.nombres || ''} ${record.apellidos || ''}`.trim()}
            />
          )
        : undefined,
    }
  }, [assignableDoctors, canManagePatients, hideDoctorsColumn])

  return (
    <CatalogPage config={config} />
  )
}
