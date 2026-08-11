import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw,
  Calendar,
  TrendingUp,
  DollarSign,
  Package,
  Users,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  Filter,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { reportsApi } from '../../api/index.js';
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
        {payload.map((p, i) => (
          <p key={i} className="text-sm text-[var(--color-text-secondary)]">
            {p.name}: {typeof p.value === 'number' ? formatCurrency(p.value) : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Status badge
function StatusBadge({ status }) {
  const map = {
    paid: { label: 'Paid', color: 'emerald' },
    posted: { label: 'Posted', color: 'blue' },
    partially_paid: { label: 'Partially Paid', color: 'yellow' },
    cancelled: { label: 'Cancelled', color: 'rose' },
    draft: { label: 'Draft', color: 'gray' },
  };
  const { label, color } = map[status?.toLowerCase()] || { label: status, color: 'gray' };
  const colorClasses = {
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    yellow: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    gray: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClasses[color]}`}>
      <span className={`h-1.5 w-1.5 rounded-full bg-${color}-500`} />
      {label}
    </span>
  );
}

// ---------- Main Component ----------
export function ReportsPage() {
  const { darkMode, getBrandPrimary, getBrandSecondary } = useThemeContext();
  const primaryColor = getBrandPrimary?.() || '#064789';
  const secondaryColor = getBrandSecondary?.() || '#427aa1';

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Report data
  const [dailySales, setDailySales] = useState(null);
  const [monthlySales, setMonthlySales] = useState(null);
  const [annualSales, setAnnualSales] = useState(null);
  const [productReports, setProductReports] = useState([]);
  const [inventoryReports, setInventoryReports] = useState(null);
  const [invoiceReports, setInvoiceReports] = useState([]);
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [salesTrends, setSalesTrends] = useState([]);

  // Filters
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth() + 1);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [invoiceStatus, setInvoiceStatus] = useState('');
  const [trendDateFrom, setTrendDateFrom] = useState(
    new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().split('T')[0]
  );
  const [trendDateTo, setTrendDateTo] = useState(new Date().toISOString().split('T')[0]);

  // ---------- Data fetching ----------
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const results = await Promise.allSettled([
        reportsApi.dailySales({ date: dateFilter }),
        reportsApi.monthlySales({ year: yearFilter, month: monthFilter }),
        reportsApi.annualSales({ year: yearFilter }),
        reportsApi.productReports(),
        reportsApi.inventoryReports(),
        reportsApi.invoiceReports({
          status: invoiceStatus || undefined,
          dateFrom: trendDateFrom,
          dateTo: trendDateTo,
        }),
        reportsApi.salesTrends({
          dateFrom: trendDateFrom,
          dateTo: trendDateTo,
        }),
      ]);

      const [daily, monthly, annual, products, inventory, invoices, trends] = results;

      if (daily.status === 'fulfilled') setDailySales(daily.value);
      if (monthly.status === 'fulfilled') setMonthlySales(monthly.value);
      if (annual.status === 'fulfilled') setAnnualSales(annual.value);
      if (products.status === 'fulfilled') setProductReports(products.value.items || []);
      if (inventory.status === 'fulfilled') setInventoryReports(inventory.value);
      if (invoices.status === 'fulfilled') {
        setInvoiceReports(invoices.value.items || []);
        setInvoiceTotal(invoices.value.total || 0);
      }
      if (trends.status === 'fulfilled') setSalesTrends(trends.value.items || []);

      const firstError = results.find((result) => result.status === 'rejected');
      if (firstError) {
        console.warn('Some report sections failed to load', firstError.reason);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load reports.');
    } finally {
      setLoading(false);
    }
  }, [dateFilter, monthFilter, yearFilter, invoiceStatus, trendDateFrom, trendDateTo]);

  const refreshAll = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---------- Prepare chart data ----------
  const trendData = salesTrends.map((item) => ({
    ...item,
    month: item.label,
  }));

  const productChartData = productReports.slice(0, 10).map((item) => ({
    name: item.productName,
    value: item.revenue,
  }));

  const COLORS = [primaryColor, secondaryColor, '#8b5cf6', '#f59e0b, #3b82f6'];

  // ---------- Render ----------
  return (
    <PageContainer
      title="Reports"
      subtitle="Open reporting dashboards for sales, customers, products, and inventory."
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
      {/* Filters */}
      <div className="flex flex-wrap gap-3 rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[var(--color-text-tertiary)]" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-9 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[var(--color-text-tertiary)]" />
          <input
            type="number"
            value={yearFilter}
            onChange={(e) => setYearFilter(Number(e.target.value))}
            className="h-9 w-20 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--color-text-secondary)]">Month:</span>
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(Number(e.target.value))}
            className="h-9 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {new Date(2026, m - 1).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--color-text-secondary)]">Invoice Status:</span>
          <select
            value={invoiceStatus}
            onChange={(e) => setInvoiceStatus(e.target.value)}
            className="h-9 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
          >
            <option value="">All</option>
            <option value="paid">Paid</option>
            <option value="posted">Posted</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="cancelled">Cancelled</option>
            <option value="draft">Draft</option>
          </select>
        </div>
        <div className="flex items-center gap-2 ml-auto text-sm text-[var(--color-text-secondary)]">
          <span>From:</span>
          <input
            type="date"
            value={trendDateFrom}
            onChange={(e) => setTrendDateFrom(e.target.value)}
            className="h-9 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
          />
          <span>To:</span>
          <input
            type="date"
            value={trendDateTo}
            onChange={(e) => setTrendDateTo(e.target.value)}
            className="h-9 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
          />
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={fetchData}
            className="mt-4 rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Retry
          </button>
        </div>
      )}

      {!error && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-5">
            <KpiCard
              icon={TrendingUp}
              label="Daily Sales"
              value={formatCurrency(dailySales?.revenue)}
              color={primaryColor}
              loading={loading}
              subtitle={`${dailySales?.count || 0} invoices`}
            />
            <KpiCard
              icon={DollarSign}
              label="Monthly Revenue"
              value={formatCurrency(monthlySales?.revenue)}
              color={secondaryColor}
              loading={loading}
              subtitle={`${monthlySales?.count || 0} invoices`}
            />
            <KpiCard
              icon={Calendar}
              label="Annual Revenue"
              value={formatCurrency(annualSales?.revenue)}
              color="#8b5cf6"
              loading={loading}
              subtitle={`${annualSales?.count || 0} invoices`}
            />
            <KpiCard
              icon={FileText}
              label="Total Invoices"
              value={invoiceTotal}
              color="#f59e0b"
              loading={loading}
              subtitle={`${invoiceReports.length} in current filter`}
            />
          </div><br/>

          {/* Sales Trend Chart */}
          <div className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-5 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">
              Sales Trend
            </h3>
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
              </div>
            ) : trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                  <XAxis dataKey="month" tick={{ fill: 'var(--color-text-secondary)' }} />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} tick={{ fill: 'var(--color-text-secondary)' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="revenue" stroke={primaryColor} strokeWidth={2} dot={{ fill: primaryColor }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-[var(--color-text-secondary)]">No sales trend data available.</p>
            )}
          </div>

          {/* Two columns: Top Products and Inventory */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 p-5">
            {/* Top Products */}
            <div className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-5 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">
                Top Selling Products
              </h3>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-10 animate-pulse rounded bg-[var(--color-panel-border)]" />
                  ))}
                </div>
              ) : productChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={productChartData.slice(0, 6)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {productChartData.slice(0, 6).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-8 text-center text-[var(--color-text-secondary)]">No product data available.</p>
              )}
            </div>

            {/* Inventory Status */}
            <div className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-5 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">
                Inventory Status
              </h3>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-10 animate-pulse rounded bg-[var(--color-panel-border)]" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="mb-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-3 text-center">
                      <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                        {inventoryReports?.currentStockLevels?.length || 0}
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)]">Total Products</p>
                    </div>
                    <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-center">
                      <p className="text-2xl font-bold text-rose-500">
                        {inventoryReports?.lowStockItems?.length || 0}
                      </p>
                      <p className="text-xs text-rose-500">Low Stock Items</p>
                    </div>
                  </div>
                  {inventoryReports?.lowStockItems?.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {inventoryReports.lowStockItems.slice(0, 5).map((item) => (
                        <div key={item.id} className="flex items-center justify-between rounded-xl border border-rose-500/20 bg-rose-500/5 p-2">
                          <span className="text-sm font-medium text-[var(--color-text-primary)]">
                            {item.productName}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-rose-500 font-semibold">
                              {item.currentStock} / {item.minimumStock}
                            </span>
                            <AlertCircle className="h-4 w-4 text-rose-500" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {inventoryReports?.lowStockItems?.length === 0 && (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
                      <CheckCircle className="h-5 w-5 text-emerald-500" />
                      <p className="text-sm text-emerald-600 dark:text-emerald-400">
                        All stock levels are healthy!
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Invoice Reports Table */}
          <div className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-5 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">
              Recent Invoices
            </h3>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded bg-[var(--color-panel-border)]" />
                ))}
              </div>
            ) : invoiceReports.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-[var(--color-panel-border)] text-[var(--color-text-secondary)]">
                    <tr>
                      <th className="pb-2 pr-4 font-medium">Invoice #</th>
                      <th className="pb-2 pr-4 font-medium">Customer</th>
                      <th className="pb-2 pr-4 font-medium">Amount</th>
                      <th className="pb-2 pr-4 font-medium">Status</th>
                      <th className="pb-2 pr-4 font-medium">Payment Method</th>
                      <th className="pb-2 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceReports.slice(0, 10).map((inv) => (
                      <tr key={inv.id} className="border-b border-[var(--color-panel-border)] last:border-0">
                        <td className="py-2 pr-4 font-mono text-xs text-[var(--color-text-primary)]">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-2 pr-4 text-[var(--color-text-secondary)]">{inv.customer}</td>
                        <td className="py-2 pr-4 text-[var(--color-text-secondary)]">
                          {formatCurrency(inv.amount)}
                        </td>
                        <td className="py-2 pr-4">
                          <StatusBadge status={inv.status} />
                        </td>
                        <td className="py-2 pr-4 text-[var(--color-text-secondary)] capitalize">
                          {inv.paymentMethod || '-'}
                        </td>
                        <td className="py-2 text-[var(--color-text-secondary)]">
                          {inv.date ? new Date(inv.date).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {invoiceReports.length > 10 && (
                  <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
                    Showing 10 of {invoiceReports.length} invoices
                  </p>
                )}
              </div>
            ) : (
              <p className="py-8 text-center text-[var(--color-text-secondary)]">No invoices found.</p>
            )}
          </div>
        </>
      )}
    </PageContainer>
  );
}

export default ReportsPage;
