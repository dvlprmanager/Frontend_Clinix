import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmActionDialog } from '@/components/common/confirm-action-dialog'
import { IconTooltipButton } from '@/components/common/icon-tooltip-button'
import { EntityForm } from '@/shared/components/catalog/entity-form'
import { EntityTable } from '@/shared/components/catalog/entity-table'
import { useCatalogList, useCatalogMutations } from '@/shared/hooks/use-catalog'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Pencil, Plus, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'

function buildInitialValues(fields) {
  return fields.reduce((accumulator, field) => {
    accumulator[field.name] = field.defaultValue ?? ''
    return accumulator
  }, {})
}

function toLocalDateTimeInputValue(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export function CatalogPage({ config }) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [mode, setMode] = useState('create')
  const [editingRecordId, setEditingRecordId] = useState(null)
  const [formInitialValues, setFormInitialValues] = useState(() => buildInitialValues(config.formFields))
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false)

  const sanitizeUpdateValues = (values) => {
    const sanitized = { ...values }
    config.formFields.forEach((field) => {
      if (field.hideOnEdit) {
        delete sanitized[field.name]
      }
      if (!field.sendEmptyOnUpdate && sanitized[field.name] === '') {
        delete sanitized[field.name]
      }
    })
    return sanitized
  }

  const transformSubmitValues = (values) => {
    const transformed = { ...values }
    config.formFields.forEach((field) => {
      if (typeof field.fromFormValue === 'function' && Object.prototype.hasOwnProperty.call(transformed, field.name)) {
        transformed[field.name] = field.fromFormValue(transformed[field.name], transformed)
      }
    })
    return transformed
  }

  const query = useMemo(
    () => ({
      page,
      pageSize: config.pageSize || 10,
      sortBy: config.sortBy || 'created_at',
      sortDir: config.sortDir || 'desc',
      q: search,
      filters: config.defaultFilters || {},
    }),
    [config.defaultFilters, config.pageSize, config.sortBy, config.sortDir, page, search],
  )

  const listQuery = useCatalogList(config.entity, query)
  const { createMutation, updateMutation, deleteMutation, patchStatusMutation } = useCatalogMutations(config.entity)

  const rows = listQuery.data?.data || []
  const meta = listQuery.data?.meta

  const startCreate = () => {
    setMode('create')
    setEditingRecordId(null)
    setFormInitialValues(buildInitialValues(config.formFields))
    setIsFormDialogOpen(true)
  }

  const startEdit = (record) => {
    setMode('edit')
    setEditingRecordId(record.id)

    const mapped = buildInitialValues(config.formFields)
    config.formFields.forEach((field) => {
      if (field.type === 'datetime-local') {
        mapped[field.name] = toLocalDateTimeInputValue(record[field.name])
        return
      }
      if (typeof field.toFormValue === 'function') {
        mapped[field.name] = field.toFormValue(record[field.name], record)
        return
      }
      mapped[field.name] = record[field.name] ?? ''
    })
    setFormInitialValues(mapped)
    setIsFormDialogOpen(true)
  }

  const cancelForm = () => {
    setIsFormDialogOpen(false)
    setMode('create')
    setEditingRecordId(null)
    setFormInitialValues(buildInitialValues(config.formFields))
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPage(1)
      setSearch(searchInput.trim())
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchInput])

  const handleSubmit = async (values) => {
    try {
      const transformedValues = transformSubmitValues(values)
      if (mode === 'create') {
        if (typeof config.customCreate === 'function') {
          await config.customCreate(transformedValues)
          await listQuery.refetch()
        } else {
          await createMutation.mutateAsync(transformedValues)
        }
        toast.success(config.messages?.created || 'Registro creado correctamente')
      } else {
        await updateMutation.mutateAsync({ id: editingRecordId, payload: sanitizeUpdateValues(transformedValues) })
        toast.success(config.messages?.updated || 'Registro actualizado correctamente')
      }
      cancelForm()
    } catch (error) {
      toast.error(error.message || 'No se pudo guardar el registro')
    }
  }

  const handleDeactivate = async (record) => {
    try {
      await patchStatusMutation.mutateAsync({ id: record.id, payload: { estatus: record.estatus === 1 ? 0 : 1 } })
      toast.success(record.estatus === 1 ? 'Tenant inactivado' : 'Tenant activado')
    } catch (error) {
      toast.error(error.message || 'No se pudo cambiar el estado')
    }
  }

  const handleDelete = async (record) => {
    try {
      await deleteMutation.mutateAsync(record.id)
      toast.success(config.messages?.deleted || 'Registro eliminado correctamente')
    } catch (error) {
      toast.error(error.message || 'No se pudo eliminar el registro')
    }
  }

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending || Boolean(config.isCustomCreatePending)

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <Card className="border-white/70 bg-white/90">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>{config.title}</CardTitle>
            <CardDescription>{config.description}</CardDescription>
          </div>
          <div className="flex w-full items-center gap-2 md:w-auto">
            <Input
              className="h-9 w-full md:w-[300px]"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={config.searchPlaceholder || 'Buscar'}
            />
            <IconTooltipButton icon={Plus} label="Nuevo" variant="default" onClick={startCreate} />
          </div>
        </CardHeader>
        <CardContent className="pt-0" />
      </Card>

      <div className="border-b" />

      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{mode === 'create' ? 'Nuevo registro' : 'Editar registro'}</DialogTitle>
            <DialogDescription>Completa los datos y confirma para guardar</DialogDescription>
          </DialogHeader>
          <EntityForm
            fields={config.formFields}
            initialValues={formInitialValues}
            mode={mode}
            isSubmitting={isFormSubmitting}
            onSubmit={handleSubmit}
            onCancel={cancelForm}
          />
        </DialogContent>
      </Dialog>

      <div className="min-h-0 flex-1">
        <EntityTable
          columns={config.columns}
          rows={rows}
          isLoading={listQuery.isLoading || listQuery.isFetching}
          meta={meta}
          onPageChange={setPage}
          renderRowActions={(record) => (
            <>
              <IconTooltipButton icon={Pencil} label="Editar" variant="outline" onClick={() => startEdit(record)} />
              <ConfirmActionDialog
                triggerElement={
                  <IconTooltipButton
                    icon={record.estatus === 1 ? ToggleLeft : ToggleRight}
                    label={record.estatus === 1 ? 'Inactivar' : 'Activar'}
                    variant="secondary"
                  />
                }
                title={record.estatus === 1 ? 'Inactivar registro' : 'Activar registro'}
                description="Esta acción cambiará el estado operativo del tenant."
                confirmLabel="Confirmar"
                cancelLabel="Cancelar"
                onConfirm={() => handleDeactivate(record)}
              />
              <ConfirmActionDialog
                triggerElement={
                  <IconTooltipButton
                    icon={Trash2}
                    label="Eliminar"
                    variant="outline"
                    className="h-9 w-9 p-0 border-destructive/60 text-destructive hover:bg-destructive/10"
                  />
                }
                title="Eliminar registro"
                description="Esta acción aplicará eliminación lógica del tenant."
                confirmLabel="Eliminar"
                cancelLabel="Cancelar"
                onConfirm={() => handleDelete(record)}
              />
              {config.renderCustomRowActions ? config.renderCustomRowActions(record) : null}
            </>
          )}
        />
      </div>
    </div>
  )
}
