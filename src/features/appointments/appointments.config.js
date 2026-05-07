function formatDateTime(value) {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('es-GT', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function buildAppointmentsCatalogConfig({ doctors = [], patients = [], appointmentTypes = [], appointmentStatuses = [] } = {}) {
  return {
    entity: 'appointments',
    title: 'Agenda de Citas',
    description: 'Planificación y control de citas médicas',
    searchPlaceholder: 'Buscar por doctor, paciente, DPI o motivo',
    pageSize: 10,
    sortBy: 'start_at',
    sortDir: 'desc',
    columns: [
      {
        key: 'doctor_nombres',
        label: 'Doctor',
        render: (_value, row) =>
          `${row.doctor_nombres || ''} ${row.doctor_apellidos || ''}`.trim() || row.doctor_username || 'N/A',
      },
      {
        key: 'patient_nombres',
        label: 'Paciente',
        render: (_value, row) => `${row.patient_nombres || ''} ${row.patient_apellidos || ''}`.trim() || 'N/A',
      },
      {
        key: 'start_at',
        label: 'Inicio',
        render: (value) => formatDateTime(value),
      },
      {
        key: 'end_at',
        label: 'Fin',
        render: (value) => formatDateTime(value),
      },
      {
        key: 'appointment_status_name',
        label: 'Estado',
        render: (value) => value || 'N/A',
      },
      {
        key: 'estatus',
        label: 'Activo',
        render: (value) => (Number(value) === 1 ? 'Activo' : 'Inactivo'),
        variant: 'status-badge',
      },
    ],
    formFields: [
      {
        name: 'doctor_user_id',
        label: 'Doctor',
        type: 'select',
        required: true,
        requiredMessage: 'Doctor es obligatorio',
        options: doctors.map((doctor) => ({
          value: doctor.id,
          label: `${doctor.nombres || ''} ${doctor.apellidos || ''}`.trim() || doctor.username,
        })),
      },
      {
        name: 'patient_id',
        label: 'Paciente',
        type: 'select',
        required: true,
        requiredMessage: 'Paciente es obligatorio',
        options: patients.map((patient) => ({
          value: patient.id,
          label: `${patient.nombres || ''} ${patient.apellidos || ''}`.trim(),
        })),
      },
      {
        name: 'appointment_type_id',
        label: 'Tipo de cita',
        type: 'select',
        options: appointmentTypes.map((item) => ({
          value: item.id,
          label: item.name,
        })),
      },
      {
        name: 'appointment_status_id',
        label: 'Estado',
        type: 'select',
        options: appointmentStatuses.map((item) => ({
          value: item.id,
          label: item.name,
        })),
      },
      {
        name: 'start_at',
        label: 'Inicio',
        type: 'date',
        required: true,
        requiredMessage: 'Inicio es obligatorio',
      },
      {
        name: 'end_at',
        label: 'Fin',
        type: 'date',
        required: true,
        requiredMessage: 'Fin es obligatorio',
      },
      {
        name: 'motivo',
        label: 'Motivo',
        fullWidth: true,
      },
      {
        name: 'cancel_reason',
        label: 'Motivo de cancelación',
        fullWidth: true,
      },
    ],
    messages: {
      created: 'Cita creada correctamente',
      updated: 'Cita actualizada correctamente',
      deleted: 'Cita inactivada correctamente',
    },
  }
}
