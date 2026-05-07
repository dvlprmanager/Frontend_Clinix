import { BrowserRouter } from 'react-router-dom'
import { AppToaster } from '@/components/ui/app-toaster'
import { AuthProvider } from '@/features/auth/auth-context'
import { AppQueryProvider } from '@/shared/providers/query-provider'

export function AppProviders({ children }) {
  return (
    <BrowserRouter>
      <AppQueryProvider>
        <AuthProvider>
          {children}
          <AppToaster />
        </AuthProvider>
      </AppQueryProvider>
    </BrowserRouter>
  )
}
