import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  RefreshCw,
  AlertCircle,
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
import PageContainer from '../..//layouts/PageContainer.jsx';
import { useThemeContext } from '../../context/ThemeContext.jsx';

// Helper: format currency
const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'TZS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// KPI Card (same as dashboard)
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
              {typeof value === 'number' && !isNaN(value) ? value.toLocaleString() : value}
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
          {typeof payload[0].value === 'number' 
            ? formatCurrency(payload[0].value) 
            : payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

export function RevenueAnalyticsPage() {
  const { darkMode, getBrandPrimary, getBrandSecondary } = useThemeContext();
  const primaryColor = getBrandPrimary?.() || '#064789';
  const secondaryColor = getBrandSecondary?.() || '#427aa1';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const data = await adminApi.revenue();
      setRevenueData(data);
      setError(null);
    } catch (err) {
      setError(err?.message || 'Failed to load revenue data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Prepare chart data
  const revenueByPlanData = revenueData?.revenueBySubscriptionPlan
    ? Object.entries(revenueData.revenueBySubscriptionPlan).map(([name, value]) => ({
        name,
        value,
      }))
    : [];

  const activeVsExpiredData = revenueData?.activeVsExpiredSubscriptions
    ? Object.entries(revenueData.activeVsExpiredSubscriptions).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }))
    : [];

  // Colors for pie chart
  const COLORS = [
    primaryColor,
    darkMode ? '#f87171' : '#ef4444',
  ];

  if (loading) {
    return (
      <PageContainer title="Revenue Analytics" subtitle="Loading revenue data...">
        <div className="flex h-96 items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
            <p className="text-sm text-[var(--color-text-secondary)]">Loading revenue insights...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Revenue Analytics" subtitle="Error loading data">
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
      title="Revenue Analytics"
      subtitle="Review platform revenue, plan performance, and subscription trends."
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={DollarSign}
          label="Monthly Revenue"
          value={formatCurrency(revenueData?.monthlySubscriptionRevenue)}
          color={primaryColor}
        />
        <KpiCard
          icon={Calendar}
          label="Annual Revenue"
          value={formatCurrency(revenueData?.annualRevenue)}
          color={secondaryColor}
        />
        <KpiCard
          icon={TrendingUp}
          label="Renewal Rate"
          value={`${((revenueData?.subscriptionRenewalRate || 0) * 100).toFixed(0)}%`}
          color="#10b981"
        />
        <KpiCard
          icon={AlertCircle}
          label="Active Subscriptions"
          value={revenueData?.activeVsExpiredSubscriptions?.active || 0}
          color="#3b82f6"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 py-5">
        {/* Bar Chart: Revenue by Plan */}
        <div className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">
            Revenue by Subscription Plan
          </h3>
          {revenueByPlanData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenueByPlanData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                <XAxis dataKey="name" tick={{ fill: 'var(--color-text-secondary)' }} />
                <YAxis tickFormatter={(value) => `$${value}`} tick={{ fill: 'var(--color-text-secondary)' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill={primaryColor} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-[var(--color-text-secondary)]">No revenue data available.</p>
          )}
        </div>

        {/* Doughnut Chart: Active vs Expired */}
        <div className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">
            Active vs Expired Subscriptions
          </h3>
          {activeVsExpiredData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={activeVsExpiredData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {activeVsExpiredData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-[var(--color-text-secondary)]">No subscription status data available.</p>
          )}
        </div>
      </div>

      {/* Additional stats if needed */}
      <div className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <h4 className="text-sm font-medium text-[var(--color-text-secondary)]">Total Active Subscriptions</h4>
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">
              {revenueData?.activeVsExpiredSubscriptions?.active || 0}
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-[var(--color-text-secondary)]">Total Expired Subscriptions</h4>
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">
              {revenueData?.activeVsExpiredSubscriptions?.expired || 0}
            </p>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

export default RevenueAnalyticsPage;