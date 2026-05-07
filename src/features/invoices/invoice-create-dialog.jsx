import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { Plus, Save, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectField } from '@/components/ui/select-field'
import { getCashRegisterCurrent } from '@/features/cash-register/cash-register-api'
import { createInvoice, getInvoicesLookups, listInvoices, previewInvoicePdf } from '@/features/invoices/invoices-api'

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
}

const emptyPayment = {
  method_id: '',
  amount: '',
  reference_no: '',
  notes: '',
}

export function InvoiceCreateDialog({ open, onOpenChange, prefill = null, onSuccess }) {
  const queryClient = useQueryClient()
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false)
  const [isResolvingExistingInvoice, setIsResolvingExistingInvoice] = useState(false)
  const [invoicePreview, setInvoicePreview] = useState(null)
  const form = useForm({
    defaultValues: {
      invoice_no: '',
      patient_id: '',
      doctor_user_id: '',
      appointment_id: '',
      consultation_id: '',
      issued_at: toDateInputValue(new Date()),
      items: [emptyItem],
      payments: [emptyPayment],
    },
    mode: 'onBlur',
  })
  const { register, control, watch, reset, setValue, handleSubmit } = form
  const { fields, replace, append, remove } = useFieldArray({ control, name: 'items' })
  const { fields: paymentFields, append: appendPayment, remove: removePayment } = useFieldArray({ control, name: 'payments' })

  const lookupsQuery = useQuery({
    queryKey: ['invoices', 'lookups'],
    queryFn: getInvoicesLookups,
    enabled: open,
  })
  const cashRegisterCurrentQuery = useQuery({
    queryKey: ['cash-register', 'current'],
    queryFn: getCashRegisterCurrent,
    enabled: open,
  })

  const createMutation = useMutation({
    mutationFn: (payload) => createInvoice(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['invoices'], exact: false })
      toast.success('Factura creada correctamente')
      if (typeof onSuccess === 'function') onSuccess()
      onOpenChange(false)
    },
  })

  const lookups = lookupsQuery.data?.data || {}
  const patients = lookups.patients || []
  const services = lookups.services || []
  const paymentMethods = lookups.paymentMethods || []
  const billableAppointments = lookups.billableAppointments || []
  const nextInvoiceNo = lookups.nextInvoiceNo || ''

  const selectedPatientId = watch('patient_id')
  const selectedAppointmentId = watch('appointment_id')
  const selectedDoctorId = watch('doctor_user_id')
  const patientAppointments = useMemo(
    () => billableAppointments.filter((appointment) => appointment.patient_id === selectedPatientId),
    [billableAppointments, selectedPatientId],
  )
  const selectedAppointment = useMemo(
    () => patientAppointments.find((appointment) => appointment.id === selectedAppointmentId) || null,
    [patientAppointments, selectedAppointmentId],
  )
  const selectedDoctor = useMemo(
    () => (lookups.doctors || []).find((doctor) => doctor.id === selectedDoctorId) || null,
    [lookups.doctors, selectedDoctorId],
  )

  const items = useWatch({ control, name: 'items' }) || []
  const payments = useWatch({ control, name: 'payments' }) || []
  const totals = useMemo(() => items.reduce((acc, item) => {
    const line = calculateLineValues(item)
    acc.subtotal += line.subtotal
    acc.tax += line.tax
    acc.total += line.total
    return acc
  }, { subtotal: 0, tax: 0, total: 0 }), [items])
  const paymentsTotal = useMemo(() => payments.reduce((sum, payment) => sum + Number(payment?.amount || 0), 0), [payments])
  const paymentDifference = useMemo(
    () => Number((Number(totals.total || 0) - Number(paymentsTotal || 0)).toFixed(2)),
    [paymentsTotal, totals.total],
  )
  const isCashRegisterOpen = Boolean(cashRegisterCurrentQuery.data?.data?.isOpen)

  useEffect(() => {
    if (!open || lookupsQuery.isLoading) return
    const prefillAppointment = prefill?.appointmentId
      ? billableAppointments.find((appointment) => appointment.id === prefill.appointmentId) || null
      : null
    if (prefill?.appointmentId && !prefillAppointment && !isSubmittingInvoice) {
      let ignore = false
      const resolveExistingInvoice = async () => {
        setIsResolvingExistingInvoice(true)
        try {
          const filters = {}
          if (prefill?.appointmentId) filters.appointment_id = prefill.appointmentId
          if (prefill?.consultationId) filters.consultation_id = prefill.consultationId
          const response = await listInvoices({ page: 1, pageSize: 1, filters })
          const existingInvoice = response?.data?.[0]
          if (existingInvoice?.id) {
            toast.info('La factura ya fue generada. Abriendo visor...')
            const viewer = await previewInvoicePdf(existingInvoice.id)
            setInvoicePreview((previous) => {
              if (previous?.dispose) previous.dispose()
              return viewer
            })
          } else {
            toast.error('No se encontró una cita atendida disponible para facturar')
          }
          if (!ignore) onOpenChange(false)
        } catch {
          if (!ignore) {
            toast.error('No se pudo validar la factura existente')
            onOpenChange(false)
          }
        } finally {
          if (!ignore) setIsResolvingExistingInvoice(false)
        }
      }
      resolveExistingInvoice()
      return () => {
        ignore = true
      }
    }
    reset({
      invoice_no: nextInvoiceNo || '',
      patient_id: prefillAppointment?.patient_id || prefill?.patientId || '',
      doctor_user_id: prefillAppointment?.doctor_user_id || prefill?.doctorUserId || '',
      appointment_id: prefillAppointment?.id || prefill?.appointmentId || '',
      consultation_id: prefillAppointment?.consultation_id || prefill?.consultationId || '',
      issued_at: toDateInputValue(new Date()),
      items: [emptyItem],
      payments: [emptyPayment],
    })
  }, [billableAppointments, isSubmittingInvoice, lookupsQuery.isLoading, nextInvoiceNo, onOpenChange, open, prefill, reset])

  useEffect(() => {
    if (!open) {
      setIsSubmittingInvoice(false)
      setIsResolvingExistingInvoice(false)
    }
  }, [open])

  useEffect(() => {
    return () => {
      if (invoicePreview?.dispose) invoicePreview.dispose()
    }
  }, [invoicePreview])

  useEffect(() => {
    if (!open || !selectedAppointment) return
    setValue('doctor_user_id', selectedAppointment.doctor_user_id || '')
    setValue('consultation_id', selectedAppointment.consultation_id || prefill?.consultationId || '')
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
    })))
  }, [open, prefill?.consultationId, replace, selectedAppointment, setValue])

  const submit = async (values) => {
    setIsSubmittingInvoice(true)
    if (!isCashRegisterOpen) {
      toast.error('Debes abrir caja antes de generar pagos/factura')
      setIsSubmittingInvoice(false)
      return
    }
    const normalizedPayments = (values.payments || [])
      .map((payment) => ({
        method_id: payment?.method_id || '',
        amount: Number(payment?.amount || 0),
        reference_no: payment?.reference_no?.trim() || '',
        notes: payment?.notes?.trim() || '',
      }))
      .filter((payment) => payment.method_id || payment.amount > 0 || payment.reference_no || payment.notes)

    if (normalizedPayments.length === 0) {
      toast.error('Debes registrar al menos un pago')
      setIsSubmittingInvoice(false)
      return
    }
    for (let index = 0; index < normalizedPayments.length; index += 1) {
      const payment = normalizedPayments[index]
      if (!payment.method_id) {
        toast.error(`Selecciona método de pago en el pago #${index + 1}`)
        setIsSubmittingInvoice(false)
        return
      }
      if (!Number.isFinite(payment.amount) || payment.amount <= 0) {
        toast.error(`El monto del pago #${index + 1} debe ser mayor a 0`)
        setIsSubmittingInvoice(false)
        return
      }
    }
    if (paymentDifference !== 0) {
      toast.error('El total de pagos debe coincidir exactamente con el total de la factura')
      setIsSubmittingInvoice(false)
      return
    }

    const payload = {
      invoice_no: values.invoice_no || undefined,
      patient_id: values.patient_id,
      doctor_user_id: values.doctor_user_id,
      appointment_id: values.appointment_id || null,
      consultation_id: values.consultation_id || null,
      issued_at: null,
      items: (values.items || []).map((item) => ({
        service_id: item.service_id || null,
        description: item.description,
        qty: Number(item.qty || 0),
        unit_price: Number(item.unit_price || 0),
        discount: 0,
        tax: calculateLineValues(item).tax,
      })),
      payments: normalizedPayments.map((payment) => ({
        method_id: payment.method_id,
        amount: payment.amount,
        reference_no: payment.reference_no || null,
        notes: payment.notes || null,
      })),
    }
    try {
      await createMutation.mutateAsync(payload)
    } catch (error) {
      toast.error(error.message || 'No se pudo guardar la factura')
      setIsSubmittingInvoice(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[96vw] h-[76vh] max-w-6xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva factura</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit(submit)}>
          <input type="hidden" {...register('doctor_user_id', { required: true })} />
          <input type="hidden" {...register('consultation_id')} />
            <div className="grid gap-3 md:grid-cols-3">
              <div className="grid gap-2">
                <Label>No. factura</Label>
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-foreground">{watch('invoice_no') || 'Generando...'}</div>
              </div>
              <div className="grid gap-2">
                <Label>Fecha emisión</Label>
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-foreground">{watch('issued_at') || toDateInputValue(new Date())}</div>
              </div>
              <div className="grid gap-2">
                <Label>Doctor</Label>
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-foreground">
                  {selectedAppointment
                    ? `${selectedAppointment.doctor_nombres || ''} ${selectedAppointment.doctor_apellidos || ''}`.trim()
                    : selectedDoctor
                      ? `${selectedDoctor.nombres || ''} ${selectedDoctor.apellidos || ''}`.trim()
                      : 'N/A'}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Paciente</Label>
                <Controller
                  name="patient_id"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <SelectField
                      value={field.value}
                      onValueChange={field.onChange}
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
                <Label>Cita atendida</Label>
                <Controller
                  name="appointment_id"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <SelectField
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!selectedPatientId}
                      options={[
                        { value: '', label: selectedPatientId ? 'Seleccionar cita' : 'Primero selecciona paciente' },
                        ...patientAppointments.map((item) => ({
                          value: item.id,
                          label: formatAppointmentOptionLabel(item),
                        })),
                      ]}
                      placeholder={selectedPatientId ? 'Seleccionar cita' : 'Primero selecciona paciente'}
                    />
                  )}
                />
              </div>
            </div>

            <div className="rounded-md border">
              <div className="flex items-center justify-between border-b px-3 py-2">
                <p className="text-sm font-semibold text-foreground">Ítems de factura</p>
                <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => append(emptyItem)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            <div className="space-y-2 p-3">
                {fields.map((field, index) => {
                  const line = calculateLineValues(items[index])
                  return (
                    <div key={field.id} className="grid gap-2 rounded-md border p-3 md:grid-cols-12">
                      <div className="md:col-span-2">
                        <Label>Servicio</Label>
                        <Controller
                          name={`items.${index}.service_id`}
                          control={control}
                          render={({ field: inputField }) => (
                            <SelectField
                              value={inputField.value}
                              onValueChange={(value) => {
                                inputField.onChange(value)
                                const selectedService = services.find((item) => item.id === value)
                                if (!selectedService) {
                                  setValue(`items.${index}.description`, '', { shouldDirty: true })
                                  setValue(`items.${index}.unit_price`, '0', { shouldDirty: true, shouldValidate: true })
                                  return
                                }
                                setValue(`items.${index}.description`, selectedService.description || selectedService.name || '', { shouldDirty: true })
                                setValue(`items.${index}.unit_price`, String(Number(selectedService.default_price || 0)), { shouldDirty: true, shouldValidate: true })
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
                      <div className="md:col-span-4">
                        <Label>Descripción</Label>
                        <Input {...register(`items.${index}.description`, { required: true })} />
                      </div>
                      <div>
                        <Label>Cantidad</Label>
                        <Input type="number" step="0.01" min="0.01" {...register(`items.${index}.qty`, { required: true })} />
                      </div>
                      <input type="hidden" {...register(`items.${index}.unit_price`, { required: true })} />
                      <div className="md:col-span-2">
                        <Label>Total línea</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.total.toFixed(2)}
                          onChange={(event) => {
                            const nextLineTotal = Number(event.target.value || 0)
                            const qty = Number(items?.[index]?.qty || 0)
                            const nextUnitPrice = qty > 0 ? nextLineTotal / qty : 0
                            setValue(`items.${index}.unit_price`, String(Number(nextUnitPrice.toFixed(6))), { shouldDirty: true, shouldValidate: true })
                          }}
                        />
                      </div>
                      <div className="md:col-span-2 flex items-end justify-end">
                        <Button type="button" size="icon" variant="outline" className="h-8 w-8" disabled={fields.length === 1} onClick={() => remove(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-md border">
              <div className="flex items-center justify-between border-b px-3 py-2">
                <p className="text-sm font-semibold text-foreground">Pagos</p>
                <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => appendPayment(emptyPayment)}>
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
                      <Input type="number" step="0.01" min="0" {...register(`payments.${index}.amount`)} placeholder="0.00" />
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
                      <Button type="button" size="icon" variant="outline" className="h-8 w-8" disabled={paymentFields.length === 1} onClick={() => removePayment(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-2 rounded-md border p-3 text-sm md:grid-cols-3">
              <p><span className="font-semibold">Total factura:</span> {formatCurrency(totals.total)}</p>
              <p><span className="font-semibold">Total pagos:</span> {formatCurrency(paymentsTotal)}</p>
              <p className={paymentDifference === 0 ? 'text-emerald-700' : 'text-destructive'}>
                <span className="font-semibold">Diferencia:</span> {formatCurrency(paymentDifference)}
              </p>
            </div>
            {!isCashRegisterOpen ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                No hay caja abierta. Abre caja para contabilizar pagos y generar la factura.
              </div>
            ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
            <Button
              type="submit"
              size="icon"
              className="h-9 w-9"
              disabled={createMutation.isPending || isResolvingExistingInvoice || !watch('appointment_id') || paymentDifference !== 0 || !isCashRegisterOpen}
            >
              <Save className="h-4 w-4" />
            </Button>
          </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(invoicePreview?.objectUrl)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
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
    </>
  )
}
