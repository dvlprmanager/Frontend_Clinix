import { Outlet } from 'react-router-dom'
import { AppLayout } from '@/components/layout/app-layout'
import { useAuth } from '@/features/auth/use-auth'

export function AppShell() {
  const { session, logout } = useAuth()
  return (
    <AppLayout session={session} onLogout={logout}>
      <Outlet />
    </AppLayout>
  )
}
