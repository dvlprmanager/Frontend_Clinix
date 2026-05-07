import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ErpLoadingEmpty } from '@/components/common/erp-loading-empty'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { listRoles, getUserAccess, updateUserRoles } from '@/shared/api/access-api'
import { KeyRound } from 'lucide-react'

export function AssignRolesDialog({ userId, username }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [selectedRoleCodes, setSelectedRoleCodes] = useState([])

  const rolesQuery = useQuery({
    queryKey: ['access-roles'],
    queryFn: listRoles,
    enabled: open,
  })

  const accessQuery = useQuery({
    queryKey: ['access-user', userId],
    queryFn: () => getUserAccess(userId),
    enabled: open,
  })

  const roles = rolesQuery.data?.data || []
  const currentRoles = accessQuery.data?.data?.roles || []

  useEffect(() => {
    if (open && currentRoles.length > 0) {
      setSelectedRoleCodes(currentRoles)
    } else if (open && currentRoles.length === 0) {
      setSelectedRoleCodes([])
    }
  }, [open, currentRoles])

  const saveMutation = useMutation({
    mutationFn: (roleCodes) => updateUserRoles(userId, roleCodes),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['users'], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['access-user', userId], exact: false }),
      ])
    },
  })

  const toggleRole = (roleCode) => {
    setSelectedRoleCodes((previous) =>
      previous.includes(roleCode) ? previous.filter((item) => item !== roleCode) : [...previous, roleCode],
    )
  }

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync(selectedRoleCodes)
      toast.success('Roles actualizados correctamente')
      setOpen(false)
    } catch (error) {
      toast.error(error.message || 'No se pudieron actualizar roles')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="secondary" size="sm" aria-label="Asignar roles" title="Asignar roles">
          <KeyRound className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Asignar roles</DialogTitle>
          <DialogDescription>Usuario: {username}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          {rolesQuery.isLoading || accessQuery.isLoading ? (
            <ErpLoadingEmpty title="Cargando roles" className="py-6" />
          ) : (
            roles.map((role) => (
              <label key={role.id} className="flex items-start gap-3 rounded-md border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedRoleCodes.includes(role.code)}
                  onChange={() => toggleRole(role.code)}
                  className="mt-0.5"
                />
                <span className="min-w-0">
                  <span className="block font-medium">{role.name}</span>
                  <span className="block text-muted-foreground">({role.code})</span>
                </span>
              </label>
            ))
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} className="w-full md:w-auto">
            Cancelar
          </Button>
          <Button type="button" disabled={saveMutation.isPending} onClick={handleSave} className="w-full md:w-auto">
            {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
