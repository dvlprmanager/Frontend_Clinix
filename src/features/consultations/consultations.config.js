function formatDate(value) {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('es-GT', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function buildConsultationsCatalogConfig({ doctors = [], patients = [], appointments = [] } = {}) {
  return {
    entity: 'consultations',
    title: 'Consultas',
    description: 'Registro clínico de consulta médica e historial por paciente',
    searchPlaceholder: 'Buscar por doctor, paciente, diagnóstico o motivo',
    pageSize: 10,
    sortBy: 'created_at',
    sortDir: 'desc',
    columns: [
      {
        key: 'doctor_nombres',
        label: 'Doctor',
        render: (_value, row) => `${row.doctor_nombres || ''} ${row.doctor_apellidos || ''}`.trim() || row.doctor_username || 'N/A',
      },
      {
        key: 'patient_nombres',
        label: 'Paciente',
        render: (_value, row) => `${row.patient_nombres || ''} ${row.patient_apellidos || ''}`.trim() || 'N/A',
      },
      { key: 'diagnostico', label: 'Diagnóstico', render: (value) => value || 'N/A' },
      { key: 'plan', label: 'Plan', render: (value) => value || 'N/A' },
      { key: 'followup_suggested_at', label: 'Seguimiento', render: (value) => formatDate(value) },
      {
        key: 'estatus',
        label: 'Estado',
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
        name: 'appointment_id',
        label: 'Cita (opcional)',
        type: 'select',
        options: appointments.map((appointment) => ({
          value: appointment.id,
          label: `${formatDate(appointment.start_at)} - ${(appointment.patient_nombres || '')} ${(appointment.patient_apellidos || '')}`.trim(),
        })),
        fullWidth: true,
      },
      {
        name: 'motivo',
        label: 'Motivo',
        required: true,
        requiredMessage: 'Motivo es obligatorio',
        fullWidth: true,
      },
      {
        name: 'historia',
        label: 'Historia',
        fullWidth: true,
      },
      {
        name: 'signos_vitales',
        label: 'Signos vitales (JSON)',
        placeholder: '{"pa":"120/80","fc":"72"}',
        fullWidth: true,
        hideOnEdit: true,
      },
      {
        name: 'examen_fisico',
        label: 'Examen físico',
        fullWidth: true,
      },
      {
        name: 'diagnostico',
        label: 'Diagnóstico',
        required: true,
        requiredMessage: 'Diagnóstico es obligatorio',
        fullWidth: true,
      },
      {
        name: 'plan',
        label: 'Plan',
        required: true,
        requiredMessage: 'Plan es obligatorio',
        fullWidth: true,
      },
      {
        name: 'indicaciones',
        label: 'Indicaciones',
        fullWidth: true,
      },
      {
        name: 'followup_suggested_at',
        label: 'Fecha de seguimiento',
        type: 'date',
        required: true,
        requiredMessage: 'Fecha de seguimiento es obligatoria',
      },
    ],
    messages: {
      created: 'Consulta creada correctamente',
      updated: 'Consulta actualizada correctamente',
      deleted: 'Consulta inactivada correctamente',
    },
  }
}
