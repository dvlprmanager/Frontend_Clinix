import { CatalogPage } from '@/shared/components/catalog/catalog-page'
import { usersCatalogConfig } from '@/features/users/users.config'
import { AssignRolesDialog } from '@/features/users/assign-roles-dialog'
import { AssignPermissionsDialog } from '@/features/users/assign-permissions-dialog'
import { useAuth } from '@/features/auth/use-auth'
import { hasPermission } from '@/utils/permissions'
import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/utils/api-client'
import { listDoctorSpecialties } from '@/shared/api/patients-api'
import { listCatalog } from '@/shared/api/catalog-api'
import { toast } from 'sonner'

export function UsersPage({ session }) {
  const auth = useAuth()
  const resolvedSession = session || auth?.session
  const canManageAccess = hasPermission(resolvedSession, 'ACCESS_MANAGE')
  const canManageTenants = hasPermission(resolvedSession, 'TENANTS_MANAGE')
  const queryClient = useQueryClient()
  const specialtiesQuery = useQuery({
    queryKey: ['doctor-profiles', 'specialties'],
    queryFn: listDoctorSpecialties,
  })
  const tenantsQuery = useQuery({
    queryKey: ['tenants', 'employee-select'],
    queryFn: () =>
      listCatalog('tenants', {
        page: 1,
        pageSize: 100,
        sortBy: 'razon_social',
        sortDir: 'asc',
        filters: { estatus: 1 },
      }),
    enabled: canManageTenants,
  })

  const onboardMutation = useMutation({
    mutationFn: async (values) => {
      const employeeType = String(values.employee_type || '').trim().toUpperCase()
      if (!employeeType) {
        throw new Error('Selecciona tipo de empleado')
      }

      const roleCodes = [employeeType]
      const includeDoctorProfile = employeeType === 'DOCTOR'

      if (includeDoctorProfile && !values.specialty_id) {
        throw new Error('Selecciona especialidad para doctor')
      }

      return apiRequest('/api/users/onboard', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: values.tenant_id || null,
          nombres: values.nombres,
          apellidos: values.apellidos,
          telefono: values.telefono || null,
          email: values.email || null,
          roleCodes,
          includeDoctorProfile,
          doctorProfile: includeDoctorProfile
            ? {
                specialty_id: values.specialty_id || null,
                colegiado: values.colegiado || null,
              }
            : undefined,
        }),
      })
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ['users'], exact: false })
      const generatedUsername = response?.data?.credentials?.username
      const mailSent = response?.data?.mail?.sent
      if (generatedUsername && mailSent) {
        toast.success(`Usuario ${generatedUsername} creado y credenciales enviadas por correo`)
      } else if (generatedUsername) {
        toast.success(`Usuario ${generatedUsername} creado. No se pudo enviar correo, revisa configuración MAIL_*`)
      }
    },
  })

  const config = useMemo(() => {
    const specialties = specialtiesQuery.data?.data || []
    const tenants = tenantsQuery.data?.data || []
    const tenantField = canManageTenants
      ? [{
          name: 'tenant_id',
          label: 'Tenant',
          type: 'select',
          required: true,
          requiredMessage: 'Selecciona un tenant',
          hideOnEdit: true,
          options: tenants.map((tenant) => ({
            value: tenant.id,
            label: tenant.razon_social || tenant.nombre_comercial || tenant.clinic_code,
          })),
        }]
      : []

    return {
      ...usersCatalogConfig,
      title: 'Empleados',
      description: canManageTenants
        ? 'Administración de empleados por tenant'
        : 'Administración de empleados del tenant actual',
      formFields: [
        ...tenantField,
        ...usersCatalogConfig.formFields.map((field) =>
          field.name === 'specialty_id'
            ? {
                ...field,
                options: specialties.map((specialty) => ({ value: specialty.id, label: specialty.name })),
              }
            : field,
        ),
      ],
      customCreate: (values) => onboardMutation.mutateAsync(values),
      isCustomCreatePending: onboardMutation.isPending,
      messages: {
        ...usersCatalogConfig.messages,
        created: 'Empleado creado correctamente',
      },
      renderCustomRowActions: canManageAccess
        ? (record) => (
            <>
              <AssignRolesDialog userId={record.id} username={record.username} />
              <AssignPermissionsDialog userId={record.id} username={record.username} />
            </>
          )
        : undefined,
    }
  }, [canManageAccess, canManageTenants, onboardMutation, specialtiesQuery.data?.data, tenantsQuery.data?.data])

  return (
    <CatalogPage config={config} />
  )
}
