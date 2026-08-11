import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  BarChart3,
  BadgeDollarSign,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Package,
  RefreshCw,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  Warehouse,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { dashboardApi } from '../../api/index.js'
import PageContainer from '../../layouts/PageContainer.jsx'
import { useThemeContext } from '../../context/ThemeContext.jsx'
import { navigateTo } from '../../utils/navigation.js'

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'TZS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0))
}

function MetricCard({ icon: Icon, label, value, color, loading, subtitle }) {
  return (
    <motion.div whileHover={{ y: -4 }} className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-5 shadow-sm transition-all duration-300 hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">{label}</p>
          {loading ? (
            <div className="mt-2 h-8 w-24 animate-pulse rounded bg-[var(--color-panel-border)]" />
          ) : (
            <p className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
          )}
          {subtitle && !loading && <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{subtitle}</p>}
        </div>
        <div className="rounded-xl p-2.5" style={{ backgroundColor: `${color}20`, color }}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  )
}

function StatPill({ label, value, tone = 'blue' }) {
  const tones = {
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-[var(--color-panel-border)] px-3 py-2">
      <span className="text-xs text-[var(--color-text-secondary)]">{label}</span>
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone] || tones.blue}`}>{value}</span>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel-strong)] p-3 shadow-lg backdrop-blur-xl">
      <p className="text-sm font-medium text-[var(--color-text-primary)]">{label}</p>
      <p className="text-sm text-[var(--color-text-secondary)]">{formatCurrency(payload[0].value)}</p>
    </div>
  )
}

export function StaffDashboardPage() {
  const { darkMode, getBrandPrimary, getBrandSecondary } = useThemeContext()
  const primaryColor = getBrandPrimary?.() || '#064789'
  const secondaryColor = getBrandSecondary?.() || '#427aa1'

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [summary, setSummary] = useState(null)
  const [todaySales, setTodaySales] = useState(null)
  const [recentInvoices, setRecentInvoices] = useState([])
  const [lowStockItems, setLowStockItems] = useState([])
  const [bestSellingProducts, setBestSellingProducts] = useState([])

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true)
      setError(null)
      const [summaryData, todaySalesData, invoicesData, lowStockData, bestSellingData] = await Promise.all([
        dashboardApi.summary(),
        dashboardApi.todaySales(),
        dashboardApi.recentInvoices(),
        dashboardApi.lowStock(),
        dashboardApi.bestSellingProducts(),
      ])

      setSummary(summaryData)
      setTodaySales(todaySalesData)
      setRecentInvoices(Array.isArray(invoicesData?.items) ? invoicesData.items : [])
      setLowStockItems(Array.isArray(lowStockData?.items) ? lowStockData.items : [])
      setBestSellingProducts(Array.isArray(bestSellingData?.items) ? bestSellingData.items : [])
    } catch (err) {
      setError(err?.message || 'Failed to load staff dashboard data.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const salesSummaryData = useMemo(() => {
    const source = summary?.salesSummary || {}
    return Object.entries(source).map(([period, data]) => ({
      period: period.charAt(0).toUpperCase() + period.slice(1),
      revenue: Number(data?.revenue ?? 0),
      count: Number(data?.count ?? 0),
    }))
  }, [summary])

  const businessStats = summary?.businessStatistics || {}
  const systemData = useMemo(
    () => [
      { name: 'Products', value: Number(businessStats.products ?? 0) },
      { name: 'Customers', value: Number(businessStats.customers ?? 0) },
      { name: 'Vendors', value: Number(businessStats.vendors ?? 0) },
      { name: 'Users', value: Number(businessStats.activeUsers ?? 0) },
    ],
    [businessStats],
  )

  const todayRevenue = Number(todaySales?.revenue ?? summary?.todaySales?.revenue ?? 0)
  const todayCount = Number(todaySales?.count ?? summary?.todaySales?.count ?? 0)
  const monthRevenue = Number(summary?.monthlySales?.revenue ?? 0)
  const inventoryValue = Number(businessStats.inventoryValue ?? 0)
  const lowStockCount = lowStockItems.length

  const COLORS = [primaryColor, secondaryColor, '#8b5cf6', '#f59e0b']

  if (loading) {
    return (
      <PageContainer title="Staff Dashboard" subtitle="Loading your workspace...">
        <div className="flex h-96 items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
            <p className="text-sm text-[var(--color-text-secondary)]">Preparing your staff overview...</p>
          </div>
        </div>
      </PageContainer>
    )
  }

  if (error) {
    return (
      <PageContainer title="Staff Dashboard" subtitle="Error loading data">
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button type="button" onClick={fetchData} className="rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
            Retry
          </button>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer
      title="Staff Dashboard"
      subtitle="Your daily workspace for sales, stock, and customer activity."
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
      <div className="relative overflow-hidden rounded-3xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-6 shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(6,71,137,0.14),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(66,122,161,0.12),transparent_35%)]" />
        <div className="relative grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-panel-border)] bg-[var(--color-panel-strong)]/70 px-3 py-1 text-xs font-semibold text-[var(--color-text-secondary)]">
              <Sparkles className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
              Staff command center
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
                Run today’s work with fewer clicks.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
                Keep an eye on today’s sales, stock pressure, and the latest invoices without leaving the dashboard.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => navigateTo('/invoices')} className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
                <ShoppingCart className="h-4 w-4" />
                Open Invoices
              </button>
              <button type="button" onClick={() => navigateTo('/inventory')} className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel-strong)]/70 px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition hover:bg-[var(--color-panel-strong)]">
                <Warehouse className="h-4 w-4" />
                Review Stock
              </button>
              <button type="button" onClick={() => navigateTo('/customers')} className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel-strong)]/70 px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition hover:bg-[var(--color-panel-strong)]">
                <Users className="h-4 w-4" />
                Customers
              </button>
            </div>
          </div>

          <div className="grid gap-3 rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel-strong)]/70 p-4 backdrop-blur-xl">
            <StatPill label="Today Sales" value={formatCurrency(todayRevenue)} tone="emerald" />
            <StatPill label="Today Invoices" value={todayCount.toLocaleString()} tone="blue" />
            <StatPill label="Month Revenue" value={formatCurrency(monthRevenue)} tone="amber" />
            <StatPill label="Low Stock" value={lowStockCount.toLocaleString()} tone="rose" />
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={ShoppingCart} label="Today Sales" value={todayCount} color={primaryColor} loading={loading} subtitle={formatCurrency(todayRevenue)} />
        <MetricCard icon={TrendingUp} label="Monthly Revenue" value={formatCurrency(monthRevenue)} color={secondaryColor} loading={loading} subtitle="Current month performance" />
        <MetricCard icon={Package} label="Low Stock Items" value={lowStockCount} color="#f59e0b" loading={loading} subtitle="Needs restocking" />
        <MetricCard icon={CircleDollarSign} label="Inventory Value" value={formatCurrency(inventoryValue)} color="#8b5cf6" loading={loading} subtitle="Estimated business stock value" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Sales Overview</h3>
              <p className="text-sm text-[var(--color-text-secondary)]">Revenue trends across time ranges.</p>
            </div>
            <BarChart3 className="h-5 w-5 text-[var(--brand-primary)]" />
          </div>
          {salesSummaryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={salesSummaryData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                <XAxis dataKey="period" tick={{ fill: 'var(--color-text-secondary)' }} />
                <YAxis tick={{ fill: 'var(--color-text-secondary)' }} tickFormatter={(value) => `TZS ${(Number(value) / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" fill={primaryColor} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-10 text-center text-sm text-[var(--color-text-secondary)]">No sales summary data available yet.</p>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Business Snapshot</h3>
              <p className="text-sm text-[var(--color-text-secondary)]">A quick glance at your workspace.</p>
            </div>
            <BadgeDollarSign className="h-5 w-5 text-[var(--brand-primary)]" />
          </div>
          <div className="grid gap-3">
            <StatPill label="Products" value={Number(businessStats.products ?? 0).toLocaleString()} tone="blue" />
            <StatPill label="Customers" value={Number(businessStats.customers ?? 0).toLocaleString()} tone="emerald" />
            <StatPill label="Vendors" value={Number(businessStats.vendors ?? 0).toLocaleString()} tone="amber" />
            <StatPill label="Active Users" value={Number(businessStats.activeUsers ?? 0).toLocaleString()} tone="rose" />
          </div>
          <div className="mt-5 h-px bg-[var(--color-panel-border)]" />
          <div className="mt-5">
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-text-tertiary)]">Inventory Split</h4>
            {systemData.some((item) => item.value > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={systemData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={84} paddingAngle={4}>
                    {systemData.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-10 text-center text-sm text-[var(--color-text-secondary)]">No business stats yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Recent Invoices</h3>
              <p className="text-sm text-[var(--color-text-secondary)]">Latest customer billing activity.</p>
            </div>
            <Clock3 className="h-5 w-5 text-[var(--brand-primary)]" />
          </div>
          {recentInvoices.length ? (
            <div className="space-y-3">
              {recentInvoices.map((invoice) => (
                <button
                  key={invoice.id}
                  type="button"
                  onClick={() => navigateTo(`/invoices/${invoice.id}`)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--color-panel-border)] px-4 py-3 text-left transition hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[var(--color-text-primary)]">{invoice.invoiceNumber}</p>
                    <p className="truncate text-xs text-[var(--color-text-secondary)]">{invoice.customer}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">{formatCurrency(invoice.amount)}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{invoice.status}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-[var(--color-text-secondary)]">No recent invoices yet.</p>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Low Stock Watch</h3>
              <p className="text-sm text-[var(--color-text-secondary)]">Items that need restocking soon.</p>
            </div>
            <AlertCircle className="h-5 w-5 text-amber-500" />
          </div>
          {lowStockItems.length ? (
            <div className="space-y-3">
              {lowStockItems.slice(0, 6).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateTo('/inventory')}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--color-panel-border)] px-4 py-3 text-left transition hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[var(--color-text-primary)]">{item.productName}</p>
                    <p className="truncate text-xs text-[var(--color-text-secondary)]">{item.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-rose-500">{Number(item.currentStock ?? 0).toLocaleString()}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">Min {Number(item.minimumStock ?? 0).toLocaleString()}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-[var(--color-text-secondary)]">No low stock items right now.</p>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Top Selling Products</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">What is moving fastest in the business.</p>
          </div>
          <ChevronRight className="h-5 w-5 text-[var(--color-text-tertiary)]" />
        </div>
        {bestSellingProducts.length ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {bestSellingProducts.slice(0, 6).map((item, index) => (
              <div key={item.productId || item.productName || index} className="rounded-xl border border-[var(--color-panel-border)] px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--color-text-primary)]">{item.productName}</p>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">#{index + 1} best seller</p>
                  </div>
                  <div className="rounded-lg bg-[var(--brand-primary)]/10 px-2 py-1 text-xs font-semibold text-[var(--brand-primary)]">
                    {Number(item.quantitySold ?? 0).toLocaleString()} sold
                  </div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-[var(--color-panel-border)]">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${Math.min(100, 30 + index * 12)}%`,
                      background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`,
                    }}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                  <span>Revenue</span>
                  <span className="font-semibold text-[var(--color-text-primary)]">{formatCurrency(item.revenueGenerated)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-[var(--color-text-secondary)]">No best-seller data available yet.</p>
        )}
      </div>
    </PageContainer>
  )
}

export default StaffDashboardPage
