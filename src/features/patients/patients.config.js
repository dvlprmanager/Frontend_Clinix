function formatDate(value) {
  if (!value) return 'N/A'
  const raw = String(value).trim()
  const date = raw.includes('T') ? new Date(raw) : new Date(`${raw}T00:00:00`)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('es-GT', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export const patientsCatalogConfig = {
  entity: 'patients',
  title: 'Pacientes',
  description: 'Registro clínico base de pacientes',
  searchPlaceholder: 'Buscar por nombre, DPI, teléfono o email',
  pageSize: 10,
  sortBy: 'created_at',
  sortDir: 'desc',
  columns: [
    {
      key: 'nombres',
      label: 'Paciente',
      render: (_value, row) => `${row.nombres || ''} ${row.apellidos || ''}`.trim(),
    },
    {
      key: 'fecha_nacimiento',
      label: 'Nacimiento',
      render: (value) => formatDate(value),
    },
    {
      key: 'sexo',
      label: 'Sexo',
      render: (value) => value || 'N/A',
    },
    {
      key: 'telefono',
      label: 'Teléfono',
      render: (value) => value || 'N/A',
    },
    {
      key: 'assigned_doctors',
      label: 'Doctores',
      render: (value) => Number(value || 0),
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
      name: 'nombres',
      label: 'Nombres',
      required: true,
      placeholder: 'Luis',
      regex: "^[\\p{L}\\p{N}\\s.,'()\\-_/&#+:;°]+$",
      regexMessage: 'Nombres inválidos',
    },
    {
      name: 'apellidos',
      label: 'Apellidos',
      required: true,
      placeholder: 'Carias',
      regex: "^[\\p{L}\\p{N}\\s.,'()\\-_/&#+:;°]+$",
      regexMessage: 'Apellidos inválidos',
    },
    {
      name: 'fecha_nacimiento',
      label: 'Fecha de nacimiento',
      type: 'date',
      required: true,
      requiredMessage: 'Fecha de nacimiento es obligatoria',
    },
    {
      name: 'sexo',
      label: 'Sexo',
      type: 'select',
      required: true,
      requiredMessage: 'Sexo es obligatorio',
      options: [
        { value: 'M', label: 'M' },
        { value: 'F', label: 'F' },
        { value: 'OTRO', label: 'OTRO' },
      ],
    },
    {
      name: 'telefono',
      label: 'Teléfono',
      placeholder: '55550000',
      required: true,
      requiredMessage: 'Teléfono es obligatorio',
      regex: '^[0-9+\\-\\s]{0,30}$',
      regexMessage: 'Teléfono inválido',
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      placeholder: 'paciente@correo.com',
      required: true,
      requiredMessage: 'Email es obligatorio',
      regex: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
      regexMessage: 'Email inválido',
    },
    {
      name: 'dpi',
      label: 'DPI',
      placeholder: '1234567890101',
      required: true,
      requiredMessage: 'DPI es obligatorio',
      regex: '^[A-Za-z0-9\\-]{0,30}$',
      regexMessage: 'DPI inválido',
    },
    {
      name: 'direccion',
      label: 'Dirección',
      fullWidth: true,
      placeholder: 'Zona 10, ciudad',
      required: true,
      requiredMessage: 'Dirección es obligatoria',
      regex: "^[\\p{L}\\p{N}\\s.,'()\\-_/&#+:;°]*$",
      regexMessage: 'Dirección inválida',
    },
    {
      name: 'alergias',
      label: 'Alergias',
      fullWidth: true,
      placeholder: 'Penicilina',
    },
    {
      name: 'cronicos',
      label: 'Crónicos',
      fullWidth: true,
      placeholder: 'Hipertensión',
    },
    {
      name: 'medicamentos_actuales',
      label: 'Medicamentos actuales',
      fullWidth: true,
      placeholder: 'Losartán',
    },
    {
      name: 'notas_alerta',
      label: 'Notas de alerta',
      fullWidth: true,
      placeholder: 'Riesgo de alergia',
    },
  ],
  messages: {
    created: 'Paciente creado correctamente',
    updated: 'Paciente actualizado correctamente',
    deleted: 'Paciente inactivado correctamente',
  },
}
