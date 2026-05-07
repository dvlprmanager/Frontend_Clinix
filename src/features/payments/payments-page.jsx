import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { ChevronLeft, ChevronRight, Plus, Save, ToggleLeft, ToggleRight } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmActionDialog } from '@/components/common/confirm-action-dialog'
import { ErpTableLoadingRow } from '@/components/common/erp-loading-empty'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectField } from '@/components/ui/select-field'
import { DateTimePickerInput } from '@/components/ui/date-time-picker-input'
import { buildVisiblePageNumbers } from '@/lib/pagination'
import { createPayment, getPaymentsLookups, listPayments, patchPaymentStatus, updatePayment } from '@/features/payments/payments-api'

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

function toDateInputValue(value) {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function PaymentsPage() {
  const queryClient = useQueryClient()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [operationalFilter, setOperationalFilter] = useState('1')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingPaymentId, setEditingPaymentId] = useState(null)

  const {
    control,
    register,
    watch,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      invoice_id: '',
      method_id: '',
      payment_status_id: '',
      amount: '',
      paid_at: toDateInputValue(new Date()),
      reference_no: '',
      notes: '',
    },
    mode: 'onBlur',
  })

  const lookupsQuery = useQuery({
    queryKey: ['payments', 'lookups'],
    queryFn: getPaymentsLookups,
  })

  const paymentsQuery = useQuery({
    queryKey: ['payments', page, search, statusFilter, operationalFilter],
    queryFn: () =>
      listPayments({
        page,
        pageSize: 10,
        sortBy: 'paid_at',
        sortDir: 'desc',
        q: search,
        filters: {
          payment_status_id: statusFilter || undefined,
          estatus: operationalFilter === 'all' ? undefined : Number(operationalFilter),
        },
      }),
  })

  const createMutation = useMutation({
    mutationFn: (payload) => createPayment(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['payments'], exact: false })
      await queryClient.invalidateQueries({ queryKey: ['invoices'], exact: false })
      toast.success('Pago registrado correctamente')
      setIsFormOpen(false)
      setEditingPaymentId(null)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updatePayment(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['payments'], exact: false })
      await queryClient.invalidateQueries({ queryKey: ['invoices'], exact: false })
      toast.success('Pago actualizado correctamente')
      setIsFormOpen(false)
      setEditingPaymentId(null)
    },
  })

  const patchStatusMutation = useMutation({
    mutationFn: ({ id, estatus }) => patchPaymentStatus(id, estatus),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['payments'], exact: false })
      await queryClient.invalidateQueries({ queryKey: ['invoices'], exact: false })
      toast.success('Estado operativo de pago actualizado')
    },
  })

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPage(1)
      setSearch(searchInput.trim())
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [searchInput])

  const lookups = lookupsQuery.data?.data || {}
  const invoices = lookups.invoices || []
  const methods = lookups.methods || []
  const statuses = lookups.statuses || []
  const defaultStatusId = useMemo(
    () => statuses.find((item) => item.code === 'APPLIED')?.id || statuses[0]?.id || '',
    [statuses],
  )
  const selectedInvoiceId = watch('invoice_id')
  const selectedInvoice = useMemo(() => invoices.find((item) => item.id === selectedInvoiceId) || null, [invoices, selectedInvoiceId])

  const openCreate = () => {
    setEditingPaymentId(null)
    reset({
      invoice_id: '',
      method_id: '',
      payment_status_id: defaultStatusId,
      amount: '',
      paid_at: toDateInputValue(new Date()),
      reference_no: '',
      notes: '',
    })
    setIsFormOpen(true)
  }

  const openEdit = (payment) => {
    setEditingPaymentId(payment.id)
    reset({
      invoice_id: payment.invoice_id || '',
      method_id: payment.method_id || '',
      payment_status_id: payment.payment_status_id || defaultStatusId,
      amount: String(payment.amount || ''),
      paid_at: toDateInputValue(payment.paid_at),
      reference_no: payment.reference_no || '',
      notes: payment.notes || '',
    })
    setIsFormOpen(true)
  }

  const onSubmit = async (values) => {
    const payload = {
      invoice_id: values.invoice_id,
      method_id: values.method_id,
      payment_status_id: values.payment_status_id || null,
      amount: Number(values.amount || 0),
      paid_at: values.paid_at || null,
      reference_no: values.reference_no || null,
      notes: values.notes || null,
    }

    try {
      if (editingPaymentId) {
        await updateMutation.mutateAsync({ id: editingPaymentId, payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
    } catch (error) {
      toast.error(error.message || 'No se pudo guardar el pago')
    }
  }

  const rows = paymentsQuery.data?.data || []
  const meta = paymentsQuery.data?.meta
  const currentPage = Math.max(1, Number(meta?.page || 1))
  const totalPages = Math.max(1, Number(meta?.totalPages || 1))
  const pageNumbers = buildVisiblePageNumbers(currentPage, totalPages, 10)

  return (
    <Card className="flex h-full min-h-0 flex-col">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Pagos</CardTitle>
          <p className="text-sm text-muted-foreground">Aplicación de pagos a facturas y control de saldo</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
          <Input
            className="h-9 w-full md:w-[280px]"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Buscar por factura, referencia o paciente"
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
              ...statuses.map((item) => ({ value: item.id, label: item.name })),
            ]}
            placeholder="Todos los estados"
          />
          <Button type="button" size="icon" onClick={openCreate} aria-label="Nuevo pago" title="Nuevo pago">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 p-0">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1100px] border-collapse text-sm">
            <thead className="bg-muted/60 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold text-foreground">Fecha</th>
                <th className="px-4 py-3 font-semibold text-foreground">Factura</th>
                <th className="px-4 py-3 font-semibold text-foreground">Paciente</th>
                <th className="px-4 py-3 font-semibold text-foreground">Método</th>
                <th className="px-4 py-3 font-semibold text-foreground">Estado</th>
                <th className="px-4 py-3 font-semibold text-foreground">Monto</th>
                <th className="px-4 py-3 font-semibold text-foreground">Saldo Factura</th>
                <th className="px-4 py-3 font-semibold text-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paymentsQuery.isLoading ? (
                <ErpTableLoadingRow colSpan={8} title="Cargando pagos" />
              ) : rows.length === 0 ? (
                <tr><td className="px-4 py-6 text-muted-foreground" colSpan={8}>No hay pagos para mostrar</td></tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-4 py-3">{formatDateTime(row.paid_at)}</td>
                    <td className="px-4 py-3">{row.invoice_no}</td>
                    <td className="px-4 py-3">{`${row.patient_nombres || ''} ${row.patient_apellidos || ''}`.trim()}</td>
                    <td className="px-4 py-3">{row.method_name}</td>
                    <td className="px-4 py-3">{row.payment_status_name}</td>
                    <td className="px-4 py-3">{formatCurrency(row.amount)}</td>
                    <td className="px-4 py-3">{formatCurrency(row.invoice_balance)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button type="button" size="icon" variant="outline" className="h-9 w-9" title="Editar pago" onClick={() => openEdit(row)}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <ConfirmActionDialog
                          triggerElement={(
                            <Button
                              type="button"
                              size="icon"
                              variant={Number(row.estatus) === 1 ? 'secondary' : 'default'}
                              className="h-9 w-9"
                              title={Number(row.estatus) === 1 ? 'Inactivar' : 'Activar'}
                            >
                              {Number(row.estatus) === 1 ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
                            </Button>
                          )}
                          title={Number(row.estatus) === 1 ? 'Inactivar pago' : 'Activar pago'}
                          description="Esta acción modifica el estado operativo del pago y puede impactar saldos/caja."
                          confirmLabel="Confirmar"
                          cancelLabel="Cancelar"
                          onConfirm={() => patchStatusMutation.mutate({ id: row.id, estatus: Number(row.estatus) === 1 ? 0 : 1 })}
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
            <Button type="button" variant="outline" size="icon" className="h-9 w-9" disabled={currentPage <= 1} onClick={() => setPage(Math.max(1, currentPage - 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1">
              {pageNumbers.map((pageNumber) => (
                <Button key={pageNumber} type="button" variant={pageNumber === currentPage ? 'default' : 'outline'} className="h-9 min-w-9 px-2" onClick={() => setPage(pageNumber)}>
                  {pageNumber}
                </Button>
              ))}
            </div>
            <Button type="button" variant="outline" size="icon" className="h-9 w-9" disabled={currentPage >= totalPages} onClick={() => setPage(Math.min(totalPages, currentPage + 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPaymentId ? 'Editar pago' : 'Nuevo pago'}</DialogTitle>
            <DialogDescription>Registra el pago y aplícalo a una factura con saldo pendiente</DialogDescription>
          </DialogHeader>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-2 md:col-span-2">
              <Label>Factura</Label>
              <Controller
                name="invoice_id"
                control={control}
                rules={{ required: 'Campo requerido' }}
                render={({ field }) => (
                  <SelectField
                    value={field.value}
                    onValueChange={field.onChange}
                    options={[
                      { value: '', label: 'Seleccionar factura' },
                      ...invoices.map((invoice) => ({
                        value: invoice.id,
                        label: `${invoice.invoice_no} • ${`${invoice.patient_nombres || ''} ${invoice.patient_apellidos || ''}`.trim()} • Saldo ${formatCurrency(invoice.balance)}`,
                      })),
                    ]}
                    placeholder="Seleccionar factura"
                  />
                )}
              />
              {errors.invoice_id ? <p className="text-xs text-destructive">{errors.invoice_id.message}</p> : null}
            </div>
            <div className="grid gap-2">
              <Label>Método de pago</Label>
              <Controller
                name="method_id"
                control={control}
                rules={{ required: 'Campo requerido' }}
                render={({ field }) => (
                  <SelectField
                    value={field.value}
                    onValueChange={field.onChange}
                    options={[
                      { value: '', label: 'Seleccionar método' },
                      ...methods.map((method) => ({ value: method.id, label: method.name })),
                    ]}
                    placeholder="Seleccionar método"
                  />
                )}
              />
              {errors.method_id ? <p className="text-xs text-destructive">{errors.method_id.message}</p> : null}
            </div>
            <div className="grid gap-2">
              <Label>Estado de pago</Label>
              <Controller
                name="payment_status_id"
                control={control}
                rules={{ required: 'Campo requerido' }}
                render={({ field }) => (
                  <SelectField
                    value={field.value}
                    onValueChange={field.onChange}
                    options={[
                      { value: '', label: 'Seleccionar estado' },
                      ...statuses.map((status) => ({ value: status.id, label: status.name })),
                    ]}
                    placeholder="Seleccionar estado"
                  />
                )}
              />
            </div>
            <div className="grid gap-2">
              <Label>Monto</Label>
              <Input type="number" step="0.01" min="0.01" {...register('amount', { required: 'Campo requerido' })} />
              {errors.amount ? <p className="text-xs text-destructive">{errors.amount.message}</p> : null}
            </div>
            <div className="grid gap-2">
              <Label>Fecha pago</Label>
              <Controller
                name="paid_at"
                control={control}
                render={({ field }) => (
                  <DateTimePickerInput id="paid_at" value={field.value || ''} onChange={field.onChange} withTime={false} />
                )}
              />
            </div>
            <div className="grid gap-2">
              <Label>Referencia</Label>
              <Input {...register('reference_no')} />
            </div>
            <div className="grid gap-2">
              <Label>Notas</Label>
              <Input {...register('notes')} />
            </div>
            <div className="rounded-md border bg-muted/20 p-3 text-sm md:col-span-2">
              <p><span className="font-semibold">Factura seleccionada:</span> {selectedInvoice?.invoice_no || 'N/A'}</p>
              <p><span className="font-semibold">Saldo actual:</span> {formatCurrency(selectedInvoice?.balance || 0)}</p>
            </div>
            <div className="flex justify-end gap-2 md:col-span-2">
              <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => setIsFormOpen(false)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button type="submit" size="icon" className="h-9 w-9" disabled={createMutation.isPending || updateMutation.isPending}>
                <Save className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
