import { KeyRound } from 'lucide-react'

export const usersCatalogConfig = {
  entity: 'users',
  title: 'Empleados',
  description: 'Administración de empleados del tenant actual',
  searchPlaceholder: 'Buscar por usuario, nombre, email o rol',
  pageSize: 10,
  sortBy: 'created_at',
  sortDir: 'desc',
  columns: [
    {
      key: 'username',
      label: 'Usuario',
      headerClassName: 'w-[140px] min-w-[140px]',
      cellClassName: 'w-[140px] min-w-[140px]',
    },
    {
      key: 'full_name',
      label: 'Nombre',
      render: (_value, row) => `${row.nombres || ''} ${row.apellidos || ''}`.trim(),
      headerClassName: 'w-[180px] min-w-[180px]',
      cellClassName: 'w-[180px] min-w-[180px]',
    },
    {
      key: 'tenant_label',
      label: 'Tenant',
      render: (_value, row) => (
        <span className="text-sm font-semibold text-foreground md:text-base">
          {row.tenant_label || row.clinic_code || row.tenant_id || 'N/A'}
        </span>
      ),
      headerClassName: 'w-[320px] min-w-[320px]',
      cellClassName: 'w-[320px] min-w-[320px]',
    },
    {
      key: 'role_codes',
      label: 'Roles',
      render: (value) => (Array.isArray(value) && value.length > 0 ? value.join(', ') : 'Sin roles'),
    },
    {
      key: 'permission_codes',
      label: 'Permisos efectivos',
      render: (value) => (Array.isArray(value) && value.length > 0 ? `${value.length} permisos` : 'Sin permisos'),
    },
    {
      key: 'estatus',
      label: 'Estado',
      render: (value) => (Number(value) === 1 ? 'Activo' : 'Inactivo'),
      variant: 'status-badge',
    },
  ],
  formFields: [
    {
      name: 'employee_type',
      label: 'Tipo de empleado',
      type: 'select',
      required: true,
      requiredMessage: 'Selecciona tipo de empleado',
      hideOnEdit: true,
      options: [
        { value: 'DOCTOR', label: 'Doctor' },
        { value: 'ENFERMERIA', label: 'Enfermería' },
        { value: 'RECEPCION', label: 'Recepción' },
        { value: 'ADMIN', label: 'Administrativo IT' },
      ],
    },
    {
      name: 'username',
      label: 'Usuario (autogenerado)',
      required: false,
      placeholder: 'Se genera automáticamente',
      hideOnCreate: true,
      hideOnEdit: false,
      disabledOnEdit: true,
    },
    {
      name: 'password',
      label: 'Contraseña',
      type: 'password',
      required: false,
      placeholder: '********',
      regex: '^(?=.*[A-Za-z])(?=.*\\d).{8,}$',
      regexMessage: 'Mínimo 8 caracteres con letras y números',
      hideOnCreate: true,
      hideOnEdit: true,
    },
    {
      name: 'nombres',
      label: 'Nombres',
      required: true,
      placeholder: 'Luis',
    },
    {
      name: 'apellidos',
      label: 'Apellidos',
      required: true,
      placeholder: 'Carias',
    },
    {
      name: 'telefono',
      label: 'Teléfono',
      placeholder: '55550000',
      regex: '^[0-9]+$',
      regexMessage: 'Solo números',
    },
    {
      name: 'specialty_id',
      label: 'Especialidad (solo doctor)',
      type: 'select',
      visibleWhen: (values) => values.employee_type === 'DOCTOR',
      options: [],
    },
    {
      name: 'colegiado',
      label: 'Colegiado (solo doctor)',
      visibleWhen: (values) => values.employee_type === 'DOCTOR',
      placeholder: 'Número de colegiado',
      regex: '^[A-Za-z0-9\\-_/ ]{0,50}$',
      regexMessage: 'Formato inválido',
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      placeholder: 'usuario@clinic.com',
      regex: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
      regexMessage: 'Email inválido',
      fullWidth: true,
    },
  ],
  messages: {
    created: 'Usuario creado correctamente',
    updated: 'Usuario actualizado correctamente',
    deleted: 'Usuario inactivado correctamente',
  },
  roleActionIcon: <KeyRound className="h-4 w-4" />,
}
