import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  Users,
  Receipt,
  DollarSign,
  Clock,
  AlertCircle,
  TrendingUp,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { adminApi } from '../../api/admin.api.js';
import PageContainer from '../../layouts/PageContainer.jsx';
import { useThemeContext } from '../../context/ThemeContext.jsx';

// Helper to format currency
const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'TZS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// KPI Card Component
function KpiCard({ icon: Icon, label, value, trend, color, loading }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-5 shadow-sm transition-all duration-300 hover:shadow-lg"
      style={{
        background: 'var(--color-panel)',
      }}
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
          {trend !== undefined && (
            <p className="mt-1 text-xs text-emerald-500">
              <TrendingUp className="inline h-3 w-3" /> {trend}% from last month
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

// Custom Tooltip for charts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel-strong)] p-3 shadow-lg backdrop-blur-xl">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">{label}</p>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {payload[0].value} {payload[0].name === 'count' ? 'businesses' : ''}
        </p>
      </div>
    );
  }
  return null;
};

export function AdminDashboardPage() {
  const { darkMode, getBrandPrimary, getBrandSecondary } = useThemeContext();
  const primaryColor = getBrandPrimary?.() || '#064789';
  const secondaryColor = getBrandSecondary?.() || '#427aa1';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [statisticsData, setStatisticsData] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [dashboard, statistics, users] = await Promise.all([
        adminApi.dashboard(),
        adminApi.statistics(),
        adminApi.activeUsers({ page: 1, limit: 20 }),
      ]);
      setDashboardData(dashboard);
      setStatisticsData(statistics);
      setActiveUsers(users.items || []);
      setError(null);
    } catch (err) {
      setError(err?.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Prepare chart data
  const planData = statisticsData?.businessesBySubscriptionPlan
    ? Object.entries(statisticsData.businessesBySubscriptionPlan).map(([name, value]) => ({
        name,
        value,
      }))
    : [];

  const statusData = statisticsData?.businessesByStatus
    ? Object.entries(statisticsData.businessesByStatus).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }))
    : [];

  // Colors for pie chart – use brand colors plus some variants
  const COLORS = [
    primaryColor,
    secondaryColor,
    darkMode ? '#60a5fa' : '#3b82f6',
    darkMode ? '#f87171' : '#ef4444',
    darkMode ? '#34d399' : '#10b981',
  ];

  if (loading) {
    return (
      <PageContainer title="Platform Dashboard" subtitle="Loading overview...">
        <div className="flex h-96 items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
            <p className="text-sm text-[var(--color-text-secondary)]">Loading dashboard...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Platform Dashboard" subtitle="Error loading data">
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={fetchData}
            className="rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Retry
          </button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Platform Dashboard"
      subtitle="Overview of tenants, subscriptions, revenue, and platform-wide activity."
      actions={
        <button
          type="button"
          onClick={fetchData}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition hover:bg-[var(--color-panel-strong)] disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      }
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        <KpiCard
          icon={Building2}
          label="Total Businesses"
          value={dashboardData?.totalBusinesses}
          color={primaryColor}
        />
        <KpiCard
          icon={CheckCircle}
          label="Active Businesses"
          value={dashboardData?.activeBusinesses}
          color={secondaryColor}
        />
        <KpiCard
          icon={Clock}
          label="Expired Subscriptions"
          value={dashboardData?.expiredSubscriptions}
          color="#f59e0b"
        />
        <KpiCard
          icon={Users}
          label="Active Users"
          value={dashboardData?.activeUsers}
          color="#3b82f6"
        />
        <KpiCard
          icon={Receipt}
          label="Total Invoices"
          value={dashboardData?.totalSalesInvoicesGenerated}
          color="#8b5cf6"
        />
        <KpiCard
          icon={DollarSign}
          label="Platform Revenue"
          value={formatCurrency(dashboardData?.platformRevenue)}
          color="#10b981"
        />
        <KpiCard
          icon={TrendingUp}
          label="New Registrations"
          value={dashboardData?.newRegistrations}
          color="#ec4899"
        />
        <KpiCard
          icon={AlertCircle}
          label="System Health"
          value={dashboardData?.systemHealth?.status === 'ok' ? 'Healthy' : 'Issues'}
          color={dashboardData?.systemHealth?.status === 'ok' ? '#10b981' : '#ef4444'}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 py-5">
        {/* Doughnut Chart: Businesses by Status */}
        <div className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">Businesses by Status</h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-[var(--color-text-secondary)]">No data available</p>
          )}
        </div>

        {/* Bar Chart: Businesses by Subscription Plan */}
        <div className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">Businesses by Plan</h3>
          {planData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={planData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                <XAxis dataKey="name" tick={{ fill: 'var(--color-text-secondary)' }} />
                <YAxis tick={{ fill: 'var(--color-text-secondary)' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill={primaryColor} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-[var(--color-text-secondary)]">No data available</p>
          )}
        </div>
      </div>

      {/* Active Users Table */}
      <div className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-5 shadow-sm">
        <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Recently Active Users</h3>
          <span className="text-sm text-[var(--color-text-secondary)]">Last 20 active users</span>
        </div>
        {activeUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-panel-border)] text-[var(--color-text-secondary)]">
                  <th className="pb-2 pr-4 font-medium">User</th>
                  <th className="pb-2 pr-4 font-medium">Business</th>
                  <th className="pb-2 pr-4 font-medium">Role</th>
                  <th className="pb-2 pr-4 font-medium">Last Login</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {activeUsers.map((user) => (
                  <tr key={user.id} className="border-b border-[var(--color-panel-border)] last:border-0">
                    <td className="py-3 pr-4 font-medium text-[var(--color-text-primary)]">{user.userName}</td>
                    <td className="py-3 pr-4 text-[var(--color-text-secondary)]">{user.business}</td>
                    <td className="py-3 pr-4 text-[var(--color-text-secondary)]">{user.role}</td>
                    <td className="py-3 pr-4 text-[var(--color-text-secondary)]">
                      {new Date(user.lastLogin).toLocaleDateString()}
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          user.accountStatus === 'active'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            user.accountStatus === 'active' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        {user.accountStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-8 text-center text-[var(--color-text-secondary)]">No active users found</p>
        )}
      </div>
    </PageContainer>
  );
}

export default AdminDashboardPage;