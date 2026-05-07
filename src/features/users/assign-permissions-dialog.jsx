import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ErpLoadingEmpty } from '@/components/common/erp-loading-empty'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { getUserAccess, listPermissions, updateUserPermissions } from '@/shared/api/access-api'
import { ShieldCheck, Save, X } from 'lucide-react'
import { SelectField } from '@/components/ui/select-field'
import { IconTooltipButton } from '@/components/common/icon-tooltip-button'

const EFFECT_INHERIT = 'INHERIT'
const EFFECT_ALLOW = 'ALLOW'
const EFFECT_DENY = 'DENY'

export function AssignPermissionsDialog({ userId, username }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [permissionEffects, setPermissionEffects] = useState({})

  const permissionsQuery = useQuery({
    queryKey: ['access-permissions'],
    queryFn: listPermissions,
    enabled: open,
  })

  const accessQuery = useQuery({
    queryKey: ['access-user', userId],
    queryFn: () => getUserAccess(userId),
    enabled: open,
  })

  const permissions = permissionsQuery.data?.data || []
  const directPermissions = accessQuery.data?.data?.directPermissions || []
  const effectivePermissions = accessQuery.data?.data?.effectivePermissions || []

  useEffect(() => {
    if (!open) return

    const mapped = {}
    directPermissions.forEach((permission) => {
      mapped[permission.code] = permission.effect
    })
    setPermissionEffects(mapped)
  }, [directPermissions, open])

  const groupedPermissions = useMemo(() => {
    return permissions.reduce((acc, permission) => {
      const moduleName = permission.module || 'general'
      if (!acc[moduleName]) acc[moduleName] = []
      acc[moduleName].push(permission)
      return acc
    }, {})
  }, [permissions])

  const saveMutation = useMutation({
    mutationFn: (permissionsPayload) => updateUserPermissions(userId, permissionsPayload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['access-user', userId], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['users'], exact: false }),
      ])
    },
  })

  const handleEffectChange = (permissionCode, effect) => {
    setPermissionEffects((previous) => ({
      ...previous,
      [permissionCode]: effect,
    }))
  }

  const buildPayload = () => {
    return Object.entries(permissionEffects)
      .filter(([, effect]) => [EFFECT_ALLOW, EFFECT_DENY].includes(effect))
      .map(([code, effect]) => ({ code, effect }))
  }

  const handleSave = async () => {
    try {
      const payload = buildPayload()
      await saveMutation.mutateAsync(payload)
      toast.success('Permisos actualizados correctamente')
      setOpen(false)
    } catch (error) {
      toast.error(error.message || 'No se pudieron actualizar permisos')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="secondary" size="sm" aria-label="Asignar permisos" title="Asignar permisos">
          <ShieldCheck className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Permisos directos</DialogTitle>
          <DialogDescription>Usuario: {username}</DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Permisos efectivos actuales: {effectivePermissions.length}
        </div>

        <div className="max-h-[420px] space-y-4 overflow-y-auto pr-1">
          {permissionsQuery.isLoading || accessQuery.isLoading ? (
            <ErpLoadingEmpty title="Cargando permisos" />
          ) : (
            Object.entries(groupedPermissions).map(([moduleName, modulePermissions]) => (
              <div key={moduleName} className="space-y-2">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-foreground">{moduleName}</h4>
                <div className="space-y-2 rounded-md border p-3">
                  {modulePermissions.map((permission) => {
                    const currentEffect = permissionEffects[permission.code] || EFFECT_INHERIT
                    return (
                      <div key={permission.id} className="flex flex-col gap-2 rounded-md border px-3 py-2 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{permission.name}</p>
                          <p className="break-all text-xs text-muted-foreground">{permission.code}</p>
                        </div>
                        <SelectField
                          className="h-9 w-full text-sm md:w-40"
                          value={currentEffect}
                          onValueChange={(value) => handleEffectChange(permission.code, value)}
                          options={[
                            { value: EFFECT_INHERIT, label: 'Heredar' },
                            { value: EFFECT_ALLOW, label: 'ALLOW' },
                            { value: EFFECT_DENY, label: 'DENY' },
                          ]}
                          placeholder="Heredar"
                          searchable={false}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
          <IconTooltipButton icon={X} label="Cancelar" variant="outline" onClick={() => setOpen(false)} />
          <IconTooltipButton
            icon={Save}
            label="Guardar"
            variant="default"
            disabled={saveMutation.isPending}
            onClick={handleSave}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
