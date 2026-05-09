import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { ChevronLeft, ChevronRight, Eye, LockOpen, Save, Scissors, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ErpTableLoadingRow } from '@/components/common/erp-loading-empty'
import { buildVisiblePageNumbers } from '@/lib/pagination'
import { useAuth } from '@/features/auth/use-auth'
import {
  closeCashRegister,
  createCashRegisterCut,
  getCashRegisterCurrent,
  getCashRegisterReport,
  listCashRegisterCuts,
  listCashRegisterSessions,
  openCashRegister,
} from '@/features/cash-register/cash-register-api'

const DENOMINATIONS = [
  { key: 'bill_200', label: 'Q200', value: 200 },
  { key: 'bill_100', label: 'Q100', value: 100 },
  { key: 'bill_50', label: 'Q50', value: 50 },
  { key: 'bill_20', label: 'Q20', value: 20 },
  { key: 'bill_10', label: 'Q10', value: 10 },
  { key: 'bill_5', label: 'Q5', value: 5 },
  { key: 'bill_1', label: 'Q1', value: 1 },
  { key: 'coin_0_50', label: 'Q0.50', value: 0.5 },
  { key: 'coin_0_25', label: 'Q0.25', value: 0.25 },
  { key: 'coin_0_10', label: 'Q0.10', value: 0.1 },
  { key: 'coin_0_05', label: 'Q0.05', value: 0.05 },
]

const DEFAULT_OPEN_FORM_VALUES = {
  username: '',
  password: '',
  opening_amount: '0',
  notes: '',
}

const DEFAULT_CLOSE_FORM_VALUES = {
  denomination_counts: DENOMINATIONS.reduce((accumulator, item) => {
    accumulator[item.key] = '0'
    return accumulator
  }, {}),
  payment_channel_summary: {
    card_transaction_count: '0',
    card_amount: '0',
    transfer_transaction_count: '0',
    transfer_amount: '0',
  },
  notes: '',
}

const DEFAULT_CUT_FORM_VALUES = {
  notes: '',
  denomination_counts: DENOMINATIONS.reduce((accumulator, item) => {
    accumulator[item.key] = '0'
    return accumulator
  }, {}),
  payment_channel_summary: {
    card_transaction_count: '0',
    card_amount: '0',
    transfer_transaction_count: '0',
    transfer_amount: '0',
  },
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

function SummaryMetricCard({ label, value }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-[11px] leading-4 text-muted-foreground sm:text-xs">{label}</p>
      <p className="text-sm font-semibold leading-5">{value}</p>
    </div>
  )
}

export function CashRegisterPage() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [cutsPage, setCutsPage] = useState(1)
  const [isOpenDialogVisible, setIsOpenDialogVisible] = useState(false)
  const [isCloseDialogVisible, setIsCloseDialogVisible] = useState(false)
  const [isCutDialogVisible, setIsCutDialogVisible] = useState(false)
  const [viewingCut, setViewingCut] = useState(null)

  const openForm = useForm({
    defaultValues: DEFAULT_OPEN_FORM_VALUES,
    mode: 'onBlur',
  })

  const closeForm = useForm({
    defaultValues: DEFAULT_CLOSE_FORM_VALUES,
    mode: 'onBlur',
  })

  const cutForm = useForm({
    defaultValues: DEFAULT_CUT_FORM_VALUES,
    mode: 'onBlur',
  })

  const currentQuery = useQuery({
    queryKey: ['cash-register', 'current'],
    queryFn: getCashRegisterCurrent,
  })

  const sessionsQuery = useQuery({
    queryKey: ['cash-register', 'sessions', page],
    queryFn: () => listCashRegisterSessions({ page, pageSize: 10 }),
  })

  const reportQuery = useQuery({
    queryKey: ['cash-register', 'report'],
    queryFn: () => getCashRegisterReport({}),
  })

  const cutsQuery = useQuery({
    queryKey: ['cash-register', 'cuts', cutsPage, currentQuery.data?.data?.session?.id || null],
    queryFn: () =>
      listCashRegisterCuts({
        page: cutsPage,
        pageSize: 10,
        sessionId: currentQuery.data?.data?.session?.id || undefined,
      }),
    enabled: Boolean(currentQuery.data?.data?.session?.id),
  })

  const openMutation = useMutation({
    mutationFn: (payload) => openCashRegister(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cash-register'], exact: false })
      await queryClient.invalidateQueries({ queryKey: ['invoices'], exact: false })
      await queryClient.invalidateQueries({ queryKey: ['payments'], exact: false })
      toast.success('Caja abierta correctamente')
      setIsOpenDialogVisible(false)
      openForm.reset(getOpenFormDefaults())
    },
  })

  const closeMutation = useMutation({
    mutationFn: (payload) => closeCashRegister(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cash-register'], exact: false })
      await queryClient.invalidateQueries({ queryKey: ['invoices'], exact: false })
      await queryClient.invalidateQueries({ queryKey: ['payments'], exact: false })
      toast.success('Caja cerrada correctamente')
      setIsCloseDialogVisible(false)
      closeForm.reset(DEFAULT_CLOSE_FORM_VALUES)
    },
  })

  const cutMutation = useMutation({
    mutationFn: (payload) => createCashRegisterCut(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cash-register'], exact: false })
      toast.success('Corte de caja generado')
      setIsCutDialogVisible(false)
      cutForm.reset(DEFAULT_CUT_FORM_VALUES)
    },
  })

  const currentData = currentQuery.data?.data || { isOpen: false, session: null }
  const currentSession = currentData.session
  const summary = reportQuery.data?.data?.summary || {}
  const rows = sessionsQuery.data?.data || []
  const meta = sessionsQuery.data?.meta
  const cutsRows = cutsQuery.data?.data || []
  const cutsMeta = cutsQuery.data?.meta
  const currentPage = Math.max(1, Number(meta?.page || 1))
  const totalPages = Math.max(1, Number(meta?.totalPages || 1))
  const currentCutsPage = Math.max(1, Number(cutsMeta?.page || 1))
  const totalCutsPages = Math.max(1, Number(cutsMeta?.totalPages || 1))
  const pageNumbers = useMemo(() => buildVisiblePageNumbers(currentPage, totalPages, 10), [currentPage, totalPages])
  const cutPageNumbers = useMemo(() => buildVisiblePageNumbers(currentCutsPage, totalCutsPages, 10), [currentCutsPage, totalCutsPages])
  const watchedDenominationCounts = useWatch({
    control: cutForm.control,
    name: 'denomination_counts',
    defaultValue: DEFAULT_CUT_FORM_VALUES.denomination_counts,
  })
  const watchedPaymentChannelSummary = useWatch({
    control: cutForm.control,
    name: 'payment_channel_summary',
    defaultValue: DEFAULT_CUT_FORM_VALUES.payment_channel_summary,
  })
  const cutCountedTotal = useMemo(() => {
    return DENOMINATIONS.reduce((total, denomination) => {
      const qty = Number(watchedDenominationCounts?.[denomination.key] || 0)
      return total + (Number.isFinite(qty) ? qty * denomination.value : 0)
    }, 0)
  }, [watchedDenominationCounts])
  const systemCardTotal = Number(currentSession?.paymentBreakdown?.card || 0)
  const systemTransferTotal = Number(currentSession?.paymentBreakdown?.transfer || 0)
  const systemOtherTotal = Number(currentSession?.paymentBreakdown?.other || 0)
  const cutExpectedTotal = Number(currentSession?.totals?.expectedCash || 0) + systemCardTotal + systemTransferTotal + systemOtherTotal
  const enteredCardTotal = Number(watchedPaymentChannelSummary?.card_amount || 0)
  const enteredTransferTotal = Number(watchedPaymentChannelSummary?.transfer_amount || 0)
  const cutCountedOverallTotal = cutCountedTotal + enteredCardTotal + enteredTransferTotal + systemOtherTotal
  const cutDifference = cutCountedOverallTotal - cutExpectedTotal
  const closeWatchedDenominationCounts = useWatch({
    control: closeForm.control,
    name: 'denomination_counts',
    defaultValue: DEFAULT_CLOSE_FORM_VALUES.denomination_counts,
  })
  const closeWatchedPaymentSummary = useWatch({
    control: closeForm.control,
    name: 'payment_channel_summary',
    defaultValue: DEFAULT_CLOSE_FORM_VALUES.payment_channel_summary,
  })
  const closeCountedCashTotal = useMemo(() => {
    return DENOMINATIONS.reduce((total, denomination) => {
      const qty = Number(closeWatchedDenominationCounts?.[denomination.key] || 0)
      return total + (Number.isFinite(qty) ? qty * denomination.value : 0)
    }, 0)
  }, [closeWatchedDenominationCounts])
  const closeEnteredCardTotal = Number(closeWatchedPaymentSummary?.card_amount || 0)
  const closeEnteredTransferTotal = Number(closeWatchedPaymentSummary?.transfer_amount || 0)
  const closeExpectedTotal = Number(currentSession?.totals?.expectedCash || 0) +
    Number(currentSession?.paymentBreakdown?.card || 0) +
    Number(currentSession?.paymentBreakdown?.transfer || 0) +
    Number(currentSession?.paymentBreakdown?.other || 0)
  const closeCountedOverallTotal = closeCountedCashTotal + closeEnteredCardTotal + closeEnteredTransferTotal + Number(currentSession?.paymentBreakdown?.other || 0)
  const closeDifference = closeCountedOverallTotal - closeExpectedTotal
  const sessionUsername = session?.username || ''
  const getOpenFormDefaults = () => ({
    ...DEFAULT_OPEN_FORM_VALUES,
    username: sessionUsername,
  })

  const parsedViewingCut = useMemo(() => {
    if (!viewingCut) return null
    const denominationCounts = typeof viewingCut.denomination_counts === 'string'
      ? JSON.parse(viewingCut.denomination_counts || '{}')
      : (viewingCut.denomination_counts || {})
    const paymentChannelSummary = typeof viewingCut.payment_channel_summary === 'string'
      ? JSON.parse(viewingCut.payment_channel_summary || '{}')
      : (viewingCut.payment_channel_summary || {})
    return { ...viewingCut, denominationCounts, paymentChannelSummary }
  }, [viewingCut])
  const viewingCutTotals = useMemo(() => {
    if (!parsedViewingCut) return null
    const countedCash = Number(parsedViewingCut.counted_cash_total || 0)
    const card = Number(parsedViewingCut.paymentChannelSummary?.card_amount || 0)
    const transfer = Number(parsedViewingCut.paymentChannelSummary?.transfer_amount || 0)
    const difference = Number(parsedViewingCut.cut_difference || 0)
    const countedOverall = countedCash + card + transfer
    const expected = countedOverall - difference
    return {
      expected,
      countedCash,
      card,
      transfer,
      countedOverall,
      difference,
    }
  }, [parsedViewingCut])
  const summaryCards = [
    { label: 'Estado actual', value: currentData.isOpen ? 'Caja abierta' : 'Caja cerrada' },
    { label: 'Apertura', value: formatCurrency(currentSession?.totals?.openingAmount || 0) },
    { label: 'Ingresos efectivo', value: formatCurrency(currentSession?.totals?.cashIn || 0) },
    { label: 'Pagos tarjeta', value: formatCurrency(currentSession?.paymentBreakdown?.card || 0) },
    { label: 'Pagos transferencia', value: formatCurrency(currentSession?.paymentBreakdown?.transfer || 0) },
    { label: 'Pagos otros', value: formatCurrency(currentSession?.paymentBreakdown?.other || 0) },
    { label: 'Total transacciones', value: formatCurrency(currentSession?.paymentBreakdown?.total || 0) },
    { label: 'Esperado', value: formatCurrency(currentSession?.totals?.expectedCash || 0) },
    { label: 'Cuadres cerrados', value: summary.closedSessions || 0 },
    { label: 'Diferencia acumulada', value: formatCurrency(summary.difference || 0) },
  ]

  const onOpenSubmit = async (values) => {
    try {
      await openMutation.mutateAsync({
        username: values.username,
        password: values.password,
        opening_amount: Number(values.opening_amount || 0),
        notes: values.notes || null,
      })
    } catch (error) {
      toast.error(error.message || 'No se pudo abrir la caja')
    }
  }

  const onCloseSubmit = async (values) => {
    try {
      await closeMutation.mutateAsync({
        denomination_counts: DENOMINATIONS.reduce((accumulator, denomination) => {
          accumulator[denomination.key] = Number(values?.denomination_counts?.[denomination.key] || 0)
          return accumulator
        }, {}),
        payment_channel_summary: {
          card_transaction_count: Number(values?.payment_channel_summary?.card_transaction_count || 0),
          card_amount: Number(values?.payment_channel_summary?.card_amount || 0),
          transfer_transaction_count: Number(values?.payment_channel_summary?.transfer_transaction_count || 0),
          transfer_amount: Number(values?.payment_channel_summary?.transfer_amount || 0),
        },
        notes: values.notes || null,
      })
    } catch (error) {
      toast.error(error.message || 'No se pudo cerrar la caja')
    }
  }

  const onCutSubmit = async (values) => {
    try {
      await cutMutation.mutateAsync({
        notes: values.notes || null,
        denomination_counts: DENOMINATIONS.reduce((accumulator, denomination) => {
          accumulator[denomination.key] = Number(values?.denomination_counts?.[denomination.key] || 0)
          return accumulator
        }, {}),
        payment_channel_summary: {
          card_transaction_count: Number(values?.payment_channel_summary?.card_transaction_count || 0),
          card_amount: Number(values?.payment_channel_summary?.card_amount || 0),
          transfer_transaction_count: Number(values?.payment_channel_summary?.transfer_transaction_count || 0),
          transfer_amount: Number(values?.payment_channel_summary?.transfer_amount || 0),
        },
      })
    } catch (error) {
      toast.error(error.message || 'No se pudo generar corte')
    }
  }

  return (
    <Card className="flex h-full min-h-0 flex-col">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Caja</CardTitle>
          <p className="text-sm text-muted-foreground">Apertura, cierre y cuadre de efectivo</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="icon"
            className="h-9 w-9"
            title="Abrir caja"
            aria-label="Abrir caja"
            disabled={Boolean(currentData.isOpen)}
            onClick={() => {
              openForm.reset(getOpenFormDefaults())
              setIsOpenDialogVisible(true)
            }}
          >
            <LockOpen className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-9 w-9"
            title="Corte de caja"
            aria-label="Corte de caja"
            disabled={!currentData.isOpen}
            onClick={() => setIsCutDialogVisible(true)}
          >
            <Scissors className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-9 w-9"
            title="Cerrar caja"
            aria-label="Cerrar caja"
            disabled={!currentData.isOpen}
            onClick={() => setIsCloseDialogVisible(true)}
          >
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 space-y-4 p-3">
        <section className="overflow-hidden rounded-xl border bg-background">
          <div className="border-b px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Resumen actual</p>
          </div>
          <div className="grid grid-cols-2 gap-3 p-3 xl:grid-cols-5">
            {summaryCards.map((item) => (
              <SummaryMetricCard key={item.label} label={item.label} value={item.value} />
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border bg-background">
          <div className="border-b px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Sesiones de caja</p>
          </div>
        <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1400px] border-collapse text-sm">
              <thead className="bg-muted/60 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold text-foreground">Apertura</th>
                  <th className="px-4 py-3 font-semibold text-foreground">Usuario Apertura</th>
                  <th className="px-4 py-3 font-semibold text-foreground">Estado</th>
                  <th className="px-4 py-3 font-semibold text-foreground">Apertura Efectivo</th>
                  <th className="px-4 py-3 font-semibold text-foreground">Pagos Efectivo</th>
                  <th className="px-4 py-3 font-semibold text-foreground">Pagos Tarjeta</th>
                  <th className="px-4 py-3 font-semibold text-foreground">Pagos Transferencia</th>
                  <th className="px-4 py-3 font-semibold text-foreground">Pagos Otros</th>
                  <th className="px-4 py-3 font-semibold text-foreground">Total Transacciones</th>
                  <th className="px-4 py-3 font-semibold text-foreground">Esperado</th>
                  <th className="px-4 py-3 font-semibold text-foreground">Cierre Real</th>
                  <th className="px-4 py-3 font-semibold text-foreground">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {sessionsQuery.isLoading ? (
                  <ErpTableLoadingRow colSpan={12} title="Cargando sesiones de caja" />
                ) : rows.length === 0 ? (
                  <tr><td className="px-4 py-6 text-muted-foreground" colSpan={12}>No hay sesiones de caja</td></tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="px-4 py-3">{formatDateTime(row.opened_at)}</td>
                      <td className="px-4 py-3">{row.opened_by_username || 'N/A'}</td>
                      <td className="px-4 py-3">{row.status}</td>
                      <td className="px-4 py-3">{formatCurrency(row.totals?.openingAmount || 0)}</td>
                      <td className="px-4 py-3">{formatCurrency(row.paymentBreakdown?.cash || 0)}</td>
                      <td className="px-4 py-3">{formatCurrency(row.paymentBreakdown?.card || 0)}</td>
                      <td className="px-4 py-3">{formatCurrency(row.paymentBreakdown?.transfer || 0)}</td>
                      <td className="px-4 py-3">{formatCurrency(row.paymentBreakdown?.other || 0)}</td>
                      <td className="px-4 py-3">{formatCurrency(row.paymentBreakdown?.total || 0)}</td>
                      <td className="px-4 py-3">{formatCurrency(row.totals?.expectedCash || 0)}</td>
                      <td className="px-4 py-3">{formatCurrency(row.totals?.closingAmount || 0)}</td>
                      <td className="px-4 py-3">{formatCurrency(row.totals?.difference || 0)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 p-3 md:hidden">
          {sessionsQuery.isLoading ? (
            <div className="rounded-lg border">
              <ErpTableLoadingRow colSpan={1} title="Cargando sesiones de caja" />
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-lg border px-4 py-6 text-sm text-muted-foreground">No hay sesiones de caja</div>
          ) : (
            rows.map((row) => (
              <div key={row.id} className="rounded-lg border p-4 text-sm">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{formatDateTime(row.opened_at)}</p>
                    <p className="text-xs text-muted-foreground">{row.opened_by_username || 'N/A'}</p>
                  </div>
                  <span className="rounded-md border px-2 py-1 text-xs">{row.status}</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div><span className="text-muted-foreground">Apertura efectivo:</span> {formatCurrency(row.totals?.openingAmount || 0)}</div>
                  <div><span className="text-muted-foreground">Pagos efectivo:</span> {formatCurrency(row.paymentBreakdown?.cash || 0)}</div>
                  <div><span className="text-muted-foreground">Tarjeta:</span> {formatCurrency(row.paymentBreakdown?.card || 0)}</div>
                  <div><span className="text-muted-foreground">Transferencia:</span> {formatCurrency(row.paymentBreakdown?.transfer || 0)}</div>
                  <div><span className="text-muted-foreground">Otros:</span> {formatCurrency(row.paymentBreakdown?.other || 0)}</div>
                  <div><span className="text-muted-foreground">Total transacciones:</span> {formatCurrency(row.paymentBreakdown?.total || 0)}</div>
                  <div><span className="text-muted-foreground">Esperado:</span> {formatCurrency(row.totals?.expectedCash || 0)}</div>
                  <div><span className="text-muted-foreground">Cierre real:</span> {formatCurrency(row.totals?.closingAmount || 0)}</div>
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground">Diferencia:</span>{' '}
                    <span className={Number(row.totals?.difference || 0) > 0 ? 'text-emerald-600 font-semibold' : Number(row.totals?.difference || 0) < 0 ? 'text-red-600 font-semibold' : 'font-semibold'}>
                      {formatCurrency(row.totals?.difference || 0)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground">
            Página {meta?.page || 1} de {meta?.totalPages || 1} | Total: {meta?.total || 0}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9"
              disabled={currentPage <= 1}
              onClick={() => setPage(Math.max(1, currentPage - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex flex-1 flex-wrap items-center gap-1 sm:flex-initial">
              {pageNumbers.map((pageNumber) => (
                <Button
                  key={pageNumber}
                  type="button"
                  variant={pageNumber === currentPage ? 'default' : 'outline'}
                  className="h-9 min-w-9 px-2"
                  onClick={() => setPage(pageNumber)}
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
              disabled={currentPage >= totalPages}
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        </section>

        <section className="overflow-hidden rounded-xl border bg-background">
          <div className="border-b px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Cortes de caja (sesión actual)</p>
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead className="bg-muted/60 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold text-foreground">Corte</th>
                  <th className="px-4 py-3 font-semibold text-foreground">Fecha</th>
                <th className="px-4 py-3 font-semibold text-foreground">Usuario</th>
                <th className="px-4 py-3 font-semibold text-foreground">Esperado</th>
                <th className="px-4 py-3 font-semibold text-foreground">Contado</th>
                <th className="px-4 py-3 font-semibold text-foreground">Diferencia</th>
                <th className="px-4 py-3 font-semibold text-foreground">Notas</th>
                <th className="px-4 py-3 font-semibold text-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
                {cutsQuery.isLoading ? (
                  <ErpTableLoadingRow colSpan={8} title="Cargando cortes de caja" />
                ) : cutsRows.length === 0 ? (
                  <tr><td className="px-4 py-6 text-muted-foreground" colSpan={8}>No hay cortes registrados</td></tr>
                ) : (
                  cutsRows.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="px-4 py-3">#{row.cut_no}</td>
                      <td className="px-4 py-3">{formatDateTime(row.cut_at)}</td>
                      <td className="px-4 py-3">{row.performed_by_username || 'N/A'}</td>
                      <td className="px-4 py-3">{formatCurrency(row.expected_cash_total)}</td>
                      <td className="px-4 py-3">{formatCurrency(row.counted_cash_total)}</td>
                      <td
                        className={`px-4 py-3 font-semibold ${
                          Number(row.cut_difference || 0) > 0
                            ? 'text-emerald-600'
                            : Number(row.cut_difference || 0) < 0
                              ? 'text-red-600'
                              : ''
                        }`}
                      >
                        {formatCurrency(row.cut_difference)}
                      </td>
                      <td className="px-4 py-3">{row.notes || '-'}</td>
                      <td className="px-4 py-3">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-9 w-9"
                          title="Ver corte"
                          aria-label="Ver corte"
                          onClick={() => setViewingCut(row)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 p-3 md:hidden">
            {cutsQuery.isLoading ? (
              <div className="rounded-lg border">
                <ErpTableLoadingRow colSpan={1} title="Cargando cortes de caja" />
              </div>
            ) : cutsRows.length === 0 ? (
              <div className="rounded-lg border px-4 py-6 text-sm text-muted-foreground">No hay cortes registrados</div>
            ) : (
              cutsRows.map((row) => (
                <div key={row.id} className="rounded-lg border p-4 text-sm">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">Corte #{row.cut_no}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(row.cut_at)}</p>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 shrink-0"
                      title="Ver corte"
                      aria-label="Ver corte"
                      onClick={() => setViewingCut(row)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div><span className="text-muted-foreground">Usuario:</span> {row.performed_by_username || 'N/A'}</div>
                    <div><span className="text-muted-foreground">Esperado:</span> {formatCurrency(row.expected_cash_total)}</div>
                    <div><span className="text-muted-foreground">Contado:</span> {formatCurrency(row.counted_cash_total)}</div>
                    <div>
                      <span className="text-muted-foreground">Diferencia:</span>{' '}
                      <span className={Number(row.cut_difference || 0) > 0 ? 'text-emerald-600 font-semibold' : Number(row.cut_difference || 0) < 0 ? 'text-red-600 font-semibold' : 'font-semibold'}>
                        {formatCurrency(row.cut_difference)}
                      </span>
                    </div>
                    <div className="sm:col-span-2"><span className="text-muted-foreground">Notas:</span> {row.notes || '-'}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground">
              Página {cutsMeta?.page || 1} de {cutsMeta?.totalPages || 1} | Total: {cutsMeta?.total || 0}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9"
                disabled={currentCutsPage <= 1}
                onClick={() => setCutsPage(Math.max(1, currentCutsPage - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex flex-1 flex-wrap items-center gap-1 sm:flex-initial">
                {cutPageNumbers.map((pageNumber) => (
                  <Button
                    key={pageNumber}
                    type="button"
                    variant={pageNumber === currentCutsPage ? 'default' : 'outline'}
                    className="h-9 min-w-9 px-2"
                    onClick={() => setCutsPage(pageNumber)}
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
                disabled={currentCutsPage >= totalCutsPages}
                onClick={() => setCutsPage(Math.min(totalCutsPages, currentCutsPage + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      </CardContent>

      <Dialog
        open={isOpenDialogVisible}
        onOpenChange={(open) => {
          setIsOpenDialogVisible(open)
          if (!open) openForm.reset(getOpenFormDefaults())
        }}
      >
        <DialogContent className="w-[calc(100vw-2rem)] max-w-lg">
          <DialogHeader>
            <DialogTitle>Apertura de caja</DialogTitle>
            <DialogDescription>Confirma usuario y contraseña para abrir caja.</DialogDescription>
          </DialogHeader>
          <form className="grid gap-3" onSubmit={openForm.handleSubmit(onOpenSubmit)}>
            <input type="hidden" {...openForm.register('username', { required: 'Campo requerido' })} />
            <div className="grid gap-2">
              <Label>Usuario</Label>
              <Input value={openForm.watch('username') || ''} readOnly disabled />
              {openForm.formState.errors.username ? <p className="text-xs text-destructive">{openForm.formState.errors.username.message}</p> : null}
            </div>
            <div className="grid gap-2">
              <Label>Contraseña</Label>
              <Input type="password" {...openForm.register('password', { required: 'Campo requerido' })} />
              {openForm.formState.errors.password ? <p className="text-xs text-destructive">{openForm.formState.errors.password.message}</p> : null}
            </div>
            <div className="grid gap-2">
              <Label>Monto apertura</Label>
              <Input type="number" step="0.01" min="0" {...openForm.register('opening_amount', { required: 'Campo requerido' })} />
              {openForm.formState.errors.opening_amount ? <p className="text-xs text-destructive">{openForm.formState.errors.opening_amount.message}</p> : null}
            </div>
            <div className="grid gap-2">
              <Label>Notas</Label>
              <Input {...openForm.register('notes')} />
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="icon" className="h-9 w-9" disabled={openMutation.isPending}>
                <Save className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isCloseDialogVisible}
        onOpenChange={(open) => {
          setIsCloseDialogVisible(open)
          if (!open) closeForm.reset(DEFAULT_CLOSE_FORM_VALUES)
        }}
      >
        <DialogContent className="w-[calc(100vw-2rem)] max-w-5xl">
          <DialogHeader>
            <DialogTitle>Cierre de caja</DialogTitle>
            <DialogDescription>Ingresa el cierre con denominaciones y canales de pago.</DialogDescription>
          </DialogHeader>
          <form className="grid gap-3" onSubmit={closeForm.handleSubmit(onCloseSubmit)}>
            <div className="grid gap-2">
              <p className="text-xs font-semibold text-muted-foreground">Denominaciones</p>
              <div className="grid gap-2 md:grid-cols-3">
                {DENOMINATIONS.map((denomination) => (
                  <div key={denomination.key} className="grid gap-1 rounded-md border p-2">
                    <div>
                      <Label>{denomination.label}</Label>
                    </div>
                    <div>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        {...closeForm.register(`denomination_counts.${denomination.key}`, {
                          min: { value: 0, message: 'Mínimo 0' },
                          validate: (value) => Number.isInteger(Number(value || 0)) || 'Debe ser entero',
                        })}
                      />
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {formatCurrency(Number(closeWatchedDenominationCounts?.[denomination.key] || 0) * denomination.value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-3 rounded-md border p-3 md:grid-cols-2">
              <div className="grid gap-2 rounded-md border p-3">
                <p className="text-xs font-semibold text-muted-foreground">Tarjeta</p>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="grid gap-1">
                    <Label>Cantidad transacciones</Label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      {...closeForm.register('payment_channel_summary.card_transaction_count', {
                        min: { value: 0, message: 'Mínimo 0' },
                        validate: (value) => Number.isInteger(Number(value || 0)) || 'Debe ser entero',
                      })}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label>Monto total</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      {...closeForm.register('payment_channel_summary.card_amount', {
                        min: { value: 0, message: 'Mínimo 0' },
                      })}
                    />
                  </div>
                </div>
              </div>
              <div className="grid gap-2 rounded-md border p-3">
                <p className="text-xs font-semibold text-muted-foreground">Transferencia</p>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="grid gap-1">
                    <Label>Cantidad transacciones</Label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      {...closeForm.register('payment_channel_summary.transfer_transaction_count', {
                        min: { value: 0, message: 'Mínimo 0' },
                        validate: (value) => Number.isInteger(Number(value || 0)) || 'Debe ser entero',
                      })}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label>Monto total</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      {...closeForm.register('payment_channel_summary.transfer_amount', {
                        min: { value: 0, message: 'Mínimo 0' },
                      })}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="grid gap-2 rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-semibold">Esperado</span>
                <span className="min-w-[120px] text-right tabular-nums">{formatCurrency(closeExpectedTotal)}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-semibold">Contado efectivo</span>
                <span className="min-w-[120px] text-right tabular-nums">{formatCurrency(closeCountedCashTotal)}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-semibold">Tarjetas crédito</span>
                <span className="min-w-[120px] text-right tabular-nums">{formatCurrency(closeEnteredCardTotal)}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-semibold">Transferencias</span>
                <span className="min-w-[120px] text-right tabular-nums">{formatCurrency(closeEnteredTransferTotal)}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-semibold">Contado total</span>
                <span className="min-w-[120px] text-right tabular-nums">{formatCurrency(closeCountedOverallTotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold">Diferencia</span>
                <span
                  className={`min-w-[120px] text-right tabular-nums font-semibold ${
                    closeDifference > 0 ? 'text-emerald-600' : closeDifference < 0 ? 'text-red-600' : ''
                  }`}
                >
                  {formatCurrency(closeDifference)}
                </span>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Notas</Label>
              <Input {...closeForm.register('notes')} />
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="icon" className="h-9 w-9" disabled={closeMutation.isPending}>
                <Save className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isCutDialogVisible}
        onOpenChange={(open) => {
          setIsCutDialogVisible(open)
          if (!open) cutForm.reset(DEFAULT_CUT_FORM_VALUES)
        }}
      >
        <DialogContent className="w-[calc(100vw-2rem)] max-w-5xl">
          <DialogHeader>
            <DialogTitle>Generar corte de caja</DialogTitle>
            <DialogDescription>Crea un corte con el saldo esperado actual de la sesión abierta.</DialogDescription>
          </DialogHeader>
          <form className="grid gap-3" onSubmit={cutForm.handleSubmit(onCutSubmit)}>
            <div className="grid gap-2">
              <p className="text-xs font-semibold text-muted-foreground">Denominaciones</p>
              <div className="grid gap-2 md:grid-cols-3">
                {DENOMINATIONS.map((denomination) => (
                  <div key={denomination.key} className="grid gap-1 rounded-md border p-2">
                    <div>
                      <Label>{denomination.label}</Label>
                    </div>
                    <div>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        {...cutForm.register(`denomination_counts.${denomination.key}`, {
                          min: { value: 0, message: 'Mínimo 0' },
                          validate: (value) => Number.isInteger(Number(value || 0)) || 'Debe ser entero',
                        })}
                      />
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {formatCurrency(Number(watchedDenominationCounts?.[denomination.key] || 0) * denomination.value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-3 rounded-md border p-3 md:grid-cols-2">
              <div className="grid gap-2 rounded-md border p-3">
                <p className="text-xs font-semibold text-muted-foreground">Tarjeta</p>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="grid gap-1">
                    <Label>Cantidad transacciones</Label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      {...cutForm.register('payment_channel_summary.card_transaction_count', {
                        min: { value: 0, message: 'Mínimo 0' },
                        validate: (value) => Number.isInteger(Number(value || 0)) || 'Debe ser entero',
                      })}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label>Monto total</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      {...cutForm.register('payment_channel_summary.card_amount', {
                        min: { value: 0, message: 'Mínimo 0' },
                      })}
                    />
                  </div>
                </div>
              </div>
              <div className="grid gap-2 rounded-md border p-3">
                <p className="text-xs font-semibold text-muted-foreground">Transferencia</p>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="grid gap-1">
                    <Label>Cantidad transacciones</Label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      {...cutForm.register('payment_channel_summary.transfer_transaction_count', {
                        min: { value: 0, message: 'Mínimo 0' },
                        validate: (value) => Number.isInteger(Number(value || 0)) || 'Debe ser entero',
                      })}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label>Monto total</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      {...cutForm.register('payment_channel_summary.transfer_amount', {
                        min: { value: 0, message: 'Mínimo 0' },
                      })}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="grid gap-2 rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-semibold">Esperado</span>
                <span className="min-w-[120px] text-right tabular-nums">{formatCurrency(cutExpectedTotal)}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-semibold">Contado efectivo</span>
                <span className="min-w-[120px] text-right tabular-nums">{formatCurrency(cutCountedTotal)}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-semibold">Tarjetas crédito</span>
                <span className="min-w-[120px] text-right tabular-nums">{formatCurrency(enteredCardTotal)}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-semibold">Transferencias</span>
                <span className="min-w-[120px] text-right tabular-nums">{formatCurrency(enteredTransferTotal)}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-semibold">Contado total</span>
                <span className="min-w-[120px] text-right tabular-nums">{formatCurrency(cutCountedOverallTotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold">Diferencia</span>
                <span
                  className={`min-w-[120px] text-right tabular-nums font-semibold ${
                    cutDifference > 0 ? 'text-emerald-600' : cutDifference < 0 ? 'text-red-600' : ''
                  }`}
                >
                  {formatCurrency(cutDifference)}
                </span>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Notas</Label>
              <Input {...cutForm.register('notes')} />
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="icon" className="h-9 w-9" disabled={cutMutation.isPending}>
                <Save className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(parsedViewingCut)} onOpenChange={(open) => !open && setViewingCut(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-5xl">
          <DialogHeader>
            <DialogTitle>Detalle corte #{parsedViewingCut?.cut_no || ''}</DialogTitle>
            <DialogDescription>Información del cuadre en modo solo lectura.</DialogDescription>
          </DialogHeader>
          {parsedViewingCut ? (
            <div className="grid gap-3">
              <div className="grid gap-2 md:grid-cols-4">
                <div className="rounded-md border p-2 text-sm">
                  <p className="text-xs text-muted-foreground">Fecha</p>
                  <p className="font-semibold">{formatDateTime(parsedViewingCut.cut_at)}</p>
                </div>
                <div className="rounded-md border p-2 text-sm">
                  <p className="text-xs text-muted-foreground">Usuario</p>
                  <p className="font-semibold">{parsedViewingCut.performed_by_username || 'N/A'}</p>
                </div>
                <div className="rounded-md border p-2 text-sm">
                  <p className="text-xs text-muted-foreground">Esperado</p>
                  <p className="font-semibold">{formatCurrency(parsedViewingCut.expected_cash_total)}</p>
                </div>
                <div className="rounded-md border p-2 text-sm">
                  <p className="text-xs text-muted-foreground">Contado</p>
                  <p className="font-semibold">{formatCurrency(parsedViewingCut.counted_cash_total)}</p>
                </div>
              </div>

              <div className="grid gap-2">
                <p className="text-xs font-semibold text-muted-foreground">Denominaciones</p>
                <div className="grid gap-2 md:grid-cols-3">
                  {DENOMINATIONS.map((denomination) => {
                    const qty = Number(parsedViewingCut.denominationCounts?.[denomination.key] || 0)
                    return (
                      <div key={denomination.key} className="grid gap-1 rounded-md border p-2">
                        <Label>{denomination.label}</Label>
                        <Input value={qty} readOnly disabled />
                        <div className="text-right text-xs text-muted-foreground">
                          {formatCurrency(qty * denomination.value)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="grid gap-3 rounded-md border p-3 md:grid-cols-2">
                <div className="grid gap-2 rounded-md border p-3">
                  <p className="text-xs font-semibold text-muted-foreground">Tarjeta</p>
                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="grid gap-1">
                      <Label>Cantidad transacciones</Label>
                      <Input value={Number(parsedViewingCut.paymentChannelSummary?.card_transaction_count || 0)} readOnly disabled />
                    </div>
                    <div className="grid gap-1">
                      <Label>Monto total</Label>
                      <Input value={Number(parsedViewingCut.paymentChannelSummary?.card_amount || 0)} readOnly disabled />
                    </div>
                  </div>
                </div>
                <div className="grid gap-2 rounded-md border p-3">
                  <p className="text-xs font-semibold text-muted-foreground">Transferencia</p>
                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="grid gap-1">
                      <Label>Cantidad transacciones</Label>
                      <Input value={Number(parsedViewingCut.paymentChannelSummary?.transfer_transaction_count || 0)} readOnly disabled />
                    </div>
                    <div className="grid gap-1">
                      <Label>Monto total</Label>
                      <Input value={Number(parsedViewingCut.paymentChannelSummary?.transfer_amount || 0)} readOnly disabled />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-2 rounded-md border p-3 text-sm">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-semibold">Esperado</span>
                  <span className="min-w-[120px] text-right tabular-nums">{formatCurrency(viewingCutTotals?.expected || 0)}</span>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-semibold">Contado efectivo</span>
                  <span className="min-w-[120px] text-right tabular-nums">{formatCurrency(viewingCutTotals?.countedCash || 0)}</span>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-semibold">Tarjetas crédito</span>
                  <span className="min-w-[120px] text-right tabular-nums">{formatCurrency(viewingCutTotals?.card || 0)}</span>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-semibold">Transferencias</span>
                  <span className="min-w-[120px] text-right tabular-nums">{formatCurrency(viewingCutTotals?.transfer || 0)}</span>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-semibold">Contado total</span>
                  <span className="min-w-[120px] text-right tabular-nums">{formatCurrency(viewingCutTotals?.countedOverall || 0)}</span>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-semibold">Diferencia</span>
                  <span
                    className={`min-w-[120px] text-right tabular-nums font-semibold ${
                      Number(viewingCutTotals?.difference || 0) > 0
                        ? 'text-emerald-600'
                        : Number(viewingCutTotals?.difference || 0) < 0
                          ? 'text-red-600'
                          : ''
                    }`}
                  >
                    {formatCurrency(viewingCutTotals?.difference || 0)}
                  </span>
                </div>
                <div>
                  <Label>Notas</Label>
                  <Input value={parsedViewingCut.notes || ''} readOnly disabled />
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
