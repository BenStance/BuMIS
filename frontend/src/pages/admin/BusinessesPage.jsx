import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Search,
  Filter,
  Eye,
  LogIn,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Users,
  Calendar,
  CreditCard,
  CheckCircle,
  AlertCircle,
  X,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { adminApi } from '../../api/admin.api.js';
import PageContainer from '../../layouts/PageContainer.jsx';
import { navigateTo } from '../../utils/navigation.js';
import { useThemeContext } from '../../context/ThemeContext.jsx';
import { setAccessToken, setCurrentUser, setRefreshToken } from '../../utils/storage.js';
import { BusinessRegistrationForm } from '../auth/RegisterBusinessPage.jsx';

// Simple KPI Card (same as dashboard)
function KpiCard({ icon: Icon, label, value, color, loading }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-4 shadow-sm transition-all duration-300 hover:shadow-lg"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">{label}</p>
          {loading ? (
            <div className="mt-1 h-7 w-16 animate-pulse rounded bg-[var(--color-panel-border)]" />
          ) : (
            <p className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">
              {value?.toLocaleString() ?? '-'}
            </p>
          )}
        </div>
        <div
          className="rounded-xl p-2"
          style={{ backgroundColor: `${color}20`, color }}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}

// Status badge component
function StatusBadge({ status }) {
  const statusMap = {
    active: { label: 'Active', color: 'emerald' },
    suspended: { label: 'Suspended', color: 'yellow' },
    closed: { label: 'Closed', color: 'rose' },
    expired: { label: 'Expired', color: 'rose' },
    pending: { label: 'Pending', color: 'blue' },
  };
  const { label, color } = statusMap[status?.toLowerCase()] || { label: status, color: 'gray' };

  const colorClasses = {
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    yellow: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    gray: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClasses[color]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full bg-${color}-500`} />
      {label}
    </span>
  );
}

// Business detail drawer
function BusinessDetailDrawer({ businessId, isOpen, onClose, onLogin }) {
  const { darkMode } = useThemeContext();
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  useEffect(() => {
    if (isOpen && businessId) {
      const fetchDetail = async () => {
        setLoading(true);
        try {
          const data = await adminApi.business(businessId);
          setDetail(data);
          // Fetch active users for this business
          setUsersLoading(true);
          const usersData = await adminApi.activeUsers({ businessId, limit: 10 });
          setActiveUsers(usersData.items || []);
        } catch (err) {
          console.error('Failed to fetch business detail:', err);
        } finally {
          setLoading(false);
          setUsersLoading(false);
        }
      };
      fetchDetail();
    }
  }, [isOpen, businessId]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 z-50 h-full w-full max-w-2xl overflow-y-auto border-l border-[var(--color-panel-border)] bg-[var(--color-panel-strong)] p-6 shadow-2xl backdrop-blur-2xl sm:p-8"
      >
        <div className="flex items-start justify-between">
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Business Details</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-[var(--color-text-secondary)] hover:bg-black/5 dark:hover:bg-white/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="mt-8 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
          </div>
        ) : detail ? (
          <div className="mt-6 space-y-6">
            {/* Business info */}
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">
                {detail.businessName}
              </h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <InfoItem label="Email" value={detail.email} />
                <InfoItem label="Phone" value={detail.phone} />
                <InfoItem label="Address" value={detail.address} />
                <InfoItem label="TIN" value={detail.tin} />
                <InfoItem label="Status" value={<StatusBadge status={detail.status} />} />
                <InfoItem label="Registered" value={new Date(detail.registrationDate).toLocaleDateString()} />
              </div>
            </div>

            {/* Subscription */}
            {detail.activeSubscription && (
              <div className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-4">
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Active Subscription
                </h4>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-[var(--color-text-secondary)]">Plan</p>
                    <p className="font-medium text-[var(--color-text-primary)]">
                      {detail.activeSubscription.plan}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-text-secondary)]">Status</p>
                    <StatusBadge status={detail.activeSubscription.status} />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-text-secondary)]">Start</p>
                    <p className="text-sm text-[var(--color-text-primary)]">
                      {new Date(detail.activeSubscription.startDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-text-secondary)]">End</p>
                    <p className="text-sm text-[var(--color-text-primary)]">
                      {new Date(detail.activeSubscription.endDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Active Users */}
            <div>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Active Users ({detail.activeUsers || 0})
              </h4>
              {usersLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="h-6 w-6 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
                </div>
              ) : activeUsers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-[var(--color-panel-border)] text-[var(--color-text-secondary)]">
                      <tr>
                        <th className="pb-2 pr-4 font-medium">User</th>
                        <th className="pb-2 pr-4 font-medium">Role</th>
                        <th className="pb-2 pr-4 font-medium">Last Login</th>
                        <th className="pb-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeUsers.map((user) => (
                        <tr key={user.id} className="border-b border-[var(--color-panel-border)] last:border-0">
                          <td className="py-2 pr-4 text-[var(--color-text-primary)]">{user.userName}</td>
                          <td className="py-2 pr-4 text-[var(--color-text-secondary)]">{user.role}</td>
                          <td className="py-2 pr-4 text-[var(--color-text-secondary)]">
                            {new Date(user.lastLogin).toLocaleDateString()}
                          </td>
                          <td className="py-2">
                            <StatusBadge status={user.accountStatus} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-[var(--color-text-secondary)]">No active users found.</p>
              )}
            </div>

            {/* Action: Login as Business */}
            <button
              type="button"
              onClick={() => onLogin(detail.id)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--brand-primary)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              <LogIn className="h-4 w-4" />
              Login as Business
            </button>
          </div>
        ) : (
          <p className="mt-8 text-center text-[var(--color-text-secondary)]">
            Business not found.
          </p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// Helper for info items
function InfoItem({ label, value }) {
  return (
    <div>
      <p className="text-xs text-[var(--color-text-secondary)]">{label}</p>
      <p className="text-sm text-[var(--color-text-primary)]">{value || '-'}</p>
    </div>
  );
}

export function BusinessesPage() {
  const { darkMode, getBrandPrimary, getBrandSecondary } = useThemeContext();
  const primaryColor = getBrandPrimary?.() || '#064789';
  const secondaryColor = getBrandSecondary?.() || '#427aa1';

  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);
  const [registrationOpen, setRegistrationOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page,
        limit: pageSize,
        search: search || undefined,
        status: statusFilter || undefined,
      };
      Object.keys(params).forEach((key) => {
        if (params[key] === undefined || params[key] === '') delete params[key];
      });
      
      const [statsData, listData] = await Promise.all([
        adminApi.statistics(),
        adminApi.businesses(params),
      ]);
      setStats(statsData);
      setBusinesses(listData.items || []);
      setTotal(listData.total || 0);
    } catch (err) {
      setError(err?.message || 'Failed to load businesses.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter]);

  const refreshAll = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    const nextSearch = searchInput.trim();
    if (nextSearch === search && page === 1) {
      fetchData();
      return;
    }
    setPage(1);
    setSearch(nextSearch);
  };

  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (page - 1) * pageSize;

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setPage(1);
  };

  const goToPage = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const handleViewDetail = (id) => {
    setSelectedBusinessId(id);
    setDrawerOpen(true);
  };

  const handleLoginAsBusiness = async (id) => {
    try {
      const response = await adminApi.loginAsBusiness(id);
      if (response?.accessToken && response?.user) {
        setAccessToken(response.accessToken);
        if (response.refreshToken) {
          setRefreshToken(response.refreshToken);
        }
        setCurrentUser(response.user);
        window.dispatchEvent(new Event('storage'));
        navigateTo('/dashboard');
      } else {
        console.error('No access token returned');
      }
    } catch (err) {
      console.error('Login as business failed:', err);
      alert('Failed to login as business. Please try again.');
    }
  };

  return (
    <PageContainer
      title="Businesses"
      subtitle="Manage all registered businesses, view details, and perform administrative actions."
      actions={
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setRegistrationOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
            <Plus className="h-4 w-4" /> Register Business
          </button>
          <button type="button" onClick={refreshAll} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition hover:bg-[var(--color-panel-strong)] disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      }
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 pb-5">
        <KpiCard
          icon={Building2}
          label="Total Businesses"
          value={stats?.totalBusinesses}
          color={primaryColor}
          loading={loading}
        />
        <KpiCard
          icon={CheckCircle}
          label="Active Businesses"
          value={stats?.businessesByStatus?.active}
          color={secondaryColor}
          loading={loading}
        />
        <KpiCard
          icon={AlertCircle}
          label="Suspended"
          value={stats?.businessesByStatus?.suspended}
          color="#f59e0b"
          loading={loading}
        />
        <KpiCard
          icon={Users}
          label="Avg Users / Business"
          value={stats?.averageUsersPerBusiness}
          color="#3b82f6"
          loading={loading}
        />
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-5">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
            <input
              type="text"
              placeholder="Search by business name or owner..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-10 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] pl-9 pr-4 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:border-[var(--brand-primary)] focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[var(--color-text-tertiary)]" />
          <select
            value={statusFilter}
            onChange={handleStatusChange}
            className="h-10 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="closed">Closed</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={fetchData}
            className="mt-4 rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--color-panel-border)] text-[var(--color-text-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Business</th>
                  <th className="px-4 py-3 font-medium">Owner</th>
                  <th className="px-4 py-3 font-medium">Registered</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Users</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: pageSize }).map((_, i) => (
                    <tr key={i} className="border-b border-[var(--color-panel-border)] last:border-0">
                      <td className="px-4 py-3">
                        <div className="h-4 w-32 animate-pulse rounded bg-[var(--color-panel-border)]" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 w-24 animate-pulse rounded bg-[var(--color-panel-border)]" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 w-20 animate-pulse rounded bg-[var(--color-panel-border)]" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 w-16 animate-pulse rounded bg-[var(--color-panel-border)]" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 w-16 animate-pulse rounded bg-[var(--color-panel-border)]" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 w-12 animate-pulse rounded bg-[var(--color-panel-border)]" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="ml-auto h-4 w-16 animate-pulse rounded bg-[var(--color-panel-border)]" />
                      </td>
                    </tr>
                  ))
                ) : businesses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">
                      {search || statusFilter ? 'No businesses match your filters.' : 'No businesses found.'}
                    </td>
                  </tr>
                ) : (
                  businesses.map((biz) => (
                    <tr key={biz.id} className="border-b border-[var(--color-panel-border)] last:border-0 hover:bg-black/5 dark:hover:bg-white/5">
                      <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">
                        {biz.businessName}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{biz.ownerName}</td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                        {new Date(biz.registrationDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{biz.subscriptionPlan}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={biz.currentStatus || biz.subscriptionStatus} />
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{biz.activeUsers}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleViewDetail(biz.id)}
                            className="rounded-lg p-1.5 text-[var(--color-text-secondary)] transition hover:bg-black/5 dark:hover:bg-white/5"
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleLoginAsBusiness(biz.id)}
                            className="rounded-lg p-1.5 text-[var(--color-text-secondary)] transition hover:bg-black/5 dark:hover:bg-white/5"
                            title="Login as this business"
                          >
                            <LogIn className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 0 && (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={handlePageSizeChange}
                  className="rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-2 py-1 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span className="hidden sm:inline">
                  {startIndex + 1}–{Math.min(startIndex + pageSize, total)} of {total}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => goToPage(page - 1)}
                  disabled={page === 1}
                  className="rounded-lg border border-[var(--color-panel-border)] p-2 text-[var(--color-text-secondary)] transition hover:bg-[var(--color-panel-strong)] disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-3 text-sm text-[var(--color-text-secondary)]">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => goToPage(page + 1)}
                  disabled={page === totalPages}
                  className="rounded-lg border border-[var(--color-panel-border)] p-2 text-[var(--color-text-secondary)] transition hover:bg-[var(--color-panel-strong)] disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail Drawer */}
      <BusinessDetailDrawer
        businessId={selectedBusinessId}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onLogin={handleLoginAsBusiness}
      />

      <AnimatePresence>
        {registrationOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setRegistrationOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 20 }} className="fixed inset-x-4 top-1/2 z-50 mx-auto max-h-[90vh] max-w-3xl -translate-y-1/2 overflow-y-auto rounded-[2rem] border border-[var(--color-panel-border)] bg-[var(--color-panel-strong)] p-6 shadow-2xl sm:p-8">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Register a business</h2>
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">The owner must verify their email with the OTP sent to them.</p>
                </div>
                <button type="button" onClick={() => setRegistrationOpen(false)} className="rounded-xl p-2 text-[var(--color-text-secondary)] hover:bg-black/5 dark:hover:bg-white/5" aria-label="Close registration"><X className="h-5 w-5" /></button>
              </div>
              <BusinessRegistrationForm embedded onCancel={() => setRegistrationOpen(false)} onComplete={() => fetchData()} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </PageContainer>
  );
}

export { BusinessesPage as AdminBusinessesPage };

export default BusinessesPage;
