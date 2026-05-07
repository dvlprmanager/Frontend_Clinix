import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, Eye, Plus, Search, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ErpTableLoadingRow } from '@/components/common/erp-loading-empty'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createClinicalShare, getClinicalShareLookups, listClinicalShares, revokeClinicalShare } from './clinical-sharing-api'
import { SelectField } from '@/components/ui/select-field'

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

function statusBadgeClass(status) {
  const normalized = String(status || '').toUpperCase()
  if (normalized === 'ACTIVE') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (normalized === 'PENDING_DELIVERY') return 'border-amber-200 bg-amber-50 text-amber-700'
  if (normalized === 'REVOKED') return 'border-red-200 bg-red-50 text-red-700'
  if (normalized === 'BLOCKED') return 'border-red-200 bg-red-50 text-red-700'
  if (normalized === 'EXPIRED') return 'border-slate-200 bg-slate-100 text-slate-700'
  return 'border-slate-200 bg-slate-100 text-slate-700'
}

function directionLabel(direction) {
  return direction === 'received' ? 'Recibidos' : 'Enviados'
}

export function ClinicalSharingPage() {
  const queryClient = useQueryClient()
  const [direction, setDirection] = useState('sent')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pendingPayload, setPendingPayload] = useState(null)
  const [shareToRevoke, setShareToRevoke] = useState(null)

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      patient_id: '',
      tenant_target_id: '',
      doctor_target_user_id: '',
      consultation_id: '',
      invitation_ttl_days: 30,
      access_ttl_unit: 'days',
      access_ttl_value: 30,
      notes: '',
    },
    mode: 'onBlur',
  })

  const lookupsQuery = useQuery({
    queryKey: ['clinical-sharing', 'lookups'],
    queryFn: getClinicalShareLookups,
  })

  const sharesQuery = useQuery({
    queryKey: ['clinical-sharing', 'list', direction, search],
    queryFn: () => listClinicalShares({ direction, q: search, page: 1, pageSize: 20 }),
  })

  const createMutation = useMutation({
    mutationFn: createClinicalShare,
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ['clinical-sharing'], exact: false })
      const sent = Boolean(response?.data?.mail?.sent)
      if (sent) {
        toast.success('Compartición creada. Se envió enlace y código OTP por correo')
      } else {
        toast.success('Compartición creada. No se pudo enviar correo, revisa configuración MAIL_*')
      }
      reset({
        patient_id: '',
        tenant_target_id: '',
        doctor_target_user_id: '',
        consultation_id: '',
        invitation_ttl_days: 30,
        access_ttl_unit: 'days',
        access_ttl_value: 30,
        notes: '',
      })
      setConfirmPassword('')
    },
  })

  const revokeMutation = useMutation({
    mutationFn: ({ shareId, reason }) => revokeClinicalShare(shareId, { reason }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['clinical-sharing'], exact: false })
      toast.success('Compartición revocada')
    },
  })

  const patients = lookupsQuery.data?.data?.patients || []
  const clinics = lookupsQuery.data?.data?.clinics || []
  const doctors = lookupsQuery.data?.data?.doctors || []
  const defaults = lookupsQuery.data?.data?.defaults || {}
  const shares = sharesQuery.data?.data || []
  const selectedTargetClinicId = watch('tenant_target_id')
  const selectedTargetDoctorId = watch('doctor_target_user_id')

  const patientOptions = useMemo(
    () =>
      patients.map((item) => ({
        value: item.id,
        label: `${item.nombres || ''} ${item.apellidos || ''}`.trim(),
      })),
    [patients],
  )

  const doctorOptions = useMemo(
    () =>
      doctors
        .filter((item) => item.tenant_id === selectedTargetClinicId)
        .map((item) => ({
        value: item.id,
        label: `${item.nombres || ''} ${item.apellidos || ''}`.trim(),
      })),
    [doctors, selectedTargetClinicId],
  )

  useEffect(() => {
    if (!selectedTargetDoctorId) return
    if (doctorOptions.some((doctor) => doctor.value === selectedTargetDoctorId)) return
    setValue('doctor_target_user_id', '')
  }, [selectedTargetDoctorId, doctorOptions, setValue])

  const onSubmit = (values) => {
    setPendingPayload({
      ...values,
      consultation_id: values.consultation_id || null,
      invitation_ttl_days: Number(values.invitation_ttl_days || 30),
      access_ttl_value: Number(values.access_ttl_value || 30),
    })
    setPasswordModalOpen(true)
  }

  const handleConfirmCreate = async () => {
    if (!pendingPayload) return
    if (!confirmPassword.trim()) {
      toast.error('Ingresa tu contraseña para confirmar')
      return
    }
    try {
      await createMutation.mutateAsync({
        ...pendingPayload,
        current_password: confirmPassword,
      })
      setPasswordModalOpen(false)
      setPendingPayload(null)
      setConfirmPassword('')
    } catch (error) {
      toast.error(error.message || 'No se pudo crear la compartición')
    }
  }

  const handleRevoke = async () => {
    if (!shareToRevoke) return
    try {
      await revokeMutation.mutateAsync({
        shareId: shareToRevoke.id,
        reason: 'Revocado manualmente por doctor remitente',
      })
      setShareToRevoke(null)
    } catch (error) {
      toast.error(error.message || 'No se pudo revocar la compartición')
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle>Interconsulta segura</CardTitle>
          <CardDescription>
            Doble validación: contraseña del remitente + OTP por correo al doctor consultante.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="patient_id">Paciente</Label>
                <Controller
                  name="patient_id"
                  control={control}
                  rules={{ required: 'Paciente requerido' }}
                  render={({ field }) => (
                    <SelectField
                      value={field.value}
                      onValueChange={field.onChange}
                      options={[{ value: '', label: 'Selecciona paciente' }, ...patientOptions]}
                      placeholder="Selecciona paciente"
                    />
                  )}
                />
                {errors.patient_id ? <p className="text-xs text-destructive">{errors.patient_id.message}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tenant_target_id">Clínica destino</Label>
                <Controller
                  name="tenant_target_id"
                  control={control}
                  rules={{ required: 'Clínica destino requerida' }}
                  render={({ field }) => (
                    <SelectField
                      value={field.value}
                      onValueChange={field.onChange}
                      options={[
                        { value: '', label: 'Selecciona clínica' },
                        ...clinics.map((clinic) => ({
                          value: clinic.id,
                          label: `${clinic.clinic_name} (${clinic.clinic_code})`,
                        })),
                      ]}
                      placeholder="Selecciona clínica"
                    />
                  )}
                />
                {errors.tenant_target_id ? <p className="text-xs text-destructive">{errors.tenant_target_id.message}</p> : null}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="doctor_target_user_id">Doctor consultante</Label>
                <Controller
                  name="doctor_target_user_id"
                  control={control}
                  rules={{ required: 'Doctor destino requerido' }}
                  render={({ field }) => (
                    <SelectField
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!selectedTargetClinicId}
                      options={[
                        { value: '', label: selectedTargetClinicId ? 'Selecciona doctor' : 'Selecciona primero la clínica' },
                        ...doctorOptions,
                      ]}
                      placeholder={selectedTargetClinicId ? 'Selecciona doctor' : 'Selecciona primero la clínica'}
                    />
                  )}
                />
                {errors.doctor_target_user_id ? <p className="text-xs text-destructive">{errors.doctor_target_user_id.message}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contrato de envío</Label>
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  <p>Estándar FHIR: <strong>HL7 FHIR {defaults.fhirVersion || 'R4'}</strong></p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <div className="space-y-1.5 md:col-span-1">
                <Label htmlFor="invitation_ttl_days">Expira enlace (días)</Label>
                <Input
                  id="invitation_ttl_days"
                  type="number"
                  min={1}
                  max={90}
                  {...register('invitation_ttl_days', {
                    required: 'Requerido',
                    min: { value: 1, message: 'Mínimo 1 día' },
                    max: { value: 90, message: 'Máximo 90 días' },
                  })}
                />
              </div>
              <div className="space-y-1.5 md:col-span-1">
                <Label htmlFor="access_ttl_unit">Unidad consulta</Label>
                <Controller
                  name="access_ttl_unit"
                  control={control}
                  rules={{ required: 'Requerido' }}
                  render={({ field }) => (
                    <SelectField
                      value={field.value}
                      onValueChange={field.onChange}
                      options={[
                        { value: 'days', label: 'Días' },
                        { value: 'hours', label: 'Horas' },
                      ]}
                      placeholder="Unidad"
                    />
                  )}
                />
              </div>
              <div className="space-y-1.5 md:col-span-1">
                <Label htmlFor="access_ttl_value">Duración consulta</Label>
                <Input
                  id="access_ttl_value"
                  type="number"
                  min={1}
                  {...register('access_ttl_value', {
                    required: 'Requerido',
                    min: { value: 1, message: 'Mínimo 1' },
                  })}
                />
              </div>
              <div className="space-y-1.5 md:col-span-1">
                <Label htmlFor="consultation_id">Consulta específica (opcional)</Label>
                <Input id="consultation_id" placeholder="UUID consulta" {...register('consultation_id')} />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="notes">Notas</Label>
                <Input id="notes" placeholder="Motivo de interconsulta" {...register('notes')} />
              </div>
            </div>

            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <div className="inline-flex items-center gap-2 font-semibold">
                <ShieldAlert className="h-4 w-4" />
                Información sensible
              </div>
              <p className="mt-1">Se enviará solo enlace y código OTP. Los datos clínicos se consultan dentro del sistema.</p>
            </div>

            <div className="flex justify-end">
              <Button type="submit" className="h-9 w-9 p-0" title="Compartir expediente" aria-label="Compartir expediente">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>{directionLabel(direction)}</CardTitle>
            <div className="inline-flex rounded-md border">
              <Button
                type="button"
                variant={direction === 'sent' ? 'default' : 'ghost'}
                className="rounded-r-none"
                onClick={() => setDirection('sent')}
              >
                Enviados
              </Button>
              <Button
                type="button"
                variant={direction === 'received' ? 'default' : 'ghost'}
                className="rounded-l-none"
                onClick={() => setDirection('received')}
              >
                Recibidos
              </Button>
            </div>
          </div>
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  setSearch(searchInput.trim())
                }
              }}
              className="pl-8"
              placeholder="Buscar paciente o doctor"
            />
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-muted/60 text-muted-foreground">
                <tr>
                  <th className="border-y px-3 py-2 text-left font-semibold">Paciente</th>
                  <th className="border-y px-3 py-2 text-left font-semibold">Origen</th>
                  <th className="border-y px-3 py-2 text-left font-semibold">Destino</th>
                  <th className="border-y px-3 py-2 text-left font-semibold">Estado</th>
                  <th className="border-y px-3 py-2 text-left font-semibold">Vence acceso</th>
                  <th className="border-y px-3 py-2 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sharesQuery.isLoading ? (
                  <ErpTableLoadingRow colSpan={6} title="Cargando interconsultas" />
                ) : shares.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">Sin registros</td>
                  </tr>
                ) : (
                  shares.map((item) => {
                    const status = String(item.status || '').toUpperCase()
                    const isRevocable = direction === 'sent' && !['REVOKED', 'EXPIRED'].includes(status)
                    return (
                      <tr key={item.id} className="border-b">
                        <td className="px-3 py-2">{`${item.patient_nombres || ''} ${item.patient_apellidos || ''}`.trim()}</td>
                        <td className="px-3 py-2">{`${item.doctor_origin_nombres || ''} ${item.doctor_origin_apellidos || ''}`.trim()}</td>
                        <td className="px-3 py-2">{`${item.doctor_target_nombres || ''} ${item.doctor_target_apellidos || ''}`.trim()}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(status)}`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-3 py-2">{formatDateTime(item.access_expires_at || item.invitation_expires_at)}</td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-2">
                            {direction === 'received' ? (
                              <Button
                                type="button"
                                variant="secondary"
                                className="h-9 w-9 p-0"
                                title="Abrir desde enlace de correo"
                                aria-label="Abrir desde enlace de correo"
                                disabled
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            ) : null}
                            {isRevocable ? (
                              <Button
                                type="button"
                                variant="secondary"
                                className="h-9 w-9 p-0"
                                title="Revocar"
                                aria-label="Revocar"
                                onClick={() => setShareToRevoke(item)}
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={passwordModalOpen}
        onOpenChange={(open) => {
          setPasswordModalOpen(open)
          if (!open) {
            setConfirmPassword('')
            setPendingPayload(null)
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ingrese su contraseña</DialogTitle>
            <DialogDescription>
              Para confirmar la interconsulta y enviar el expediente, valida tu contraseña actual.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="confirm-share-password">Contraseña</Label>
              <Input
                id="confirm-share-password"
                type="password"
                autoComplete="current-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    handleConfirmCreate()
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPasswordModalOpen(false)
                  setConfirmPassword('')
                  setPendingPayload(null)
                }}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={handleConfirmCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Confirmando...' : 'Confirmar y compartir'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(shareToRevoke)} onOpenChange={(open) => !open && setShareToRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revocar compartición</AlertDialogTitle>
            <AlertDialogDescription>
              El doctor consultante perderá acceso al expediente en el momento de confirmar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke} disabled={revokeMutation.isPending}>
              {revokeMutation.isPending ? 'Revocando...' : 'Revocar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
