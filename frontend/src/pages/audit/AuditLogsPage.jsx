import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw,
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Activity,
  User,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { auditApi } from '../../api/index.js';
import PageContainer from '../../layouts/PageContainer.jsx';
import { useThemeContext } from '../../context/ThemeContext.jsx';

// ---------- Helper Components ----------
function StatusBadge({ action }) {
  const colorMap = {
    login_success: 'emerald',
    login_failure: 'rose',
    logout: 'gray',
    create: 'blue',
    update: 'yellow',
    delete: 'rose',
    activate: 'emerald',
    deactivate: 'yellow',
    assign: 'purple',
    renew: 'blue',
    export: 'indigo',
  };

  const colors = {
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    gray: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    yellow: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  };

  const color = colorMap[action] || 'gray';
  const label = action?.replace(/_/g, ' ') || 'Unknown';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[color]}`}>
      <span className={`h-1.5 w-1.5 rounded-full bg-${color}-500`} />
      {label}
    </span>
  );
}

// KPI Card
function KpiCard({ icon: Icon, label, value, color, loading }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-5 shadow-sm transition-all duration-300 hover:shadow-lg"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">{label}</p>
          {loading ? (
            <div className="mt-1 h-8 w-20 animate-pulse rounded bg-[var(--color-panel-border)]" />
          ) : (
            <p className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
          )}
        </div>
        <div
          className="rounded-xl p-2.5"
          style={{ backgroundColor: `${color}20`, color }}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}

// ---------- Main Component ----------
export function AuditLogsPage() {
  const { darkMode, getBrandPrimary, getBrandSecondary } = useThemeContext();
  const primaryColor = getBrandPrimary?.() || '#064789';
  const secondaryColor = getBrandSecondary?.() || '#427aa1';

  // State
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState(null);

  // Filter state
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // ---------- Data fetching ----------
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit: pageSize,
        search: search || undefined,
        action: action || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      };

      // Clean up undefined params
      Object.keys(params).forEach((key) => {
        if (params[key] === undefined) delete params[key];
      });

      const [logsData, summaryData] = await Promise.all([
        auditApi.logs(params),
        auditApi.summary(params),
      ]);

      setLogs(logsData.items || []);
      setTotal(logsData.total || 0);
      setSummary(summaryData || null);
    } catch (err) {
      setError(err?.message || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, action, dateFrom, dateTo]);

  const refreshAll = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // Fetch on filter/page change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, action, dateFrom, dateTo]);

  // ---------- Pagination ----------
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

  // ---------- Format date ----------
  const formatDate = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'medium',
    }).format(date);
  };

  // ---------- Render ----------
  return (
    <PageContainer
      title="Audit Logs"
      subtitle="Review recent system actions, user events, and operational history."
      actions={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={refreshAll}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition hover:bg-[var(--color-panel-strong)] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      }
    >
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Activity}
          label="Total Events"
          value={summary?.total}
          color={primaryColor}
          loading={loading}
        />
        <KpiCard
          icon={User}
          label="Distinct Users"
          value={Object.keys(summary?.byUser || {}).length || 0}
          color={secondaryColor}
          loading={loading}
        />
        <KpiCard
          icon={Clock}
          label="Latest Activity"
          value={logs.length > 0 ? formatDate(logs[0].createdAt) : '-'}
          color="#8b5cf6"
          loading={loading}
        />
        <KpiCard
          icon={AlertCircle}
          label="Most Common Action"
          value={
            summary?.byAction
              ? Object.entries(summary.byAction).sort((a, b) => b[1] - a[1])[0]?.[0]?.replace(/_/g, ' ') || 'N/A'
              : 'N/A'
          }
          color="#f59e0b"
          loading={loading}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-4 shadow-sm sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
          <input
            type="text"
            placeholder="Search by user, entity, or metadata..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] pl-9 pr-4 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:border-[var(--brand-primary)] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 min-w-[150px]">
          <Filter className="h-4 w-4 text-[var(--color-text-tertiary)]" />
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="h-10 flex-1 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
          >
            <option value="">All Actions</option>
            <option value="login_success">Login Success</option>
            <option value="login_failure">Login Failure</option>
            <option value="logout">Logout</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="activate">Activate</option>
            <option value="deactivate">Deactivate</option>
            <option value="assign">Assign</option>
            <option value="renew">Renew</option>
            <option value="export">Export</option>
          </select>
        </div>

        <div className="flex items-center gap-2 min-w-[120px]">
          <Calendar className="h-4 w-4 text-[var(--color-text-tertiary)]" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-10 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 min-w-[120px]">
          <span className="text-sm text-[var(--color-text-secondary)]">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-10 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
          />
        </div>

        <div className="text-sm text-[var(--color-text-secondary)] ml-auto">
          {total} event{total !== 1 ? 's' : ''}
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
                  <th className="px-4 py-3 font-medium">Timestamp</th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Entity</th>
                  <th className="px-4 py-3 font-medium">IP</th>
                  <th className="px-4 py-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: pageSize }).map((_, i) => (
                    <tr key={i} className="border-b border-[var(--color-panel-border)] last:border-0">
                      <td className="px-4 py-3"><div className="h-4 w-32 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-24 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-20 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-24 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-16 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-32 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">
                      No audit logs found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="border-b border-[var(--color-panel-border)] last:border-0 hover:bg-black/5 dark:hover:bg-white/5">
                      <td className="px-4 py-3 text-[var(--color-text-secondary)] whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">
                        {log.user?.fullName || log.user?.email || 'Unknown'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge action={log.action} />
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                        {log.entityName || '-'}
                        {log.entityId && (
                          <span className="ml-1 text-xs text-[var(--color-text-tertiary)]">
                            ({log.entityId.slice(0, 8)})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)] font-mono text-xs">
                        {log.ipAddress || '-'}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)] max-w-xs truncate">
                        {log.metadata ? JSON.stringify(log.metadata) : '-'}
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
                  <option value={100}>100</option>
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
    </PageContainer>
  );
}

export default AuditLogsPage;