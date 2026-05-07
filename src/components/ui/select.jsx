import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

const SelectContext = createContext(null)

function useSelectContext(componentName) {
  const context = useContext(SelectContext)
  if (!context) {
    throw new Error(`${componentName} must be used within <Select>`)
  }
  return context
}

export function Select({
  children,
  items = [],
  value,
  defaultValue = '',
  onValueChange,
  disabled = false,
  searchable = true,
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [internalValue, setInternalValue] = useState(defaultValue)
  const rootRef = useRef(null)

  const isControlled = value !== undefined
  const currentValue = isControlled ? value : internalValue

  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const handleOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  const itemLabelByValue = useMemo(() => {
    return new Map(
      (items || [])
        .filter((item) => item?.value !== null && item?.value !== undefined)
        .map((item) => [String(item.value), item.label || String(item.value)]),
    )
  }, [items])

  const selectValue = (nextValue) => {
    if (disabled) return
    if (!isControlled) setInternalValue(nextValue)
    onValueChange?.(nextValue)
    setOpen(false)
  }

  const contextValue = useMemo(
    () => ({
      open,
      setOpen,
      search,
      setSearch,
      searchable,
      currentValue: currentValue ?? '',
      selectValue,
      itemLabelByValue,
      disabled,
    }),
    [open, search, searchable, currentValue, itemLabelByValue, disabled],
  )

  return (
    <SelectContext.Provider value={contextValue}>
      <div ref={rootRef} className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

export function SelectTrigger({ className, children }) {
  const { open, setOpen, disabled } = useSelectContext('SelectTrigger')

  return (
    <button
      type="button"
      disabled={disabled}
      aria-expanded={open}
      className={cn(
        'flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      onClick={() => setOpen((previous) => !previous)}
    >
      {children}
      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
    </button>
  )
}

export function SelectValue({ placeholder = 'Selecciona una opción' }) {
  const { currentValue, itemLabelByValue } = useSelectContext('SelectValue')
  const label = itemLabelByValue.get(String(currentValue))

  return (
    <span className={cn('truncate', !label && 'text-muted-foreground')}>
      {label || placeholder}
    </span>
  )
}

export function SelectContent({ children, className }) {
  const { open, searchable, search, setSearch } = useSelectContext('SelectContent')
  if (!open) return null

  return (
    <div
      className={cn(
        'absolute left-0 z-50 mt-1 w-full rounded-md border border-border bg-card p-1 text-card-foreground shadow-lg',
        className,
      )}
    >
      {searchable ? (
        <div className="mb-1 flex items-center gap-2 rounded-md border px-2">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-8 w-full bg-transparent text-sm outline-none"
            placeholder="Escribe para filtrar..."
          />
        </div>
      ) : null}
      <div className="max-h-60 overflow-auto">{children}</div>
    </div>
  )
}

export function SelectGroup({ children }) {
  return <div className="space-y-1">{children}</div>
}

export function SelectLabel({ children }) {
  return (
    <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </div>
  )
}

export function SelectItem({ value, children }) {
  const { currentValue, selectValue, search } = useSelectContext('SelectItem')
  const normalizedValue = String(value ?? '')
  const isSelected = String(currentValue ?? '') === normalizedValue
  const searchText = String(children ?? '').toLowerCase()
  const shouldShow = !search.trim() || searchText.includes(search.trim().toLowerCase())

  if (!shouldShow) return null

  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground',
        isSelected && 'bg-accent text-accent-foreground',
      )}
      onClick={() => selectValue(normalizedValue)}
    >
      <span className="truncate">{children}</span>
      {isSelected ? <Check className="ml-2 h-4 w-4 shrink-0" /> : null}
    </button>
  )
}
