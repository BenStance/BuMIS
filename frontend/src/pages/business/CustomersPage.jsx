import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Plus,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Users,
  Wallet,
  ShoppingBag,
  Clock3,
  History,
  Mail,
  Phone,
  MapPin,
  BadgeDollarSign,
} from 'lucide-react'
import { customersApi } from '../../api/index.js'
import PageContainer from '../../layouts/PageContainer.jsx'
import { useThemeContext } from '../../context/ThemeContext.jsx'

function MetricCard({ icon: Icon, label, value, color, loading, subtitle }) {
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

function StatusBadge({ status }) {
  const value = String(status || 'inactive').toLowerCase()
  const palette = {
    active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    inactive: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    locked: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  }
  const dot = {
    active: 'bg-emerald-500',
    inactive: 'bg-rose-500',
    locked: 'bg-amber-500',
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${palette[value] || palette.inactive}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot[value] || dot.inactive}`} />
      {value.charAt(0).toUpperCase() + value.slice(1)}
    </span>
  )
}

function normalizeListItems(data) {
  const root = data?.data ?? data
  if (Array.isArray(root)) return root
  return root?.items || root?.results || []
}

function Modal({ isOpen, onClose, title, children }) {
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
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <motion.div
          className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel-strong)] p-6 shadow-2xl backdrop-blur-2xl sm:p-8 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-[var(--color-text-secondary)] hover:bg-black/5 dark:hover:bg-white/5"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4">{children}</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
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

const EMPTY_FORM = {
  fullName: '',
  contactPerson: '',
  email: '',
  phone: '',
  address: '',
  tin: '',
  notes: '',
  status: 'active',
}

function CustomerRowActions({ onView, onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={onView}
        className="rounded-lg p-2 text-[var(--color-text-secondary)] transition hover:bg-black/5 hover:text-[var(--color-text-primary)] dark:hover:bg-white/5"
        title="View profile"
      >
        <Eye className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onEdit}
        className="rounded-lg p-2 text-[var(--color-text-secondary)] transition hover:bg-black/5 hover:text-[var(--color-text-primary)] dark:hover:bg-white/5"
        title="Edit customer"
      >
        <Edit className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="rounded-lg p-2 text-[var(--color-text-secondary)] transition hover:bg-black/5 hover:text-rose-600 dark:hover:bg-white/5"
        title="Archive customer"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

export function CustomersPage() {
  const { getBrandPrimary, getBrandSecondary } = useThemeContext()
  const primaryColor = getBrandPrimary?.() || '#064789'
  const secondaryColor = getBrandSecondary?.() || '#427aa1'

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [customers, setCustomers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [formSaving, setFormSaving] = useState(false)
  const [formData, setFormData] = useState(EMPTY_FORM)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileData, setProfileData] = useState(null)

  const fetchCustomers = useCallback(async () => {
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
      const data = await customersApi.list(params)
      setCustomers(data.items || [])
      setTotal(data.total || 0)
    } catch (err) {
      setError(err?.message || 'Failed to load customers.')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, statusFilter])

  const refreshAll = async () => {
    setRefreshing(true)
    await fetchCustomers()
    setRefreshing(false)
  }

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter])

  useEffect(() => {
    if (!drawerOpen || !selectedCustomerId) return

    const loadProfile = async () => {
      try {
        setProfileLoading(true)
        const data = await customersApi.profile(selectedCustomerId)
        setProfileData(data)
      } catch (err) {
        setProfileData({ error: err?.message || 'Failed to load profile.' })
      } finally {
        setProfileLoading(false)
      }
    }

    loadProfile()
  }, [drawerOpen, selectedCustomerId])

  const stats = useMemo(() => {
    const active = customers.filter((item) => String(item.status).toLowerCase() === 'active').length
    const archived = customers.length - active
    const totalBalance = customers.reduce((sum, item) => sum + Number(item.outstandingBalance ?? item.balance ?? 0), 0)
    const totalPurchases = customers.reduce((sum, item) => sum + Number(item.totalPurchases ?? 0), 0)

    return { active, archived, totalBalance, totalPurchases }
  }, [customers])

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

  const openCreate = () => {
    setEditingCustomer(null)
    setFormData(EMPTY_FORM)
    setFormOpen(true)
  }

  const openEdit = (customer) => {
    setEditingCustomer(customer)
    setFormData({
      fullName: customer.fullName || '',
      contactPerson: customer.contactPerson || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      tin: customer.tin || '',
      notes: customer.notes || '',
      status: customer.status || 'active',
    })
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingCustomer(null)
    setFormData(EMPTY_FORM)
  }

  const saveCustomer = async (event) => {
    event.preventDefault()
    try {
      setFormSaving(true)
      const payload = {
        fullName: formData.fullName.trim(),
        contactPerson: formData.contactPerson.trim() || undefined,
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        tin: formData.tin.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      }

      if (editingCustomer) {
        await customersApi.update(editingCustomer.id, payload)
      } else {
        await customersApi.create(payload)
      }

      closeForm()
      await fetchCustomers()
    } catch (err) {
      setError(err?.message || 'Failed to save customer.')
    } finally {
      setFormSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Archive this customer?')) return
    try {
      await customersApi.remove(id)
      await fetchCustomers()
    } catch (err) {
      setError(err?.message || 'Failed to archive customer.')
    }
  }

  const handleSearch = (event) => {
    event.preventDefault()
    const nextSearch = searchInput.trim()
    if (nextSearch === search && page === 1) {
      fetchCustomers()
      return
    }
    setPage(1)
    setSearch(nextSearch)
  }

  const openDrawer = (customer) => {
    setSelectedCustomerId(customer.id)
    setProfileData(null)
    setDrawerOpen(true)
  }

  return (
    <PageContainer
      title="Customers"
      subtitle="Manage customer accounts, balances, and purchase relationships across the business."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New Customer
          </button>
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Users} label="Total Customers" value={total} color={primaryColor} loading={loading} />
        <MetricCard icon={BadgeDollarSign} label="Active Customers" value={stats.active} color={secondaryColor} loading={loading} />
        <MetricCard icon={Wallet} label="Outstanding Balance" value={stats.totalBalance} color="#f59e0b" loading={loading} />
        <MetricCard icon={ShoppingBag} label="Total Purchases" value={stats.totalPurchases} color="#10b981" loading={loading} />
      </div><br/>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <form onSubmit={handleSearch} className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name, phone, or email..."
              className="h-11 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] pl-9 pr-4 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:border-[var(--brand-primary)] focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Search
          </button>
        </form>

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
            <option value="inactive">Inactive</option>
            <option value="locked">Locked</option>
          </select>
        </div>
      </div><br/>

      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={fetchCustomers}
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
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Balance</th>
                  <th className="px-4 py-3 font-medium">Purchases</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: pageSize }).map((_, index) => (
                    <tr key={index} className="border-b border-[var(--color-panel-border)] last:border-0">
                      <td className="px-4 py-3"><div className="h-4 w-40 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-28 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-20 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-16 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-20 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3 text-right"><div className="ml-auto h-4 w-20 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                    </tr>
                  ))
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-[var(--color-text-secondary)]">
                      {search || statusFilter ? 'No customers match your filters.' : 'No customers found.'}
                    </td>
                  </tr>
                ) : (
                  customers.map((customer, index) => {
                    const customerId = customer.id || customer.customerId || `customer-${index}`
                    return (
                    <tr key={customerId} className="border-b border-[var(--color-panel-border)] last:border-0 hover:bg-black/5 dark:hover:bg-white/5">
                      <td className="px-4 py-3">
                        <div className="font-medium text-[var(--color-text-primary)]">{customer.fullName || customer.contactPerson || customer.name || 'Customer'}</div>
                        <div className="text-xs text-[var(--color-text-secondary)]">{customer.tin || 'No TIN'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 text-[var(--color-text-secondary)]">
                          <span className="inline-flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {customer.email || '-'}</span>
                          <span className="inline-flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {customer.phone || '-'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">
                        {Number(customer.outstandingBalance ?? customer.balance ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                        {Number(customer.totalPurchases ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={customer.status} /></td>
                      <td className="px-4 py-3">
                        <CustomerRowActions
                          onView={() => openDrawer(customer)}
                          onEdit={() => openEdit(customer)}
                          onDelete={() => handleDelete(customerId)}
                        />
                      </td>
                    </tr>
                    )
                  })
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

      <Modal isOpen={formOpen} onClose={closeForm} title={editingCustomer ? 'Edit Customer' : 'New Customer'}>
        <form onSubmit={saveCustomer} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full Name" value={formData.fullName} onChange={(value) => setFormData((prev) => ({ ...prev, fullName: value }))} required />
          <Field label="Contact Person" value={formData.contactPerson} onChange={(value) => setFormData((prev) => ({ ...prev, contactPerson: value }))} />
          <Field label="Email" type="email" value={formData.email} onChange={(value) => setFormData((prev) => ({ ...prev, email: value }))} />
          <Field label="Phone" value={formData.phone} onChange={(value) => setFormData((prev) => ({ ...prev, phone: value }))} />
          <Field label="Address" value={formData.address} onChange={(value) => setFormData((prev) => ({ ...prev, address: value }))} />
          <Field label="TIN" value={formData.tin} onChange={(value) => setFormData((prev) => ({ ...prev, tin: value }))} />
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              rows={4}
              className="w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
              className="h-11 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="locked">Locked</option>
            </select>
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeForm}
              className="rounded-xl border border-[var(--color-panel-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition hover:bg-[var(--color-panel-strong)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSaving}
              className="rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {formSaving ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Create Customer'}
            </button>
          </div>
        </form>
      </Modal>

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Customer Profile"
      >
        {profileLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
          </div>
        ) : profileData?.error ? (
          <p className="text-sm text-rose-500">{profileData.error}</p>
        ) : profileData ? (
          <CustomerProfileDetails profileData={profileData} primaryColor={primaryColor} secondaryColor={secondaryColor} />
        ) : null}
      </Drawer>
    </PageContainer>
  )
}

function Field({ label, value, onChange, type = 'text', required = false }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
      />
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

function CustomerProfileDetails({ profileData, primaryColor, secondaryColor }) {
  const customer = profileData.customer || profileData
  const recentInvoices = profileData.recentInvoices || profileData.invoices || []

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-4">
        <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">{customer.fullName || 'Customer'}</h3>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Customer profile and purchase activity</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoLine icon={Mail} label="Email" value={customer.email} />
          <InfoLine icon={Phone} label="Phone" value={customer.phone} />
          <InfoLine icon={MapPin} label="Address" value={customer.address} />
          <InfoLine icon={Wallet} label="Balance" value={Number(customer.outstandingBalance ?? customer.balance ?? 0).toLocaleString()} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard icon={ShoppingBag} label="Purchases" value={profileData.totalPurchases ?? 0} color={primaryColor} loading={false} />
        <MetricCard icon={Clock3} label="Invoices" value={profileData.invoiceCount ?? recentInvoices.length ?? 0} color={secondaryColor} loading={false} />
      </div>

      <div className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-4">
        <div className="mb-3 flex items-center gap-2">
          <History className="h-4 w-4 text-[var(--brand-primary)]" />
          <h4 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
            Recent Invoices
          </h4>
        </div>
        {recentInvoices.length ? (
          <div className="space-y-3">
            {recentInvoices.map((invoice, index) => (
              <div key={invoice.id || invoice.invoiceNumber || `customer-invoice-${index}`} className="rounded-xl border border-[var(--color-panel-border)] px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-[var(--color-text-primary)]">{invoice.invoiceNumber || 'Invoice'}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : '-'}
                    </p>
                  </div>
                  <p className="font-semibold text-[var(--color-text-primary)]">
                    {Number(invoice.totalAmount ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--color-text-secondary)]">No invoice history found.</p>
        )}
      </div>
    </div>
  )
}

export default CustomersPage