import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { CalendarPlus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErpTableLoadingRow } from '@/components/common/erp-loading-empty'
import { Input } from '@/components/ui/input'
import { listClinicalShares } from '@/features/clinical-sharing/clinical-sharing-api'

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

export function InternalReferralsPage() {
  const navigate = useNavigate()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  const referralsQuery = useQuery({
    queryKey: ['clinical-sharing', 'internal-referrals', search],
    queryFn: () =>
      listClinicalShares({
        direction: 'received',
        internal: true,
        page: 1,
        pageSize: 50,
        q: search,
      }),
  })

  const rows = referralsQuery.data?.data || []

  const handleSchedule = (item) => {
    const params = new URLSearchParams()
    params.set('prefillPatientId', item.patient_id)
    params.set('prefillDoctorId', item.doctor_target_user_id)
    params.set('prefillMotivo', item.notes || 'Paciente remitido internamente')
    navigate(`/appointments?${params.toString()}`)
  }

  const onSearchKeyDown = (event) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    setSearch(searchInput.trim())
  }

  const summary = useMemo(() => ({ total: rows.length }), [rows])

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Pacientes remitidos</CardTitle>
          <p className="text-sm text-muted-foreground">Listado interno para programación de cita por recepción</p>
        </div>
        <div className="relative w-full md:w-[340px]">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder="Buscar por paciente o doctor"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead className="bg-muted/60 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold text-foreground">Paciente</th>
                <th className="px-4 py-3 font-semibold text-foreground">Doctor remitente</th>
                <th className="px-4 py-3 font-semibold text-foreground">Doctor destino</th>
                <th className="px-4 py-3 font-semibold text-foreground">Notas</th>
                <th className="px-4 py-3 font-semibold text-foreground">Fecha remisión</th>
                <th className="px-4 py-3 font-semibold text-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {referralsQuery.isLoading ? (
                <ErpTableLoadingRow colSpan={6} title="Cargando pacientes remitidos" />
              ) : rows.length === 0 ? (
                <tr><td className="px-4 py-6 text-muted-foreground" colSpan={6}>No hay pacientes remitidos</td></tr>
              ) : (
                rows.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="px-4 py-3">{`${item.patient_nombres || ''} ${item.patient_apellidos || ''}`.trim()}</td>
                    <td className="px-4 py-3">{`${item.doctor_origin_nombres || ''} ${item.doctor_origin_apellidos || ''}`.trim()}</td>
                    <td className="px-4 py-3">{`${item.doctor_target_nombres || ''} ${item.doctor_target_apellidos || ''}`.trim()}</td>
                    <td className="px-4 py-3">{item.notes || 'N/A'}</td>
                    <td className="px-4 py-3">{formatDateTime(item.created_at)}</td>
                    <td className="px-4 py-3">
                      <Button
                        type="button"
                        size="sm"
                        className="gap-2"
                        onClick={() => handleSchedule(item)}
                        title="Agendar cita"
                        aria-label="Agendar cita"
                      >
                        <CalendarPlus className="h-4 w-4" />
                        Agendar cita
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t px-4 py-3 text-xs text-muted-foreground">Total remitidos: {summary.total}</div>
      </CardContent>
    </Card>
  )
}
