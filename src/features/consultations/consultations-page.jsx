import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Eye, FilePenLine, Pill, Plus, Save, Share2, Stethoscope, ToggleLeft, ToggleRight, Trash2, Upload } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErpLoadingEmpty } from '@/components/common/erp-loading-empty'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectField } from '@/components/ui/select-field'
import { DateTimePickerInput } from '@/components/ui/date-time-picker-input'
import { buildVisiblePageNumbers } from '@/lib/pagination'
import { useAuth } from '@/features/auth/use-auth'
import { hasPermission } from '@/utils/permissions'
import { API_URL } from '@/utils/api-client'
import { createClinicalShare, getClinicalShareLookups } from '@/features/clinical-sharing/clinical-sharing-api'
import {
  getClinicalFileLookups,
  getConsultationByAppointment,
  getPatientClinicalFilesPaginated,
  getPatientConsultationHistory,
  listAppointmentsForConsultation,
  registerClinicalFileAccess,
  previewPrescriptionPdf,
  saveConsultationByAppointment,
  updateClinicalFile,
  updateClinicalFileStatus,
  uploadClinicalFileByAppointment,
} from '@/features/consultations/consultations-api'

const ATTENTION_PATH_PREFIX = '/consultations/attention/'
const ATTENTION_STEPS = ['consulta', 'receta']

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

function formatDateOnly(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatFileSize(bytes) {
  const size = Number(bytes || 0)
  if (!Number.isFinite(size) || size <= 0) return '0 KB'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(2)} MB`
}

function getAppointmentIdFromPath(pathname) {
  if (!pathname.startsWith(ATTENTION_PATH_PREFIX)) return null
  const rawId = pathname.slice(ATTENTION_PATH_PREFIX.length).trim()
  if (!rawId) return null
  return decodeURIComponent(rawId)
}

function canPreviewPdf(file) {
  return Boolean(file?.is_pdf && file?.storage_key)
}

function toPreviewUrl(storageKey) {
  if (!storageKey) return ''
  if (storageKey.startsWith('http://') || storageKey.startsWith('https://')) return storageKey
  if (storageKey.startsWith('/')) return `${API_URL}${storageKey}`
  return `${API_URL}/${storageKey}`
}

function ConsultationAttentionView({ appointmentId, onBack, openHistoryOnLoad = false }) {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const [historyListOpen, setHistoryListOpen] = useState(false)
  const [historyDetail, setHistoryDetail] = useState(null)
  const [filePreview, setFilePreview] = useState(null)
  const [internalReferralOpen, setInternalReferralOpen] = useState(false)
  const [internalDoctorTargetId, setInternalDoctorTargetId] = useState('')
  const [internalReferralNotes, setInternalReferralNotes] = useState('')
  const [internalPassword, setInternalPassword] = useState('')
  const [activeStep, setActiveStep] = useState('consulta')
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadDescription, setUploadDescription] = useState('')
  const [uploadExamDate, setUploadExamDate] = useState(() => formatDateOnly(new Date()))
  const [uploadFileTypeId, setUploadFileTypeId] = useState('')
  const [uploadStorageProviderId, setUploadStorageProviderId] = useState('')
  const [filesSearchInput, setFilesSearchInput] = useState('')
  const [filesSearch, setFilesSearch] = useState('')
  const [filesPage, setFilesPage] = useState(1)
  const [filesTypeFilter, setFilesTypeFilter] = useState('')
  const [filesStatusFilter, setFilesStatusFilter] = useState('1')
  const [editingFile, setEditingFile] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editExamDate, setEditExamDate] = useState('')
  const [editFileTypeId, setEditFileTypeId] = useState('')
  const [editStorageProviderId, setEditStorageProviderId] = useState('')
  const {
    control,
    register,
    handleSubmit,
    reset,
    trigger,
    formState: { errors },
  } = useForm({
    defaultValues: {
      motivo: '',
      historia: '',
      examen_fisico: '',
      diagnostico: '',
      plan: '',
      indicaciones: '',
      followup_suggested_at: '',
      prescription_items: [{ medicamento: '', dosis: '', frecuencia: '', duracion: '', notas: '' }],
    },
    mode: 'onBlur',
  })
  const { fields: prescriptionFields, append, remove } = useFieldArray({
    control,
    name: 'prescription_items',
  })

  const attentionQuery = useQuery({
    queryKey: ['consultations', 'by-appointment', appointmentId],
    queryFn: () => getConsultationByAppointment(appointmentId),
    enabled: Boolean(appointmentId),
  })

  const historyQuery = useQuery({
    queryKey: ['consultations', 'history', attentionQuery.data?.data?.appointment?.patient_id],
    queryFn: () => getPatientConsultationHistory(attentionQuery.data?.data?.appointment?.patient_id),
    enabled: Boolean(attentionQuery.data?.data?.appointment?.patient_id),
  })

  const fileLookupsQuery = useQuery({
    queryKey: ['consultations', 'files', 'lookups'],
    queryFn: getClinicalFileLookups,
    enabled: Boolean(attentionQuery.data?.data?.appointment?.patient_id),
  })

  const filesQuery = useQuery({
    queryKey: [
      'consultations',
      'files',
      attentionQuery.data?.data?.appointment?.patient_id,
      attentionQuery.data?.data?.consultation?.id,
      filesPage,
      filesSearch,
      filesTypeFilter,
      filesStatusFilter,
    ],
    queryFn: () =>
      getPatientClinicalFilesPaginated(attentionQuery.data?.data?.appointment?.patient_id, {
        page: filesPage,
        pageSize: 5,
        q: filesSearch,
        consultation_id: attentionQuery.data?.data?.consultation?.id || undefined,
        file_type_id: filesTypeFilter || undefined,
        estatus: filesStatusFilter === 'all' ? undefined : Number(filesStatusFilter),
      }),
    enabled: Boolean(attentionQuery.data?.data?.appointment?.patient_id && attentionQuery.data?.data?.consultation?.id),
  })

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setFilesPage(1)
      setFilesSearch(filesSearchInput.trim())
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [filesSearchInput])

  useEffect(() => {
    const appointment = attentionQuery.data?.data?.appointment
    const consultation = attentionQuery.data?.data?.consultation
    const prescription = attentionQuery.data?.data?.prescription
    if (!appointment) return
    reset({
      motivo: consultation?.motivo || appointment.appointment_motivo || '',
      historia: consultation?.historia || '',
      examen_fisico: consultation?.examen_fisico || '',
      diagnostico: consultation?.diagnostico || '',
      plan: consultation?.plan || '',
      indicaciones: consultation?.indicaciones || '',
      followup_suggested_at: formatDateOnly(consultation?.followup_suggested_at),
      prescription_items: (prescription?.items || []).length > 0
        ? prescription.items.map((item) => ({
            medicamento: item.medicamento || '',
            dosis: item.dosis || '',
            frecuencia: item.frecuencia || '',
            duracion: item.duracion || '',
            notas: item.notas || '',
          }))
        : [{ medicamento: '', dosis: '', frecuencia: '', duracion: '', notas: '' }],
    })
    setActiveStep('consulta')
    setUploadExamDate(formatDateOnly(new Date()))
    setFilesSearchInput('')
    setFilesSearch('')
    setFilesPage(1)
    setFilesTypeFilter('')
    setFilesStatusFilter('1')
  }, [attentionQuery.data?.data, reset])

  useEffect(() => {
    const fileTypes = fileLookupsQuery.data?.data?.fileTypes || []
    const storageProviders = fileLookupsQuery.data?.data?.storageProviders || []
    if (!uploadFileTypeId && fileTypes[0]?.id) {
      setUploadFileTypeId(fileTypes[0].id)
    }
    if (!uploadStorageProviderId && storageProviders[0]?.id) {
      setUploadStorageProviderId(storageProviders[0].id)
    }
  }, [fileLookupsQuery.data?.data, uploadFileTypeId, uploadStorageProviderId])

  const saveMutation = useMutation({
    mutationFn: (payload) => saveConsultationByAppointment(appointmentId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['consultations', 'appointments'], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['consultations', 'by-appointment', appointmentId] }),
        queryClient.invalidateQueries({ queryKey: ['consultations', 'history'], exact: false }),
      ])
      toast.success('Consulta guardada correctamente')
    },
  })

  const uploadFileMutation = useMutation({
    mutationFn: (payload) => uploadClinicalFileByAppointment(appointmentId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['consultations', 'files'], exact: false })
      toast.success('Examen cargado correctamente')
      setUploadFile(null)
      setUploadTitle('')
      setUploadDescription('')
      setUploadExamDate(formatDateOnly(new Date()))
    },
  })

  const updateFileMutation = useMutation({
    mutationFn: ({ fileId, payload }) => updateClinicalFile(fileId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['consultations', 'files'], exact: false })
      toast.success('Archivo clínico actualizado')
      setEditingFile(null)
    },
  })

  const updateFileStatusMutation = useMutation({
    mutationFn: ({ fileId, estatus }) => updateClinicalFileStatus(fileId, estatus),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['consultations', 'files'], exact: false })
      toast.success('Estado del archivo actualizado')
    },
  })

  const registerFileAccessMutation = useMutation({
    mutationFn: ({ fileId, accessType }) => registerClinicalFileAccess(fileId, accessType),
  })

  const internalShareLookupsQuery = useQuery({
    queryKey: ['clinical-sharing', 'lookups', 'internal-referral'],
    queryFn: getClinicalShareLookups,
    enabled: internalReferralOpen,
  })

  const internalShareMutation = useMutation({
    mutationFn: createClinicalShare,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['clinical-sharing'], exact: false })
      toast.success('Paciente remitido correctamente')
      setInternalReferralOpen(false)
      setInternalDoctorTargetId('')
      setInternalReferralNotes('')
      setInternalPassword('')
    },
  })

  const handleSaveConsultation = async (values) => {
    const normalizedPrescriptionItems = (values.prescription_items || [])
      .map((item) => ({
        medicamento: item?.medicamento?.trim() || '',
        dosis: item?.dosis?.trim() || '',
        frecuencia: item?.frecuencia?.trim() || '',
        duracion: item?.duracion?.trim() || '',
        notas: item?.notas?.trim() || '',
      }))
      .filter((item) => item.medicamento || item.dosis || item.frecuencia || item.duracion || item.notas)

    try {
      await saveMutation.mutateAsync({
        ...values,
        prescription_items: normalizedPrescriptionItems,
      })
      onBack()
    } catch (error) {
      toast.error(error.message || 'No se pudo guardar la consulta')
    }
  }

  const handleNextStep = async () => {
    if (activeStep === 'consulta') {
      const valid = await trigger(['diagnostico', 'plan', 'followup_suggested_at'])
      if (!valid) return
    }

    const nextIndex = Math.min(ATTENTION_STEPS.length - 1, ATTENTION_STEPS.indexOf(activeStep) + 1)
    setActiveStep(ATTENTION_STEPS[nextIndex])
  }

  const handlePrevStep = () => {
    const previousIndex = Math.max(0, ATTENTION_STEPS.indexOf(activeStep) - 1)
    setActiveStep(ATTENTION_STEPS[previousIndex])
  }

  const handleUploadExam = async (event) => {
    event.preventDefault()
    if (!uploadFile) {
      toast.error('Debes seleccionar un archivo')
      return
    }
    try {
      await uploadFileMutation.mutateAsync({
        file: uploadFile,
        title: uploadTitle,
        description: uploadDescription,
        exam_date: uploadExamDate,
        file_type_id: uploadFileTypeId || undefined,
        storage_provider_id: uploadStorageProviderId || undefined,
      })
    } catch (error) {
      toast.error(error.message || 'No se pudo cargar el examen')
    }
  }

  const openEditFileModal = (file) => {
    setEditingFile(file)
    setEditTitle(file?.title || '')
    setEditDescription(file?.description || '')
    setEditExamDate(formatDateOnly(file?.exam_date))
    setEditFileTypeId(file?.file_type_id || '')
    setEditStorageProviderId(file?.storage_provider_id || '')
  }

  const handleUpdateFileMetadata = async () => {
    if (!editingFile?.id) return
    try {
      await updateFileMutation.mutateAsync({
        fileId: editingFile.id,
        payload: {
          title: editTitle,
          description: editDescription,
          exam_date: editExamDate || null,
          file_type_id: editFileTypeId || null,
          storage_provider_id: editStorageProviderId || null,
        },
      })
    } catch (error) {
      toast.error(error.message || 'No se pudo actualizar el archivo')
    }
  }

  const handleChangeFileStatus = async (file, estatus) => {
    try {
      await updateFileStatusMutation.mutateAsync({ fileId: file.id, estatus })
    } catch (error) {
      toast.error(error.message || 'No se pudo actualizar el estado')
    }
  }

  const handlePreviewFile = async (file) => {
    if (!canPreviewPdf(file)) {
      toast.info('Este archivo no es PDF o no tiene URL pública de visualización')
      return
    }
    try {
      await registerFileAccessMutation.mutateAsync({
        fileId: file.id,
        accessType: 'VIEW',
      })
      setFilePreview(file)
    } catch (error) {
      toast.error(error.message || 'No se pudo registrar el acceso del archivo')
    }
  }

  const handleDownloadFile = async (file) => {
    const url = toPreviewUrl(file?.storage_key)
    if (!url) return
    try {
      await registerFileAccessMutation.mutateAsync({
        fileId: file.id,
        accessType: 'DOWNLOAD',
      })
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      toast.error(error.message || 'No se pudo registrar la descarga')
    }
  }

  const handleCreateInternalReferral = async () => {
    if (!selectedAppointment?.patient_id) {
      toast.error('No se encontró paciente para remitir')
      return
    }
    if (!internalDoctorTargetId) {
      toast.error('Selecciona un doctor destino')
      return
    }
    if (!internalPassword.trim()) {
      toast.error('Ingresa tu contraseña para confirmar')
      return
    }

    try {
      await internalShareMutation.mutateAsync({
        patient_id: selectedAppointment.patient_id,
        tenant_target_id: session?.tenantId,
        doctor_target_user_id: internalDoctorTargetId,
        consultation_id: null,
        invitation_ttl_days: 30,
        access_ttl_unit: 'days',
        access_ttl_value: 30,
        notes: internalReferralNotes || null,
        current_password: internalPassword,
      })
    } catch (error) {
      toast.error(error.message || 'No se pudo remitir el paciente')
    }
  }

  const selectedAppointment = attentionQuery.data?.data?.appointment
  const clinicalFiles = filesQuery.data?.data || []
  const filesMeta = filesQuery.data?.meta
  const filesCurrentPage = Math.max(1, Number(filesMeta?.page || 1))
  const filesTotalPages = Math.max(1, Number(filesMeta?.totalPages || 1))
  const filesPageNumbers = buildVisiblePageNumbers(filesCurrentPage, filesTotalPages, 10)
  const fileTypes = fileLookupsQuery.data?.data?.fileTypes || []
  const storageProviders = fileLookupsQuery.data?.data?.storageProviders || []
  const canCreateInternalReferral = hasPermission(session, 'CLINICAL_SHARE_CREATE')
  const internalDoctors = (internalShareLookupsQuery.data?.data?.doctors || [])
    .filter((doctor) => doctor.tenant_id === session?.tenantId)
    .filter((doctor) => doctor.id !== session?.userId)
  const canSubmitInternalReferral = Boolean(
    selectedAppointment?.patient_id && internalDoctorTargetId && internalPassword && !internalShareMutation.isPending,
  )

  useEffect(() => {
    if (!openHistoryOnLoad) return
    setHistoryListOpen(true)
  }, [openHistoryOnLoad])

  if (attentionQuery.isLoading) {
    return (
      <Card>
        <CardContent className="py-4">
          <ErpLoadingEmpty title="Cargando datos de la cita" />
        </CardContent>
      </Card>
    )
  }

  if (attentionQuery.isError || !selectedAppointment) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-destructive">
          No se pudo cargar la atención de la cita.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Información del paciente</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="grid min-w-[1200px] gap-3 text-sm xl:grid-cols-8">
            <div><span className="font-semibold">Doctor:</span> {`${selectedAppointment.doctor_nombres || ''} ${selectedAppointment.doctor_apellidos || ''}`.trim() || selectedAppointment.doctor_username}</div>
            <div><span className="font-semibold">Paciente:</span> {`${selectedAppointment.patient_nombres || ''} ${selectedAppointment.patient_apellidos || ''}`.trim()}</div>
            <div><span className="font-semibold">DPI:</span> {selectedAppointment?.patient_dpi || 'N/A'}</div>
            <div><span className="font-semibold">Nacimiento:</span> {formatDateOnly(selectedAppointment?.patient_fecha_nacimiento) || 'N/A'}</div>
            <div><span className="font-semibold">Sexo:</span> {selectedAppointment?.patient_sexo || 'N/A'}</div>
            <div><span className="font-semibold">Teléfono:</span> {selectedAppointment?.patient_telefono || 'N/A'}</div>
            <div><span className="font-semibold">Email:</span> {selectedAppointment?.patient_email || 'N/A'}</div>
            <div><span className="font-semibold">Dirección:</span> {selectedAppointment?.patient_direccion || 'N/A'}</div>
            <div><span className="font-semibold">Alergias:</span> {selectedAppointment?.patient_alergias || 'N/A'}</div>
            <div><span className="font-semibold">Crónicos:</span> {selectedAppointment?.patient_cronicos || 'N/A'}</div>
            <div><span className="font-semibold">Medicamentos:</span> {selectedAppointment?.patient_medicamentos_actuales || 'N/A'}</div>
            <div><span className="font-semibold">Notas alerta:</span> {selectedAppointment?.patient_notas_alerta || 'N/A'}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Atención de consulta</CardTitle>
          <div className="flex items-center gap-2">
            {canCreateInternalReferral ? (
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-9 w-9"
                title="Remitir paciente"
                aria-label="Remitir paciente"
                onClick={() => setInternalReferralOpen(true)}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            ) : null}
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-9 w-9"
              title="Historial médico"
              aria-label="Historial médico"
              onClick={() => setHistoryListOpen(true)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button type="button" size="icon" variant="outline" className="h-9 w-9" title="Volver al listado" aria-label="Volver al listado" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className={`rounded-md border px-3 py-2 text-center text-sm ${activeStep === 'consulta' ? 'bg-primary text-primary-foreground' : 'bg-muted/40 text-muted-foreground'}`}>
                Paso 1: Consulta
              </div>
              <div className={`rounded-md border px-3 py-2 text-center text-sm ${activeStep === 'receta' ? 'bg-primary text-primary-foreground' : 'bg-muted/40 text-muted-foreground'}`}>
                Paso 2: Receta
              </div>
            </div>

            {activeStep === 'consulta' ? (
              <div className="grid gap-4 rounded-md border p-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Motivo</Label>
                  <Input {...register('motivo')} />
                </div>
                <div className="grid gap-2">
                  <Label>Historia</Label>
                  <Input {...register('historia')} />
                </div>
                <div className="grid gap-2">
                  <Label>Examen físico</Label>
                  <Input {...register('examen_fisico')} />
                </div>
                <div className="grid gap-2">
                  <Label>Diagnóstico</Label>
                  <Input {...register('diagnostico', { required: 'Diagnóstico es obligatorio' })} />
                  {errors.diagnostico ? <p className="text-xs font-medium text-destructive">{errors.diagnostico.message}</p> : null}
                </div>
                <div className="grid gap-2">
                  <Label>Plan</Label>
                  <Input {...register('plan', { required: 'Plan es obligatorio' })} />
                  {errors.plan ? <p className="text-xs font-medium text-destructive">{errors.plan.message}</p> : null}
                </div>
                <div className="grid gap-2">
                  <Label>Indicaciones</Label>
                  <Input {...register('indicaciones')} />
                </div>
                <div className="grid gap-2">
                  <Label>Seguimiento sugerido</Label>
                  <Controller
                    name="followup_suggested_at"
                    control={control}
                    rules={{ required: 'Fecha de seguimiento es obligatoria' }}
                    render={({ field }) => (
                      <DateTimePickerInput
                        id="followup_suggested_at"
                        value={field.value || ''}
                        onChange={field.onChange}
                        withTime={false}
                      />
                    )}
                  />
                  {errors.followup_suggested_at ? <p className="text-xs font-medium text-destructive">{errors.followup_suggested_at.message}</p> : null}
                </div>
              </div>
            ) : null}

            {activeStep === 'receta' ? (
              <div className="space-y-4 rounded-md border p-4">
                {prescriptionFields.map((field, index) => (
                  <div key={field.id} className="rounded-md border p-3">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold">Medicamento {index + 1}</p>
                      {prescriptionFields.length > 1 ? (
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => remove(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="grid gap-2">
                        <Label>Medicamento</Label>
                        <Input {...register(`prescription_items.${index}.medicamento`)} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Dosis</Label>
                        <Input {...register(`prescription_items.${index}.dosis`)} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Frecuencia</Label>
                        <Input {...register(`prescription_items.${index}.frecuencia`)} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Duración</Label>
                        <Input {...register(`prescription_items.${index}.duracion`)} />
                      </div>
                      <div className="grid gap-2 md:col-span-2">
                        <Label>Notas</Label>
                        <Input {...register(`prescription_items.${index}.notas`)} />
                      </div>
                    </div>
                  </div>
                ))}
                    <div className="flex">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-9 w-9"
                        title="Agregar medicamento"
                        aria-label="Agregar medicamento"
                        onClick={() => append({ medicamento: '', dosis: '', frecuencia: '', duracion: '', notas: '' })}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
              </div>
            ) : null}

            {activeStep === 'examenes' ? (
              <div className="space-y-4 rounded-md border p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Archivo de examen (PDF)</Label>
                    <Input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={(event) => setUploadFile(event.target.files?.[0] || null)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Título</Label>
                    <Input value={uploadTitle} onChange={(event) => setUploadTitle(event.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Tipo de archivo</Label>
                    <SelectField
                      className="text-sm"
                      value={uploadFileTypeId}
                      onValueChange={setUploadFileTypeId}
                      options={[
                        { value: '', label: 'Seleccionar tipo' },
                        ...fileTypes.map((item) => ({ value: item.id, label: item.name })),
                      ]}
                      placeholder="Seleccionar tipo"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Proveedor</Label>
                    <SelectField
                      className="text-sm"
                      value={uploadStorageProviderId}
                      onValueChange={setUploadStorageProviderId}
                      options={[
                        { value: '', label: 'Seleccionar proveedor' },
                        ...storageProviders.map((item) => ({ value: item.id, label: item.name })),
                      ]}
                      placeholder="Seleccionar proveedor"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Fecha del examen</Label>
                    <DateTimePickerInput id="upload_exam_date" value={uploadExamDate} onChange={setUploadExamDate} withTime={false} />
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <Label>Descripción</Label>
                    <Input value={uploadDescription} onChange={(event) => setUploadDescription(event.target.value)} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="icon"
                    className="h-9 w-9"
                    title={uploadFileMutation.isPending ? 'Subiendo examen' : 'Subir examen'}
                    aria-label={uploadFileMutation.isPending ? 'Subiendo examen' : 'Subir examen'}
                    onClick={handleUploadExam}
                    disabled={uploadFileMutation.isPending}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <div className="grid gap-2 md:grid-cols-3">
                    <Input
                      value={filesSearchInput}
                      onChange={(event) => setFilesSearchInput(event.target.value)}
                      placeholder="Buscar por título o descripción"
                    />
                    <SelectField
                      className="text-sm"
                      value={filesTypeFilter}
                      onValueChange={(value) => {
                        setFilesPage(1)
                        setFilesTypeFilter(value)
                      }}
                      options={[
                        { value: '', label: 'Todos los tipos' },
                        ...fileTypes.map((item) => ({ value: item.id, label: item.name })),
                      ]}
                      placeholder="Todos los tipos"
                    />
                    <SelectField
                      className="text-sm"
                      value={filesStatusFilter}
                      onValueChange={(value) => {
                        setFilesPage(1)
                        setFilesStatusFilter(value)
                      }}
                      options={[
                        { value: '1', label: 'Solo activos' },
                        { value: '0', label: 'Solo inactivos' },
                        { value: 'all', label: 'Todos' },
                      ]}
                      placeholder="Estado"
                      searchable={false}
                    />
                  </div>
                  <p className="text-sm font-semibold text-foreground">Exámenes cargados</p>
                  {filesQuery.isLoading ? (
                    <ErpLoadingEmpty title="Cargando archivos clínicos" />
                  ) : clinicalFiles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay exámenes o archivos clínicos registrados.</p>
                  ) : (
                    clinicalFiles.map((file) => (
                      <div
                        key={file.id}
                        className={`w-full rounded-md border p-3 text-left transition-colors ${
                          Number(file.estatus) === 1 ? 'hover:bg-muted/30' : 'border-dashed opacity-70'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-foreground">{file.title || file.file_type_name || 'Archivo clínico'}</p>
                            <p className="text-xs text-muted-foreground">{file.file_type_name || 'Tipo no definido'}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              title="Previsualizar PDF"
                              aria-label="Previsualizar PDF"
                              onClick={() => handlePreviewFile(file)}
                              disabled={Number(file.estatus) !== 1}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              title="Descargar archivo"
                              aria-label="Descargar archivo"
                              onClick={() => handleDownloadFile(file)}
                              disabled={Number(file.estatus) !== 1}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              title="Editar metadatos"
                              aria-label="Editar metadatos"
                              onClick={() => openEditFileModal(file)}
                            >
                              <FilePenLine className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant={Number(file.estatus) === 1 ? 'destructive' : 'default'}
                              className="h-8 w-8"
                              title={Number(file.estatus) === 1 ? 'Inactivar archivo' : 'Activar archivo'}
                              aria-label={Number(file.estatus) === 1 ? 'Inactivar archivo' : 'Activar archivo'}
                              onClick={() => handleChangeFileStatus(file, Number(file.estatus) === 1 ? 0 : 1)}
                            >
                              {Number(file.estatus) === 1 ? (
                                <ToggleRight className="h-4 w-4" />
                              ) : (
                                <ToggleLeft className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{file.description || 'Sin descripción'}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Fecha examen: {formatDateOnly(file.exam_date) || 'N/A'} | Cargado: {formatDateTime(file.created_at)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Tamaño: {formatFileSize(file.size_bytes)} | Estado: {Number(file.estatus) === 1 ? 'Activo' : 'Inactivo'}
                        </p>
                      </div>
                    ))
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                    <p className="text-xs text-muted-foreground">
                      Página {filesMeta?.page || 1} de {filesMeta?.totalPages || 1} | Total: {filesMeta?.total || 0}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        title="Página anterior"
                        aria-label="Página anterior"
                        disabled={filesCurrentPage <= 1}
                        onClick={() => setFilesPage(Math.max(1, filesCurrentPage - 1))}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="flex items-center gap-1">
                        {filesPageNumbers.map((pageNumber) => (
                          <Button
                            key={pageNumber}
                            type="button"
                            variant={pageNumber === filesCurrentPage ? 'default' : 'outline'}
                            className="h-8 min-w-8 px-2"
                            onClick={() => setFilesPage(pageNumber)}
                            aria-label={`Ir a página ${pageNumber}`}
                            title={`Página ${pageNumber}`}
                          >
                            {pageNumber}
                          </Button>
                        ))}
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        title="Página siguiente"
                        aria-label="Página siguiente"
                        disabled={filesCurrentPage >= filesTotalPages}
                        onClick={() => setFilesPage(Math.min(filesTotalPages, filesCurrentPage + 1))}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex justify-between">
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-9 w-9"
                title="Paso anterior"
                aria-label="Paso anterior"
                onClick={handlePrevStep}
                disabled={ATTENTION_STEPS.indexOf(activeStep) === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {activeStep !== 'receta' ? (
                <Button type="button" size="icon" className="h-9 w-9" title="Siguiente paso" aria-label="Siguiente paso" onClick={handleNextStep}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="icon"
                  className="h-9 w-9"
                  title={saveMutation.isPending ? 'Guardando consulta y receta' : 'Guardar consulta y receta'}
                  aria-label={saveMutation.isPending ? 'Guardando consulta y receta' : 'Guardar consulta y receta'}
                  disabled={saveMutation.isPending}
                  onClick={handleSubmit(handleSaveConsultation)}
                >
                  <Save className="h-4 w-4" />
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Dialog
        open={internalReferralOpen}
        onOpenChange={(open) => {
          setInternalReferralOpen(open)
          if (!open) {
            setInternalDoctorTargetId('')
            setInternalReferralNotes('')
            setInternalPassword('')
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Remitir paciente</DialogTitle>
            <DialogDescription>
              Referencia interna de paciente para seguimiento clínico y programación de cita.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <p><strong>Paciente:</strong> {`${selectedAppointment?.patient_nombres || ''} ${selectedAppointment?.patient_apellidos || ''}`.trim()}</p>
              <p><strong>DPI:</strong> {selectedAppointment?.patient_dpi || 'N/A'}</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="internal-doctor-target">Doctor destino</Label>
              <SelectField
                value={internalDoctorTargetId}
                onValueChange={setInternalDoctorTargetId}
                options={[
                  { value: '', label: 'Selecciona doctor' },
                  ...internalDoctors.map((doctor) => ({
                    value: doctor.id,
                    label: `${doctor.nombres || ''} ${doctor.apellidos || ''}`.trim(),
                  })),
                ]}
                placeholder="Selecciona doctor"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="internal-referral-notes">Notas</Label>
              <Input
                id="internal-referral-notes"
                value={internalReferralNotes}
                onChange={(event) => setInternalReferralNotes(event.target.value)}
                placeholder="Motivo de referencia"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="internal-referral-password">Ingrese su contraseña</Label>
              <Input
                id="internal-referral-password"
                type="password"
                autoComplete="current-password"
                value={internalPassword}
                onChange={(event) => setInternalPassword(event.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setInternalReferralOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleCreateInternalReferral} disabled={!canSubmitInternalReferral}>
                {internalShareMutation.isPending ? 'Remitiendo...' : 'Remitir paciente'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={historyListOpen} onOpenChange={setHistoryListOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Historial médico</DialogTitle>
            <DialogDescription>Consultas previas del paciente</DialogDescription>
          </DialogHeader>
          <div className="max-h-[65vh] space-y-3 overflow-y-auto">
            {historyQuery.isLoading ? (
              <ErpLoadingEmpty title="Cargando historial clínico" />
            ) : (historyQuery.data?.data || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay consultas registradas para este paciente</p>
            ) : (
              (historyQuery.data?.data || []).map((item) => (
                <div key={item.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-foreground">{item.motivo || 'Sin motivo'}</p>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0"
                      title="Consultar detalle"
                      aria-label="Consultar detalle"
                      onClick={() => setHistoryDetail(item)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="mt-1 text-muted-foreground">{item.historia || 'Sin historia clínica'}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Doctor: {`${item.doctor_nombres || ''} ${item.doctor_apellidos || ''}`.trim() || 'N/A'}
                  </p>
                  <p className="text-xs text-muted-foreground">Fecha: {formatDateTime(item.created_at)}</p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(historyDetail)} onOpenChange={(open) => !open && setHistoryDetail(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{historyDetail?.motivo || 'Detalle de consulta'}</DialogTitle>
            <DialogDescription>
              {historyDetail ? `Consulta registrada el ${formatDateTime(historyDetail.created_at)}` : ''}
            </DialogDescription>
          </DialogHeader>
          {historyDetail ? (
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <p className="md:col-span-2"><span className="font-semibold">Historia:</span> {historyDetail.historia || 'N/A'}</p>
              <p className="md:col-span-2"><span className="font-semibold">Diagnóstico:</span> {historyDetail.diagnostico || 'N/A'}</p>
              <p className="md:col-span-2"><span className="font-semibold">Plan:</span> {historyDetail.plan || 'N/A'}</p>
              <p className="md:col-span-2"><span className="font-semibold">Indicaciones:</span> {historyDetail.indicaciones || 'N/A'}</p>
              <p><span className="font-semibold">Seguimiento:</span> {formatDateOnly(historyDetail.followup_suggested_at) || 'N/A'}</p>
              <p><span className="font-semibold">Doctor:</span> {`${historyDetail.doctor_nombres || ''} ${historyDetail.doctor_apellidos || ''}`.trim() || 'N/A'}</p>
              <div className="md:col-span-2 rounded-md border p-3">
                <p className="mb-2 font-semibold text-foreground">Receta</p>
                {(historyDetail.prescription_items || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">Esta consulta no tiene receta registrada.</p>
                ) : (
                  <div className="space-y-2">
                    {historyDetail.prescription_items.map((item, index) => (
                      <div key={item.id || `${item.medicamento}-${index}`} className="rounded-md border bg-muted/30 p-2 text-xs">
                        <p><span className="font-semibold text-foreground">Medicamento:</span> {item.medicamento || 'N/A'}</p>
                        <p><span className="font-semibold text-foreground">Dosis:</span> {item.dosis || 'N/A'}</p>
                        <p><span className="font-semibold text-foreground">Frecuencia:</span> {item.frecuencia || 'N/A'}</p>
                        <p><span className="font-semibold text-foreground">Duración:</span> {item.duracion || 'N/A'}</p>
                        <p><span className="font-semibold text-foreground">Notas:</span> {item.notas || 'N/A'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(filePreview)} onOpenChange={(open) => !open && setFilePreview(null)}>
        <DialogContent className="h-[88vh] w-[96vw] max-w-6xl">
          <DialogHeader>
            <DialogTitle>{filePreview?.title || 'Visor de examen PDF'}</DialogTitle>
            <DialogDescription>
              {filePreview ? `${filePreview.file_type_name || 'Archivo clínico'} | ${formatDateOnly(filePreview.exam_date) || 'Sin fecha de examen'}` : ''}
            </DialogDescription>
          </DialogHeader>
          {filePreview ? (
            <iframe
              title="Visor de PDF clínico"
              src={toPreviewUrl(filePreview.storage_key)}
              className="h-full min-h-[65vh] w-full rounded-md border"
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingFile)} onOpenChange={(open) => !open && setEditingFile(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar archivo clínico</DialogTitle>
            <DialogDescription>Actualiza metadatos del archivo seleccionado</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2 md:col-span-2">
              <Label>Título</Label>
              <Input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>Descripción</Label>
              <Input value={editDescription} onChange={(event) => setEditDescription(event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Fecha examen</Label>
              <DateTimePickerInput id="edit_exam_date" value={editExamDate} onChange={setEditExamDate} withTime={false} />
            </div>
            <div className="grid gap-2">
              <Label>Tipo de archivo</Label>
              <SelectField
                className="text-sm"
                value={editFileTypeId}
                onValueChange={setEditFileTypeId}
                options={[
                  { value: '', label: 'Seleccionar tipo' },
                  ...fileTypes.map((item) => ({ value: item.id, label: item.name })),
                ]}
                placeholder="Seleccionar tipo"
              />
            </div>
            <div className="grid gap-2">
              <Label>Proveedor</Label>
              <SelectField
                className="text-sm"
                value={editStorageProviderId}
                onValueChange={setEditStorageProviderId}
                options={[
                  { value: '', label: 'Seleccionar proveedor' },
                  ...storageProviders.map((item) => ({ value: item.id, label: item.name })),
                ]}
                placeholder="Seleccionar proveedor"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              size="icon"
              className="h-9 w-9"
              title={updateFileMutation.isPending ? 'Guardando cambios' : 'Guardar cambios'}
              aria-label={updateFileMutation.isPending ? 'Guardando cambios' : 'Guardar cambios'}
              onClick={handleUpdateFileMetadata}
              disabled={updateFileMutation.isPending}
            >
              <Save className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function ConsultationsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [prescriptionPreview, setPrescriptionPreview] = useState(null)
  const [historyListOpen, setHistoryListOpen] = useState(false)
  const [historyDetail, setHistoryDetail] = useState(null)
  const [historyPatientContext, setHistoryPatientContext] = useState(null)

  const appointmentId = useMemo(() => getAppointmentIdFromPath(location.pathname), [location.pathname])
  const openHistoryFromQuery = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get('openHistory') === '1'
  }, [location.search])
  const isAttentionMode = Boolean(appointmentId)

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPage(1)
      setSearch(searchInput.trim())
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [searchInput])

  useEffect(() => {
    return () => {
      if (prescriptionPreview?.dispose) {
        prescriptionPreview.dispose()
      }
    }
  }, [prescriptionPreview])

  const appointmentsQuery = useQuery({
    queryKey: ['consultations', 'appointments', page, search],
    queryFn: () =>
      listAppointmentsForConsultation({
        page,
        pageSize: 10,
        q: search,
      }),
    enabled: !isAttentionMode,
  })
  const historyFromListQuery = useQuery({
    queryKey: ['consultations', 'history', 'list-modal', historyPatientContext?.patientId],
    queryFn: () => getPatientConsultationHistory(historyPatientContext?.patientId),
    enabled: Boolean(historyListOpen && historyPatientContext?.patientId),
  })

  const prescriptionPdfMutation = useMutation({
    mutationFn: ({ appointmentRowId }) => previewPrescriptionPdf(appointmentRowId),
  })

  const handlePreviewPrescriptionFromList = async (appointmentRowId) => {
    try {
      const preview = await prescriptionPdfMutation.mutateAsync({ appointmentRowId })
      setPrescriptionPreview((previous) => {
        if (previous?.dispose) previous.dispose()
        return preview
      })
    } catch (error) {
      toast.error(error.message || 'No se pudo abrir la receta en PDF')
    }
  }

  if (isAttentionMode) {
    return (
      <div className="grid gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Atención de consulta</h2>
          <p className="text-sm text-muted-foreground">Consulta clínica, receta y exámenes en un solo flujo</p>
        </div>
        <ConsultationAttentionView appointmentId={appointmentId} onBack={() => navigate('/consultations')} openHistoryOnLoad={openHistoryFromQuery} />
      </div>
    )
  }

  const rows = appointmentsQuery.data?.data || []
  const meta = appointmentsQuery.data?.meta
  const currentPage = Math.max(1, Number(meta?.page || 1))
  const totalPages = Math.max(1, Number(meta?.totalPages || 1))
  const pageNumbers = buildVisiblePageNumbers(currentPage, totalPages, 10)

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Consultas</CardTitle>
          <p className="text-sm text-muted-foreground">Listado de citas para atender consulta clínica</p>
        </div>
        <Input
          className="h-9 w-full md:w-[320px]"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Buscar por doctor, paciente, DPI o motivo"
        />
      </CardHeader>
      <CardContent className="space-y-4">
        {appointmentsQuery.isLoading ? (
          <ErpLoadingEmpty title="Cargando citas para consulta" className="py-8" />
        ) : rows.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">No hay citas para mostrar</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((row) => (
              <button
                key={row.appointment_id}
                type="button"
                className="rounded-lg border p-4 text-left transition-colors hover:bg-muted/40"
                onClick={() => navigate(`/consultations/attention/${row.appointment_id}`)}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{`${row.patient_nombres || ''} ${row.patient_apellidos || ''}`.trim()}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(row.start_at)}</p>
                  </div>
                  <span className="rounded-md border px-2 py-0.5 text-xs">
                    {row.appointment_status_name || row.appointment_status_code || 'Sin estado'}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground">
                  <p><span className="font-medium text-foreground">Doctor:</span> {`${row.doctor_nombres || ''} ${row.doctor_apellidos || ''}`.trim() || row.doctor_username}</p>
                  <p><span className="font-medium text-foreground">Estado cita:</span> {row.appointment_status_name || row.appointment_status_code}</p>
                  <p><span className="font-medium text-foreground">Motivo:</span> {row.motivo || 'Sin motivo registrado'}</p>
                  <p><span className="font-medium text-foreground">Paciente:</span> Haz click para ver ficha completa, historial y llenar consulta.</p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation()
                      navigate(`/consultations/attention/${row.appointment_id}`)
                    }}
                  >
                    <Stethoscope className="mr-1 h-4 w-4" />
                    Atender
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation()
                      setHistoryPatientContext({
                        patientId: row.patient_id,
                        patientName: `${row.patient_nombres || ''} ${row.patient_apellidos || ''}`.trim(),
                      })
                      setHistoryDetail(null)
                      setHistoryListOpen(true)
                    }}
                  >
                    <Eye className="mr-1 h-4 w-4" />
                    Historial completo
                  </Button>
                  {row.consultation_id ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation()
                        handlePreviewPrescriptionFromList(row.appointment_id)
                      }}
                      disabled={prescriptionPdfMutation.isPending}
                    >
                      <Pill className="mr-1 h-4 w-4" />
                      Receta
                    </Button>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t pt-3 text-sm">
          <p className="text-muted-foreground">
            Página {meta?.page || 1} de {meta?.totalPages || 1} | Total: {meta?.total || 0}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9"
              title="Página anterior"
              aria-label="Página anterior"
              disabled={currentPage <= 1}
              onClick={() => setPage(Math.max(1, currentPage - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1">
              {pageNumbers.map((pageNumber) => (
                <Button
                  key={pageNumber}
                  type="button"
                  variant={pageNumber === currentPage ? 'default' : 'outline'}
                  className="h-9 min-w-9 px-2"
                  onClick={() => setPage(pageNumber)}
                  aria-label={`Ir a página ${pageNumber}`}
                  title={`Página ${pageNumber}`}
                >
                  {pageNumber}
                </Button>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9"
              title="Página siguiente"
              aria-label="Página siguiente"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>

      <Dialog
        open={historyListOpen}
        onOpenChange={(open) => {
          setHistoryListOpen(open)
          if (!open) {
            setHistoryDetail(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Historial médico</DialogTitle>
            <DialogDescription>
              {historyPatientContext?.patientName
                ? `Consultas previas de ${historyPatientContext.patientName}`
                : 'Consultas previas del paciente'}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[65vh] space-y-3 overflow-y-auto">
            {historyFromListQuery.isLoading ? (
              <ErpLoadingEmpty title="Cargando historial clínico" />
            ) : (historyFromListQuery.data?.data || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay consultas registradas para este paciente</p>
            ) : (
              (historyFromListQuery.data?.data || []).map((item) => (
                <div key={item.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-foreground">{item.motivo || 'Sin motivo'}</p>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0"
                      title="Consultar detalle"
                      aria-label="Consultar detalle"
                      onClick={() => setHistoryDetail(item)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="mt-1 text-muted-foreground">{item.historia || 'Sin historia clínica'}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Doctor: {`${item.doctor_nombres || ''} ${item.doctor_apellidos || ''}`.trim() || 'N/A'}
                  </p>
                  <p className="text-xs text-muted-foreground">Fecha: {formatDateTime(item.created_at)}</p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(historyDetail)} onOpenChange={(open) => !open && setHistoryDetail(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{historyDetail?.motivo || 'Detalle de consulta'}</DialogTitle>
            <DialogDescription>
              {historyDetail ? `Consulta registrada el ${formatDateTime(historyDetail.created_at)}` : ''}
            </DialogDescription>
          </DialogHeader>
          {historyDetail ? (
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <p className="md:col-span-2"><span className="font-semibold">Historia:</span> {historyDetail.historia || 'N/A'}</p>
              <p className="md:col-span-2"><span className="font-semibold">Diagnóstico:</span> {historyDetail.diagnostico || 'N/A'}</p>
              <p className="md:col-span-2"><span className="font-semibold">Plan:</span> {historyDetail.plan || 'N/A'}</p>
              <p className="md:col-span-2"><span className="font-semibold">Indicaciones:</span> {historyDetail.indicaciones || 'N/A'}</p>
              <p><span className="font-semibold">Seguimiento:</span> {formatDateOnly(historyDetail.followup_suggested_at) || 'N/A'}</p>
              <p><span className="font-semibold">Doctor:</span> {`${historyDetail.doctor_nombres || ''} ${historyDetail.doctor_apellidos || ''}`.trim() || 'N/A'}</p>
              <div className="md:col-span-2 rounded-md border p-3">
                <p className="mb-2 font-semibold text-foreground">Receta</p>
                {(historyDetail.prescription_items || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">Esta consulta no tiene receta registrada.</p>
                ) : (
                  <div className="space-y-2">
                    {historyDetail.prescription_items.map((item, index) => (
                      <div key={item.id || `${item.medicamento}-${index}`} className="rounded-md border bg-muted/30 p-2 text-xs">
                        <p><span className="font-semibold text-foreground">Medicamento:</span> {item.medicamento || 'N/A'}</p>
                        <p><span className="font-semibold text-foreground">Dosis:</span> {item.dosis || 'N/A'}</p>
                        <p><span className="font-semibold text-foreground">Frecuencia:</span> {item.frecuencia || 'N/A'}</p>
                        <p><span className="font-semibold text-foreground">Duración:</span> {item.duracion || 'N/A'}</p>
                        <p><span className="font-semibold text-foreground">Notas:</span> {item.notas || 'N/A'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(prescriptionPreview?.objectUrl)}
        onOpenChange={(open) => {
          if (!open) {
            setPrescriptionPreview((previous) => {
              if (previous?.dispose) previous.dispose()
              return null
            })
          }
        }}
      >
        <DialogContent className="h-[88vh] w-[96vw] max-w-6xl">
          <DialogHeader>
            <DialogTitle>Visor de receta</DialogTitle>
            <DialogDescription>{prescriptionPreview?.filename || 'Receta médica en PDF'}</DialogDescription>
          </DialogHeader>
          {prescriptionPreview?.objectUrl ? (
            <iframe
              title="Visor PDF receta médica"
              src={prescriptionPreview.objectUrl}
              className="h-full min-h-[65vh] w-full rounded-md border"
            />
          ) : null}
        </DialogContent>
      </Dialog>

    </Card>
  )
}
