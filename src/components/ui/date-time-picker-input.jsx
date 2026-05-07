import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

function toDatePart(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toTimePart(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '09:00'
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function parseDateValue(value, withTime) {
  if (!value) return undefined
  if (withTime) {
    const normalized = String(value).trim().replace(' ', 'T')
    const parsed = new Date(normalized)
    return Number.isNaN(parsed.getTime()) ? undefined : parsed
  }
  const [year, month, day] = String(value).split('-').map(Number)
  if (!year || !month || !day) return undefined
  const parsed = new Date(year, month - 1, day)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

export function DateTimePickerInput({
  id,
  value,
  onChange,
  withTime = false,
  disabled = false,
  datePlaceholder = 'Seleccionar fecha',
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const selectedDate = useMemo(() => parseDateValue(value, withTime), [value, withTime])
  const [timeValue, setTimeValue] = useState(() => toTimePart(selectedDate || new Date()))

  useEffect(() => {
    if (!withTime) return
    setTimeValue(toTimePart(selectedDate || new Date()))
  }, [selectedDate, withTime])

  return (
    <div className={`grid gap-2 sm:grid-cols-[1fr_auto] ${className}`.trim()}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            id={id}
            className="h-9 w-full justify-between px-3 text-xs font-normal text-foreground"
            disabled={disabled}
          >
            {selectedDate ? format(selectedDate, 'dd/MM/yyyy') : datePlaceholder}
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden rounded-md border border-input bg-card p-2 text-foreground" align="start">
          <Calendar
            className="text-sm [--rdp-accent-color:hsl(var(--primary))] [--rdp-accent-background-color:hsl(var(--primary)/0.15)] [&_.rdp-caption_label]:text-sm [&_.rdp-button_previous]:text-foreground [&_.rdp-button_next]:text-foreground [&_.rdp-day_button]:h-8 [&_.rdp-day_button]:w-8 [&_.rdp-day_button]:rounded-md [&_.rdp-day_button]:text-foreground [&_.rdp-day_button:hover]:bg-muted [&_.rdp-day_button:hover]:text-foreground [&_.rdp-dropdown]:rounded-md [&_.rdp-dropdown]:border [&_.rdp-dropdown]:border-input [&_.rdp-dropdown]:bg-background [&_.rdp-dropdown]:text-xs [&_.rdp-selected_.rdp-day_button]:bg-primary [&_.rdp-selected_.rdp-day_button]:text-primary-foreground [&_.rdp-today_.rdp-day_button]:border [&_.rdp-today_.rdp-day_button]:border-primary"
            mode="single"
            selected={selectedDate}
            captionLayout="dropdown"
            defaultMonth={selectedDate}
            onSelect={(nextDate) => {
              if (!nextDate) {
                onChange?.('')
                setOpen(false)
                return
              }
              const datePart = toDatePart(nextDate)
              onChange?.(withTime ? `${datePart}T${timeValue}` : datePart)
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
      {withTime ? (
        <Input
          type="time"
          step="60"
          value={timeValue}
          disabled={disabled}
          onChange={(event) => {
            const nextTime = event.target.value || '00:00'
            setTimeValue(nextTime)
            if (!selectedDate) return
            onChange?.(`${toDatePart(selectedDate)}T${nextTime}`)
          }}
          className="h-9 bg-background text-xs appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        />
      ) : null}
    </div>
  )
}
