import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { X, Save } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { IconTooltipButton } from '@/components/common/icon-tooltip-button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function EntityForm({
  fields,
  initialValues,
  isSubmitting,
  mode,
  onSubmit,
  onCancel,
}) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: initialValues,
    mode: 'onBlur',
  })

  const formValues = watch()
  const visibilityValues = { ...(initialValues || {}), ...(formValues || {}) }

  const visibleFields = fields.filter((field) => {
    if (mode === 'create' && field.hideOnCreate) return false
    if (mode === 'edit' && field.hideOnEdit) return false
    if (typeof field.visibleWhen === 'function' && !field.visibleWhen(visibilityValues, mode)) return false
    return true
  })

  useEffect(() => {
    reset(initialValues)
  }, [initialValues, reset])

  useEffect(() => {
    fields.forEach((field) => {
      if (typeof field.deriveValue !== 'function') return
      const computedValue = field.deriveValue(visibilityValues, mode)
      const normalizedCurrentValue = formValues?.[field.name] ?? ''
      const normalizedComputedValue = computedValue ?? ''
      if (String(normalizedCurrentValue) !== String(normalizedComputedValue)) {
        setValue(field.name, normalizedComputedValue)
      }
    })
  }, [fields, formValues, mode, setValue, visibilityValues])

  const buildRules = (field) => {
    const rules = {}

    if (field.required) {
      rules.required = field.requiredMessage || `${field.label} es obligatorio`
    }

    if (field.regex) {
      const regexValue =
        field.regex instanceof RegExp ? field.regex : new RegExp(field.regex, field.regexFlags || 'u')

      rules.pattern = {
        value: regexValue,
        message: field.regexMessage || `Formato inválido para ${field.label}`,
      }
    }

    return rules
  }

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
      {visibleFields.map((field) => (
        <div key={field.name} className={field.fullWidth ? 'grid gap-2 md:col-span-2' : 'grid gap-2'}>
          <Label htmlFor={field.name}>{field.label}</Label>
          {field.type === 'select' ? (
            <Controller
              name={field.name}
              control={control}
              rules={buildRules(field)}
              render={({ field: selectField }) => (
                <Select
                  items={field.options || []}
                  value={selectField.value ?? ''}
                  onValueChange={selectField.onChange}
                  disabled={isSubmitting || (mode === 'edit' && field.disabledOnEdit)}
                  searchable
                >
                  <SelectTrigger className={errors[field.name] ? 'border-destructive focus-visible:ring-destructive/40' : ''}>
                    <SelectValue placeholder={field.placeholder || 'Selecciona una opción'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {(field.options || []).map((option) => (
                        <SelectItem key={`${field.name}-${option.value}`} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            />
          ) : (
            <Input
              id={field.name}
              type={field.type || 'text'}
              placeholder={field.placeholder || ''}
              disabled={isSubmitting || (mode === 'edit' && field.disabledOnEdit)}
              readOnly={Boolean(field.readOnly)}
              className={errors[field.name] ? 'border-destructive focus-visible:ring-destructive/40' : ''}
              {...register(field.name, buildRules(field))}
            />
          )}
          {errors[field.name] ? <p className="text-xs font-medium text-destructive">{errors[field.name].message}</p> : null}
        </div>
      ))}

      <div className="flex flex-col-reverse gap-2 md:col-span-2 md:flex-row md:items-center md:justify-end">
        <IconTooltipButton
          icon={Save}
          label={mode === 'edit' ? 'Editar' : 'Guardar'}
          type="submit"
          variant="default"
          disabled={isSubmitting}
        />
        <IconTooltipButton icon={X} label="Cancelar" variant="outline" onClick={onCancel} />
      </div>
    </form>
  )
}
