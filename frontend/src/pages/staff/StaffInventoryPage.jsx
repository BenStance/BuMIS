import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  SlidersHorizontal,
  Package,
  RefreshCw,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Activity,
  Boxes,
  Warehouse,
  ClipboardList,
  BadgeDollarSign,
} from 'lucide-react'
import { inventoryApi, productsApi, vendorsApi } from '../../api/index.js'
import PageContainer from '../../layouts/PageContainer.jsx'
import { useThemeContext } from '../../context/ThemeContext.jsx'

const STOCK_IN = 'stock_in'
const STOCK_OUT = 'stock_out'
const ADJUSTMENT = 'adjustment'

function MetricCard({ icon: Icon, label, value, color, loading, subtitle }) {
  return (
    <motion.div whileHover={{ y: -4 }} className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-5 shadow-sm transition-all duration-300 hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">{label}</p>
          {loading ? (
            <div className="mt-2 h-8 w-20 animate-pulse rounded bg-[var(--color-panel-border)]" />
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

function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl' }) {
  if (!isOpen) return null
  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" 
        onClick={onClose} 
      />
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 20 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <motion.div
          className={`w-[min(92vw,50rem)] ${maxWidth} max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel-strong)] p-5 shadow-2xl backdrop-blur-2xl sm:p-6 pointer-events-auto`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{title}</h2>
            <button type="button" onClick={onClose} className="rounded-xl p-2 text-[var(--color-text-secondary)] hover:bg-black/5 dark:hover:bg-white/5">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4">{children}</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function Drawer({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <motion.div
          className="w-[min(92vw,52rem)] max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel-strong)] p-6 shadow-2xl backdrop-blur-2xl sm:p-8 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between">
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-[var(--color-text-secondary)] hover:bg-black/5 dark:hover:bg-white/5"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-6">{children}</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Badge({ children, tone = 'emerald' }) {
  const tones = {
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    yellow: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    gray: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
  }

  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone] || tones.gray}`}>{children}</span>
}

function isUuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim())
}

export function StaffInventoryPage() {
  const { getBrandPrimary, getBrandSecondary } = useThemeContext()
  const primaryColor = getBrandPrimary?.() || '#064789'
  const secondaryColor = getBrandSecondary?.() || '#427aa1'

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [lowStockItems, setLowStockItems] = useState([])
  const [productOptions, setProductOptions] = useState([])
  const [vendorOptions, setVendorOptions] = useState([])

  const [movementOpen, setMovementOpen] = useState(false)
  const [movementType, setMovementType] = useState(null)
  const [saving, setSaving] = useState(false)
  const [movementForm, setMovementForm] = useState({
    productId: '',
    quantity: '',
    unitCost: '',
    vendorId: '',
    referenceNumber: '',
    stockInDate: '',
    reason: '',
    remarks: '',
    adjustmentType: 'increase',
    approvedByUserId: '',
  })

  const [stockDrawerOpen, setStockDrawerOpen] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState(null)
  const [stockLoading, setStockLoading] = useState(false)
  const [stockData, setStockData] = useState(null)

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params = {
        page,
        limit: pageSize,
        search: search || undefined,
        transactionType: typeFilter || undefined,
      }
      Object.keys(params).forEach((key) => {
        if (params[key] === undefined || params[key] === '') delete params[key]
      })
      
      const [transactionsData, lowStockData, productsData, vendorsData] = await Promise.all([
        inventoryApi.transactions(params),
        inventoryApi.lowStock(),
        productsApi.list({ limit: 100 }),
        vendorsApi.list({ limit: 100 }),
      ])

      setTransactions(transactionsData.items || [])
      setTotal(transactionsData.total || 0)
      setLowStockItems(lowStockData.items || [])
      setProductOptions(Array.isArray(productsData) ? productsData : productsData.items || [])
      setVendorOptions(Array.isArray(vendorsData) ? vendorsData : vendorsData.items || [])
    } catch (err) {
      setError(err?.message || 'Failed to load inventory data.')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, typeFilter])

  const refreshAll = async () => {
    setRefreshing(true)
    await fetchInventory()
    setRefreshing(false)
  }

  useEffect(() => {
    fetchInventory()
  }, [fetchInventory])

  useEffect(() => {
    setPage(1)
  }, [search, typeFilter])

  useEffect(() => {
    if (!stockDrawerOpen || !selectedProductId) return

    const loadStock = async () => {
      try {
        setStockLoading(true)
        const data = await inventoryApi.productStock(selectedProductId)
        setStockData(data)
      } catch (err) {
        setStockData({ error: err?.message || 'Failed to load stock details.' })
      } finally {
        setStockLoading(false)
      }
    }

    loadStock()
  }, [stockDrawerOpen, selectedProductId])

  const stats = useMemo(() => {
    const lowStockCount = lowStockItems.length
    const stockInCount = transactions.filter((item) => item.transactionType === STOCK_IN).length
    const stockOutCount = transactions.filter((item) => item.transactionType === STOCK_OUT).length
    const adjustmentCount = transactions.filter((item) => item.transactionType === ADJUSTMENT).length
    return { lowStockCount, stockInCount, stockOutCount, adjustmentCount }
  }, [lowStockItems, transactions])

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

  const openMovement = (type) => {
    setMovementType(type)
    setMovementForm({
      productId: '',
      quantity: '',
      unitCost: '',
      vendorId: '',
      referenceNumber: '',
      stockInDate: '',
      reason: '',
      remarks: '',
      adjustmentType: 'increase',
      approvedByUserId: '',
    })
    setMovementOpen(true)
  }

  const closeMovement = () => {
    setMovementOpen(false)
    setMovementType(null)
  }

  const openStockDrawer = (productId) => {
    setSelectedProductId(typeof productId === 'string' ? productId.toLowerCase() : productId)
    setStockData(null)
    setStockDrawerOpen(true)
  }

  const saveMovement = async (event) => {
    event.preventDefault()
    try {
      const productId = movementForm.productId.trim().toLowerCase()
      if (!isUuid(productId)) {
        throw new Error('Please select a valid product before saving the stock movement.')
      }

      setSaving(true)
      if (movementType === STOCK_IN) {
        await inventoryApi.stockIn({
          productId,
          quantity: Number(movementForm.quantity),
          unitCost: movementForm.unitCost ? Number(movementForm.unitCost) : undefined,
          vendorId: isUuid(movementForm.vendorId) ? movementForm.vendorId.toLowerCase() : undefined,
          referenceNumber: movementForm.referenceNumber || undefined,
          stockInDate: movementForm.stockInDate || undefined,
          remarks: movementForm.remarks || undefined,
        })
      } else if (movementType === STOCK_OUT) {
        await inventoryApi.stockOut({
          productId,
          quantity: Number(movementForm.quantity),
          reason: movementForm.reason,
          referenceNumber: movementForm.referenceNumber || undefined,
          remarks: movementForm.remarks || undefined,
        })
      } else {
        await inventoryApi.adjustment({
          productId,
          adjustmentType: movementForm.adjustmentType,
          quantity: Number(movementForm.quantity),
          reason: movementForm.reason,
          approvedByUserId: isUuid(movementForm.approvedByUserId) ? movementForm.approvedByUserId.toLowerCase() : undefined,
          referenceNumber: movementForm.referenceNumber || undefined,
          remarks: movementForm.remarks || undefined,
        })
      }

      closeMovement()
      await fetchInventory()
    } catch (err) {
      setError(err?.message || 'Failed to save stock movement.')
    } finally {
      setSaving(false)
    }
  }

  const handleSearch = (event) => {
    event.preventDefault()
    const nextSearch = searchInput.trim()
    if (nextSearch === search && page === 1) {
      fetchInventory()
      return
    }
    setPage(1)
    setSearch(nextSearch)
  }

  const transactionColor = (type) => {
    if (type === STOCK_IN) return 'emerald'
    if (type === STOCK_OUT) return 'rose'
    return 'yellow'
  }

  return (
    <PageContainer
      title="Inventory"
      subtitle="Monitor stock movements, low-stock alerts, and product availability in one workspace."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => openMovement(STOCK_IN)} className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
            <ArrowUpCircle className="h-4 w-4" />
            Stock In
          </button>
          <button type="button" onClick={() => openMovement(STOCK_OUT)} className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition hover:bg-[var(--color-panel-strong)]">
            <ArrowDownCircle className="h-4 w-4" />
            Stock Out
          </button>
          <button type="button" onClick={() => openMovement(ADJUSTMENT)} className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition hover:bg-[var(--color-panel-strong)]">
            <SlidersHorizontal className="h-4 w-4" />
            Adjustment
          </button>
          <button type="button" onClick={refreshAll} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition hover:bg-[var(--color-panel-strong)] disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={ClipboardList} label="Movements" value={total} color={primaryColor} loading={loading} subtitle="Recorded transactions" />
        <MetricCard icon={AlertTriangle} label="Low Stock" value={stats.lowStockCount} color="#f59e0b" loading={loading} subtitle="Needs attention" />
        <MetricCard icon={ArrowUpCircle} label="Stock In" value={stats.stockInCount} color={secondaryColor} loading={loading} subtitle="Incoming items" />
        <MetricCard icon={ArrowDownCircle} label="Stock Out" value={stats.stockOutCount} color="#ef4444" loading={loading} subtitle="Outgoing items" />
      </div><br/>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <form onSubmit={handleSearch} className="flex flex-1 flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by product, SKU, or transaction..."
                  className="h-11 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] pl-9 pr-4 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:border-[var(--brand-primary)] focus:outline-none"
                />
              </div>
              <button type="submit" className="rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
                Search
              </button>
            </form>

            <div className="flex items-center gap-2">
              <FilterIcon />
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value)
                  setPage(1)
                }}
                className="h-11 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
              >
                <option value="">All types</option>
                <option value={STOCK_IN}>Stock In</option>
                <option value={STOCK_OUT}>Stock Out</option>
                <option value={ADJUSTMENT}>Adjustment</option>
              </select>
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <button type="button" onClick={fetchInventory} className="mt-4 rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
                Retry
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[var(--color-panel-border)] text-[var(--color-text-secondary)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Transaction</th>
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Qty</th>
                    <th className="px-4 py-3 font-medium">Stock</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: pageSize }).map((_, index) => (
                      <tr key={index} className="border-b border-[var(--color-panel-border)] last:border-0">
                        <td className="px-4 py-3"><div className="h-4 w-32 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                        <td className="px-4 py-3"><div className="h-4 w-28 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                        <td className="px-4 py-3"><div className="h-4 w-20 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                        <td className="px-4 py-3"><div className="h-4 w-12 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                        <td className="px-4 py-3"><div className="h-4 w-16 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                        <td className="px-4 py-3 text-right"><div className="ml-auto h-4 w-12 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      </tr>
                    ))
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-[var(--color-text-secondary)]">
                        {search || typeFilter ? 'No inventory movements match your filters.' : 'No inventory movements found.'}
                      </td>
                    </tr>
                  ) : (
                    transactions.map((transaction) => (
                      <tr key={transaction.id} className="border-b border-[var(--color-panel-border)] last:border-0 hover:bg-black/5 dark:hover:bg-white/5">
                        <td className="px-4 py-3">
                          <div className="font-medium text-[var(--color-text-primary)]">{transaction.transactionNumber}</div>
                          <div className="text-xs text-[var(--color-text-secondary)]">
                            {transaction.createdAt ? new Date(transaction.createdAt).toLocaleString() : '-'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => openStockDrawer(transaction.product?.id || transaction.productId)}
                            className="text-left font-medium text-[var(--color-text-primary)] transition hover:text-[var(--brand-primary)]"
                          >
                            {transaction.product?.productName || transaction.productName || '-'}
                          </button>
                          <div className="text-xs text-[var(--color-text-secondary)]">{transaction.product?.sku || transaction.sku || '-'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={transactionColor(transaction.transactionType)}>
                            {String(transaction.transactionType || '').replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">{Number(transaction.quantity ?? 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                          {Number(transaction.previousStock ?? 0).toLocaleString()} → {Number(transaction.newStock ?? 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => openStockDrawer(transaction.product?.id || transaction.productId)}
                            className="rounded-lg p-2 text-[var(--color-text-secondary)] transition hover:bg-black/5 hover:text-[var(--color-text-primary)] dark:hover:bg-white/5"
                            title="View stock"
                          >
                            <Package className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

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
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Low Stock Alerts</h3>
            </div>
            {lowStockItems.length ? (
              <div className="space-y-3">
                {lowStockItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openStockDrawer(item.id)}
                    className="w-full rounded-xl border border-[var(--color-panel-border)] px-3 py-3 text-left transition hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-[var(--color-text-primary)]">{item.productName}</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">{item.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-rose-500">{Number(item.currentStock ?? 0).toLocaleString()}</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">Min {Number(item.minimumStock ?? 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--color-text-secondary)]">No low stock items right now.</p>
            )}
          </div>

          <div className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-[var(--brand-primary)]" />
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Movement Mix</h3>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <MiniStat label="In" value={stats.stockInCount} tone="emerald" />
              <MiniStat label="Out" value={stats.stockOutCount} tone="rose" />
              <MiniStat label="Adjustments" value={transactions.filter((item) => item.transactionType === ADJUSTMENT).length} tone="yellow" />
            </div>
          </div>
        </div>
      </div><br/>

      <Modal isOpen={movementOpen} onClose={closeMovement} title={movementType === STOCK_IN ? 'Stock In' : movementType === STOCK_OUT ? 'Stock Out' : 'Stock Adjustment'}>
        <form onSubmit={saveMovement} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField
                label="Product"
                value={movementForm.productId}
                onChange={(value) => setMovementForm((prev) => ({ ...prev, productId: value }))}
            options={productOptions.map((product) => ({ value: String(product.id || '').toLowerCase(), label: `${product.productName} (${product.sku})` }))}
                required
              />
          <Field
            label="Quantity"
            type="number"
            min="0"
            step="0.001"
            value={movementForm.quantity}
            onChange={(value) => setMovementForm((prev) => ({ ...prev, quantity: value }))}
            required
          />

          {movementType === STOCK_IN && (
            <>
              <Field
                label="Unit Cost"
                type="number"
                min="0"
                step="0.01"
                value={movementForm.unitCost}
                onChange={(value) => setMovementForm((prev) => ({ ...prev, unitCost: value }))}
              />
              <SelectField
                label="Vendor"
                value={movementForm.vendorId}
                onChange={(value) => setMovementForm((prev) => ({ ...prev, vendorId: value }))}
                options={vendorOptions.map((vendor) => ({ value: String(vendor.id || '').toLowerCase(), label: vendor.name }))}
              />
              <Field
                label="Reference Number"
                value={movementForm.referenceNumber}
                onChange={(value) => setMovementForm((prev) => ({ ...prev, referenceNumber: value }))}
              />
              <Field
                label="Stock In Date"
                type="datetime-local"
                value={movementForm.stockInDate}
                onChange={(value) => setMovementForm((prev) => ({ ...prev, stockInDate: value }))}
              />
              <div className="sm:col-span-2">
                <Field
                  label="Remarks"
                  value={movementForm.remarks}
                  onChange={(value) => setMovementForm((prev) => ({ ...prev, remarks: value }))}
                />
              </div>
            </>
          )}

          {movementType === STOCK_OUT && (
            <>
              <div className="sm:col-span-2">
                <Field
                  label="Reason"
                  value={movementForm.reason}
                  onChange={(value) => setMovementForm((prev) => ({ ...prev, reason: value }))}
                  required
                />
              </div>
              <Field
                label="Reference Number"
                value={movementForm.referenceNumber}
                onChange={(value) => setMovementForm((prev) => ({ ...prev, referenceNumber: value }))}
              />
              <div className="sm:col-span-2">
                <Field
                  label="Remarks"
                  value={movementForm.remarks}
                  onChange={(value) => setMovementForm((prev) => ({ ...prev, remarks: value }))}
                />
              </div>
            </>
          )}

          {movementType === ADJUSTMENT && (
            <>
              <SelectField
                label="Adjustment Type"
                value={movementForm.adjustmentType}
                onChange={(value) => setMovementForm((prev) => ({ ...prev, adjustmentType: value }))}
                options={[
                  { value: 'increase', label: 'Increase' },
                  { value: 'decrease', label: 'Decrease' },
                ]}
                required
              />
              <Field
                label="Reason"
                value={movementForm.reason}
                onChange={(value) => setMovementForm((prev) => ({ ...prev, reason: value }))}
                required
              />
              <Field
                label="Approved By User ID"
                value={movementForm.approvedByUserId}
                onChange={(value) => setMovementForm((prev) => ({ ...prev, approvedByUserId: value }))}
              />
              <Field
                label="Reference Number"
                value={movementForm.referenceNumber}
                onChange={(value) => setMovementForm((prev) => ({ ...prev, referenceNumber: value }))}
              />
              <div className="sm:col-span-2">
                <Field
                  label="Remarks"
                  value={movementForm.remarks}
                  onChange={(value) => setMovementForm((prev) => ({ ...prev, remarks: value }))}
                />
              </div>
            </>
          )}

          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" onClick={closeMovement} className="rounded-xl border border-[var(--color-panel-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition hover:bg-[var(--color-panel-strong)]">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Movement'}
            </button>
          </div>
        </form>
      </Modal>

      <Drawer isOpen={stockDrawerOpen} onClose={() => setStockDrawerOpen(false)} title="Product Stock">
        {stockLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
          </div>
        ) : stockData?.error ? (
          <p className="text-sm text-rose-500">{stockData.error}</p>
        ) : stockData ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-4">
              <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">{stockData.productName}</h3>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Live stock snapshot and recent movement</p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InfoLine icon={Warehouse} label="Current Stock" value={Number(stockData.currentStock ?? 0).toLocaleString()} />
                <InfoLine icon={Boxes} label="Available Stock" value={Number(stockData.availableStock ?? 0).toLocaleString()} />
                <InfoLine icon={BadgeDollarSign} label="Minimum Stock" value={Number(stockData.minimumStock ?? 0).toLocaleString()} />
                <InfoLine icon={AlertTriangle} label="Low Stock" value={stockData.lowStock ? 'Yes' : 'No'} />
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-4">
              <div className="mb-3 flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-[var(--brand-primary)]" />
                <h4 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Last Transaction</h4>
              </div>
              {stockData.lastTransaction ? (
                <div className="space-y-2 text-sm text-[var(--color-text-secondary)]">
                  <p>Transaction: {stockData.lastTransaction.transactionNumber || stockData.lastTransaction.id}</p>
                  <p>Type: {stockData.lastTransaction.transactionType}</p>
                  <p>Date: {stockData.lastTransaction.createdAt ? new Date(stockData.lastTransaction.createdAt).toLocaleString() : '-'}</p>
                </div>
              ) : (
                <p className="text-sm text-[var(--color-text-secondary)]">No stock movement yet.</p>
              )}
            </div>
          </div>
        ) : null}
      </Drawer>
    </PageContainer>
  )
}

function FilterIcon() {
  return <SlidersHorizontal className="h-4 w-4 text-[var(--color-text-tertiary)]" />
}

function Field({ label, value, onChange, type = 'text', required = false, min, step }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">{label}</label>
      <input
        type={type}
        required={required}
        min={min}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
      />
    </div>
  )
}

function SelectField({ label, value, onChange, options, required = false }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">{label}</label>
      <select
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
      >
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function MiniStat({ label, value, tone }) {
  const tones = {
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    yellow: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  }

  return (
    <div className={`rounded-xl px-3 py-3 ${tones[tone] || tones.emerald}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-black">{Number(value ?? 0).toLocaleString()}</p>
    </div>
  )
}

function InfoLine({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-[var(--color-panel-border)] px-3 py-2">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-sm text-[var(--color-text-primary)]">{value || '-'}</p>
    </div>
  )
}

export default StaffInventoryPage