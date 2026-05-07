import { useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { ArrowLeft, Eye, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ErpLoadingEmpty } from '@/components/common/erp-loading-empty'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getClinicalShareAccessData, verifyClinicalShareAccess } from './clinical-sharing-api'
import { API_URL } from '@/utils/api-client'

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

function fileUrl(storageKey) {
  if (!storageKey) return ''
  if (storageKey.startsWith('http://') || storageKey.startsWith('https://')) return storageKey
  if (storageKey.startsWith('/')) return `${API_URL}${storageKey}`
  return `${API_URL}/${storageKey}`
}

function formatClinicalValue(value) {
  if (value === null || value === undefined || value === '') return 'N/A'
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

export function ClinicalShareAccessPage() {
  const { token = '' } = useParams()
  const [otpDigits, setOtpDigits] = useState(() => Array.from({ length: 6 }, () => ''))
  const [verified, setVerified] = useState(false)
  const otpInputRefs = useRef([])

  const verifyMutation = useMutation({
    mutationFn: () => verifyClinicalShareAccess(token, otpDigits.join('')),
    onSuccess: () => {
      setVerified(true)
      toast.success('Código válido. Acceso habilitado')
    },
  })

  const dataQuery = useQuery({
    queryKey: ['clinical-sharing', 'access', token],
    queryFn: () => getClinicalShareAccessData(token),
    enabled: verified && Boolean(token),
  })

  const handleVerify = async (event) => {
    event.preventDefault()
    const otpCode = otpDigits.join('')
    if (otpCode.length !== 6) {
      toast.error('Ingresa el código OTP completo')
      return
    }
    try {
      await verifyMutation.mutateAsync()
    } catch (error) {
      toast.error(error.message || 'No se pudo validar el código')
    }
  }

  const focusInput = (index) => {
    const next = otpInputRefs.current[index]
    if (next) next.focus()
  }

  const handleDigitChange = (index, value) => {
    const normalized = String(value || '').replace(/\D/g, '').slice(-1)
    setOtpDigits((previous) => {
      const next = [...previous]
      next[index] = normalized
      return next
    })
    if (normalized && index < 5) {
      focusInput(index + 1)
    }
  }

  const handleDigitKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !otpDigits[index] && index > 0) {
      focusInput(index - 1)
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      focusInput(index - 1)
    }
    if (event.key === 'ArrowRight' && index < 5) {
      event.preventDefault()
      focusInput(index + 1)
    }
  }

  const handleDigitPaste = (event) => {
    const pasted = event.clipboardData?.getData('text') || ''
    const digits = pasted.replace(/\D/g, '').slice(0, 6).split('')
    if (digits.length === 0) return
    event.preventDefault()
    setOtpDigits((previous) => {
      const next = [...previous]
      for (let index = 0; index < 6; index += 1) {
        next[index] = digits[index] || ''
      }
      return next
    })
    focusInput(Math.min(digits.length, 6) - 1)
  }

  const payload = dataQuery.data?.data
  const share = payload?.share
  const patient = payload?.patient
  const consultations = payload?.consultations || []
  const clinicalFiles = payload?.clinicalFiles || []
  const prescriptions = payload?.prescriptions || []
  const latestConsultation = consultations[0]
  const latestConsultationId = latestConsultation?.id || null
  const latestConsultationPrescriptions = latestConsultationId
    ? prescriptions.filter((item) => item.consultation_id === latestConsultationId)
    : []
  const latestConsultationFiles = latestConsultationId
    ? clinicalFiles.filter((file) => file.consultation_id === latestConsultationId)
    : []

  if (!verified) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Validar código OTP
            </CardTitle>
            <CardDescription>
              Ingresa el código de 6 dígitos enviado por correo para desbloquear el expediente compartido.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleVerify}>
              <div className="space-y-1.5">
                <Label htmlFor="otp-code">Código OTP</Label>
                <div className="flex items-center gap-2">
                  {otpDigits.map((digit, index) => (
                    <Input
                      key={`otp-digit-${index + 1}`}
                      id={index === 0 ? 'otp-code' : undefined}
                      ref={(node) => {
                        otpInputRefs.current[index] = node
                      }}
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(event) => handleDigitChange(index, event.target.value)}
                      onKeyDown={(event) => handleDigitKeyDown(index, event)}
                      onPaste={handleDigitPaste}
                      className="h-10 w-10 text-center text-base"
                      aria-label={`Dígito ${index + 1} del código OTP`}
                      required
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" className="h-9 w-9 p-0" title="Validar código" aria-label="Validar código">
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="mx-auto w-full max-w-5xl border-slate-300 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-200 bg-slate-50/70">
          <CardTitle className="text-xl">Referencia clínica entre profesionales</CardTitle>
          <CardDescription className="text-sm text-slate-600">
            Documento clínico compartido entre médicos. Remitente: {share?.doctor_origin || 'N/A'} | Destino: {share?.doctor_target || 'N/A'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-5">
          {dataQuery.isLoading ? (
            <ErpLoadingEmpty title="Cargando expediente clínico" />
          ) : (
            <>
              <section className="grid gap-3 text-sm md:grid-cols-2">
                <p className="md:col-span-2 text-sm font-semibold uppercase tracking-wide text-slate-700">Datos del Paciente</p>
                <p><strong>Paciente:</strong> {`${patient?.nombres || ''} ${patient?.apellidos || ''}`.trim() || 'N/A'}</p>
                <p><strong>DPI:</strong> {patient?.dpi || 'N/A'}</p>
                <p><strong>Fecha de nacimiento:</strong> {patient?.fecha_nacimiento || 'N/A'}</p>
                <p><strong>Sexo:</strong> {patient?.sexo || 'N/A'}</p>
                <p><strong>Teléfono:</strong> {patient?.telefono || 'N/A'}</p>
                <p><strong>Email:</strong> {patient?.email || 'N/A'}</p>
                <p className="md:col-span-2"><strong>Dirección:</strong> {patient?.direccion || 'N/A'}</p>
                <p><strong>Vigencia de acceso:</strong> {formatDateTime(share?.access_expires_at)}</p>
              </section>

              <section className="space-y-2">
                <h3 className="border-b border-slate-200 pb-1 text-sm font-semibold uppercase tracking-wide text-slate-700">Motivo de Referencia</h3>
                <p className="text-sm text-slate-800">{share?.notes || latestConsultation?.motivo || 'No especificado'}</p>
              </section>

              <section className="space-y-2">
                <h3 className="border-b border-slate-200 pb-1 text-sm font-semibold uppercase tracking-wide text-slate-700">Resumen de Consultas</h3>
                {consultations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin consultas asociadas.</p>
                ) : (
                  <div className="grid gap-2 text-sm md:grid-cols-2">
                    <p><strong>Fecha:</strong> {formatDateTime(latestConsultation?.created_at)}</p>
                    <p><strong>Doctor:</strong> {`${latestConsultation?.doctor_nombres || ''} ${latestConsultation?.doctor_apellidos || ''}`.trim() || 'N/A'}</p>
                    <p><strong>ID cita:</strong> {latestConsultation?.appointment_id || 'N/A'}</p>
                    <p><strong>Seguimiento sugerido:</strong> {formatDateTime(latestConsultation?.followup_suggested_at)}</p>
                    <p className="md:col-span-2"><strong>Motivo:</strong> {latestConsultation?.motivo || 'N/A'}</p>
                    <p className="md:col-span-2"><strong>Historia clínica:</strong> {latestConsultation?.historia || 'N/A'}</p>
                    <p className="md:col-span-2"><strong>Examen físico:</strong> {latestConsultation?.examen_fisico || 'N/A'}</p>
                    <p className="md:col-span-2"><strong>Indicaciones:</strong> {latestConsultation?.indicaciones || 'N/A'}</p>
                    <p className="md:col-span-2"><strong>Diagnóstico:</strong> {latestConsultation?.diagnostico || 'N/A'}</p>
                    <p className="md:col-span-2"><strong>Plan terapéutico:</strong> {latestConsultation?.plan || 'N/A'}</p>
                    <div className="md:col-span-2">
                      <p><strong>Signos vitales:</strong></p>
                      <pre className="mt-1 overflow-x-auto rounded-md bg-slate-50 p-2 text-xs text-slate-700">
                        {formatClinicalValue(latestConsultation?.signos_vitales)}
                      </pre>
                    </div>
                  </div>
                )}
              </section>

              <section className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <h3 className="border-b border-slate-200 pb-1 text-sm font-semibold uppercase tracking-wide text-slate-700">Tratamiento farmacológico</h3>
                  {latestConsultationPrescriptions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin recetas asociadas.</p>
                  ) : (
                    <div className="space-y-2">
                      {latestConsultationPrescriptions.map((item, index) => (
                        <div key={`${item.id}-${index}`} className="rounded-md border border-slate-200 p-2 text-sm">
                          <p><strong>Medicamento:</strong> {item.medicamento || 'N/A'}</p>
                          <p><strong>Dosis:</strong> {item.dosis || 'N/A'}</p>
                          <p><strong>Frecuencia:</strong> {item.frecuencia || 'N/A'}</p>
                          <p><strong>Duración:</strong> {item.duracion || 'N/A'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="border-b border-slate-200 pb-1 text-sm font-semibold uppercase tracking-wide text-slate-700">Exámenes de la Última Receta</h3>
                  {latestConsultationFiles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin exámenes/archivos asociados a la última consulta.</p>
                  ) : (
                    <div className="space-y-2">
                      {latestConsultationFiles.map((file) => (
                        <div key={file.id} className="flex items-center justify-between rounded-md border border-slate-200 p-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{file.title || 'Archivo clínico'}</p>
                            <p className="text-xs text-muted-foreground">{formatDateTime(file.created_at)}</p>
                          </div>
                          <a
                            href={fileUrl(file.storage_key)}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border"
                            title="Ver archivo"
                            aria-label="Ver archivo"
                          >
                            <Eye className="h-4 w-4" />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </CardContent>
      </Card>
      <Button type="button" variant="outline" className="h-9 w-9 p-0" title="Volver" aria-label="Volver" onClick={() => window.history.back()}>
        <ArrowLeft className="h-4 w-4" />
      </Button>
    </div>
  )
}
