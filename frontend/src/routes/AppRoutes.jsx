import { useEffect } from 'react'
import { useAuth } from '../hooks/useAuth.js'
import { useQueryHash } from '../hooks/useQueryHash.js'
import { AppLayout } from '../layouts/AppLayout.jsx'
import { ProtectedRoute } from './ProtectedRoute.jsx'
import { navigateTo } from '../utils/navigation.js'
import { ROLES } from '../utils/constants.js'
import LandingPage from '../pages/public/Landing.jsx'
import { LoginPage } from '../pages/auth/LoginPage.jsx'
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage.jsx'
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage.jsx'
import { ChangePasswordPage } from '../pages/auth/ChangePasswordPage.jsx'
import { InvoiceListPage } from '../pages/invoices/InvoiceListPage.jsx'
import { InvoiceDetailsPage } from '../pages/invoices/InvoiceDetailsPage.jsx'
import { InvoiceCreatePage } from '../pages/invoices/InvoiceCreatePage.jsx'
import { ReportsPage } from '../pages/reports/ReportsPage.jsx'
import { SettingsPage } from '../pages/settings/SettingsPage.jsx'
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage.jsx'
import { BusinessesPage } from '../pages/admin/BusinessesPage.jsx'
import { RevenueAnalyticsPage } from '../pages/admin/RevenueAnalyticsPage.jsx'
import { LoginAsBusinessPage } from '../pages/admin/LoginAsBusinessPage.jsx'
import { SubscriptionsPage } from '../pages/admin/SubscriptionsPage.jsx'
import { SystemSettingsPage } from '../pages/admin/SystemSettingsPage.jsx'
import { AdminUsersPage } from '../pages/admin/AdminUsersPage.jsx'
import { AdminRolesPage } from '../pages/admin/AdminRolesPage.jsx'
import { AdminPermissionsPage } from '../pages/admin/AdminPermissionsPage.jsx'
import { AuditLogsPage as AdminAuditLogsPage } from '../pages/audit/AuditLogsPage.jsx'
import { BusinessDashboardPage } from '../pages/business/BusinessDashboardPage.jsx'
import { CategoriesPage } from '../pages/business/CategoriesPage.jsx'
import { CustomersPage } from '../pages/business/CustomersPage.jsx'
import { VendorsPage } from '../pages/business/VendorsPage.jsx'
import { InventoryPage } from '../pages/business/InventoryPage.jsx'
import { LedgerPage } from '../pages/business/LedgerPage.jsx'
import { PermissionsPage } from '../pages/business/PermissionsPage.jsx'
import { RolesPage } from '../pages/business/RolesPage.jsx'
import { SubscriptionPage } from '../pages/business/SubscriptionPage.jsx'
import { UsersPage } from '../pages/business/UsersPage.jsx'
import { ProductsPage } from '../pages/business/ProductsPage.jsx'
import { AuditLogsPage as BusinessAuditLogsPage } from '../pages/business/AuditLogsPage.jsx'
import { StaffDashboardPage } from '../pages/staff/StaffDashboardPage.jsx'
import { StaffCustomersPage } from '../pages/staff/StaffCustomersPage.jsx'
import { StaffInventoryPage } from '../pages/staff/StaffInventoryPage.jsx'
// import { InvoiceListPage } from '../pages/invoices/InvoiceListPage.jsx'
// import { StaffProductsPage } from '../pages/staff/StaffProductsPage.jsx'
// import { StaffVendorsPage } from '../pages/staff/StaffVendorsPage.jsx'

function normalizePath(path) {
  return path?.replace(/\/+$|^\s+|\s+$/g, '') || '/'
}

function Redirect({ to }) {
  useEffect(() => {
    navigateTo(to, { replace: true })
  }, [to])

  return null
}

function getDashboardForRole(roleName) {
  if (roleName === ROLES.ADMIN) {
    return <AdminDashboardPage />
  }

  if (roleName === ROLES.STAFF) {
    return <StaffDashboardPage />
  }

  return <BusinessDashboardPage />
}

function getUsersForRole(roleName) {
  return roleName === ROLES.ADMIN ? <AdminUsersPage /> : <UsersPage />
}

function getRolesForRole(roleName) {
  return roleName === ROLES.ADMIN ? <AdminRolesPage /> : <RolesPage />
}

function getPermissionsForRole(roleName) {
  return roleName === ROLES.ADMIN ? <AdminPermissionsPage /> : <PermissionsPage />
}

function getSettingsForRole(roleName) {
  return roleName === ROLES.ADMIN ? <SystemSettingsPage /> : <SettingsPage />
}

function getAuditForRole(roleName) {
  if (roleName === ROLES.ADMIN) {
    return <AdminAuditLogsPage />
  }

  if (roleName === ROLES.STAFF) {
    return <StaffAuditLogsPage />
  }

  return <BusinessAuditLogsPage />
}

function getProductsForRole(roleName) {
  return roleName === ROLES.STAFF ? <ProductsPage /> : <ProductsPage />
}

function getCustomersForRole(roleName) {
  return roleName === ROLES.STAFF ? <StaffCustomersPage /> : <CustomersPage />
}

function getVendorsForRole(roleName) {
  return roleName === ROLES.STAFF ? <VendorsPage /> : <VendorsPage />
}

function getInventoryForRole(roleName) {
  return roleName === ROLES.STAFF ? <StaffInventoryPage /> : <InventoryPage />
}

function getInvoicesForRole(roleName) {
  return roleName === ROLES.STAFF ? <InvoiceListPage /> : <InvoiceListPage />
}

function getPageForPath(path, roleName) {
  switch (path) {
    case '/':
      return null
    case '/login':
    case '/forgot-password':
    case '/reset-password':
      return null
    case '/dashboard':
      return getDashboardForRole(roleName)
    case '/invoices':
      return getInvoicesForRole(roleName)
    case '/invoices/new':
      return <InvoiceCreatePage />
    case '/settings':
      return getSettingsForRole(roleName)
    case '/reports':
      return <ReportsPage />
    case '/audit':
      return getAuditForRole(roleName)
    case '/categories':
      return <CategoriesPage />
    case '/customers':
      return getCustomersForRole(roleName)
    case '/vendors':
      return getVendorsForRole(roleName)
    case '/inventory':
      return getInventoryForRole(roleName)
    case '/products':
      return getProductsForRole(roleName)
    case '/ledger':
      return roleName === ROLES.STAFF || roleName === ROLES.ADMIN ? null : <LedgerPage />
    case '/subscription':
    case '/subscription-control':
      return <SubscriptionPage />
    case '/change-password':
      return <ChangePasswordPage />
    case '/users':
      return getUsersForRole(roleName)
    case '/roles':
      return getRolesForRole(roleName)
    case '/permissions':
      return getPermissionsForRole(roleName)
    case '/admin':
      return roleName === ROLES.ADMIN ? <AdminDashboardPage /> : null
    case '/admin/businesses':
      return roleName === ROLES.ADMIN ? <BusinessesPage /> : null
    case '/admin/revenue':
      return roleName === ROLES.ADMIN ? <RevenueAnalyticsPage /> : null
    case '/admin/login-as-business':
      return roleName === ROLES.ADMIN ? <LoginAsBusinessPage /> : null
    case '/admin/subscriptions':
      return roleName === ROLES.ADMIN ? <SubscriptionsPage /> : null
    default:
      if (path.startsWith('/invoices/') && path !== '/invoices/new') {
        return <InvoiceDetailsPage />
      }

      return null
  }
}

function getFallbackRedirect(path, roleName, needsSubscription) {
  if (path === '/admin' && roleName !== ROLES.ADMIN) {
    return '/dashboard'
  }

  if (path.startsWith('/admin') && roleName !== ROLES.ADMIN) {
    return '/dashboard'
  }

  if (path === '/login' || path === '/forgot-password' || path === '/reset-password' || path === '/') {
    return '/dashboard'
  }

  if (roleName !== ROLES.ADMIN && path !== '/subscription' && path !== '/subscription-control' && needsSubscription) {
    return '/subscription-control'
  }

  return null
}

function PageNotFound() {
  return (
    <div className="rounded-3xl border border-dashed border-slate-400/30 bg-white/80 p-8 text-sm text-slate-700">
      <h1 className="mb-3 text-xl font-semibold">Page not found</h1>
      <p>The page you are looking for does not exist or is not available for your role.</p>
    </div>
  )
}

export function AppRoutes() {
  const { token, user, loading, logout, setSession } = useAuth()
  const currentPath = normalizePath(useQueryHash())
  const isAuthenticated = Boolean(token)
  const roleName = user?.role?.name || ''

  if (loading) {
    return null
  }

  if (!isAuthenticated) {
    if (currentPath === '/') {
      return <LandingPage />
    }

    if (currentPath === '/login') {
      return <LoginPage onSuccess={setSession} />
    }

    if (currentPath === '/forgot-password') {
      return <ForgotPasswordPage />
    }

    if (currentPath === '/reset-password') {
      return <ResetPasswordPage />
    }

    return <Redirect to="/login" />
  }

  if (currentPath === '/' || currentPath === '/login' || currentPath === '/forgot-password' || currentPath === '/reset-password') {
    return <Redirect to="/dashboard" />
  }

  const page = getPageForPath(currentPath, roleName)
  const fallbackRedirect = getFallbackRedirect(currentPath, roleName, Boolean(user?.needsSubscription))

  if (!page) {
    if (fallbackRedirect) {
      return <Redirect to={fallbackRedirect} />
    }

    return (
      <AppLayout currentPath={currentPath} user={user} onLogout={logout}>
        <PageNotFound />
      </AppLayout>
    )
  }

  return (
    <ProtectedRoute isAuthenticated={isAuthenticated}>
      <AppLayout currentPath={currentPath} user={user} onLogout={logout}>
        {page}
      </AppLayout>
    </ProtectedRoute>
  )
}
