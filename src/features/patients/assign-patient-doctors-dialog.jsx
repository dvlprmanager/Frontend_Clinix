import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Stethoscope } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErpLoadingEmpty } from '@/components/common/erp-loading-empty'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { getPatientDoctors, listAssignableDoctors, replacePatientDoctors } from '@/shared/api/patients-api'

export function AssignPatientDoctorsDialog({ patientId, patientLabel }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [selectedDoctorIds, setSelectedDoctorIds] = useState([])
  const [hasUserChanges, setHasUserChanges] = useState(false)

  const doctorsQuery = useQuery({
    queryKey: ['doctor-profiles', 'assignable'],
    queryFn: () => listAssignableDoctors(),
    enabled: open,
  })

  const patientDoctorsQuery = useQuery({
    queryKey: ['patients', patientId, 'doctors'],
    queryFn: () => getPatientDoctors(patientId),
    enabled: open,
  })

  useEffect(() => {
    if (!open) return
    if (!patientDoctorsQuery.isSuccess) return
    if (hasUserChanges) return
    const currentDoctorIds = (patientDoctorsQuery.data?.data || []).map((item) => item.doctor_user_id)
    setSelectedDoctorIds(currentDoctorIds)
  }, [open, patientDoctorsQuery.isSuccess, patientDoctorsQuery.data?.data, hasUserChanges])

  const saveMutation = useMutation({
    mutationFn: (doctorUserIds) => replacePatientDoctors(patientId, doctorUserIds),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['patients'], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['patients', patientId, 'doctors'], exact: false }),
      ])
    },
  })

  const assignableDoctors = doctorsQuery.data?.data || []

  const selectedSet = useMemo(() => new Set(selectedDoctorIds), [selectedDoctorIds])

  const toggleDoctor = (doctorUserId) => {
    setHasUserChanges(true)
    setSelectedDoctorIds((previous) =>
      previous.includes(doctorUserId)
        ? previous.filter((item) => item !== doctorUserId)
        : [...previous, doctorUserId],
    )
  }

  const isLoadingData = doctorsQuery.isLoading || patientDoctorsQuery.isLoading

  const handleOpenChange = (nextOpen) => {
    setOpen(nextOpen)
    if (nextOpen) {
      setHasUserChanges(false)
    } else {
      setSelectedDoctorIds([])
      setHasUserChanges(false)
    }
  }

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync(selectedDoctorIds)
      toast.success('Médicos asignados correctamente')
      setOpen(false)
    } catch (error) {
      toast.error(error.message || 'No se pudieron asignar médicos')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-label="Asignar médicos"
          title="Asignar médicos"
        >
          <Stethoscope className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Asignar médicos</DialogTitle>
          <DialogDescription>Paciente: {patientLabel}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
          {doctorsQuery.isLoading || patientDoctorsQuery.isLoading ? (
            <ErpLoadingEmpty title="Cargando médicos asignables" className="py-6" />
          ) : assignableDoctors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay doctores activos para asignar</p>
          ) : (
            assignableDoctors.map((doctor) => {
              const isSelected = selectedSet.has(doctor.user_id)
              const fullName = `${doctor.nombres || ''} ${doctor.apellidos || ''}`.trim()
              return (
                <label key={doctor.user_id} className="flex items-start gap-3 rounded-md border px-3 py-2 text-sm">
                  <input type="checkbox" checked={isSelected} onChange={() => toggleDoctor(doctor.user_id)} className="mt-0.5" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{fullName || doctor.username}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {doctor.specialty_name ? `${doctor.specialty_name} • ` : ''}
                      {doctor.colegiado ? `Colegiado: ${doctor.colegiado}` : doctor.username}
                    </span>
                  </span>
                </label>
              )
            })
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} className="w-full md:w-auto">
            Cancelar
          </Button>
          <Button type="button" disabled={saveMutation.isPending || isLoadingData} onClick={handleSave} className="w-full md:w-auto">
            {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
