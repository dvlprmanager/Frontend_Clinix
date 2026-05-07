import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { PageSkeleton } from '@/components/common/page-skeleton'
import { DashboardHome } from '@/pages/dashboard-home'
import { ReportsPage } from '@/pages/reports-page'
import { TenantsPage } from '@/features/tenants/tenants-page'
import { UsersPage } from '@/features/users/users-page'
import { RolesPage } from '@/features/roles/roles-page'
import { PatientsPage } from '@/features/patients/patients-page'
import { AppointmentsPage } from '@/features/appointments/appointments-page'
import { ConsultationsPage } from '@/features/consultations/consultations-page'
import { InvoicesPage } from '@/features/invoices/invoices-page'
import { PaymentsPage } from '@/features/payments/payments-page'
import { CashRegisterPage } from '@/features/cash-register/cash-register-page'
import { ClinicalSharingPage } from '@/features/clinical-sharing/clinical-sharing-page'
import { ClinicalShareAccessPage } from '@/features/clinical-sharing/clinical-share-access-page'
import { InternalReferralsPage } from '@/features/clinical-sharing/internal-referrals-page'
import { AdminCatalogPage } from '@/features/administration/admin-catalog-page'
import { LoginPage } from '@/features/auth/pages/login-page'
import { ChangePasswordPage } from '@/features/auth/pages/change-password-page'
import {
  getDefaultAuthenticatedRoute,
  RedirectIfPasswordChangePending,
  RequireAuth,
  RequireNoAuth,
  RequirePasswordChange,
  RequirePermissions,
  RequireRoles,
} from '@/features/auth/guards'
import { useAuth } from '@/features/auth/use-auth'
import { adminCatalogRouteMap } from '@/app/route-config'
import { AppShell } from '@/app/app-shell'

function DashboardPage() {
  const { session } = useAuth()
  const [isDashboardLoading, setIsDashboardLoading] = useState(false)

  useEffect(() => {
    if (!session) {
      setIsDashboardLoading(false)
      return
    }
    setIsDashboardLoading(true)
    const timeoutId = setTimeout(() => setIsDashboardLoading(false), 700)
    return () => clearTimeout(timeoutId)
  }, [session])

  return <DashboardHome isLoading={isDashboardLoading} />
}

function ProtectedRoutes() {
  return (
    <RequireAuth>
      <RedirectIfPasswordChangePending>
        <AppShell />
      </RedirectIfPasswordChangePending>
    </RequireAuth>
  )
}

export function AppRouter() {
  const { token, isSessionLoading, isAuthenticated, session } = useAuth()
  if (isSessionLoading) {
    return <PageSkeleton variant={token ? 'dashboard' : 'auth'} />
  }

  const rootRedirect = isAuthenticated
    ? session?.mustChangePassword ? '/change-password' : getDefaultAuthenticatedRoute(session)
    : '/login'

  return (
    <Routes>
      <Route path="/" element={<Navigate to={rootRedirect} replace />} />
      <Route
        path="/login"
        element={(
          <RequireNoAuth>
            <LoginPage />
          </RequireNoAuth>
        )}
      />
      <Route
        path="/change-password"
        element={(
          <RequireAuth>
            <RequirePasswordChange>
              <ChangePasswordPage />
            </RequirePasswordChange>
          </RequireAuth>
        )}
      />
      <Route path="/clinical-sharing/access/:token" element={<ClinicalShareAccessPage />} />

      <Route element={<ProtectedRoutes />}>
        <Route
          path="/dashboard"
          element={(
            <RequireRoles requiredRoles={['ADMIN', 'DOCTOR', 'RECEPCION']}>
              <DashboardPage />
            </RequireRoles>
          )}
        />
        <Route
          path="/tenants"
          element={(
            <RequirePermissions requiredPermissions={['TENANTS_MANAGE']}>
              <TenantsPage />
            </RequirePermissions>
          )}
        />
        <Route
          path="/users"
          element={(
            <RequirePermissions requiredPermissions={['USERS_MANAGE']}>
              <UsersPage />
            </RequirePermissions>
          )}
        />
        <Route
          path="/employees"
          element={(
            <RequirePermissions requiredPermissions={['USERS_MANAGE']}>
              <UsersPage />
            </RequirePermissions>
          )}
        />
        <Route
          path="/roles"
          element={(
            <RequirePermissions requiredPermissions={['ACCESS_MANAGE']}>
              <RolesPage />
            </RequirePermissions>
          )}
        />
        <Route
          path="/patients"
          element={(
            <RequirePermissions requiredPermissions={['PATIENTS_READ']}>
              <PatientsPage />
            </RequirePermissions>
          )}
        />
        <Route
          path="/appointments"
          element={(
            <RequirePermissions requiredPermissions={['APPOINTMENTS_READ']}>
              <AppointmentsPage />
            </RequirePermissions>
          )}
        />
        <Route
          path="/consultations/*"
          element={(
            <RequireRoles requiredRoles={['ADMIN', 'DOCTOR']}>
              <RequirePermissions requiredPermissions={['PATIENTS_READ']}>
                <ConsultationsPage />
              </RequirePermissions>
            </RequireRoles>
          )}
        />
        <Route
          path="/clinical-sharing"
          element={(
            <RequirePermissions requiredPermissions={['CLINICAL_SHARE_READ']}>
              <ClinicalSharingPage />
            </RequirePermissions>
          )}
        />
        <Route
          path="/clinical-sharing/internal-referrals"
          element={(
            <RequirePermissions requiredPermissions={['CLINICAL_SHARE_READ', 'APPOINTMENTS_READ']}>
              <InternalReferralsPage />
            </RequirePermissions>
          )}
        />
        <Route
          path="/invoices"
          element={(
            <RequirePermissions requiredPermissions={['BILLING_READ']}>
              <InvoicesPage />
            </RequirePermissions>
          )}
        />
        <Route
          path="/payments"
          element={(
            <RequirePermissions requiredPermissions={['BILLING_READ']}>
              <PaymentsPage />
            </RequirePermissions>
          )}
        />
        <Route
          path="/cash-register"
          element={(
            <RequirePermissions requiredPermissions={['BILLING_READ']}>
              <CashRegisterPage />
            </RequirePermissions>
          )}
        />
        <Route
          path="/reports"
          element={(
            <RequirePermissions requiredPermissions={['REPORTS_READ']}>
              <ReportsPage />
            </RequirePermissions>
          )}
        />
        {Object.entries(adminCatalogRouteMap).map(([path, catalogKey]) => (
          <Route
            key={path}
            path={path}
            element={(
              <RequirePermissions requiredPermissions={catalogKey === 'services' ? ['BILLING_WRITE'] : ['ACCESS_MANAGE']}>
                <AdminCatalogPage catalogKey={catalogKey} />
              </RequirePermissions>
            )}
          />
        ))}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
