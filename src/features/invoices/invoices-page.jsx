import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { ChevronLeft, ChevronRight, Eye, FileText, Pencil, Plus, Save, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ConfirmActionDialog } from '@/components/common/confirm-action-dialog'
import { ErpTableLoadingRow } from '@/components/common/erp-loading-empty'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectField } from '@/components/ui/select-field'
import { buildVisiblePageNumbers } from '@/lib/pagination'
import {
  createInvoice,
  getInvoiceById,
  getInvoicesLookups,
  listInvoices,
  patchInvoiceOperationalStatus,
  previewInvoicePdf,
  updateInvoice,
  updateInvoiceStatus,
} from '@/features/invoices/invoices-api'

function toDateInputValue(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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

function formatCurrency(value) {
  const amount = Number(value || 0)
  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: 'GTQ',
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatAppointmentOptionLabel(appointment) {
  const startAt = appointment?.start_at ? formatDateTime(appointment.start_at) : 'Sin fecha'
  const status = appointment?.appointment_status_name || appointment?.appointment_status_code || 'N/A'
  return `${startAt} • ${status}`
}

function calculateLineValues(item) {
  const qty = Number(item?.qty || 0)
  const unitPrice = Number(item?.unit_price || 0)
  const total = qty * unitPrice
  const subtotal = total / 1.12
  const tax = total - subtotal
  return { subtotal, tax, total }
}

const emptyItem = {
  service_id: '',
  description: '',
  qty: '1',
  unit_price: '0',
  discount: '0',
  tax: '0',
}

const emptyPayment = {
  method_id: '',
  amount: '',
  reference_no: '',
  notes: '',
}

export function InvoicesPage() {
  const queryClient = useQueryClient()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [operationalFilter, setOperationalFilter] = useState('1')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingInvoiceId, setEditingInvoiceId] = useState(null)
  const [viewingInvoice, setViewingInvoice] = useState(null)
  const [editingAppointmentFallback, setEditingAppointmentFallback] = useState(null)
  const [invoicePreview, setInvoicePreview] = useState(null)
  const [isLockedFromConsultationFlow, setIsLockedFromConsultationFlow] = useState(false)

  const {
    register,
    control,
    watch,
    reset,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      invoice_no: '',
      patient_id: '',
      doctor_user_id: '',
      appointment_id: '',
      consultation_id: '',
      issued_at: toDateInputValue(new Date()),
      invoice_status_id: '',
      items: [emptyItem],
      payments: [emptyPayment],
    },
    mode: 'onBlur',
  })

  const { fields, replace, append, remove } = useFieldArray({
    control,
    name: 'items',
  })

  const {
    fields: paymentFields,
    append: appendPayment,
    remove: removePayment,
  } = useFieldArray({
    control,
    name: 'payments',
  })

  const lookupsQuery = useQuery({
    queryKey: ['invoices', 'lookups'],
    queryFn: getInvoicesLookups,
  })

  const invoicesQuery = useQuery({
    queryKey: ['invoices', page, search, statusFilter, operationalFilter],
    queryFn: () =>
      listInvoices({
        page,
        pageSize: 10,
        sortBy: 'issued_at',
        sortDir: 'desc',
        q: search,
        filters: {
          invoice_status_id: statusFilter || undefined,
          estatus: operationalFilter === 'all' ? undefined : Number(operationalFilter),
        },
      }),
  })

  const createMutation = useMutation({
    mutationFn: (payload) => createInvoice(payload),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ['invoices'], exact: false })
      toast.success('Factura creada correctamente')
      if (Number(response?.data?.balance || 0) > 0) {
        toast.info(`Factura con saldo pendiente: ${formatCurrency(response.data.balance)}`)
      }
      setIsFormOpen(false)
      setEditingInvoiceId(null)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateInvoice(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['invoices'], exact: false })
      toast.success('Factura actualizada correctamente')
      setIsFormOpen(false)
      setEditingInvoiceId(null)
    },
  })

  const patchOperationalStatusMutation = useMutation({
    mutationFn: ({ id, estatus }) => patchInvoiceOperationalStatus(id, estatus),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['invoices'], exact: false })
      toast.success('Estado operativo actualizado')
    },
  })

  const patchInvoiceStatusMutation = useMutation({
    mutationFn: ({ id, invoiceStatusId }) => updateInvoiceStatus(id, invoiceStatusId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['invoices'], exact: false })
      toast.success('Estado de factura actualizado')
    },
  })

  const invoicePdfMutation = useMutation({
    mutationFn: ({ invoiceId }) => previewInvoicePdf(invoiceId),
  })

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPage(1)
      setSearch(searchInput.trim())
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [searchInput])

  useEffect(() => {
    return () => {
      if (invoicePreview?.dispose) {
        invoicePreview.dispose()
      }
    }
  }, [invoicePreview])

  const handlePreviewInvoicePdf = async (invoiceId) => {
    try {
      const preview = await invoicePdfMutation.mutateAsync({ invoiceId })
      setInvoicePreview((previous) => {
        if (previous?.dispose) previous.dispose()
        return preview
      })
    } catch (error) {
      toast.error(error.message || 'No se pudo abrir la factura en PDF')
    }
  }

  const lookups = lookupsQuery.data?.data || {}
  const patients = lookups.patients || []
  const doctors = lookups.doctors || []
  const invoiceStatuses = lookups.invoiceStatuses || []
  const paymentMethods = lookups.paymentMethods || []
  const billableAppointments = lookups.billableAppointments || []
  const services = lookups.services || []
  const nextInvoiceNo = lookups.nextInvoiceNo || ''
  const defaultStatusId = useMemo(
    () => invoiceStatuses.find((item) => item.code === 'ISSUED')?.id || invoiceStatuses[0]?.id || '',
    [invoiceStatuses],
  )
  const selectedPatientId = watch('patient_id')
  const selectedAppointmentId = watch('appointment_id')
  const selectedDoctorId = watch('doctor_user_id')
  const patientAppointments = useMemo(
    () => billableAppointments.filter((appointment) => appointment.patient_id === selectedPatientId),
    [billableAppointments, selectedPatientId],
  )
  const appointmentOptions = useMemo(() => {
    if (!editingAppointmentFallback?.id) return patientAppointments
    if (patientAppointments.some((appointment) => appointment.id === editingAppointmentFallback.id)) return patientAppointments
    return [editingAppointmentFallback, ...patientAppointments]
  }, [editingAppointmentFallback, patientAppointments])
  const selectedAppointment = useMemo(
    () => appointmentOptions.find((appointment) => appointment.id === selectedAppointmentId) || null,
    [appointmentOptions, selectedAppointmentId],
  )
  const selectedDoctor = useMemo(
    () => doctors.find((doctor) => doctor.id === selectedDoctorId) || null,
    [doctors, selectedDoctorId],
  )
  const prefillParams = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return {
      appointmentId: params.get('appointmentId') || '',
      patientId: params.get('patientId') || '',
      consultationId: params.get('consultationId') || '',
      doctorUserId: params.get('doctorUserId') || '',
    }
  }, [location.search])
  const prefillKey = `${prefillParams.appointmentId}|${prefillParams.consultationId}`
  const [consumedPrefillKey, setConsumedPrefillKey] = useState('')

  useEffect(() => {
    if (!watch('invoice_status_id') && defaultStatusId) {
      setValue('invoice_status_id', defaultStatusId)
    }
  }, [defaultStatusId, setValue, watch])

  const items = useWatch({ control, name: 'items' }) || []
  const payments = useWatch({ control, name: 'payments' }) || []
  const totals = useMemo(() => {
    return items.reduce(
      (accumulator, item) => {
        const { subtotal, tax, total } = calculateLineValues(item)
        accumulator.subtotal += subtotal
        accumulator.tax += tax
        accumulator.total += total
        return accumulator
      },
      { subtotal: 0, discount: 0, tax: 0, total: 0 },
    )
  }, [items])
  const paymentsTotal = useMemo(
    () => payments.reduce((sum, payment) => sum + Number(payment?.amount || 0), 0),
    [payments],
  )
  const paymentDifference = useMemo(
    () => Number((Number(totals.total || 0) - Number(paymentsTotal || 0)).toFixed(2)),
    [paymentsTotal, totals.total],
  )

  const openCreate = (prefill = null) => {
    const prefillAppointment = prefill?.appointmentId
      ? billableAppointments.find((appointment) => appointment.id === prefill.appointmentId) || null
      : null
    const resolvedPatientId = prefillAppointment?.patient_id || prefill?.patientId || ''
    const resolvedAppointmentId = prefillAppointment?.id || prefill?.appointmentId || ''
    const resolvedDoctorId = prefillAppointment?.doctor_user_id || prefill?.doctorUserId || ''
    const resolvedConsultationId = prefillAppointment?.consultation_id || prefill?.consultationId || ''
    const isPrefilledFromConsultation = Boolean(resolvedConsultationId || resolvedAppointmentId)

    setEditingAppointmentFallback(null)
    setEditingInvoiceId(null)
    setIsLockedFromConsultationFlow(isPrefilledFromConsultation)
    reset({
      invoice_no: nextInvoiceNo || '',
      patient_id: resolvedPatientId,
      doctor_user_id: resolvedDoctorId,
      appointment_id: resolvedAppointmentId,
      consultation_id: resolvedConsultationId,
      issued_at: toDateInputValue(new Date()),
      invoice_status_id: defaultStatusId,
      items: [emptyItem],
      payments: [emptyPayment],
    })
    setIsFormOpen(true)
  }

  useEffect(() => {
    if (!isFormOpen || editingInvoiceId) return
    setValue('invoice_no', nextInvoiceNo || '')
    setValue('issued_at', toDateInputValue(new Date()))
  }, [editingInvoiceId, isFormOpen, nextInvoiceNo, setValue])

  useEffect(() => {
    if (consumedPrefillKey === prefillKey) return
    if (!prefillParams.appointmentId && !prefillParams.consultationId) return
    if (lookupsQuery.isLoading) return

    let prefillAppointment = null
    if (prefillParams.appointmentId) {
      prefillAppointment = billableAppointments.find((appointment) => appointment.id === prefillParams.appointmentId) || null
    } else if (prefillParams.consultationId) {
      prefillAppointment = billableAppointments.find((appointment) => appointment.consultation_id === prefillParams.consultationId) || null
    }

    if (!prefillAppointment) {
      toast.error('No se encontró una cita atendida disponible para facturar')
      setConsumedPrefillKey(prefillKey)
      navigate('/invoices', { replace: true })
      return
    }

    openCreate({
      appointmentId: prefillAppointment.id,
      patientId: prefillAppointment.patient_id,
      doctorUserId: prefillAppointment.doctor_user_id,
      consultationId: prefillAppointment.consultation_id,
    })
    setConsumedPrefillKey(prefillKey)
    navigate('/invoices', { replace: true })
  }, [billableAppointments, consumedPrefillKey, lookupsQuery.isLoading, navigate, prefillKey, prefillParams])

  useEffect(() => {
    if (!isFormOpen) return
    if (editingInvoiceId) return
    if (!selectedPatientId) {
      setValue('appointment_id', '')
      setValue('doctor_user_id', '')
      setValue('consultation_id', '')
      replace([emptyItem])
      return
    }

    if (selectedAppointmentId && !patientAppointments.some((appointment) => appointment.id === selectedAppointmentId)) {
      setValue('appointment_id', '')
      setValue('doctor_user_id', '')
      setValue('consultation_id', '')
      replace([emptyItem])
    }
  }, [editingInvoiceId, isFormOpen, patientAppointments, replace, selectedAppointmentId, selectedPatientId, setValue])

  useEffect(() => {
    if (!isFormOpen) return
    if (editingInvoiceId) return
    if (!selectedAppointment) return

    setValue('doctor_user_id', selectedAppointment.doctor_user_id || '')
    setValue('consultation_id', selectedAppointment.consultation_id || '')

    const appointmentServices = Array.isArray(selectedAppointment.services) ? selectedAppointment.services : []
    if (appointmentServices.length === 0) {
      replace([emptyItem])
      return
    }
    replace(appointmentServices.map((service) => ({
      service_id: service.service_id || '',
      description: service.description || service.service_name || '',
      qty: String(service.qty || 1),
      unit_price: String(service.unit_price || 0),
      discount: String(service.discount || 0),
      tax: String(calculateLineValues({ qty: service.qty || 1, unit_price: service.unit_price || 0 }).tax),
    })))
  }, [editingInvoiceId, isFormOpen, replace, selectedAppointment, setValue])

  const openEdit = async (invoiceId) => {
    try {
      const response = await getInvoiceById(invoiceId)
      const invoice = response.data
      setEditingAppointmentFallback(
        invoice.appointment_id
          ? {
              id: invoice.appointment_id,
              patient_id: invoice.patient_id || '',
              start_at: invoice.appointment_start_at || null,
              appointment_status_name: invoice.appointment_status_name || '',
              appointment_status_code: invoice.appointment_status_code || '',
            }
          : null,
      )
      reset({
        invoice_no: invoice.invoice_no || '',
        patient_id: invoice.patient_id || '',
        doctor_user_id: invoice.doctor_user_id || '',
        appointment_id: invoice.appointment_id || '',
        consultation_id: invoice.consultation_id || '',
        issued_at: toDateInputValue(invoice.issued_at) || toDateInputValue(new Date()),
        invoice_status_id: invoice.invoice_status_id || defaultStatusId,
        items: (invoice.items || []).map((item) => ({
          service_id: item.service_id || '',
          description: item.description || '',
          qty: String(item.qty || '1'),
          unit_price: String(item.unit_price || '0'),
          discount: String(item.discount || '0'),
          tax: String(calculateLineValues({ qty: item.qty || 1, unit_price: item.unit_price || 0 }).tax),
        })),
        payments: [emptyPayment],
      })
      if ((invoice.items || []).length === 0) {
        replace([emptyItem])
      }
      setEditingInvoiceId(invoiceId)
      setIsLockedFromConsultationFlow(false)
      setIsFormOpen(true)
    } catch (error) {
      toast.error(error.message || 'No se pudo cargar la factura')
    }
  }

  const onSubmit = async (values) => {
    const payload = {
      invoice_no: values.invoice_no || undefined,
      patient_id: values.patient_id,
      doctor_user_id: values.doctor_user_id,
      appointment_id: values.appointment_id || null,
      consultation_id: values.consultation_id || null,
      issued_at: null,
      invoice_status_id: values.invoice_status_id || null,
      items: (values.items || []).map((item) => ({
        service_id: item.service_id || null,
        description: item.description,
        qty: Number(item.qty || 0),
        unit_price: Number(item.unit_price || 0),
        discount: 0,
        tax: calculateLineValues(item).tax,
      })),
    }
    if (!editingInvoiceId) {
      const normalizedPayments = (values.payments || [])
        .map((payment) => ({
          method_id: payment?.method_id || '',
          amount: Number(payment?.amount || 0),
          reference_no: payment?.reference_no?.trim() || '',
          notes: payment?.notes?.trim() || '',
        }))
        .filter((payment) => payment.method_id || payment.amount > 0 || payment.reference_no || payment.notes)

      if (normalizedPayments.length === 0) {
        toast.error('Debes registrar al menos un pago antes de generar la factura')
        return
      }

      for (let index = 0; index < normalizedPayments.length; index += 1) {
        const payment = normalizedPayments[index]
        if (!payment.method_id) {
          toast.error(`Selecciona método de pago en el pago #${index + 1}`)
          return
        }
        if (!Number.isFinite(payment.amount) || payment.amount <= 0) {
          toast.error(`El monto del pago #${index + 1} debe ser mayor a 0`)
          return
        }
      }

      const totalPayments = Number(
        normalizedPayments.reduce((sum, payment) => sum + payment.amount, 0).toFixed(2),
      )
      const totalInvoice = Number(Number(totals.total || 0).toFixed(2))
      if (totalPayments !== totalInvoice) {
        toast.error('El total de pagos debe coincidir exactamente con el total de la factura')
        return
      }

      payload.payments = normalizedPayments.map((payment) => ({
        method_id: payment.method_id,
        amount: payment.amount,
        reference_no: payment.reference_no || null,
        notes: payment.notes || null,
      }))
    }

    try {
      if (editingInvoiceId) {
        await updateMutation.mutateAsync({ id: editingInvoiceId, payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
    } catch (error) {
      toast.error(error.message || 'No se pudo guardar la factura')
    }
  }

  const rows = invoicesQuery.data?.data || []
  const meta = invoicesQuery.data?.meta
  const currentPage = Math.max(1, Number(meta?.page || 1))
  const totalPages = Math.max(1, Number(meta?.totalPages || 1))
  const pageNumbers = buildVisiblePageNumbers(currentPage, totalPages, 10)

  return (
    <Card className="flex h-full min-h-0 flex-col">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Facturación</CardTitle>
          <p className="text-sm text-muted-foreground">Gestión de facturas, totales e impuestos</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
          <Input
            className="h-9 w-full md:w-[280px]"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Buscar por no. factura, paciente o doctor"
          />
          <SelectField
            className="h-9 text-sm"
            value={statusFilter}
            onValueChange={(value) => {
              setPage(1)
              setStatusFilter(value)
            }}
            options={[
              { value: '', label: 'Todos los estados' },
              ...invoiceStatuses.map((item) => ({ value: item.id, label: item.name })),
            ]}
            placeholder="Todos los estados"
          />
          <Button type="button" className="shrink-0" onClick={openCreate} aria-label="Nueva factura" title="Nueva factura">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 p-0">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1100px] border-collapse text-sm">
            <thead className="bg-muted/60 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold text-foreground">Factura</th>
                <th className="px-4 py-3 font-semibold text-foreground">Fecha</th>
                <th className="px-4 py-3 font-semibold text-foreground">Paciente</th>
                <th className="px-4 py-3 font-semibold text-foreground">Doctor</th>
                <th className="px-4 py-3 font-semibold text-foreground">Estado</th>
                <th className="px-4 py-3 font-semibold text-foreground">Total</th>
                <th className="px-4 py-3 font-semibold text-foreground">Saldo</th>
                <th className="px-4 py-3 font-semibold text-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {invoicesQuery.isLoading ? (
                <ErpTableLoadingRow colSpan={8} title="Cargando facturas" />
              ) : rows.length === 0 ? (
                <tr><td className="px-4 py-6 text-muted-foreground" colSpan={8}>No hay facturas para mostrar</td></tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-4 py-3">{row.invoice_no}</td>
                    <td className="px-4 py-3">{formatDateTime(row.issued_at)}</td>
                    <td className="px-4 py-3">{`${row.patient_nombres || ''} ${row.patient_apellidos || ''}`.trim()}</td>
                    <td className="px-4 py-3">{`${row.doctor_nombres || ''} ${row.doctor_apellidos || ''}`.trim()}</td>
                    <td className="px-4 py-3">{row.invoice_status_name || row.invoice_status_code}</td>
                    <td className="px-4 py-3">{formatCurrency(row.total)}</td>
                    <td className="px-4 py-3">{formatCurrency(row.balance)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-9 w-9"
                          title={invoicePdfMutation.isPending ? 'Abriendo factura' : 'Visualizar factura'}
                          aria-label={invoicePdfMutation.isPending ? 'Abriendo factura' : 'Visualizar factura'}
                          onClick={() => handlePreviewInvoicePdf(row.id)}
                          disabled={invoicePdfMutation.isPending}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-9 w-9"
                          title="Ver detalle"
                          aria-label="Ver detalle"
                          onClick={async () => {
                            try {
                              const response = await getInvoiceById(row.id)
                              setViewingInvoice(response.data)
                            } catch (error) {
                              toast.error(error.message || 'No se pudo cargar la factura')
                            }
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-9 w-9"
                          title="Editar factura"
                          aria-label="Editar factura"
                          onClick={() => openEdit(row.id)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <ConfirmActionDialog
                          triggerElement={(
                            <Button
                              type="button"
                              size="icon"
                              variant="secondary"
                              className="h-9 w-9"
                              title={Number(row.estatus) === 1 ? 'Inactivar' : 'Activar'}
                              aria-label={Number(row.estatus) === 1 ? 'Inactivar' : 'Activar'}
                            >
                              {Number(row.estatus) === 1 ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
                            </Button>
                          )}
                          title={Number(row.estatus) === 1 ? 'Inactivar factura' : 'Activar factura'}
                          description="Esta acción cambia el estado operativo y afecta su disponibilidad en el flujo."
                          confirmLabel="Confirmar"
                          cancelLabel="Cancelar"
                          onConfirm={() =>
                            patchOperationalStatusMutation.mutate({
                              id: row.id,
                              estatus: Number(row.estatus) === 1 ? 0 : 1,
                            })
                          }
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
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

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="w-[96vw] max-h-[88vh] max-w-6xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingInvoiceId ? 'Editar factura' : 'Nueva factura'}</DialogTitle>
            <DialogDescription>Selecciona paciente y cita atendida para autocompletar la factura</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <input type="hidden" {...register('doctor_user_id', { required: true })} />
            <div className="grid gap-3 md:grid-cols-3">
              <div className="grid gap-2">
                <Label>No. factura</Label>
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-foreground">
                  {watch('invoice_no') || 'Generando...'}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Fecha emisión</Label>
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-foreground">
                  {watch('issued_at') || toDateInputValue(new Date())}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Estado factura</Label>
                <Controller
                  name="invoice_status_id"
                  control={control}
                  rules={{ required: 'Campo requerido' }}
                  render={({ field }) => (
                    <SelectField
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={Boolean(!editingInvoiceId)}
                      options={[
                        { value: '', label: 'Seleccionar' },
                        ...invoiceStatuses.map((item) => ({ value: item.id, label: item.name })),
                      ]}
                      placeholder="Seleccionar"
                    />
                  )}
                />
              </div>
              <div className="grid gap-2">
                <Label>Paciente</Label>
                <Controller
                  name="patient_id"
                  control={control}
                  rules={{ required: 'Campo requerido' }}
                  render={({ field }) => (
                    <SelectField
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!editingInvoiceId && isLockedFromConsultationFlow}
                      options={[
                        { value: '', label: 'Seleccionar' },
                        ...patients.map((item) => ({
                          value: item.id,
                          label: `${item.nombres || ''} ${item.apellidos || ''}`.trim(),
                        })),
                      ]}
                      placeholder="Seleccionar"
                    />
                  )}
                />
              </div>
              <div className="grid gap-2">
                <Label>Cita atendida/terminada</Label>
                <Controller
                  name="appointment_id"
                  control={control}
                  rules={{ required: 'Selecciona una cita' }}
                  render={({ field }) => (
                    <SelectField
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!selectedPatientId || (!editingInvoiceId && isLockedFromConsultationFlow)}
                      options={[
                        { value: '', label: selectedPatientId ? 'Seleccionar cita' : 'Primero selecciona paciente' },
                        ...appointmentOptions.map((item) => ({
                          value: item.id,
                          label: formatAppointmentOptionLabel(item),
                        })),
                      ]}
                      placeholder={selectedPatientId ? 'Seleccionar cita' : 'Primero selecciona paciente'}
                    />
                  )}
                />
                {errors.appointment_id ? <p className="text-xs text-destructive">{errors.appointment_id.message}</p> : null}
              </div>
              <div className="grid gap-2">
                <Label>Doctor</Label>
                <Input
                  value={
                    selectedAppointment
                      ? `${selectedAppointment.doctor_nombres || ''} ${selectedAppointment.doctor_apellidos || ''}`.trim()
                      : selectedDoctor
                        ? `${selectedDoctor.nombres || ''} ${selectedDoctor.apellidos || ''}`.trim()
                        : ''
                  }
                  readOnly
                  disabled
                />
              </div>
              <div className="grid gap-2">
                <Label>ID consulta</Label>
                <Input {...register('consultation_id')} readOnly disabled />
              </div>
            </div>

            <div className="rounded-md border">
              <div className="flex items-center justify-between border-b px-3 py-2">
                <p className="text-sm font-semibold text-foreground">Ítems de factura</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Cita + ítems manuales</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    title="Agregar ítem manual"
                    aria-label="Agregar ítem manual"
                    onClick={() => append(emptyItem)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2 p-3">
                {fields.map((field, index) => {
                  const lineValues = calculateLineValues(items[index])
                  return (
                  <div key={field.id} className="grid gap-2 rounded-md border p-3 md:grid-cols-12">
                    <div className="md:col-span-2">
                      <Label>Servicio</Label>
                      <Controller
                        name={`items.${index}.service_id`}
                        control={control}
                        render={({ field }) => (
                          <SelectField
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value)
                              const selectedService = services.find((item) => item.id === value)
                              if (!selectedService) {
                                setValue(`items.${index}.description`, '', { shouldDirty: true })
                                setValue(`items.${index}.unit_price`, '0', { shouldDirty: true, shouldValidate: true })
                                return
                              }
                              const nextQty = Number(items?.[index]?.qty || 1)
                              const nextUnitPrice = Number(selectedService.default_price || 0)
                              setValue(`items.${index}.description`, selectedService.description || selectedService.name || '', { shouldDirty: true })
                              setValue(`items.${index}.qty`, String(nextQty), { shouldDirty: true, shouldValidate: true })
                              setValue(`items.${index}.unit_price`, String(nextUnitPrice), { shouldDirty: true, shouldValidate: true })
                            }}
                            options={[
                              { value: '', label: 'Sin servicio' },
                              ...services.map((item) => ({ value: item.id, label: item.name })),
                            ]}
                            placeholder="Sin servicio"
                          />
                        )}
                      />
                    </div>
                    <div className="md:col-span-3">
                      <Label>Descripción</Label>
                      <Input {...register(`items.${index}.description`, { required: 'Descripción requerida' })} />
                    </div>
                    <div>
                      <Label>Cantidad</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        {...register(`items.${index}.qty`, { required: true })}
                        onChange={(event) => {
                          const nextQty = Number(event.target.value || 0)
                          setValue(`items.${index}.qty`, String(event.target.value), { shouldDirty: true, shouldValidate: true })
                          const currentLineTotal = Number(lineValues.total || 0)
                          const nextUnitPrice = nextQty > 0 ? currentLineTotal / nextQty : 0
                          setValue(`items.${index}.unit_price`, String(Number(nextUnitPrice.toFixed(6))), { shouldDirty: true, shouldValidate: true })
                        }}
                      />
                    </div>
                    <input type="hidden" {...register(`items.${index}.unit_price`, { required: true })} />
                    <div className="md:col-span-2">
                      <Label>Sin impuesto</Label>
                      <Input type="number" step="0.01" min="0" value={lineValues.subtotal.toFixed(2)} readOnly disabled />
                    </div>
                    <div className="md:col-span-1">
                      <Label>Imp</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={lineValues.tax.toFixed(2)}
                        readOnly
                        disabled
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Total línea</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={lineValues.total.toFixed(2)}
                        onChange={(event) => {
                          const nextLineTotal = Number(event.target.value || 0)
                          const qty = Number(items?.[index]?.qty || 0)
                          const nextUnitPrice = qty > 0 ? nextLineTotal / qty : 0
                          setValue(`items.${index}.unit_price`, String(Number(nextUnitPrice.toFixed(6))), { shouldDirty: true, shouldValidate: true })
                        }}
                      />
                    </div>
                    <div className="md:col-span-1 flex items-end justify-end">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        title="Quitar ítem"
                        aria-label="Quitar ítem"
                        disabled={fields.length === 1}
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  )
                })}
              </div>
            </div>

            <div className="grid gap-2 rounded-md border p-3 text-sm md:grid-cols-12">
              <div className="md:col-span-6 text-right font-semibold">Totales</div>
              <div className="md:col-span-2">
                <p className="text-xs text-muted-foreground">Sin impuesto</p>
                <p className="font-semibold">{formatCurrency(totals.subtotal)}</p>
              </div>
              <div className="md:col-span-1">
                <p className="text-xs text-muted-foreground">Imp</p>
                <p className="font-semibold">{formatCurrency(totals.tax)}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-muted-foreground">Subtotal</p>
                <p className="font-semibold">{formatCurrency(totals.total)}</p>
              </div>
            </div>

            {!editingInvoiceId ? (
              <div className="rounded-md border">
                <div className="flex items-center justify-between border-b px-3 py-2">
                  <p className="text-sm font-semibold text-foreground">Pagos de la factura</p>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    title="Agregar pago"
                    aria-label="Agregar pago"
                    onClick={() => appendPayment(emptyPayment)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2 p-3">
                  {paymentFields.map((paymentField, index) => (
                    <div key={paymentField.id} className="grid gap-2 rounded-md border p-3 md:grid-cols-12">
                      <div className="md:col-span-3">
                        <Label>Método</Label>
                        <Controller
                          name={`payments.${index}.method_id`}
                          control={control}
                          render={({ field }) => (
                            <SelectField
                              value={field.value}
                              onValueChange={field.onChange}
                              options={[
                                { value: '', label: 'Seleccionar método' },
                                ...paymentMethods.map((method) => ({ value: method.id, label: method.name })),
                              ]}
                              placeholder="Seleccionar método"
                            />
                          )}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Monto</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...register(`payments.${index}.amount`)}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <Label>Referencia</Label>
                        <Input {...register(`payments.${index}.reference_no`)} placeholder="No. boleta/transferencia" />
                      </div>
                      <div className="md:col-span-3">
                        <Label>Notas</Label>
                        <Input {...register(`payments.${index}.notes`)} placeholder="Observaciones" />
                      </div>
                      <div className="md:col-span-1 flex items-end justify-end">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          title="Quitar pago"
                          aria-label="Quitar pago"
                          disabled={paymentFields.length === 1}
                          onClick={() => removePayment(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid gap-2 border-t px-3 py-2 text-sm md:grid-cols-3">
                  <p><span className="font-semibold">Total factura:</span> {formatCurrency(totals.total)}</p>
                  <p><span className="font-semibold">Total pagos:</span> {formatCurrency(paymentsTotal)}</p>
                  <p className={paymentDifference === 0 ? 'text-emerald-700' : 'text-destructive'}>
                    <span className="font-semibold">Diferencia:</span> {formatCurrency(paymentDifference)}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setIsFormOpen(false)}
                title="Cancelar"
                aria-label="Cancelar"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="submit"
                size="icon"
                className="h-9 w-9"
                title={createMutation.isPending || updateMutation.isPending ? 'Guardando' : 'Guardar factura'}
                aria-label={createMutation.isPending || updateMutation.isPending ? 'Guardando' : 'Guardar factura'}
                disabled={
                  createMutation.isPending ||
                  updateMutation.isPending ||
                  !watch('appointment_id') ||
                  (!editingInvoiceId && paymentDifference !== 0)
                }
              >
                <Save className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewingInvoice)} onOpenChange={(open) => !open && setViewingInvoice(null)}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{viewingInvoice?.invoice_no || 'Detalle de factura'}</DialogTitle>
            <DialogDescription>
              {viewingInvoice ? `Emitida: ${formatDateTime(viewingInvoice.issued_at)}` : ''}
            </DialogDescription>
          </DialogHeader>
          {viewingInvoice ? (
            <div className="space-y-3 text-sm">
              <div className="grid gap-2 md:grid-cols-2">
                <p><span className="font-semibold">Paciente:</span> {`${viewingInvoice.patient_nombres || ''} ${viewingInvoice.patient_apellidos || ''}`.trim()}</p>
                <p><span className="font-semibold">Doctor:</span> {`${viewingInvoice.doctor_nombres || ''} ${viewingInvoice.doctor_apellidos || ''}`.trim()}</p>
                <p><span className="font-semibold">Estado:</span> {viewingInvoice.invoice_status_name}</p>
                <p><span className="font-semibold">Saldo:</span> {formatCurrency(viewingInvoice.balance)}</p>
              </div>
              <div className="max-h-[45vh] overflow-y-auto rounded-md border">
                <table className="w-full border-collapse text-xs">
                  <thead className="bg-muted/60 text-left">
                    <tr>
                      <th className="px-3 py-2">Descripción</th>
                      <th className="px-3 py-2">Cant.</th>
                      <th className="px-3 py-2">P.Unit</th>
                      <th className="px-3 py-2">Imp.</th>
                      <th className="px-3 py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewingInvoice.items || []).map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="px-3 py-2">{item.description}</td>
                        <td className="px-3 py-2">{item.qty}</td>
                        <td className="px-3 py-2">{formatCurrency(item.unit_price)}</td>
                        <td className="px-3 py-2">{formatCurrency(item.tax)}</td>
                        <td className="px-3 py-2">{formatCurrency(item.line_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid gap-2 rounded-md border p-3 md:grid-cols-4">
                <p><span className="font-semibold">Subtotal:</span> {formatCurrency(viewingInvoice.subtotal)}</p>
                <p><span className="font-semibold">Impuesto:</span> {formatCurrency(viewingInvoice.tax_total)}</p>
                <p><span className="font-semibold">Total:</span> {formatCurrency(viewingInvoice.total)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {invoiceStatuses.map((status) => (
                  <ConfirmActionDialog
                    key={status.id}
                    triggerElement={(
                      <Button
                        type="button"
                        variant={status.id === viewingInvoice.invoice_status_id ? 'default' : 'outline'}
                        className="h-8 px-3 text-xs"
                        disabled={status.id === viewingInvoice.invoice_status_id}
                      >
                        {status.name}
                      </Button>
                    )}
                    title="Cambiar estado de factura"
                    description={`Se actualizará el estado a "${status.name}".`}
                    confirmLabel="Aplicar"
                    cancelLabel="Cancelar"
                    onConfirm={async () => {
                      try {
                        await patchInvoiceStatusMutation.mutateAsync({
                          id: viewingInvoice.id,
                          invoiceStatusId: status.id,
                        })
                        const response = await getInvoiceById(viewingInvoice.id)
                        setViewingInvoice(response.data)
                      } catch (error) {
                        toast.error(error.message || 'No se pudo actualizar el estado')
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(invoicePreview?.objectUrl)}
        onOpenChange={(open) => {
          if (!open) {
            setInvoicePreview((previous) => {
              if (previous?.dispose) previous.dispose()
              return null
            })
          }
        }}
      >
        <DialogContent className="h-[88vh] w-[96vw] max-w-6xl">
          <DialogHeader>
            <DialogTitle>Visor de factura</DialogTitle>
            <DialogDescription>{invoicePreview?.filename || 'Factura en PDF'}</DialogDescription>
          </DialogHeader>
          {invoicePreview?.objectUrl ? (
            <iframe
              title="Visor PDF factura"
              src={invoicePreview.objectUrl}
              className="h-full min-h-[65vh] w-full rounded-md border"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
