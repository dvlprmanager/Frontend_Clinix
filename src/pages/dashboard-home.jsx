import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CalendarDays, CreditCard, Receipt, TrendingUp, Users } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from 'recharts'
import { PageSkeleton } from '@/components/common/page-skeleton'
import { ErpLoadingEmpty } from '@/components/common/erp-loading-empty'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { getCashRegisterCurrent } from '@/features/cash-register/cash-register-api'
import { getDashboardOverview } from '@/pages/dashboard-api'
import { useAuth } from '@/features/auth/use-auth'

const PIE_COLORS = ['#22c55e', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6']

const revenueConfig = {
  invoicedTotal: { label: 'Facturado', color: '#0ea5e9' },
  paidTotal: { label: 'Cobrado', color: '#22c55e' },
}

const appointmentConfig = {
  total: { label: 'Citas', color: '#8b5cf6' },
}

const doctorConfig = {
  revenueTotal: { label: 'Ingresos', color: '#06b6d4' },
}

const cashConfig = {
  cashIn: { label: 'Efectivo', color: '#f59e0b' },
}

const operationalProjectionConfig = {
  pendingCumulative: { label: 'Pendientes', color: '#f59e0b' },
  confirmedCumulative: { label: 'Confirmadas', color: '#0ea5e9' },
  canceledCumulative: { label: 'Canceladas', color: '#ef4444' },
  attendedCumulative: { label: 'Atendidas', color: '#22c55e' },
}

function formatCurrency(value) {
  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: 'GTQ',
    minimumFractionDigits: 2,
  }).format(Number(value || 0))
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`
}

function formatNumber(value) {
  return new Intl.NumberFormat('es-GT').format(Number(value || 0))
}

function formatDateTime(value) {
  if (!value) return 'Sin fecha'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-GT', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function toDateInputValue(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getCurrentMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    start: toDateInputValue(start),
    end: toDateInputValue(end),
  }
}

function KpiCard({ title, value, note, icon: Icon }) {
  return (
    <Card>
      <CardHeader className="space-y-1 pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardDescription>{title}</CardDescription>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <CardTitle className="text-2xl md:text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  )
}

export function DashboardHome({ isLoading = false }) {
  const defaultMonthRange = getCurrentMonthRange()
  const [dateFrom, setDateFrom] = useState(defaultMonthRange.start)
  const [dateTo, setDateTo] = useState(defaultMonthRange.end)
  const { session } = useAuth()
  const sessionUserId = session?.userId || session?.id || 'anonymous'
  const sessionTenantId = session?.tenantId || 'no-tenant'
  const sessionRoles = Array.isArray(session?.roles) ? session.roles.join(',') : 'no-roles'
  const normalizedDateFrom = dateFrom <= dateTo ? dateFrom : dateTo
  const normalizedDateTo = dateFrom <= dateTo ? dateTo : dateFrom

  const overviewQuery = useQuery({
    queryKey: ['dashboard-overview', sessionTenantId, sessionUserId, sessionRoles, normalizedDateFrom, normalizedDateTo],
    queryFn: () => getDashboardOverview({ startDate: normalizedDateFrom, endDate: normalizedDateTo }),
  })

  const data = overviewQuery.data?.data
  const dashboardView = data?.scope?.view || 'admin'
  const isDoctorView = dashboardView === 'doctor'
  const isReceptionView = dashboardView === 'reception'
  const isAdminView = !isDoctorView && !isReceptionView

  const cashRegisterCurrentQuery = useQuery({
    queryKey: ['cash-register', 'current', sessionTenantId, sessionUserId],
    queryFn: getCashRegisterCurrent,
    enabled: isReceptionView,
  })

  const cashRegisterCurrent = cashRegisterCurrentQuery.data?.data || { isOpen: false, session: null }
  const receptionCashSession = cashRegisterCurrent.session
  const kpis = data?.kpis || {}
  const trends = data?.trends || {}
  const paymentMix = trends.paymentMix || []
  const appointmentsByStatus = trends.appointmentsByStatus || []
  const topDoctors = trends.topDoctors || []
  const consultations = trends.consultations || []
  const revenueByPeriod = trends.revenueByPeriod || []
  const cashFlowDaily = trends.cashFlowDaily || []
  const monthlyProjection = trends.monthlyProjection || {}
  const monthlyProjectionTotals = monthlyProjection.totals || {}
  const monthlyProjectionSeries = Array.isArray(monthlyProjection.series) ? monthlyProjection.series : []
  const alerts = data?.alerts || []

  const revenueChartData = revenueByPeriod.map((item) => ({
    period: item.period,
    invoicedTotal: Number(item.invoicedTotal || 0),
    paidTotal: Number(item.paidTotal || 0),
  }))

  const appointmentChartData = appointmentsByStatus.map((item) => ({
    name: item.name,
    total: Number(item.total || 0),
  }))

  const doctorsChartData = topDoctors.map((item) => ({
    doctorName: item.doctorName,
    revenueTotal: Number(item.revenueTotal || 0),
  }))

  const cashChartData = cashFlowDaily.slice(-14).map((item) => ({
    day: item.day,
    cashIn: Number(item.cashIn || 0),
  }))
  const monthlyProjectionChartData = monthlyProjectionSeries.map((item) => ({
    day: String(item.day || '').slice(8),
    pendingCumulative: Number(item.pendingCumulative || 0),
    confirmedCumulative: Number(item.confirmedCumulative || 0),
    canceledCumulative: Number(item.canceledCumulative || 0),
    attendedCumulative: Number(item.attendedCumulative || 0),
  }))

  const paymentMixTotal = useMemo(
    () => paymentMix.reduce((sum, item) => sum + Number(item.total || 0), 0),
    [paymentMix],
  )
  const getStatusTotal = (code) => {
    const normalized = String(code || '').toUpperCase()
    return appointmentsByStatus
      .filter((item) => String(item.code || '').toUpperCase() === normalized)
      .reduce((sum, item) => sum + Number(item.total || 0), 0)
  }
  const pendingByStatus = getStatusTotal('PENDING')
  const confirmedAppointments = getStatusTotal('CONFIRMED')
  const canceledAppointments = getStatusTotal('CANCELED')
  const scheduledAppointments = getStatusTotal('SCHEDULED')
  const attendedAppointments = getStatusTotal('ATTENDED')
  const pendingAppointments = pendingByStatus || Math.max(0, Number(kpis.appointmentsTotal || 0) - Number(attendedAppointments || 0))
  const uniquePatientsAttended = useMemo(
    () => new Set(consultations.map((item) => item.patientName).filter(Boolean)).size,
    [consultations],
  )
  const visibleAlerts = isAdminView
    ? alerts
    : alerts.filter((alert) => !['Cobranza baja', 'Diferencias de caja'].includes(alert.title))

  const dashboardTitle = dashboardView === 'doctor'
    ? 'Panel del doctor'
    : dashboardView === 'reception'
      ? 'Panel de recepción'
      : 'Panel ejecutivo'

  const dashboardDescription = dashboardView === 'doctor'
    ? 'Tu operación clínica en el período seleccionado'
    : dashboardView === 'reception'
      ? 'Indicadores operativos para recepción'
      : 'Clínica actual'

  if (isLoading || overviewQuery.isLoading) {
    return <PageSkeleton variant="dashboard" />
  }

  if (overviewQuery.isError) {
    return (
      <Card>
        <CardContent className="p-6">
          <ErpLoadingEmpty
            title="No se pudo cargar el dashboard"
            description={overviewQuery.error?.message || 'Error al obtener indicadores del tenant actual.'}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:gap-6">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">{dashboardTitle}</h2>
          <p className="text-sm text-muted-foreground">
            {dashboardDescription} | Del {data?.range?.startDate} al {data?.range?.endDate}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Desde</span>
            <Input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="h-9 w-[160px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Hasta</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="h-9 w-[160px]"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isDoctorView ? (
          <>
            <KpiCard
              title="Citas atendidas"
              value={formatNumber(attendedAppointments)}
              note={`No-show ${formatPercent(kpis.noShowRate)}`}
              icon={CalendarDays}
            />
            <KpiCard
              title="Citas pendientes"
              value={formatNumber(pendingAppointments)}
              note={`Citas programadas ${formatNumber(scheduledAppointments)}`}
              icon={CalendarDays}
            />
            <KpiCard
              title="Pacientes activos"
              value={formatNumber(kpis.activePatients)}
              note="Pacientes asignados con actividad"
              icon={Users}
            />
            <KpiCard
              title="Consultas registradas"
              value={formatNumber(consultations.length)}
              note={`Pacientes únicos ${formatNumber(uniquePatientsAttended)}`}
              icon={Users}
            />
          </>
        ) : isReceptionView ? (
          <>
            <KpiCard
              title="Pendientes"
              value={formatNumber(pendingByStatus)}
              note={`Programadas ${formatNumber(scheduledAppointments)}`}
              icon={CalendarDays}
            />
            <KpiCard
              title="Confirmadas"
              value={formatNumber(confirmedAppointments)}
              note="Listas para atención"
              icon={CalendarDays}
            />
            <KpiCard
              title="Atendidas"
              value={formatNumber(attendedAppointments)}
              note={`No-show ${formatPercent(kpis.noShowRate)}`}
              icon={CalendarDays}
            />
            <KpiCard
              title="Canceladas"
              value={formatNumber(canceledAppointments)}
              note="Citas no realizadas"
              icon={Users}
            />
          </>
        ) : (
          <>
            <KpiCard
              title="Ingresos cobrados"
              value={formatCurrency(kpis.paymentsTotal)}
              note={`Cobranza ${formatPercent(kpis.collectionRate)}`}
              icon={CreditCard}
            />
            <KpiCard
              title="Facturado"
              value={formatCurrency(kpis.invoicesTotal)}
              note={`Saldo pendiente ${formatCurrency(kpis.invoicesBalance)}`}
              icon={Receipt}
            />
            <KpiCard
              title="Citas atendidas"
              value={formatNumber(kpis.appointmentsAttended)}
              note={`No-show ${formatPercent(kpis.noShowRate)}`}
              icon={CalendarDays}
            />
            <KpiCard
              title="Pacientes activos"
              value={formatNumber(kpis.activePatients)}
              note={`Ticket promedio ${formatCurrency(kpis.averageTicket)}`}
              icon={Users}
            />
          </>
        )}
      </section>

      {!isReceptionView && (
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resumen operativo y proyección de citas</CardTitle>
              <CardDescription>
                Del {monthlyProjection?.startDate} al {monthlyProjection?.endDate}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Card className="border-amber-200 bg-amber-50/50">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-amber-700">Pendientes</CardDescription>
                    <CardTitle className="text-2xl text-amber-900">{formatNumber(monthlyProjectionTotals.pendingTotal)}</CardTitle>
                  </CardHeader>
                </Card>
                <Card className="border-sky-200 bg-sky-50/50">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-sky-700">Confirmadas</CardDescription>
                    <CardTitle className="text-2xl text-sky-900">{formatNumber(monthlyProjectionTotals.confirmedTotal)}</CardTitle>
                  </CardHeader>
                </Card>
                <Card className="border-rose-200 bg-rose-50/50">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-rose-700">Canceladas</CardDescription>
                    <CardTitle className="text-2xl text-rose-900">{formatNumber(monthlyProjectionTotals.canceledTotal)}</CardTitle>
                  </CardHeader>
                </Card>
                <Card className="border-emerald-200 bg-emerald-50/50">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-emerald-700">Atendidas</CardDescription>
                    <CardTitle className="text-2xl text-emerald-900">{formatNumber(monthlyProjectionTotals.attendedTotal)}</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {monthlyProjectionChartData.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin citas para proyectar en el rango seleccionado.</p>
              ) : (
                <ChartContainer config={operationalProjectionConfig} className="h-[320px] w-full">
                  <LineChart data={monthlyProjectionChartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} minTickGap={16} />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => formatNumber(value)} />
                    <ChartTooltip
                      content={(
                        <ChartTooltipContent
                          formatter={(value) => formatNumber(value)}
                          labelFormatter={(value) => `Día ${value}`}
                        />
                      )}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Line type="monotone" dataKey="pendingCumulative" stroke="var(--color-pendingCumulative)" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="confirmedCumulative" stroke="var(--color-confirmedCumulative)" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="canceledCumulative" stroke="var(--color-canceledCumulative)" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="attendedCumulative" stroke="var(--color-attendedCumulative)" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {isReceptionView && (
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estado de caja actual</CardTitle>
              <CardDescription>Resumen de la sesión abierta de caja para recepción</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-md border px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Caja</p>
                <p className="text-lg font-semibold text-foreground">{cashRegisterCurrent?.isOpen ? 'Abierta' : 'Cerrada'}</p>
              </div>
              <div className="rounded-md border px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Cobrado en caja</p>
                <p className="text-lg font-semibold text-foreground">{formatCurrency(receptionCashSession?.paymentBreakdown?.total || 0)}</p>
              </div>
              <div className="rounded-md border px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Efectivo en caja</p>
                <p className="text-lg font-semibold text-foreground">{formatCurrency(receptionCashSession?.totals?.expectedCash || 0)}</p>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {isAdminView && (
        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tendencia mensual</CardTitle>
              <CardDescription>Facturado vs cobrado</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={revenueConfig} className="h-[280px] w-full">
                <LineChart data={revenueChartData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="period" tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `Q${Math.round(Number(value || 0) / 1000)}k`} />
                  <ChartTooltip
                    content={(
                      <ChartTooltipContent
                        formatter={(value) => formatCurrency(value)}
                        labelFormatter={(value) => `Período: ${value}`}
                      />
                    )}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line type="monotone" dataKey="invoicedTotal" stroke="var(--color-invoicedTotal)" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="paidTotal" stroke="var(--color-paidTotal)" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Métodos de pago</CardTitle>
              <CardDescription>Distribución del recaudo</CardDescription>
            </CardHeader>
            <CardContent>
              {paymentMix.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin pagos registrados</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-[240px,1fr] md:items-center">
                  <ChartContainer config={{}} className="mx-auto h-[220px] w-[220px]">
                    <PieChart>
                      <ChartTooltip
                        content={(
                          <ChartTooltipContent
                            formatter={(value) => formatCurrency(value)}
                            labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ''}
                          />
                        )}
                      />
                      <Pie data={paymentMix} dataKey="total" nameKey="name" innerRadius={60} outerRadius={95} strokeWidth={2}>
                        {paymentMix.map((item, index) => (
                          <Cell key={item.code} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <div className="space-y-2">
                    {paymentMix.map((item, index) => (
                      <div key={item.code} className="flex items-center justify-between gap-3 text-sm">
                        <span className="inline-flex items-center gap-2 text-foreground">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                          {item.name}
                        </span>
                        <span className="text-muted-foreground">
                          {formatCurrency(item.total)} ({formatPercent(item.percentage)})
                        </span>
                      </div>
                    ))}
                    <div className="pt-2 text-xs text-muted-foreground">
                      Total del período: {formatCurrency(paymentMixTotal)}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Citas por estado</CardTitle>
            <CardDescription>Comportamiento operativo del período</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={appointmentConfig} className="h-[280px] w-full">
              <BarChart data={appointmentChartData} layout="vertical" margin={{ left: 8, right: 12 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  width={130}
                  tick={{ fontSize: 12 }}
                />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatNumber(value)} />} />
                <Bar dataKey="total" fill="var(--color-total)" radius={6} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {isAdminView ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top doctores</CardTitle>
              <CardDescription>Consultas e ingresos por médico</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={doctorConfig} className="h-[280px] w-full">
                <BarChart data={doctorsChartData} layout="vertical" margin={{ left: 8, right: 12 }}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(value) => `Q${Math.round(Number(value || 0) / 1000)}k`} />
                  <YAxis
                    type="category"
                    dataKey="doctorName"
                    tickLine={false}
                    axisLine={false}
                    width={140}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => String(value || '').slice(0, 18)}
                  />
                  <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(value)} />} />
                  <Bar dataKey="revenueTotal" fill="var(--color-revenueTotal)" radius={6} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{isDoctorView ? 'Mis consultas recientes' : 'Consultas recientes'}</CardTitle>
              <CardDescription>
                {isDoctorView ? 'Últimas consultas registradas por ti' : 'Últimas consultas registradas'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {consultations.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin consultas en el período.</p>
              ) : (
                consultations.slice(0, 8).map((item) => (
                  <div key={item.consultationId} className="rounded-md border px-3 py-2 text-sm">
                    <div className="font-medium text-foreground">{item.patientName}</div>
                    <div className="text-muted-foreground">
                      {item.doctorName} | {formatDateTime(item.consultationAt)}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}
      </section>

      <section className={`grid gap-4 ${isAdminView ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
        {isAdminView && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Flujo diario de efectivo</CardTitle>
              <CardDescription>Últimos 14 días</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={cashConfig} className="h-[280px] w-full">
                <BarChart data={cashChartData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tickFormatter={(value) => String(value || '').slice(5)} minTickGap={14} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `Q${Math.round(Number(value || 0) / 1000)}k`} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(value)} />} />
                  <Bar dataKey="cashIn" fill="var(--color-cashIn)" radius={6} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{isReceptionView ? 'Alertas operativas' : 'Alertas'}</CardTitle>
            <CardDescription>
              {isReceptionView ? 'Estado de citas y atención del período' : 'Indicadores que requieren atención'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {visibleAlerts.length === 0 ? (
              <p className="text-sm text-emerald-700">No hay alertas críticas para este período.</p>
            ) : (
              visibleAlerts.map((alert) => (
                <div key={alert.title} className="rounded-md border px-3 py-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    {alert.title}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{alert.message}</p>
                </div>
              ))
            )}
            {isAdminView && (
              <div className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Diferencia acumulada de caja: {formatCurrency(data?.cashSummary?.totalDifference)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
