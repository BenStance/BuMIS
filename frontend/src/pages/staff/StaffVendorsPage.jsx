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
  Truck,
  Mail,
  Phone,
  MapPin,
  History,
  BadgeDollarSign,
  Building2,
} from 'lucide-react'
import { vendorsApi } from '../../api/index.js'
import PageContainer from '../../layouts/PageContainer.jsx'
import { useThemeContext } from '../../context/ThemeContext.jsx'

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
  if (Array.isArray(data)) return data
  return data?.items || data?.data || data?.results || []
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
  name: '',
  contactPerson: '',
  email: '',
  phone: '',
  address: '',
  tin: '',
  notes: '',
  status: 'active',
}

function VendorRowActions({ onView, onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <button type="button" onClick={onView} className="rounded-lg p-2 text-[var(--color-text-secondary)] transition hover:bg-black/5 hover:text-[var(--color-text-primary)] dark:hover:bg-white/5" title="View profile">
        <Eye className="h-4 w-4" />
      </button>
      <button type="button" onClick={onEdit} className="rounded-lg p-2 text-[var(--color-text-secondary)] transition hover:bg-black/5 hover:text-[var(--color-text-primary)] dark:hover:bg-white/5" title="Edit vendor">
        <Edit className="h-4 w-4" />
      </button>
      <button type="button" onClick={onDelete} className="rounded-lg p-2 text-[var(--color-text-secondary)] transition hover:bg-black/5 hover:text-rose-600 dark:hover:bg-white/5" title="Archive vendor">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

export function VendorsPage() {
  const { getBrandPrimary, getBrandSecondary } = useThemeContext()
  const primaryColor = getBrandPrimary?.() || '#064789'
  const secondaryColor = getBrandSecondary?.() || '#427aa1'

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [vendors, setVendors] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState(null)
  const [formSaving, setFormSaving] = useState(false)
  const [formData, setFormData] = useState(EMPTY_FORM)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedVendorId, setSelectedVendorId] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileData, setProfileData] = useState(null)

  const fetchVendors = useCallback(async () => {
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
      const data = await vendorsApi.list(params)
      setVendors(data.items || [])
      setTotal(data.total || 0)
    } catch (err) {
      setError(err?.message || 'Failed to load vendors.')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, statusFilter])

  const refreshAll = async () => {
    setRefreshing(true)
    await fetchVendors()
    setRefreshing(false)
  }

  useEffect(() => {
    fetchVendors()
  }, [fetchVendors])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter])

  useEffect(() => {
    if (!drawerOpen || !selectedVendorId) return
    const loadProfile = async () => {
      try {
        setProfileLoading(true)
        const data = await vendorsApi.profile(selectedVendorId)
        setProfileData(data)
      } catch (err) {
        setProfileData({ error: err?.message || 'Failed to load profile.' })
      } finally {
        setProfileLoading(false)
      }
    }
    loadProfile()
  }, [drawerOpen, selectedVendorId])

  const stats = useMemo(() => {
    const active = vendors.filter((item) => String(item.status).toLowerCase() === 'active').length
    const inactive = vendors.length - active
    const totalNotes = vendors.reduce((sum, item) => sum + (item.notes ? 1 : 0), 0)
    const totalContacts = vendors.reduce((sum, item) => sum + (item.contactPerson ? 1 : 0), 0)
    return { active, inactive, totalNotes, totalContacts }
  }, [vendors])

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
    setEditingVendor(null)
    setFormData(EMPTY_FORM)
    setFormOpen(true)
  }

  const openEdit = (vendor) => {
    setEditingVendor(vendor)
    setFormData({
      name: vendor.name || '',
      contactPerson: vendor.contactPerson || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      address: vendor.address || '',
      tin: vendor.tin || '',
      notes: vendor.notes || '',
      status: vendor.status || 'active',
    })
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingVendor(null)
    setFormData(EMPTY_FORM)
  }

  const saveVendor = async (event) => {
    event.preventDefault()
    try {
      setFormSaving(true)
      const payload = {
        name: formData.name.trim(),
        contactPerson: formData.contactPerson.trim() || undefined,
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        tin: formData.tin.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      }

      if (editingVendor) {
        await vendorsApi.update(editingVendor.id, payload)
      } else {
        await vendorsApi.create(payload)
      }

      closeForm()
      await fetchVendors()
    } catch (err) {
      setError(err?.message || 'Failed to save vendor.')
    } finally {
      setFormSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Archive this vendor?')) return
    try {
      await vendorsApi.remove(id)
      await fetchVendors()
    } catch (err) {
      setError(err?.message || 'Failed to archive vendor.')
    }
  }

  const handleSearch = (event) => {
    event.preventDefault()
    const nextSearch = searchInput.trim()
    if (nextSearch === search && page === 1) {
      fetchVendors()
      return
    }
    setPage(1)
    setSearch(nextSearch)
  }

  return (
    <PageContainer
      title="Vendors"
      subtitle="Track supplier accounts, contact details, and purchasing relationships."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
            <Plus className="h-4 w-4" />
            New Vendor
          </button>
          <button type="button" onClick={refreshAll} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition hover:bg-[var(--color-panel-strong)] disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Truck} label="Total Vendors" value={total} color={primaryColor} loading={loading} />
        <MetricCard icon={Building2} label="Active Vendors" value={stats.active} color={secondaryColor} loading={loading} />
        <MetricCard icon={BadgeDollarSign} label="Notes Added" value={stats.totalNotes} color="#f59e0b" loading={loading} />
        <MetricCard icon={Mail} label="Contacts Linked" value={stats.totalContacts} color="#10b981" loading={loading} />
      </div><br/>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <form onSubmit={handleSearch} className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by vendor name, phone, or email..."
              className="h-11 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] pl-9 pr-4 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:border-[var(--brand-primary)] focus:outline-none"
            />
          </div>
          <button type="submit" className="rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
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
          <button type="button" onClick={fetchVendors} className="mt-4 rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--color-panel-border)] text-[var(--color-text-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Vendor</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Location</th>
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
                      <td className="px-4 py-3"><div className="h-4 w-24 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-20 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3 text-right"><div className="ml-auto h-4 w-20 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                    </tr>
                  ))
                ) : vendors.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-[var(--color-text-secondary)]">
                      {search || statusFilter ? 'No vendors match your filters.' : 'No vendors found.'}
                    </td>
                  </tr>
                ) : (
                  vendors.map((vendor, index) => {
                    const vendorId = vendor.id || vendor.vendorId || `vendor-${index}`
                    return (
                    <tr key={vendorId} className="border-b border-[var(--color-panel-border)] last:border-0 hover:bg-black/5 dark:hover:bg-white/5">
                      <td className="px-4 py-3">
                        <div className="font-medium text-[var(--color-text-primary)]">{vendor.name || vendor.fullName || 'Vendor'}</div>
                        <div className="text-xs text-[var(--color-text-secondary)]">{vendor.tin || 'No TIN'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 text-[var(--color-text-secondary)]">
                          <span className="inline-flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {vendor.email || '-'}</span>
                          <span className="inline-flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {vendor.phone || '-'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="inline-flex items-center gap-2 text-[var(--color-text-secondary)]">
                          <MapPin className="h-3.5 w-3.5" />
                          {vendor.address || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={vendor.status} /></td>
                      <td className="px-4 py-3">
                        <VendorRowActions
                          onView={() => {
                            setSelectedVendorId(vendorId)
                            setProfileData(null)
                            setDrawerOpen(true)
                          }}
                          onEdit={() => openEdit(vendor)}
                          onDelete={() => handleDelete(vendorId)}
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

      <Modal isOpen={formOpen} onClose={closeForm} title={editingVendor ? 'Edit Vendor' : 'New Vendor'}>
        <form onSubmit={saveVendor} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Vendor Name" value={formData.name} onChange={(value) => setFormData((prev) => ({ ...prev, name: value }))} required />
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
            <button type="button" onClick={closeForm} className="rounded-xl border border-[var(--color-panel-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition hover:bg-[var(--color-panel-strong)]">
              Cancel
            </button>
            <button type="submit" disabled={formSaving} className="rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
              {formSaving ? 'Saving...' : editingVendor ? 'Update Vendor' : 'Create Vendor'}
            </button>
          </div>
        </form>
      </Modal>

      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title="Vendor Profile">
        {profileLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
          </div>
        ) : profileData?.error ? (
          <p className="text-sm text-rose-500">{profileData.error}</p>
        ) : profileData ? (
          <VendorProfileDetails profileData={profileData} />
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

function VendorProfileDetails({ profileData }) {
  const vendor = profileData.vendor || profileData
  const purchaseHistory = profileData.purchaseHistory || profileData.purchases || []

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-4">
        <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">{vendor.name || 'Vendor'}</h3>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Supplier account and purchase activity</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoLine icon={Mail} label="Email" value={vendor.email} />
          <InfoLine icon={Phone} label="Phone" value={vendor.phone} />
          <InfoLine icon={MapPin} label="Address" value={vendor.address} />
          <InfoLine icon={History} label="Registered" value={profileData.registrationDate ? new Date(profileData.registrationDate).toLocaleDateString() : '-'} />
        </div>
      </div>
      <div className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-4">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-[var(--brand-primary)]" />
          <h4 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Purchase History</h4>
        </div>
        <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
          Total purchases: {Number(profileData.totalPurchases ?? 0).toLocaleString()}
        </p>
        {purchaseHistory.length > 0 && (
          <div className="mt-4 space-y-3">
            {purchaseHistory.map((item, index) => (
              <div key={item.id || item.reference || `vendor-purchase-${index}`} className="rounded-xl border border-[var(--color-panel-border)] px-3 py-2 text-sm text-[var(--color-text-secondary)]">
                {item.reference || item.transactionNumber || 'Purchase'}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default VendorsPage