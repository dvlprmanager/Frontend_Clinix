import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { ErpLoadingEmpty } from '@/components/common/erp-loading-empty'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SelectField } from '@/components/ui/select-field'
import { DateTimePickerInput } from '@/components/ui/date-time-picker-input'
import { IconTooltipButton } from '@/components/common/icon-tooltip-button'
import { openPdfReportViewer } from '@/shared/utils/export-pdf'

const REPORT_TYPES = [
  { value: 'patients-consultations', label: 'Consultas' },
  { value: 'appointments', label: 'Citas' },
  { value: 'billing-collections', label: 'Facturación y cobros' },
  { value: 'executive-kpis', label: 'KPIs ejecutivos' },
]

function getDefaultDateRange() {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 29)
  const toIso = (date) => date.toISOString().slice(0, 10)
  return {
    startDate: toIso(start),
    endDate: toIso(end),
  }
}

function toQueryString(params = {}) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (!value) continue
    search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}

export function ReportsPage() {
  const defaults = useMemo(() => getDefaultDateRange(), [])
  const [reportType, setReportType] = useState('patients-consultations')
  const [startDate, setStartDate] = useState(defaults.startDate)
  const [endDate, setEndDate] = useState(defaults.endDate)
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)
  const [viewer, setViewer] = useState(null)
  const [previewParams, setPreviewParams] = useState(null)

  useEffect(() => {
    return () => {
      if (viewer?.dispose) viewer.dispose()
    }
  }, [viewer])

  const handleConsult = async () => {
    if (!startDate || !endDate) {
      setFormError('Selecciona el rango de fechas')
      return
    }
    if (startDate > endDate) {
      setFormError('La fecha inicial no puede ser mayor a la final')
      return
    }
    setFormError('')
    setLoading(true)

    try {
      const query = toQueryString({
        reportType,
        startDate,
        endDate,
      })
      const nextViewer = await openPdfReportViewer({
        path: `/api/dashboard/reports/pdf${query}`,
        fallbackFilename: 'reporte-operativo.pdf',
      })
      if (viewer?.dispose) viewer.dispose()
      setViewer(nextViewer)
      setPreviewParams({ reportType, startDate, endDate })
    } catch (error) {
      setFormError(error.message || 'No se pudo generar el reporte PDF')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-150px)] min-h-[660px] flex-col gap-4">
      <Card>
        <CardHeader className="space-y-3">
          <CardTitle>Reporteador</CardTitle>
          <CardDescription>Tipo de reporte + rango de fechas</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[220px,170px,170px,120px]">
          <div className="space-y-1">
            <Label htmlFor="reportType">Tipo de reporte</Label>
            <SelectField
              value={reportType}
              onValueChange={setReportType}
              options={REPORT_TYPES}
              placeholder="Tipo de reporte"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="startDate">Desde</Label>
            <DateTimePickerInput id="startDate" value={startDate} onChange={setStartDate} withTime={false} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="endDate">Hasta</Label>
            <DateTimePickerInput id="endDate" value={endDate} onChange={setEndDate} withTime={false} />
          </div>
          <div className="flex items-end">
            <div className="w-full">
              <IconTooltipButton
                icon={Search}
                label={loading ? 'Generando reporte...' : 'Consultar reporte'}
                variant="default"
                onClick={handleConsult}
                disabled={loading}
                className="h-10 w-full"
              />
            </div>
          </div>
        </CardContent>
        {formError ? (
          <CardContent className="pt-0">
            <p className="text-sm text-destructive">{formError}</p>
          </CardContent>
        ) : null}
      </Card>

      <Card className="flex min-h-0 flex-1 flex-col">
        <CardHeader className="space-y-1">
          <CardTitle>Visor PDF</CardTitle>
          <CardDescription>
            {previewParams
              ? `Vista previa del reporte (${previewParams.reportType}) del ${previewParams.startDate} al ${previewParams.endDate}`
              : 'Aún no hay un reporte generado'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 min-h-0">
          {viewer?.objectUrl ? (
            <iframe
              title={viewer.filename || 'Reporte PDF'}
              src={viewer.objectUrl}
              className="h-full min-h-[620px] w-full rounded-md border"
            />
          ) : (
            <ErpLoadingEmpty
              title="Sin reporte en pantalla"
              description="Completa los filtros y presiona Consultar para generar el PDF."
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
