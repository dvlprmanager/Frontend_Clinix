import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ErpLoadingEmpty } from '@/components/common/erp-loading-empty'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { listPermissions, getRolePermissions, updateRolePermissions } from '@/shared/api/access-api'
import { ShieldCheck } from 'lucide-react'

export function AssignRolePermissionsDialog({ roleId, roleCode, roleName }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [selectedPermissions, setSelectedPermissions] = useState([])

  const permissionsQuery = useQuery({
    queryKey: ['access-permissions'],
    queryFn: listPermissions,
    enabled: open,
  })

  const rolePermissionsQuery = useQuery({
    queryKey: ['access-role-permissions', roleId],
    queryFn: () => getRolePermissions(roleId),
    enabled: open,
  })

  useEffect(() => {
    if (!open) return
    const permissions = rolePermissionsQuery.data?.data?.permissions || []
    setSelectedPermissions(permissions)
  }, [open, rolePermissionsQuery.data])

  const saveMutation = useMutation({
    mutationFn: (permissionCodes) => updateRolePermissions(roleId, permissionCodes),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['roles'], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['access-role-permissions', roleId], exact: false }),
      ])
    },
  })

  const grouped = (permissionsQuery.data?.data || []).reduce((acc, permission) => {
    const moduleName = permission.module || 'general'
    if (!acc[moduleName]) acc[moduleName] = []
    acc[moduleName].push(permission)
    return acc
  }, {})

  const togglePermission = (code) => {
    setSelectedPermissions((previous) =>
      previous.includes(code) ? previous.filter((item) => item !== code) : [...previous, code],
    )
  }

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync(selectedPermissions)
      toast.success('Permisos de rol actualizados correctamente')
      setOpen(false)
    } catch (error) {
      toast.error(error.message || 'No se pudieron actualizar los permisos de rol')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="secondary" size="sm" aria-label="Asignar permisos de rol" title="Asignar permisos de rol">
          <ShieldCheck className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Permisos del rol</DialogTitle>
          <DialogDescription>
            {roleName} ({roleCode})
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[420px] space-y-4 overflow-y-auto pr-1">
          {permissionsQuery.isLoading || rolePermissionsQuery.isLoading ? (
            <ErpLoadingEmpty title="Cargando permisos del rol" className="py-6" />
          ) : (
            Object.entries(grouped).map(([moduleName, modulePermissions]) => (
              <div key={moduleName} className="space-y-2">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-foreground">{moduleName}</h4>
                <div className="space-y-2 rounded-md border p-3">
                  {modulePermissions.map((permission) => (
                    <label key={permission.id} className="flex items-start gap-3 rounded-md border px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(permission.code)}
                        onChange={() => togglePermission(permission.code)}
                        className="mt-0.5"
                      />
                      <span className="min-w-0">
                        <span className="block font-medium">{permission.name}</span>
                        <span className="block break-all text-xs text-muted-foreground">{permission.code}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
          <Button type="button" variant="outline" className="w-full md:w-auto" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="button" className="w-full md:w-auto" onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
