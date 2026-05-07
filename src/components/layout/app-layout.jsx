import { ConfirmActionDialog } from '@/components/common/confirm-action-dialog'
import { Button } from '@/components/ui/button'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { hasPermission } from '@/utils/permissions'
import { navSections } from '@/components/layout/nav.config'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  ChevronDown,
  ChevronRight,
  LogOut,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react'

function AppLayoutInner({ session, onLogout, children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { setOpenMobile } = useSidebar()

  const normalizedPath = location.pathname === '/' ? '/dashboard' : location.pathname
  const isNavPathMatch = (itemPath) => normalizedPath === itemPath || normalizedPath.startsWith(`${itemPath}/`)
  const [activeSectionId, setActiveSectionId] = useState('dashboard')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const toggleSection = (sectionId) => {
    setActiveSectionId((previous) => (previous === sectionId ? null : sectionId))
  }

  const hasRequiredPermissions = (requiredPermissions = []) =>
    requiredPermissions.every((permission) => hasPermission(session, permission))
  const hasRequiredRoles = (requiredRoles = []) => {
    if (!requiredRoles.length) return true
    const roleCodes = session?.roles || []
    return requiredRoles.some((roleCode) => roleCodes.includes(roleCode))
  }

  const filteredSections = navSections
    .filter((section) => hasRequiredPermissions(section.requiredPermissions || []) && hasRequiredRoles(section.requiredRoles || []))
    .map((section) => ({
      ...section,
      items: (section.items || []).filter(
        (item) =>
          hasPermission(session, item.requiredPermission)
          && hasRequiredRoles(item.requiredRoles || []),
      ),
    }))
    .filter((section) => Boolean(section.path) || section.items.length > 0)

  const flatItems = filteredSections.flatMap((section) => (
    section.path
      ? [{ id: section.id, path: section.path, label: section.label, icon: section.icon }]
      : section.items
  ))
  const currentNavItem = flatItems.find((item) => isNavPathMatch(item.path))
  const tenantDisplayName =
    session?.tenantName
    || session?.razonSocial
    || session?.clinicCode
    || session?.tenantId
    || 'Tenant'
  const userFullName = [session?.nombres, session?.apellidos].filter(Boolean).join(' ').trim() || session?.username || 'Usuario'
  const primaryRole = Array.isArray(session?.roles) && session.roles.length > 0
    ? String(session.roles[0] || '').toLowerCase()
    : 'sin rol'
  const currentSectionId = useMemo(
    () =>
      filteredSections.find(
        (section) => (section.path ? isNavPathMatch(section.path) : section.items.some((item) => isNavPathMatch(item.path))),
      )?.id,
    [filteredSections, normalizedPath],
  )

  useEffect(() => {
    if (currentSectionId) {
      setActiveSectionId(currentSectionId)
    }
  }, [currentSectionId])

  return (
    <div className="h-screen bg-muted/30">
      <div className="flex h-full">
        <Sidebar className={isSidebarCollapsed ? 'lg:w-20 lg:transition-[width] lg:duration-300' : 'lg:w-72 lg:transition-[width] lg:duration-300'}>
          <SidebarHeader>
            <div className={isSidebarCollapsed ? 'flex justify-center' : 'flex items-start justify-between gap-2'}>
              <div className={isSidebarCollapsed ? 'hidden' : 'min-w-0'}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">CLINIX</p>
                <p className="mt-1 truncate text-sm font-semibold text-foreground">{tenantDisplayName}</p>
                <h2 className="mt-1 text-lg font-bold text-foreground">Menú principal</h2>
              </div>
              <button
                type="button"
                className="hidden rounded-md border p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:inline-flex"
                title={isSidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
                onClick={() => setIsSidebarCollapsed((previous) => !previous)}
              >
                {isSidebarCollapsed ? <PanelRightOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
              </button>
            </div>
          </SidebarHeader>
          <SidebarContent>
            {filteredSections.map((section) => (
              <SidebarGroup key={section.id}>
                <button
                  type="button"
                  className={isSidebarCollapsed
                    ? `mx-auto flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${
                      section.path && isNavPathMatch(section.path) ? 'bg-muted text-foreground' : ''
                    }`
                    : `flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/60 ${
                      section.path && isNavPathMatch(section.path) ? 'bg-muted text-foreground' : ''
                    }`}
                  title={section.label}
                  onClick={() => {
                    if (section.path) {
                      navigate(section.path)
                      setOpenMobile(false)
                      setActiveSectionId(section.id)
                      return
                    }
                    toggleSection(section.id)
                  }}
                >
                  <div className={isSidebarCollapsed ? '' : 'flex items-center gap-2'}>
                    {section.icon ? <section.icon className="h-4 w-4 text-muted-foreground" /> : null}
                    {isSidebarCollapsed ? null : <SidebarGroupLabel className="mb-0 px-0">{section.label}</SidebarGroupLabel>}
                  </div>
                  {isSidebarCollapsed || section.path ? null : activeSectionId === section.id ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                {section.path ? null : (
                  <div
                    className={`grid overflow-hidden transition-all duration-300 ease-in-out ${
                      activeSectionId === section.id ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <SidebarGroupContent className={isSidebarCollapsed ? 'pt-1' : ''}>
                        <SidebarMenu>
                          {section.items.map((item) => {
                            const Icon = item.icon
                            return (
                              <SidebarMenuItem key={item.id}>
                                <SidebarMenuButton
                                  isActive={isNavPathMatch(item.path)}
                                  className={isSidebarCollapsed ? 'justify-center px-2' : ''}
                                  title={item.label}
                                  onClick={() => {
                                    navigate(item.path)
                                    setOpenMobile(false)
                                  }}
                                >
                                  {Icon ? <Icon className="h-4 w-4" /> : null}
                                  {isSidebarCollapsed ? null : <span>{item.label}</span>}
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            )
                          })}
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </div>
                  </div>
                )}
              </SidebarGroup>
            ))}
          </SidebarContent>
          <SidebarFooter>
            {isSidebarCollapsed ? (
              <div className="mx-auto inline-flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                {session?.username?.[0]?.toUpperCase() || 'U'}
              </div>
            ) : (
              <>
                <p className="truncate text-sm font-semibold text-foreground">{session?.username}</p>
                <p className="truncate text-xs text-muted-foreground">{primaryRole}</p>
              </>
            )}
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
            <div className="flex min-h-16 flex-col gap-3 px-4 py-2 md:flex-row md:items-center md:justify-between md:px-6">
              <div className="flex items-center gap-2 md:gap-3">
                <SidebarTrigger />
                <div className="min-w-0">
                  <h1 className="truncate text-base font-semibold text-foreground md:text-lg">{currentNavItem?.label || 'Home'}</h1>
                  <p className="truncate text-xs text-muted-foreground">
                    {normalizedPath === '/dashboard' ? 'Panel operativo de la clínica' : 'Gestión de catálogos y operación'}
                  </p>
                </div>
              </div>
              <div className="flex w-full items-center justify-between gap-2 md:w-auto md:justify-end">
                <p className="truncate text-sm font-semibold text-foreground">{userFullName}</p>
                <ConfirmActionDialog
                  triggerElement={(
                    <Button type="button" variant="outline" size="icon" title="Cerrar sesión" aria-label="Cerrar sesión">
                      <LogOut className="h-4 w-4" />
                    </Button>
                  )}
                  title="Cerrar sesión"
                  description="Se cerrará tu sesión actual y volverás a la pantalla de acceso."
                  confirmLabel="Sí, cerrar"
                  cancelLabel="Cancelar"
                  onConfirm={onLogout}
                />
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto px-3 py-4 md:px-6 md:py-6">{children}</main>

          <footer className="border-t bg-background px-4 py-3 text-xs text-muted-foreground md:px-6">
            CLINIX © {new Date().getFullYear()} | Gestión Clínica y Administrativa
          </footer>
        </SidebarInset>
      </div>
    </div>
  )
}

export function AppLayout(props) {
  return (
    <SidebarProvider>
      <AppLayoutInner {...props} />
    </SidebarProvider>
  )
}
