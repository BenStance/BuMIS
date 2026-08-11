import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  Package,
  Users,
  Truck,
  DollarSign,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { dashboardApi } from '../../api/index.js';
import PageContainer from '../../layouts/PageContainer.jsx';
import { useThemeContext } from '../../context/ThemeContext.jsx';

// Helper: format currency (TZS)
const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'TZS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// KPI Card Component
function KpiCard({ icon: Icon, label, value, color, loading, subtitle }) {
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
          {subtitle && !loading && (
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{subtitle}</p>
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

// ---------- Main Component ----------
export function BusinessDashboardPage() {
  const { darkMode, getBrandPrimary, getBrandSecondary } = useThemeContext();
  const primaryColor = getBrandPrimary?.() || '#064789';
  const secondaryColor = getBrandSecondary?.() || '#427aa1';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState(null);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [bestSelling, setBestSelling] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);
      const [summaryData, invoicesData, lowStockData, bestSellingData] = await Promise.all([
        dashboardApi.summary(),
        dashboardApi.recentInvoices(),
        dashboardApi.lowStock(),
        dashboardApi.bestSellingProducts(),
      ]);
      setSummary(summaryData);
      setRecentInvoices(invoicesData.items || []);
      setLowStockItems(lowStockData.items || []);
      setBestSelling(bestSellingData.items || []);
    } catch (err) {
      setError(err?.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Prepare sales summary data for chart
  const salesSummaryData = summary?.salesSummary
    ? Object.entries(summary.salesSummary).map(([period, data]) => ({
        period: period.charAt(0).toUpperCase() + period.slice(1),
        revenue: data.revenue || 0,
        count: data.count || 0,
      }))
    : [];

  // Prepare business statistics for pie chart
  const statsData = summary?.businessStatistics
    ? [
        { name: 'Products', value: summary.businessStatistics.products || 0 },
        { name: 'Customers', value: summary.businessStatistics.customers || 0 },
        { name: 'Vendors', value: summary.businessStatistics.vendors || 0 },
        { name: 'Active Users', value: summary.businessStatistics.activeUsers || 0 },
      ]
    : [];

  const COLORS = [primaryColor, secondaryColor, '#8b5cf6', '#f59e0b'];

  if (loading && !refreshing) {
    return (
      <PageContainer title="Business Dashboard" subtitle="Loading your business overview...">
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
      <PageContainer title="Business Dashboard" subtitle="Error loading data">
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
      title="Business Dashboard"
      subtitle="Overview of your business performance, sales, inventory, and activity."
      actions={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={fetchData}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition hover:bg-[var(--color-panel-strong)] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      }
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 pb-5">
        <KpiCard
          icon={ShoppingCart}
          label="Today's Sales"
          value={summary?.todaySales?.count}
          color={primaryColor}
          loading={loading}
          subtitle={formatCurrency(summary?.todaySales?.revenue)}
        />
        <KpiCard
          icon={TrendingUp}
          label="Monthly Revenue"
          value={formatCurrency(summary?.monthlySales?.revenue)}
          color={secondaryColor}
          loading={loading}
          subtitle={`${summary?.monthlySales?.invoiceCount} invoices`}
        />
        <KpiCard
          icon={Package}
          label="Total Products"
          value={summary?.businessStatistics?.products}
          color="#8b5cf6"
          loading={loading}
        />
        <KpiCard
          icon={Users}
          label="Total Customers"
          value={summary?.businessStatistics?.customers}
          color="#3b82f6"
          loading={loading}
        />
      </div>

      {/* Sales Summary Chart */}
      <div className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">
          Sales Summary (Revenue)
        </h3>
        {salesSummaryData.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={salesSummaryData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
              <XAxis dataKey="period" tick={{ fill: 'var(--color-text-secondary)' }} />
              <YAxis tickFormatter={(value) => `TZS ${(value / 1000).toFixed(0)}k`} tick={{ fill: 'var(--color-text-secondary)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" fill={primaryColor} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-8 text-center text-[var(--color-text-secondary)]">No sales data available.</p>
        )}
      </div>

      {/* Bottom two columns: Best Sellers and Business Stats */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 pt-5">
        {/* Best Selling Products */}
        <div className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">
            Best Selling Products
          </h3>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-[var(--color-panel-border)]" />
              ))}
            </div>
          ) : bestSelling.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[var(--color-panel-border)] text-[var(--color-text-secondary)]">
                  <tr>
                    <th className="pb-2 pr-4 font-medium">Product</th>
                    <th className="pb-2 pr-4 font-medium text-right">Qty Sold</th>
                    <th className="pb-2 font-medium text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {bestSelling.slice(0, 5).map((item) => (
                    <tr key={item.productId} className="border-b border-[var(--color-panel-border)] last:border-0">
                      <td className="py-2 pr-4 font-medium text-[var(--color-text-primary)]">
                        {item.productName}
                      </td>
                      <td className="py-2 pr-4 text-right text-[var(--color-text-secondary)]">
                        {item.quantitySold}
                      </td>
                      <td className="py-2 text-right text-[var(--color-text-secondary)]">
                        {formatCurrency(item.revenueGenerated)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-[var(--color-text-secondary)]">No best-selling data yet.</p>
          )}
        </div>

        {/* Business Statistics - Pie Chart */}
        <div className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] pt-5 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">
            Business Composition
          </h3>
          {loading ? (
            <div className="flex h-56 items-center justify-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
            </div>
          ) : statsData.length > 0 && statsData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={statsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {statsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-[var(--color-text-secondary)]">No statistics available.</p>
          )}
        </div>
      </div><br/>

      {/* Recent Invoices */}
      <div className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">
          Recent Invoices
        </h3>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-[var(--color-panel-border)]" />
            ))}
          </div>
        ) : recentInvoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--color-panel-border)] text-[var(--color-text-secondary)]">
                <tr>
                  <th className="pb-2 pr-4 font-medium">Invoice #</th>
                  <th className="pb-2 pr-4 font-medium">Customer</th>
                  <th className="pb-2 pr-4 font-medium">Amount</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.slice(0, 5).map((inv) => (
                  <tr key={inv.id} className="border-b border-[var(--color-panel-border)] last:border-0">
                    <td className="py-2 pr-4 font-mono text-xs text-[var(--color-text-primary)]">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-2 pr-4 text-[var(--color-text-secondary)]">{inv.customer}</td>
                    <td className="py-2 pr-4 text-[var(--color-text-secondary)]">
                      {formatCurrency(inv.amount)}
                    </td>
                    <td className="py-2 pr-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          inv.status === 'paid'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {inv.status === 'paid' ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-2 text-[var(--color-text-secondary)]">
                      {new Date(inv.date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-8 text-center text-[var(--color-text-secondary)]">No recent invoices.</p>
        )}
      </div><br/>

      {/* Low Stock Alerts */}
      <div className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-5 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--color-text-primary)]">
          <AlertCircle className="h-5 w-5 text-rose-500" />
          Low Stock Alerts
        </h3>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-[var(--color-panel-border)]" />
            ))}
          </div>
        ) : lowStockItems.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--color-panel-border)] text-[var(--color-text-secondary)]">
                <tr>
                  <th className="pb-2 pr-4 font-medium">Product</th>
                  <th className="pb-2 pr-4 font-medium">SKU</th>
                  <th className="pb-2 pr-4 font-medium">Current Stock</th>
                  <th className="pb-2 font-medium">Minimum Stock</th>
                </tr>
              </thead>
              <tbody>
                {lowStockItems.map((item) => (
                  <tr key={item.id} className="border-b border-[var(--color-panel-border)] last:border-0">
                    <td className="py-2 pr-4 font-medium text-[var(--color-text-primary)]">
                      {item.productName}
                    </td>
                    <td className="py-2 pr-4 text-[var(--color-text-secondary)]">{item.sku}</td>
                    <td className="py-2 pr-4 text-rose-500 font-semibold">
                      {item.currentStock}
                    </td>
                    <td className="py-2 text-[var(--color-text-secondary)]">{item.minimumStock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-4 text-sm text-emerald-600 dark:text-emerald-400">
            All stock levels are healthy.
          </p>
        )}
      </div>
    </PageContainer>
  );
}

export default BusinessDashboardPage;