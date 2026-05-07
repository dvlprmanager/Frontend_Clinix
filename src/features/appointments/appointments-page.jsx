import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import esLocale from '@fullcalendar/core/locales/es'
import { Ban, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, List, Pencil, Plus, ReceiptText, RotateCcw, Save, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErpLoadingEmpty } from '@/components/common/erp-loading-empty'
import { ConfirmActionDialog } from '@/components/common/confirm-action-dialog'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectField } from '@/components/ui/select-field'
import { DateTimePickerInput } from '@/components/ui/date-time-picker-input'
import { IconTooltipButton } from '@/components/common/icon-tooltip-button'
import { InvoiceCreateDialog } from '@/features/invoices/invoice-create-dialog'
import { EntityTable } from '@/shared/components/catalog/entity-table'
import {
  cancelAppointment,
  createAppointment,
  getAppointmentById,
  getAppointmentsLookups,
  listAppointments,
  listAppointmentsByRange,
  updateAppointment,
} from '@/features/appointments/appointments-api'
import { useAuth } from '@/features/auth/use-auth'
import { useNavigate, useSearchParams } from 'react-router-dom'

function toDateTimeLocalValue(date, hour = null, minute = null) {
  const copy = new Date(date)
  if (hour !== null && minute !== null) {
    copy.setHours(hour, minute, 0, 0)
  }
  const year = copy.getFullYear()
  const month = String(copy.getMonth() + 1).padStart(2, '0')
  const day = String(copy.getDate()).padStart(2, '0')
  const hours = String(copy.getHours()).padStart(2, '0')
  const minutes = String(copy.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`.slice(0, 16)
}

function toDateOnlyValue(date) {
  return toDateTimeLocalValue(date).slice(0, 10)
}

function getDefaultFormValues(date = new Date()) {
  return {
    doctor_user_id: '',
    patient_id: '',
    appointment_type_id: '',
    appointment_status_id: '',
    start_at: toDateTimeLocalValue(date, 9, 0),
    end_at: toDateTimeLocalValue(date, 9, 30),
    motivo: '',
    appointment_services: [],
  }
}

function normalizeServiceToForm(service) {
  return {
    service_id: service.service_id || '',
    description: service.description || service.service_name || '',
    qty: String(service.qty ?? 1),
    unit_price: String(service.unit_price ?? 0),
    discount: String(service.discount ?? 0),
    tax: String(service.tax ?? 0),
  }
}

function mapAppointmentToFormValues(appointment) {
  const startAtDate = appointment?.start_at ? new Date(appointment.start_at) : new Date()
  return {
    doctor_user_id: appointment?.doctor_user_id || '',
    patient_id: appointment?.patient_id || '',
    appointment_type_id: appointment?.appointment_type_id || '',
    appointment_status_id: appointment?.appointment_status_id || '',
    start_at: appointment?.start_at ? toDateTimeLocalValue(startAtDate) : toDateTimeLocalValue(new Date(), 9, 0),
    end_at: appointment?.end_at ? toDateTimeLocalValue(new Date(appointment.end_at)) : toDateTimeLocalValue(startAtDate, 9, 30),
    motivo: appointment?.motivo || '',
    appointment_services: Array.isArray(appointment?.appointment_services)
      ? appointment.appointment_services.map(normalizeServiceToForm)
      : [],
  }
}

function roundAmount(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100
}

function normalizeTaxRate(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0.12
  return numeric > 1 ? numeric / 100 : numeric
}

function calculateServiceLine({ qty, unitPrice, taxRate }) {
  const safeQty = Number(qty || 0)
  const safeUnitPrice = Number(unitPrice || 0)
  const safeTaxRate = normalizeTaxRate(taxRate)
  const total = roundAmount(safeQty * safeUnitPrice)
  const subtotal = roundAmount(total / (1 + safeTaxRate))
  const tax = roundAmount(total - subtotal)
  return { subtotal, tax, total }
}

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

function toDayKey(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function startOfDay(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000)
}

function formatHourLabel(date) {
  return new Intl.DateTimeFormat('es-GT', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatDateOnly(value) {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('es-GT', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function formatTimeOnly(value) {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('es-GT', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatTimeRange(startValue, endValue) {
  if (!startValue) return 'N/A'
  const startDate = new Date(startValue)
  if (Number.isNaN(startDate.getTime())) return 'N/A'
  const endDate = endValue ? new Date(endValue) : addMinutes(startDate, 30)
  if (Number.isNaN(endDate.getTime())) return 'N/A'
  const options = { hour: 'numeric', minute: '2-digit', hour12: true }
  const normalize = (value) => value.toLowerCase().replace(/\s+/g, '')
  const startText = normalize(startDate.toLocaleTimeString('es-GT', options))
  const endText = normalize(endDate.toLocaleTimeString('es-GT', options))
  return `${startText} - ${endText}`
}

export function AppointmentsPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const calendarRef = useRef(null)
  const prefillHandledRef = useRef(false)
  const [activeRange, setActiveRange] = useState(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    return { start, end }
  })
  const [calendarTitle, setCalendarTitle] = useState('')
  const [currentView, setCurrentView] = useState('dayGridMonth')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingAppointmentId, setEditingAppointmentId] = useState(null)
  const [isLoadingAppointment, setIsLoadingAppointment] = useState(false)
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [formValues, setFormValues] = useState(() => getDefaultFormValues(new Date()))
  const [activeMainTab, setActiveMainTab] = useState('list')
  const [listPage, setListPage] = useState(1)
  const [doctorFilter, setDoctorFilter] = useState('')
  const [patientFilter, setPatientFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false)
  const [invoicePrefill, setInvoicePrefill] = useState(null)
  const lookupsQuery = useQuery({
    queryKey: ['appointments', 'lookups'],
    queryFn: getAppointmentsLookups,
  })

  const calendarAppointmentsQuery = useQuery({
    queryKey: ['appointments', 'calendar', activeRange.start.toISOString(), activeRange.end.toISOString()],
    queryFn: () =>
      listAppointmentsByRange({
        dateFrom: activeRange.start.toISOString(),
        dateTo: activeRange.end.toISOString(),
      }),
  })
  const appointmentsListQuery = useQuery({
    queryKey: ['appointments', 'list', listPage, doctorFilter, patientFilter, dateFilter, statusFilter],
    queryFn: () => {
      const filters = { estatus: 1 }
      if (doctorFilter) filters.doctor_user_id = doctorFilter
      if (patientFilter) filters.patient_id = patientFilter
      if (statusFilter) filters.appointment_status_id = statusFilter
      if (dateFilter) {
        filters.date_from = `${dateFilter}T00:00:00.000Z`
        filters.date_to = `${dateFilter}T23:59:59.999Z`
      }
      return listAppointments({
        page: listPage,
        pageSize: 10,
        sortBy: 'start_at',
        sortDir: 'desc',
        filters,
      })
    },
  })

  const createMutation = useMutation({
    mutationFn: (payload) => createAppointment(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['appointments'], exact: false })
      toast.success('Cita creada correctamente')
      setIsCreateDialogOpen(false)
      setEditingAppointmentId(null)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ appointmentId, payload }) => updateAppointment(appointmentId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['appointments'], exact: false })
      toast.success('Cita actualizada correctamente')
      setIsCreateDialogOpen(false)
      setEditingAppointmentId(null)
    },
  })

  const lookups = lookupsQuery.data?.data || {}
  const doctors = lookups.doctors || []
  const patients = lookups.patients || []
  const appointmentTypes = lookups.appointmentTypes || []
  const appointmentStatuses = lookups.appointmentStatuses || []
  const pendingStatusId = useMemo(
    () => appointmentStatuses.find((status) => status.code === 'PENDING')?.id || '',
    [appointmentStatuses],
  )
  const confirmedStatusId = useMemo(
    () => appointmentStatuses.find((status) => status.code === 'CONFIRMED')?.id || pendingStatusId,
    [appointmentStatuses, pendingStatusId],
  )
  const services = lookups.services || []

  const appointments = calendarAppointmentsQuery.data?.data || []
  const sortedAppointments = useMemo(() => {
    return [...appointments].sort((left, right) => new Date(left.start_at).getTime() - new Date(right.start_at).getTime())
  }, [appointments])
  const selectedStartDate = useMemo(() => {
    if (formValues.start_at) {
      const parsed = new Date(formValues.start_at)
      if (!Number.isNaN(parsed.getTime())) return parsed
    }
    return selectedDate
  }, [formValues.start_at, selectedDate])
  const selectedDayKey = useMemo(() => toDayKey(selectedStartDate), [selectedStartDate])
  const selectedDayAppointments = useMemo(
    () => sortedAppointments.filter((appointment) => toDayKey(appointment.start_at) === selectedDayKey),
    [selectedDayKey, sortedAppointments],
  )
  const dayTimeSlots = useMemo(() => {
    const dayStart = startOfDay(selectedStartDate)
    if (!dayStart) return []
    const slots = []
    for (let minutes = 6 * 60; minutes <= 20 * 60 + 30; minutes += 30) {
      const slotStart = new Date(dayStart)
      slotStart.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)
      const slotEnd = addMinutes(slotStart, 30)
      const overlaps = selectedDayAppointments.filter((appointment) => {
        if (editingAppointmentId && appointment.id === editingAppointmentId) return false
        const appointmentStart = new Date(appointment.start_at)
        const appointmentEnd = appointment.end_at ? new Date(appointment.end_at) : addMinutes(appointmentStart, 30)
        if (Number.isNaN(appointmentStart.getTime()) || Number.isNaN(appointmentEnd.getTime())) return false
        return appointmentStart < slotEnd && appointmentEnd > slotStart
      })
      const overlapsWithDoctor = formValues.doctor_user_id
        ? overlaps.some(
            (appointment) =>
              appointment.doctor_user_id === formValues.doctor_user_id
              && String(appointment.appointment_status_code || '').toUpperCase() !== 'CANCELED',
          )
        : false
      slots.push({
        slotStart,
        slotEnd,
        overlaps,
        overlapsWithDoctor,
      })
    }
    return slots
  }, [editingAppointmentId, formValues.doctor_user_id, selectedDayAppointments, selectedStartDate])
  const events = useMemo(
    () =>
      appointments.map((appointment) => ({
        id: appointment.id,
        title: `${appointment.patient_nombres || ''} ${appointment.patient_apellidos || ''}`.trim(),
        start: appointment.start_at,
        end: appointment.end_at,
        extendedProps: appointment,
      })),
    [appointments],
  )
  const appointmentsListColumns = useMemo(
    () => [
      {
        key: 'start_at',
        label: 'Fecha',
        render: (value) => formatDateOnly(value),
        headerClassName: 'w-[120px] min-w-[120px]',
        cellClassName: 'w-[120px] min-w-[120px]',
      },
      {
        key: 'consultation_time',
        label: 'Hora consulta',
        render: (_value, row) => formatTimeRange(row.start_at, row.end_at),
        headerClassName: 'w-[150px] min-w-[150px]',
        cellClassName: 'w-[150px] min-w-[150px]',
      },
      {
        key: 'patient_nombres',
        label: 'Paciente',
        render: (_value, row) => `${row.patient_nombres || ''} ${row.patient_apellidos || ''}`.trim() || 'N/A',
        headerClassName: 'w-[110px] min-w-[110px]',
        cellClassName: 'w-[110px] min-w-[110px]',
      },
      {
        key: 'doctor_nombres',
        label: 'Doctor',
        render: (_value, row) => `${row.doctor_nombres || ''} ${row.doctor_apellidos || ''}`.trim() || row.doctor_username || 'N/A',
        headerClassName: 'w-[110px] min-w-[110px]',
        cellClassName: 'w-[110px] min-w-[110px]',
      },
      {
        key: 'appointment_status_name',
        label: 'Estado',
        render: (value, row) => value || row.appointment_status_code || 'N/A',
        headerClassName: 'w-[90px] min-w-[90px]',
        cellClassName: 'w-[90px] min-w-[90px]',
      },
      
    ],
    [],
  )
  const listRows = appointmentsListQuery.data?.data || []
  const listMeta = appointmentsListQuery.data?.meta

  const openCreateDialogForDate = (date) => {
    const selected = new Date(date)
    setSelectedDate(selected)
    setEditingAppointmentId(null)
    setFormValues({
      ...getDefaultFormValues(selected),
      appointment_status_id: pendingStatusId || '',
    })
    setIsCreateDialogOpen(true)
  }

  useEffect(() => {
    if (prefillHandledRef.current) return
    if (lookupsQuery.isLoading) return

    const prefillPatientId = searchParams.get('prefillPatientId') || ''
    const prefillDoctorId = searchParams.get('prefillDoctorId') || ''
    const prefillMotivo = searchParams.get('prefillMotivo') || ''

    if (!prefillPatientId && !prefillDoctorId && !prefillMotivo) return

    const now = new Date()
    const patientId = patients.some((item) => item.id === prefillPatientId) ? prefillPatientId : ''
    const doctorId = doctors.some((item) => item.id === prefillDoctorId) ? prefillDoctorId : ''

    setSelectedDate(now)
    setEditingAppointmentId(null)
    setFormValues({
      ...getDefaultFormValues(now),
      patient_id: patientId,
      doctor_user_id: doctorId,
      appointment_status_id: pendingStatusId || '',
      motivo: prefillMotivo,
    })
    setIsCreateDialogOpen(true)
    prefillHandledRef.current = true

    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('prefillPatientId')
    nextParams.delete('prefillDoctorId')
    nextParams.delete('prefillMotivo')
    setSearchParams(nextParams, { replace: true })
  }, [lookupsQuery.isLoading, searchParams, setSearchParams, patients, doctors])

  const openEditDialogForAppointment = async (appointmentId) => {
    setIsLoadingAppointment(true)
    try {
      const response = await getAppointmentById(appointmentId)
      const appointment = response?.data || response
      setSelectedDate(appointment?.start_at ? new Date(appointment.start_at) : new Date())
      setEditingAppointmentId(appointment.id)
      setFormValues(mapAppointmentToFormValues(appointment))
      setIsCreateDialogOpen(true)
    } catch (error) {
      toast.error(error.message || 'No se pudo cargar la cita')
    } finally {
      setIsLoadingAppointment(false)
    }
  }

  const openCreateDialog = () => {
    const now = new Date()
    setSelectedDate(now)
    setEditingAppointmentId(null)
    setFormValues({
      ...getDefaultFormValues(now),
      appointment_status_id: pendingStatusId || '',
    })
    setIsCreateDialogOpen(true)
  }

  useEffect(() => {
    if (!isCreateDialogOpen) return
    if (editingAppointmentId) return
    if (!pendingStatusId) return
    setFormValues((prev) => {
      if (prev.appointment_status_id) return prev
      return { ...prev, appointment_status_id: pendingStatusId }
    })
  }, [editingAppointmentId, isCreateDialogOpen, pendingStatusId])

  useEffect(() => {
    setListPage(1)
  }, [doctorFilter, patientFilter, dateFilter, statusFilter])

  const moveCalendar = (action) => {
    const api = calendarRef.current?.getApi()
    if (!api) return
    api[action]()
  }

  const changeView = (viewName) => {
    const api = calendarRef.current?.getApi()
    if (!api) return
    api.changeView(viewName)
    setCurrentView(viewName)
  }

  const handleConfirmAppointment = async (row) => {
    try {
      await updateAppointment(row.id, {
        appointment_status_id: confirmedStatusId || pendingStatusId || null,
        cancel_reason: null,
      })
      toast.success('Cita confirmada correctamente')
      await queryClient.invalidateQueries({ queryKey: ['appointments'], exact: false })
    } catch (error) {
      toast.error(error.message || 'No se pudo confirmar la cita')
    }
  }

  const handleCancelAppointment = async (row) => {
    try {
      await cancelAppointment(row.id, 'Cancelada desde recepción')
      toast.success('Cita cancelada correctamente')
      await queryClient.invalidateQueries({ queryKey: ['appointments'], exact: false })
    } catch (error) {
      toast.error(error.message || 'No se pudo cancelar la cita')
    }
  }

  const handleAppointmentServiceChange = (index, field, value) => {
    setFormValues((previous) => {
      const nextServices = [...(previous.appointment_services || [])]
      const current = { ...(nextServices[index] || {}) }
      if (field === 'service_id') {
        const selectedService = services.find((item) => item.id === value)
        current.service_id = value
        current.description = selectedService?.description || selectedService?.name || ''
        current.unit_price = String(selectedService?.default_price ?? 0)
        const currentQty = Number(current.qty || 1)
        const { tax } = calculateServiceLine({
          qty: currentQty,
          unitPrice: selectedService?.default_price ?? 0,
          taxRate: selectedService?.tax_rate ?? 0.12,
        })
        current.discount = '0'
        current.tax = String(tax)
      } else {
        current[field] = value
        if (field === 'qty') {
          const selectedService = services.find((item) => item.id === current.service_id)
          const { tax } = calculateServiceLine({
            qty: Number(value || 0),
            unitPrice: Number(current.unit_price || selectedService?.default_price || 0),
            taxRate: selectedService?.tax_rate ?? 0.12,
          })
          current.tax = String(tax)
          current.discount = '0'
        }
      }
      nextServices[index] = current
      return { ...previous, appointment_services: nextServices }
    })
  }

  const addAppointmentService = () => {
    setFormValues((previous) => ({
      ...previous,
      appointment_services: [
        ...(previous.appointment_services || []),
        { service_id: '', description: '', qty: '1', unit_price: '0', discount: '0', tax: '0' },
      ],
    }))
  }

  const removeAppointmentService = (index) => {
    setFormValues((previous) => ({
      ...previous,
      appointment_services: (previous.appointment_services || []).filter((_, currentIndex) => currentIndex !== index),
    }))
  }

  const handleSubmitCreate = async (event) => {
    event.preventDefault()

    if (!formValues.doctor_user_id || !formValues.patient_id || !formValues.start_at || !formValues.end_at) {
      toast.error('Completa doctor, paciente, inicio y fin')
      return
    }

    const payload = {
      doctor_user_id: formValues.doctor_user_id,
      patient_id: formValues.patient_id,
      appointment_type_id: formValues.appointment_type_id || null,
      appointment_status_id: formValues.appointment_status_id || pendingStatusId || null,
      start_at: formValues.start_at,
      end_at: formValues.end_at,
      motivo: formValues.motivo || null,
      appointment_services: (formValues.appointment_services || [])
        .filter((service) => service.service_id)
        .map((service) => ({
          service_id: service.service_id,
          description: service.description || null,
          qty: Number(service.qty || 1),
          unit_price: Number(service.unit_price || 0),
          discount: Number(service.discount || 0),
          tax: Number(service.tax || 0),
        })),
    }

    try {
      if (editingAppointmentId) {
        await updateMutation.mutateAsync({
          appointmentId: editingAppointmentId,
          payload,
        })
      } else {
        await createMutation.mutateAsync(payload)
      }
    } catch (error) {
      toast.error(error.message || `No se pudo ${editingAppointmentId ? 'actualizar' : 'crear'} la cita`)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <Card className="border-white/70 bg-white/90">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Agenda de Citas</CardTitle>
            <p className="text-sm text-muted-foreground">Operación de recepción para agenda y seguimiento de citas</p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
            <IconTooltipButton
              icon={List}
              label="Listado"
              variant={activeMainTab === 'list' ? 'default' : 'outline'}
              onClick={() => setActiveMainTab('list')}
            />
            <IconTooltipButton
              icon={CalendarDays}
              label="Calendario"
              variant={activeMainTab === 'calendar' ? 'default' : 'outline'}
              onClick={() => setActiveMainTab('calendar')}
            />
            <IconTooltipButton icon={Plus} label="Nueva cita" variant="default" onClick={openCreateDialog} />
          </div>
        </CardHeader>
        {activeMainTab === 'list' ? (
          <CardContent className="pt-0">
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-5">
              <div className="grid gap-1">
                <Label htmlFor="appointments-filter-doctor" className="text-xs">Doctor</Label>
                <SelectField
                  value={doctorFilter}
                  onValueChange={setDoctorFilter}
                  options={[
                    { value: '', label: 'Todos los doctores' },
                    ...doctors.map((doctor) => ({
                      value: doctor.id,
                      label: `${doctor.nombres || ''} ${doctor.apellidos || ''}`.trim() || doctor.username,
                    })),
                  ]}
                  placeholder="Todos los doctores"
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="appointments-filter-patient" className="text-xs">Paciente</Label>
                <SelectField
                  value={patientFilter}
                  onValueChange={setPatientFilter}
                  options={[
                    { value: '', label: 'Todos los pacientes' },
                    ...patients.map((patient) => ({
                      value: patient.id,
                      label: `${patient.nombres || ''} ${patient.apellidos || ''}`.trim(),
                    })),
                  ]}
                  placeholder="Todos los pacientes"
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="appointments-filter-date" className="text-xs">Fecha</Label>
                <Input
                  id="appointments-filter-date"
                  type="date"
                  value={dateFilter}
                  onChange={(event) => setDateFilter(event.target.value)}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="appointments-filter-status" className="text-xs">Estado</Label>
                <SelectField
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                  options={[
                    { value: '', label: 'Todos' },
                    ...appointmentStatuses.map((status) => ({ value: status.id, label: status.name })),
                  ]}
                  placeholder="Todos"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setDoctorFilter('')
                    setPatientFilter('')
                    setDateFilter('')
                    setStatusFilter('')
                  }}
                >
                  Limpiar filtros
                </Button>
              </div>
            </div>
          </CardContent>
        ) : (
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">Vista calendario de citas</p>
          </CardContent>
        )}
      </Card>

      <div className="border-b" />

      {activeMainTab === 'list' ? (
        <div className="min-h-0 flex-1">
          <EntityTable
            columns={appointmentsListColumns}
            rows={listRows}
            isLoading={appointmentsListQuery.isLoading || appointmentsListQuery.isFetching}
            meta={listMeta}
            onPageChange={setListPage}
            actionsColumnClassName="w-[320px] min-w-[320px]"
            renderRowActions={(row) => (
              <>
                {(() => {
                  const statusCode = String(row?.appointment_status_code || '').toUpperCase()
                  const isPending = statusCode === 'PENDING'
                  const isCanceled = statusCode === 'CANCELED' || statusCode === 'CANCELLED'
                  if (!isPending && !isCanceled) return null
                  return (
                    <ConfirmActionDialog
                      triggerElement={(
                        <IconTooltipButton
                          icon={CheckCircle2}
                          label="Confirmar cita"
                          variant="outline"
                        />
                      )}
                      title="Confirmar cita"
                      description="Esta acción cambiará el estado de la cita a confirmada."
                      confirmLabel="Sí, confirmar"
                      cancelLabel="No"
                      onConfirm={() => handleConfirmAppointment(row)}
                    />
                  )
                })()}
                <IconTooltipButton icon={Pencil} label="Editar cita" variant="outline" onClick={() => openEditDialogForAppointment(row.id)} />
                <IconTooltipButton icon={RotateCcw} label="Reagendar cita" variant="outline" onClick={() => openEditDialogForAppointment(row.id)} />
                <IconTooltipButton
                  icon={ReceiptText}
                  label="Facturación"
                  variant="outline"
                  onClick={() => {
                    setInvoicePrefill({
                      appointmentId: row.id,
                      patientId: row.patient_id || '',
                      consultationId: row.consultation_id || '',
                      doctorUserId: row.doctor_user_id || '',
                    })
                    setIsInvoiceDialogOpen(true)
                  }}
                />
                {(() => {
                  const statusCode = String(row?.appointment_status_code || '').toUpperCase()
                  const isConfirmed = statusCode === 'CONFIRMED'
                  if (!isConfirmed) return null
                  return (
                    <ConfirmActionDialog
                      triggerElement={(
                        <IconTooltipButton
                          icon={Ban}
                          label="Cancelar cita"
                          variant="outline"
                        />
                      )}
                      title="Cancelar cita"
                      description="Esta acción cambiará el estado de la cita a cancelada."
                      confirmLabel="Sí, cancelar"
                      cancelLabel="No"
                      onConfirm={() => handleCancelAppointment(row)}
                    />
                  )
                })()}
              </>
            )}
          />
        </div>
      ) : (
        <Card className="flex h-full min-h-0 flex-col">
          <CardContent className="min-h-0 flex flex-1 flex-col space-y-3 overflow-hidden p-3">
            <div className="flex flex-wrap items-center gap-2 px-1 py-2">
              <IconTooltipButton icon={ChevronLeft} label="Anterior" variant="outline" onClick={() => moveCalendar('prev')} />
              <IconTooltipButton
                icon={CalendarDays}
                label="Vista día"
                variant={currentView === 'timeGridDay' ? 'default' : 'outline'}
                onClick={() => changeView('timeGridDay')}
              />
              <IconTooltipButton
                icon={CalendarDays}
                label="Vista semana"
                variant={currentView === 'timeGridWeek' ? 'default' : 'outline'}
                onClick={() => changeView('timeGridWeek')}
              />
              <IconTooltipButton
                icon={CalendarDays}
                label="Vista mes"
                variant={currentView === 'dayGridMonth' ? 'default' : 'outline'}
                onClick={() => changeView('dayGridMonth')}
              />
              <IconTooltipButton icon={ChevronRight} label="Siguiente" variant="outline" onClick={() => moveCalendar('next')} />
              <p className="ml-auto text-sm font-semibold capitalize text-foreground">{calendarTitle || 'Cargando calendario...'}</p>
            </div>
            <div className="min-h-0 flex-1 overflow-auto px-1 pb-1">
              <FullCalendar
                className="erp-calendar"
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                locale={esLocale}
                height="100%"
                headerToolbar={false}
                nowIndicator
                allDaySlot={false}
                dayMaxEvents={3}
                expandRows
                fixedWeekCount
                slotMinTime="06:00:00"
                slotMaxTime="21:00:00"
                events={events}
                dateClick={(info) => openCreateDialogForDate(info.date)}
                eventClick={(info) => {
                  info.jsEvent?.preventDefault()
                  openEditDialogForAppointment(info.event.id)
                }}
                datesSet={(info) => {
                  setCalendarTitle(info.view.title)
                  setCurrentView(info.view.type)
                  const nextStart = info.start
                  const nextEnd = new Date(info.end.getTime() - 1)
                  setActiveRange((prev) => {
                    if (prev.start.getTime() === nextStart.getTime() && prev.end.getTime() === nextEnd.getTime()) {
                      return prev
                    }
                    return { start: nextStart, end: nextEnd }
                  })
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open)
          if (!open) {
            setEditingAppointmentId(null)
          }
        }}
      >
        <DialogContent className="w-[86vw] max-w-6xl h-[60vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAppointmentId ? 'Editar cita' : 'Nueva cita'}</DialogTitle>
            <DialogDescription>Día seleccionado: {toDateOnlyValue(selectedStartDate)}</DialogDescription>
          </DialogHeader>
          {isLoadingAppointment ? (
            <ErpLoadingEmpty title="Cargando información de la cita" className="py-8" />
          ) : null}
          <form className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]" onSubmit={handleSubmitCreate}>
            <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="doctor_user_id">Doctor</Label>
              <SelectField
                value={formValues.doctor_user_id}
                onValueChange={(value) => setFormValues((prev) => ({ ...prev, doctor_user_id: value }))}
                disabled={isLoadingAppointment}
                options={[
                  { value: '', label: 'Selecciona doctor' },
                  ...doctors.map((doctor) => ({
                    value: doctor.id,
                    label: `${doctor.nombres || ''} ${doctor.apellidos || ''}`.trim() || doctor.username,
                  })),
                ]}
                placeholder="Selecciona doctor"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="patient_id">Paciente</Label>
              <SelectField
                value={formValues.patient_id}
                onValueChange={(value) => setFormValues((prev) => ({ ...prev, patient_id: value }))}
                disabled={isLoadingAppointment}
                options={[
                  { value: '', label: 'Selecciona paciente' },
                  ...patients.map((patient) => ({
                    value: patient.id,
                    label: `${patient.nombres || ''} ${patient.apellidos || ''}`.trim(),
                  })),
                ]}
                placeholder="Selecciona paciente"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="start_at">Inicio</Label>
              <DateTimePickerInput
                id="start_at"
                withTime
                value={formValues.start_at}
                onChange={(nextValue) => setFormValues((prev) => ({ ...prev, start_at: nextValue, end_at: prev.end_at || nextValue }))}
                disabled={isLoadingAppointment}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="end_at">Fin</Label>
              <DateTimePickerInput
                id="end_at"
                withTime
                value={formValues.end_at}
                onChange={(nextValue) => setFormValues((prev) => ({ ...prev, end_at: nextValue }))}
                disabled={isLoadingAppointment}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="appointment_type_id">Tipo de cita</Label>
              <SelectField
                value={formValues.appointment_type_id}
                onValueChange={(value) => setFormValues((prev) => ({ ...prev, appointment_type_id: value }))}
                disabled={isLoadingAppointment}
                options={[{ value: '', label: 'Sin tipo' }, ...appointmentTypes.map((item) => ({ value: item.id, label: item.name }))]}
                placeholder="Sin tipo"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="appointment_status_id">Estado inicial</Label>
              <SelectField
                value={formValues.appointment_status_id}
                onValueChange={(value) => setFormValues((prev) => ({ ...prev, appointment_status_id: value }))}
                disabled={isLoadingAppointment}
                options={[
                  { value: pendingStatusId || '', label: 'Pendiente (default)' },
                  ...appointmentStatuses.map((item) => ({ value: item.id, label: item.name })),
                ]}
                placeholder="Pendiente (default)"
              />
            </div>

            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="motivo">Motivo</Label>
              <Input
                id="motivo"
                value={formValues.motivo}
                onChange={(event) => setFormValues((prev) => ({ ...prev, motivo: event.target.value }))}
                placeholder="Motivo de la cita"
                disabled={isLoadingAppointment}
              />
            </div>

            <div className="grid gap-2 md:col-span-2">
              <div className="flex items-center justify-between">
                <Label>Servicios de la cita</Label>
                <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={addAppointmentService} title="Agregar servicio">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {(formValues.appointment_services || []).length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin servicios agregados (opcional)</p>
              ) : (
                <div className="space-y-2">
                  {(formValues.appointment_services || []).map((service, index) => (
                    <div key={`appointment-service-${index}`} className="grid gap-2 rounded-md border p-2 md:grid-cols-10">
                      <div className="md:col-span-3">
                        <Label className="text-xs">Servicio</Label>
                        <SelectField
                          value={service.service_id || ''}
                          onValueChange={(value) => handleAppointmentServiceChange(index, 'service_id', value)}
                          disabled={isLoadingAppointment}
                          options={[
                            { value: '', label: 'Selecciona servicio' },
                            ...services.map((item) => ({ value: item.id, label: item.name })),
                          ]}
                          placeholder="Selecciona servicio"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Cant.</Label>
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={service.qty || '1'}
                          onChange={(event) => handleAppointmentServiceChange(index, 'qty', event.target.value)}
                          disabled={isLoadingAppointment}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">P.Unit</Label>
                        <Input
                          value={Number(service.unit_price || 0).toFixed(2)}
                          readOnly
                          disabled
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Subtotal</Label>
                        <Input
                          value={calculateServiceLine({
                            qty: service.qty || 0,
                            unitPrice: service.unit_price || 0,
                            taxRate: services.find((item) => item.id === service.service_id)?.tax_rate ?? 0.12,
                          }).subtotal.toFixed(2)}
                          readOnly
                          disabled
                        />
                      </div>
                      <div>
                        <Label className="text-xs">IVA</Label>
                        <Input
                          value={calculateServiceLine({
                            qty: service.qty || 0,
                            unitPrice: service.unit_price || 0,
                            taxRate: services.find((item) => item.id === service.service_id)?.tax_rate ?? 0.12,
                          }).tax.toFixed(2)}
                          readOnly
                          disabled
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Total</Label>
                        <Input
                          value={calculateServiceLine({
                            qty: service.qty || 0,
                            unitPrice: service.unit_price || 0,
                            taxRate: services.find((item) => item.id === service.service_id)?.tax_rate ?? 0.12,
                          }).total.toFixed(2)}
                          readOnly
                          disabled
                        />
                      </div>
                      <div className="flex items-end justify-end md:col-span-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeAppointmentService(index)}
                          title="Quitar servicio"
                          disabled={isLoadingAppointment}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-2 md:col-span-2 md:flex-row md:justify-end">
              <IconTooltipButton icon={X} label="Cancelar" variant="outline" onClick={() => setIsCreateDialogOpen(false)} />
              <IconTooltipButton
                icon={Save}
                label={editingAppointmentId ? 'Editar' : 'Guardar'}
                variant="default"
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending || isLoadingAppointment}
              />
            </div>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">Horarios del día</p>
                <p className="text-xs text-muted-foreground">{toDateOnlyValue(selectedStartDate)}</p>
              </div>
              <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                {dayTimeSlots.map((slot) => {
                  const slotStartValue = toDateTimeLocalValue(slot.slotStart)
                  const isSelected = formValues.start_at === slotStartValue
                  const hasOverlaps = slot.overlaps.length > 0
                  return (
                    <button
                      key={slotStartValue}
                      type="button"
                      className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-foreground'
                          : slot.overlapsWithDoctor
                            ? 'border-rose-300 bg-rose-50 text-rose-900 hover:bg-rose-100'
                            : hasOverlaps
                              ? 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                              : 'border-border bg-background text-foreground hover:bg-muted'
                      }`}
                      onClick={() => {
                        const nextStart = toDateTimeLocalValue(slot.slotStart)
                        const nextEnd = toDateTimeLocalValue(addMinutes(slot.slotStart, 30))
                        setFormValues((prev) => ({
                          ...prev,
                          start_at: nextStart,
                          end_at: nextEnd,
                        }))
                      }}
                    >
                      <span className="font-medium">{formatHourLabel(slot.slotStart)} - {formatHourLabel(slot.slotEnd)}</span>
                      <span className="text-xs">
                        {slot.overlapsWithDoctor
                          ? 'Ocupado (doctor)'
                          : hasOverlaps
                            ? `${slot.overlaps.length} cita(s)`
                            : 'Disponible'}
                      </span>
                    </button>
                  )
                })}
              </div>
              <div className="mt-3 rounded-md border bg-background p-2">
                <p className="text-xs font-semibold text-foreground">Citas agendadas del día</p>
                {selectedDayAppointments.length === 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">Sin citas para este día.</p>
                ) : (
                  <div className="mt-2 max-h-[180px] space-y-1 overflow-y-auto pr-1">
                    {selectedDayAppointments.map((appointment) => (
                      <div key={appointment.id} className="rounded border px-2 py-1 text-xs">
                        <p className="font-medium text-foreground">
                          {formatHourLabel(new Date(appointment.start_at))}
                          {' - '}
                          {formatHourLabel(appointment.end_at ? new Date(appointment.end_at) : addMinutes(new Date(appointment.start_at), 30))}
                        </p>
                        <p className="text-muted-foreground">
                          {`${appointment.patient_nombres || ''} ${appointment.patient_apellidos || ''}`.trim()}
                          {' | '}
                          {appointment.appointment_status_name || appointment.appointment_status_code || 'N/A'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <InvoiceCreateDialog
        open={isInvoiceDialogOpen}
        onOpenChange={setIsInvoiceDialogOpen}
        prefill={invoicePrefill}
      />
    </div>
  )
}
