import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  RefreshCw,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Wallet,
  BadgeDollarSign,
  TrendingUp,
  Building2,
  CircleDollarSign,
  ReceiptText,
} from 'lucide-react'
import { ledgerApi } from '../../api/index.js'
import PageContainer from '../../layouts/PageContainer.jsx'
import { useThemeContext } from '../../context/ThemeContext.jsx'

function StatCard({ icon: Icon, label, value, color, loading }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-5 shadow-sm transition-all duration-300 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">{label}</p>
          {loading ? (
            <div className="mt-2 h-8 w-20 animate-pulse rounded bg-[var(--color-panel-border)]" />
          ) : (
            <p className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">{value}</p>
          )}
        </div>
        <div className="rounded-xl p-2.5" style={{ backgroundColor: `${color}20`, color }}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  )
}

function Badge({ children, tone = 'gray' }) {
  const tones = {
    gray: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    yellow: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  }
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone] || tones.gray}`}>{children}</span>
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'TZS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0))
}

export function LedgerPage() {
  const { getBrandPrimary, getBrandSecondary } = useThemeContext()
  const primaryColor = getBrandPrimary?.() || '#064789'
  const secondaryColor = getBrandSecondary?.() || '#427aa1'

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [entries, setEntries] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [customer, setCustomer] = useState('')
  const [transactionType, setTransactionType] = useState('')
  const [accountType, setAccountType] = useState('')

  const fetchLedger = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params = {
        page,
        limit: pageSize,
        invoiceNumber: invoiceNumber || undefined,
        customer: customer || undefined,
        transactionType: transactionType || undefined,
        accountType: accountType || undefined,
        search: search || undefined,
      }
      Object.keys(params).forEach((key) => {
        if (params[key] === undefined || params[key] === '') delete params[key]
      })
      
      const [accountsData, entriesData] = await Promise.all([
        ledgerApi.accounts(params),
        ledgerApi.entries(params),
      ])
      setAccounts(Array.isArray(accountsData) ? accountsData : accountsData?.items || [])
      setEntries(Array.isArray(entriesData?.items) ? entriesData.items : Array.isArray(entriesData) ? entriesData : [])
      setTotal(Number(entriesData?.total ?? (Array.isArray(entriesData) ? entriesData.length : 0)))
    } catch (err) {
      setError(err?.message || 'Failed to load ledger data.')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, invoiceNumber, customer, transactionType, accountType, search])

  const refreshAll = async () => {
    setRefreshing(true)
    await fetchLedger()
    setRefreshing(false)
  }

  useEffect(() => {
    fetchLedger()
  }, [fetchLedger])

  useEffect(() => {
    setPage(1)
  }, [search, invoiceNumber, customer, transactionType, accountType])

  const summary = useMemo(() => {
    const totalDebit = entries.reduce((sum, entry) => sum + Number(entry.debit ?? 0), 0)
    const totalCredit = entries.reduce((sum, entry) => sum + Number(entry.credit ?? 0), 0)
    const systemAccounts = accounts.filter((account) => account.isSystem).length
    return { totalDebit, totalCredit, systemAccounts }
  }, [entries, accounts])

  const invoiceOptions = useMemo(() => {
    const values = new Set()
    entries.forEach((entry) => {
      if (entry.invoice?.invoiceNumber) {
        values.add(entry.invoice.invoiceNumber)
      }
    })
    return Array.from(values).sort()
  }, [entries])

  const customerOptions = useMemo(() => {
    const values = new Set()
    entries.forEach((entry) => {
      if (entry.invoice?.customer?.fullName) {
        values.add(entry.invoice.customer.fullName)
      }
    })
    return Array.from(values).sort()
  }, [entries])

  const accountTypeOptions = useMemo(() => {
    const values = new Set()
    accounts.forEach((account) => {
      if (account.accountType) {
        values.add(account.accountType)
      }
    })
    return Array.from(values).sort()
  }, [accounts])

  const totalPages = Math.ceil(total / pageSize)
  const startIndex = (page - 1) * pageSize

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value))
    setPage(1)
  }

  const goToPage = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
    }
  }

  const handleSearch = () => {
    setSearch(searchInput)
    setPage(1)
  }

  const handleClear = () => {
    setSearchInput('')
    setSearch('')
    setInvoiceNumber('')
    setCustomer('')
    setTransactionType('')
    setAccountType('')
    setPage(1)
  }

  return (
    <PageContainer
      title="Ledger"
      subtitle="Track accounts, financial entries, and invoice postings with a business-level ledger view."
      actions={
        <button
          type="button"
          onClick={refreshAll}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition hover:bg-[var(--color-panel-strong)] disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={BookOpen} label="Ledger Entries" value={total.toLocaleString()} color={primaryColor} loading={loading} />
        <StatCard icon={Wallet} label="System Accounts" value={summary.systemAccounts.toLocaleString()} color={secondaryColor} loading={loading} />
        <StatCard icon={BadgeDollarSign} label="Total Debit" value={summary.totalDebit.toLocaleString()} color="#10b981" loading={loading} />
        <StatCard icon={TrendingUp} label="Total Credit" value={summary.totalCredit.toLocaleString()} color="#8b5cf6" loading={loading} />
      </div><br/>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <CircleDollarSign className="h-4 w-4 text-[var(--brand-primary)]" />
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Ledger Accounts</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {accounts.map((account) => (
              <div key={account.id} className="rounded-2xl border border-[var(--color-panel-border)] px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-text-tertiary)]">{account.code}</p>
                    <p className="mt-1 font-semibold text-[var(--color-text-primary)]">{account.name}</p>
                  </div>
                  <Badge tone={account.accountType === 'asset' ? 'emerald' : account.accountType === 'revenue' ? 'blue' : account.accountType === 'liability' ? 'rose' : 'yellow'}>
                    {String(account.accountType || '').toUpperCase()}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                  <span>{account.normalBalance || 'debit'} balance</span>
                  <span>{account.isSystem ? 'System' : 'Custom'}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                  <span>Filtered amount</span>
                  <span className={`font-semibold ${Number(account.filteredAmount ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {formatCurrency(account.filteredAmount ?? 0)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ReceiptText className="h-4 w-4 text-[var(--brand-primary)]" />
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Filters</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SearchField label="Search" value={searchInput} onChange={setSearchInput} placeholder="Find references or descriptions..." />
            <SelectField label="Invoice No." value={invoiceNumber} onChange={setInvoiceNumber} options={invoiceOptions} placeholder="All invoices" />
            <SelectField label="Customer" value={customer} onChange={setCustomer} options={customerOptions} placeholder="All customers" />
            <div>
              <label className="mb-1 flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)]">
                <Filter className="h-4 w-4" />
                Entry Type
              </label>
              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value)}
                className="h-11 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
              >
                <option value="">All types</option>
                <option value="invoice">Invoice</option>
                <option value="inventory">Inventory</option>
                <option value="manual">Manual</option>
                </select>
              </div>
            <SelectField label="Account Type" value={accountType} onChange={setAccountType} options={accountTypeOptions} placeholder="All account types" />
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={handleSearch}
              className="rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="rounded-xl border border-[var(--color-panel-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition hover:bg-[var(--color-panel-strong)]"
            >
              Clear
            </button>
          </div>
        </div>
      </div><br/>

      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={fetchLedger}
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
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Account</th>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Debit</th>
                  <th className="px-4 py-3 font-medium">Credit</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: pageSize }).map((_, index) => (
                    <tr key={index} className="border-b border-[var(--color-panel-border)] last:border-0">
                      <td className="px-4 py-3"><div className="h-4 w-24 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-32 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-24 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-56 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-20 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-20 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                    </tr>
                  ))
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-[var(--color-text-secondary)]">
                      {search || invoiceNumber || customer || transactionType ? 'No ledger entries match your filters.' : 'No ledger entries found.'}
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <tr key={entry.id} className="border-b border-[var(--color-panel-border)] last:border-0 hover:bg-black/5 dark:hover:bg-white/5">
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '-'}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[var(--color-text-primary)]">{entry.account?.name || '-'}</div>
                        <div className="text-xs text-[var(--color-text-secondary)]">{entry.account?.code || '-'}</div>
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{entry.reference || '-'}</td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{entry.description || '-'}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(entry.debit ?? 0)}</td>
                      <td className="px-4 py-3 font-semibold text-rose-600 dark:text-rose-400">{formatCurrency(entry.credit ?? 0)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

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
    </PageContainer>
  )
}

function SearchField({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:border-[var(--brand-primary)] focus:outline-none"
      />
    </div>
  )
}

function SelectField({ label, value, onChange, options, placeholder }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  )
}

export default LedgerPage
