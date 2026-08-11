import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard,
  ReceiptText,
  BarChart3,
  ShieldCheck,
  Settings,
  Building2,
  DollarSign,
  LogIn,
  Menu,
  X,
  Tags,
  Package,
  Users,
  Truck,
  Boxes,
  BookOpen,
  KeyRound,
  CreditCard,
  Shield,
  ClipboardList,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { navigateTo } from '../../utils/navigation.js';
import { NAV_GROUPS, ROLES } from '../../utils/constants.js';
import { useThemeContext } from '../../context/ThemeContext.jsx';
import logoImage from '../../assets/images/logo.png';

const ICONS = {
  dashboard: LayoutDashboard,
  invoices: ReceiptText,
  reports: BarChart3,
  audit: ShieldCheck,
  settings: Settings,
  businesses: Building2,
  revenue: DollarSign,
  loginAsBusiness: LogIn,
  categories: Tags,
  products: Package,
  customers: Users,
  vendors: Truck,
  inventory: Boxes,
  ledger: BookOpen,
  roles: KeyRound,
  permissions: Shield,
  subscriptions: CreditCard,
  users: Users,
  admin: ClipboardList,
};

function normalizeRole(role) {
  return String(role?.name || role || '').trim();
}

function isActivePath(currentPath, path) {
  return currentPath === path || (path !== '/' && currentPath.startsWith(`${path}/`));
}

function NavItem({ item, currentPath, onNavigate, collapsed }) {
  const Icon = ICONS[item.icon] || LayoutDashboard;
  const active = isActivePath(currentPath, item.to);

  return (
    <motion.button
      whileHover={{ scale: 1.02, x: 4 }}
      whileTap={{ scale: 0.98 }}
      type="button"
      onClick={() => onNavigate(item.to)}
      className={`
        group relative flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left 
        transition-all duration-300 ease-out
        ${active
          ? 'bg-gradient-to-r from-[var(--brand-primary)]/15 to-[var(--brand-secondary)]/10 text-[var(--color-text-primary)] shadow-[0_8px_30px_rgba(6,71,137,0.12)]'
          : 'text-[var(--color-text-secondary)] hover:bg-black/5 hover:text-[var(--color-text-primary)] dark:hover:bg-white/5'
        }
        ${collapsed ? 'justify-center px-0' : ''}
      `}
    >
      {/* Active indicator glow */}
      {active && (
        <span
          className="absolute inset-0 rounded-2xl opacity-20 blur-xl"
          style={{
            background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
          }}
        />
      )}
      {/* Left accent bar for active */}
      {active && (
        <span
          className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full"
          style={{ background: 'linear-gradient(180deg, var(--brand-primary), var(--brand-secondary))' }}
        />
      )}

      <Icon
        className={`h-5 w-5 shrink-0 transition-colors duration-300 ${
          active ? 'text-[var(--brand-primary)]' : 'group-hover:text-[var(--color-text-primary)]'
        }`}
        strokeWidth={active ? 2.5 : 2}
      />
      {!collapsed && (
        <span className="flex-1 text-sm font-medium tracking-wide">{item.label}</span>
      )}
      {!collapsed && item.badge && (
        <span className="rounded-full bg-[var(--brand-primary)]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--brand-primary)]">
          {item.badge}
        </span>
      )}
    </motion.button>
  );
}

function buildSections(roleName) {
  // ... (same as original, unchanged)
  const adminSections = [
    {
      title: NAV_GROUPS.overview,
      items: [{ to: '/dashboard', label: 'Dashboard', icon: 'dashboard' }],
    },
    {
      title: NAV_GROUPS.administration,
      items: [
        { to: '/admin/businesses', label: 'Businesses', icon: 'businesses' },
        { to: '/admin/subscriptions', label: 'Subscriptions', icon: 'subscriptions' },
        { to: '/admin/revenue', label: 'Revenue Analytics', icon: 'revenue' },
        { to: '/admin/login-as-business', label: 'Login as Business', icon: 'loginAsBusiness' },
        { to: '/users', label: 'Users', icon: 'users' },
        { to: '/roles', label: 'Roles', icon: 'roles' },
        { to: '/permissions', label: 'Permissions', icon: 'permissions' },
        { to: '/audit', label: 'Audit Logs', icon: 'audit' },
        // { to: '/settings', label: 'System Settings', icon: 'settings' },
      ],
    },
  ];

  const ownerSections = [
    {
      title: NAV_GROUPS.overview,
      items: [{ to: '/dashboard', label: 'Dashboard', icon: 'dashboard' }],
    },
    {
      title: NAV_GROUPS.operations,
      items: [
        { to: '/invoices', label: 'Invoices', icon: 'invoices' },
        { to: '/products', label: 'Products', icon: 'products' },
        { to: '/categories', label: 'Categories', icon: 'categories' },
        { to: '/customers', label: 'Customers', icon: 'customers' },
        { to: '/vendors', label: 'Vendors', icon: 'vendors' },
        { to: '/inventory', label: 'Inventory', icon: 'inventory' },
        { to: '/ledger', label: 'Ledger', icon: 'ledger' },
        { to: '/reports', label: 'Reports', icon: 'reports' },
      ],
    },
    {
      title: NAV_GROUPS.administration,
      items: [
        { to: '/users', label: 'Users', icon: 'users' },
        // { to: '/roles', label: 'Roles', icon: 'roles' },
        // { to: '/permissions', label: 'Permissions', icon: 'permissions' },
        { to: '/subscription', label: 'Subscription', icon: 'subscriptions' },
        { to: '/settings', label: 'Settings', icon: 'settings' },
      ],
    },
  ];

  const staffSections = [
    {
      title: NAV_GROUPS.overview,
      items: [{ to: '/dashboard', label: 'Dashboard', icon: 'dashboard' }],
    },
    {
      title: NAV_GROUPS.operations,
      items: [
        { to: '/invoices', label: 'Invoices', icon: 'invoices' },
        { to: '/products', label: 'Products', icon: 'products' },
        { to: '/customers', label: 'Customers', icon: 'customers' },
        { to: '/vendors', label: 'Vendors', icon: 'vendors' },
        { to: '/inventory', label: 'Inventory', icon: 'inventory' },
        { to: '/reports', label: 'Reports', icon: 'reports' },
        // { to: '/audit', label: 'Audit Logs', icon: 'audit' },
      ],
    },
  ];

  if (roleName === ROLES.ADMIN) {
    return adminSections;
  }
  if (roleName === ROLES.STAFF) {
    return staffSections;
  }
  return ownerSections;
}

export function Sidebar({ currentPath, user, onLogout }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const roleName = normalizeRole(user?.role);
  const { getBrandPrimary, getBrandSecondary } = useThemeContext();
  const primary = getBrandPrimary?.() || '#064789';
  const secondary = getBrandSecondary?.() || '#427aa1';

  const sections = useMemo(() => buildSections(roleName), [roleName]);

  const goTo = (path) => {
    navigateTo(path);
    setMobileOpen(false);
  };

  const sidebarPanel = (
    <div
      className={`
        flex h-full flex-col border-r border-[var(--color-panel-border)] 
        bg-[var(--color-panel-strong)]/80 backdrop-blur-2xl shadow-2xl
        transition-all duration-500 ease-in-out
        ${collapsed ? 'w-20' : 'w-[19rem]'}
      `}
      style={{
        background: `var(--color-panel-strong)`,
      }}
    >
      {/* Header with logo and collapse toggle */}
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-panel-border)] px-4 py-4">
        <button
          type="button"
          onClick={() => goTo('/')}
          className="flex items-center gap-3 text-left transition-opacity hover:opacity-80"
        >
          <div
            className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg"
            style={{
              boxShadow: `0 8px 24px ${primary}40`,
            }}
          >
            <img src={logoImage} alt="INVEXA logo" className="h-full w-full object-cover" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[var(--color-text-primary)]">
                INVEXA
              </p>
              <p className="text-xs text-[var(--color-text-secondary)]">Business Management</p>
            </div>
          )}
        </button>

        {/* Collapse toggle - only on desktop */}
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="hidden rounded-xl border border-[var(--color-panel-border)] p-2 text-[var(--color-text-secondary)] transition hover:bg-black/5 hover:text-[var(--color-text-primary)] dark:hover:bg-white/5 md:inline-flex"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>

        {/* Close button for mobile */}
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="rounded-xl border border-[var(--color-panel-border)] p-2 text-[var(--color-text-secondary)] md:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation sections */}
      <div className="mt-4 flex-1 space-y-6 overflow-y-auto px-3 pb-4 scrollbar-thin scrollbar-thumb-[var(--color-panel-border)]">
        {sections.map((section) => (
          <div key={section.title} className="space-y-3">
            {!collapsed && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--color-text-tertiary)]"
              >
                {section.title}
              </motion.p>
            )}
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavItem
                  key={item.to}
                  item={item}
                  currentPath={currentPath}
                  onNavigate={goTo}
                  collapsed={collapsed}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* User profile & logout */}
      <div className="border-t border-[var(--color-panel-border)] p-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${primary}, ${secondary})`,
              boxShadow: `0 4px 12px ${primary}50`,
            }}
          >
            <span className="text-sm font-bold">
              {user?.fullName?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </span>
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                {user?.fullName || user?.email || 'Guest'}
              </p>
              <p className="truncate text-xs text-[var(--color-text-secondary)]">
                {user?.role?.name || 'No role'}
              </p>
            </div>
          )}
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={onLogout}
          className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-600 transition-all duration-300 hover:bg-rose-500/20 hover:shadow-lg hover:shadow-rose-500/20 dark:text-rose-400 ${
            collapsed ? 'px-2' : ''
          }`}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Logout</span>}
        </motion.button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel-strong)]/80 p-3 shadow-lg backdrop-blur-xl md:hidden"
      >
        <Menu className="h-5 w-5 text-[var(--color-text-primary)]" />
      </button>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen md:block">{sidebarPanel}</aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              className="fixed left-0 top-0 z-50 h-screen w-[19rem] md:hidden"
            >
              {sidebarPanel}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default Sidebar;
