import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, Building2, Filter, LogIn, RefreshCw, Search, Shield, Sparkles, Users } from 'lucide-react'
import PageContainer from '../../layouts/PageContainer.jsx'
import { adminApi } from '../../api/index.js'
import { navigateTo } from '../../utils/navigation.js'
import { setAccessToken, setCurrentUser, setRefreshToken } from '../../utils/storage.js'
import { useThemeContext } from '../../context/ThemeContext.jsx'

function MetricCard({ icon: Icon, label, value, color, loading }) {
  return (
    <motion.div whileHover={{ y: -4 }} className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-5 shadow-sm transition-all duration-300 hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">{label}</p>
          {loading ? (
            <div className="mt-2 h-8 w-20 animate-pulse rounded bg-[var(--color-panel-border)]" />
          ) : (
            <p className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">{typeof value === 'number' ? value.toLocaleString() : value}</p>
          )}
        </div>
        <div className="rounded-xl p-2.5" style={{ backgroundColor: `${color}20`, color }}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  )
}

function StatusBadge({ status }) {
  const normalized = String(status || '').toLowerCase()
  const tones = {
    active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    suspended: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    closed: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    expired: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    pending: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  }
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[normalized] || 'bg-gray-500/10 text-gray-600 dark:text-gray-400'}`}>{status || '-'}</span>
}

export function LoginAsBusinessPage() {
  const { getBrandPrimary, getBrandSecondary } = useThemeContext()
  const primaryColor = getBrandPrimary?.() || '#064789'
  const secondaryColor = getBrandSecondary?.() || '#427aa1'

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [businesses, setBusinesses] = useState([])
  const [impersonatingId, setImpersonatingId] = useState(null)

  const fetchBusinesses = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params = {
        page,
        limit: pageSize,
        search: search || undefined,
        status: statusFilter || undefined,
      }
      Object.keys(params).forEach((key) => {
        if (params[key] === undefined || params[key] === '') delete params[key]
      })

      const data = await adminApi.businesses(params)
      setBusinesses(Array.isArray(data?.items) ? data.items : [])
      setTotal(Number(data?.total ?? 0))
    } catch (err) {
      setError(err?.message || 'Failed to load businesses.')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, statusFilter])

  useEffect(() => {
    fetchBusinesses()
  }, [fetchBusinesses])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter])

  const totalPages = Math.ceil(total / pageSize)
  const startIndex = (page - 1) * pageSize

  const stats = useMemo(() => {
    return {
      active: businesses.filter((item) => String(item.currentStatus || '').toLowerCase() === 'active').length,
      suspended: businesses.filter((item) => String(item.currentStatus || '').toLowerCase() === 'suspended').length,
    }
  }, [businesses])

  const handleSearch = (event) => {
    event.preventDefault()
    setSearch(searchInput.trim())
    setPage(1)
  }

  const handleLoginAsBusiness = async (businessId) => {
    try {
      setImpersonatingId(businessId)
      const response = await adminApi.loginAsBusiness(businessId)
      if (!response?.accessToken || !response?.user) {
        throw new Error('Login as business did not return a valid session.')
      }

      setAccessToken(response.accessToken)
      if (response.refreshToken) {
        setRefreshToken(response.refreshToken)
      }
      setCurrentUser(response.user)
      window.dispatchEvent(new Event('storage'))
      navigateTo('/dashboard')
    } catch (err) {
      setError(err?.message || 'Failed to login as business.')
    } finally {
      setImpersonatingId(null)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchBusinesses()
    setRefreshing(false)
  }

  return (
    <PageContainer
      title="Login as Business"
      subtitle="Platform administrators can jump into a business-owner session for support and verification."
      actions={
        <button
          type="button"
          onClick={handleRefresh}
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
        <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-panel-border)] bg-[var(--color-panel-strong)]/70 px-3 py-1 text-xs font-semibold text-[var(--color-text-secondary)]">
              <Sparkles className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
              Impersonation mode
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
                Step into a business-owner session with one click.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
                Select a business to load its owner account, business context, and permissions. This page is restricted to platform administrators only.
              </p>
            </div>
            <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search business name or owner..."
                  className="h-11 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel-strong)]/70 pl-9 pr-4 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:border-[var(--brand-primary)] focus:outline-none"
                />
              </div>
              <button type="submit" className="rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
                Search
              </button>
            </form>
          </div>

          <div className="grid gap-3 rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel-strong)]/70 p-4 backdrop-blur-xl">
            <div className="flex items-center gap-3 rounded-xl border border-[var(--color-panel-border)] px-3 py-3">
              <Shield className="h-5 w-5 text-[var(--brand-primary)]" />
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">Admin only</p>
                <p className="text-xs text-[var(--color-text-secondary)]">Business owner session is created from a platform admin account.</p>
              </div>
            </div>
            <MetricCard icon={Building2} label="Businesses" value={total} color={primaryColor} loading={loading} />
            <MetricCard icon={Users} label="Active" value={stats.active} color={secondaryColor} loading={loading} />
            <MetricCard icon={AlertCircle} label="Suspended" value={stats.suspended} color="#f59e0b" loading={loading} />
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[var(--color-text-tertiary)]" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className="h-11 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
          >
            <option value="">All status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="closed">Closed</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button type="button" onClick={fetchBusinesses} className="mt-4 rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--color-panel-border)] text-[var(--color-text-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Business</th>
                  <th className="px-4 py-3 font-medium">Owner</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Subscription</th>
                  <th className="px-4 py-3 font-medium">Users</th>
                  <th className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: pageSize }).map((_, index) => (
                    <tr key={index} className="border-b border-[var(--color-panel-border)] last:border-0">
                      <td className="px-4 py-3"><div className="h-4 w-40 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-28 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-5 w-16 animate-pulse rounded-full bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-24 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-12 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3 text-right"><div className="ml-auto h-9 w-28 animate-pulse rounded-xl bg-[var(--color-panel-border)]" /></td>
                    </tr>
                  ))
                ) : businesses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-[var(--color-text-secondary)]">
                      No businesses match your filters.
                    </td>
                  </tr>
                ) : (
                  businesses.map((business) => (
                    <tr key={business.id} className="border-b border-[var(--color-panel-border)] last:border-0 hover:bg-black/5 dark:hover:bg-white/5">
                      <td className="px-4 py-3">
                        <div className="font-medium text-[var(--color-text-primary)]">{business.businessName}</div>
                        <div className="text-xs text-[var(--color-text-secondary)]">{business.registrationDate ? new Date(business.registrationDate).toLocaleDateString() : '-'}</div>
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{business.ownerName || '-'}</td>
                      <td className="px-4 py-3"><StatusBadge status={business.currentStatus} /></td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{business.subscriptionPlan || '-'}</td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{Number(business.activeUsers ?? 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleLoginAsBusiness(business.id)}
                          disabled={impersonatingId === business.id}
                          className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                        >
                          <LogIn className="h-4 w-4" />
                          {impersonatingId === business.id ? 'Switching...' : 'Login as Business'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 0 && (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-[var(--color-text-secondary)]">
                {startIndex + 1}–{Math.min(startIndex + pageSize, total)} of {total}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-[var(--color-panel-border)] px-3 py-2 text-sm text-[var(--color-text-primary)] transition hover:bg-[var(--color-panel-strong)] disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="text-sm text-[var(--color-text-secondary)]">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-[var(--color-panel-border)] px-3 py-2 text-sm text-[var(--color-text-primary)] transition hover:bg-[var(--color-panel-strong)] disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </PageContainer>
  )
}

export default LoginAsBusinessPage
