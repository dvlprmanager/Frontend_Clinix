import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export function SelectField({
  value,
  onValueChange,
  options = [],
  placeholder = 'Selecciona una opción',
  disabled = false,
  searchable = true,
  className,
}) {
  return (
    <Select
      items={options}
      value={value ?? ''}
      onValueChange={(nextValue) => onValueChange?.(nextValue)}
      disabled={disabled}
      searchable={searchable}
    >
      <SelectTrigger className={cn('h-10', className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={`${option.value ?? 'empty'}-${option.label}`} value={option.value ?? ''}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
