import { createContext, useContext, useMemo, useState } from 'react'
import { PanelLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const SidebarContext = createContext(null)

function useSidebarContext() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('Sidebar components must be used within SidebarProvider')
  }
  return context
}

export function useSidebar() {
  return useSidebarContext()
}

export function SidebarProvider({ children }) {
  const [openMobile, setOpenMobile] = useState(false)

  const value = useMemo(
    () => ({
      openMobile,
      setOpenMobile,
    }),
    [openMobile],
  )

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}

export function SidebarTrigger({ className, ...props }) {
  const { setOpenMobile } = useSidebarContext()
  return (
    <Button type="button" variant="outline" size="sm" className={cn('lg:hidden', className)} onClick={() => setOpenMobile(true)} {...props}>
      <PanelLeft className="h-4 w-4" />
      <span className="sr-only">Abrir menú</span>
    </Button>
  )
}

export function Sidebar({ className, children }) {
  const { openMobile, setOpenMobile } = useSidebarContext()

  return (
    <>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[86vw] max-w-72 flex-col transform border-r bg-card transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:translate-x-0',
          openMobile ? 'translate-x-0' : '-translate-x-full',
          className,
        )}
      >
        {children}
      </aside>
      {openMobile ? (
        <button
          type="button"
          aria-label="Cerrar menú lateral"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setOpenMobile(false)}
        />
      ) : null}
    </>
  )
}

export function SidebarHeader({ className, ...props }) {
  return <div className={cn('border-b p-4', className)} {...props} />
}

export function SidebarContent({ className, ...props }) {
  return <div className={cn('flex-1 overflow-y-auto p-3', className)} {...props} />
}

export function SidebarFooter({ className, ...props }) {
  return <div className={cn('border-t p-3', className)} {...props} />
}

export function SidebarGroup({ className, ...props }) {
  return <section className={cn('mb-4', className)} {...props} />
}

export function SidebarGroupLabel({ className, ...props }) {
  return <p className={cn('mb-2 px-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground', className)} {...props} />
}

export function SidebarGroupContent({ className, ...props }) {
  return <div className={cn('grid gap-1', className)} {...props} />
}

export function SidebarMenu({ className, ...props }) {
  return <ul className={cn('grid gap-1', className)} {...props} />
}

export function SidebarMenuItem({ className, ...props }) {
  return <li className={cn('', className)} {...props} />
}

export function SidebarMenuButton({ className, isActive = false, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors',
        isActive
          ? 'bg-secondary text-secondary-foreground'
          : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground',
        className,
      )}
      {...props}
    />
  )
}

export function SidebarInset({ className, ...props }) {
  return <div className={cn('flex h-screen flex-1 flex-col overflow-hidden', className)} {...props} />
}
