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
  Tags,
  Package,
  FolderKanban,
  AlertCircle,
} from 'lucide-react'
import { categoriesApi } from '../../api/index.js'
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
    suspended: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    deleted: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
  }
  const dot = {
    active: 'bg-emerald-500',
    inactive: 'bg-rose-500',
    suspended: 'bg-amber-500',
    deleted: 'bg-slate-500',
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
  code: '',
  description: '',
  status: 'active',
}

function RowActions({ onView, onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={onView}
        className="rounded-lg p-2 text-[var(--color-text-secondary)] transition hover:bg-black/5 hover:text-[var(--color-text-primary)] dark:hover:bg-white/5"
        title="View category"
      >
        <Eye className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onEdit}
        className="rounded-lg p-2 text-[var(--color-text-secondary)] transition hover:bg-black/5 hover:text-[var(--color-text-primary)] dark:hover:bg-white/5"
        title="Edit category"
      >
        <Edit className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="rounded-lg p-2 text-[var(--color-text-secondary)] transition hover:bg-black/5 hover:text-rose-600 dark:hover:bg-white/5"
        title="Archive category"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', required = false, placeholder }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
      />
    </div>
  )
}

function InfoLine({ label, value }) {
  return (
    <div className="rounded-xl border border-[var(--color-panel-border)] px-3 py-2">
      <div className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">{label}</div>
      <p className="mt-1 text-sm text-[var(--color-text-primary)]">{value || '-'}</p>
    </div>
  )
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString()
}

export function CategoriesPage() {
  const { getBrandPrimary, getBrandSecondary } = useThemeContext()
  const primaryColor = getBrandPrimary?.() || '#064789'
  const secondaryColor = getBrandSecondary?.() || '#427aa1'

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [categories, setCategories] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [formSaving, setFormSaving] = useState(false)
  const [formData, setFormData] = useState(EMPTY_FORM)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailData, setDetailData] = useState(null)

  // ---------- Data fetching ----------
  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page,
        limit: pageSize,
        search: search || undefined,
        status: statusFilter || undefined,
      };
      Object.keys(params).forEach((key) => {
        if (params[key] === undefined || params[key] === '') delete params[key];
      });
      const data = await categoriesApi.list(params);
      setCategories(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err?.message || 'Failed to load categories.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter]);

  const refreshAll = async () => {
    setRefreshing(true);
    await fetchCategories();
    setRefreshing(false);
  };

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (!drawerOpen || !selectedCategoryId) return

    const loadDetail = async () => {
      try {
        setDetailLoading(true)
        const data = await categoriesApi.detail(selectedCategoryId)
        setDetailData(data)
      } catch (err) {
        setDetailData({ error: err?.message || 'Failed to load category details.' })
      } finally {
        setDetailLoading(false)
      }
    }

    loadDetail()
  }, [drawerOpen, selectedCategoryId])

  // ---------- Pagination ----------
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (page - 1) * pageSize;

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setPage(1);
  };

  const goToPage = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const stats = useMemo(() => {
    const active = categories.filter((item) => String(item.status).toLowerCase() === 'active').length
    const inactive = categories.filter((item) => String(item.status).toLowerCase() !== 'active').length
    const productCount = categories.reduce((sum, item) => sum + Number(item.productCount ?? 0), 0)
    const withCode = categories.filter((item) => Boolean(item.code)).length
    return { active, inactive, productCount, withCode }
  }, [categories])

  const openCreate = () => {
    setEditingCategory(null)
    setFormData(EMPTY_FORM)
    setFormOpen(true)
  }

  const openEdit = (category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name || '',
      code: category.code || '',
      description: category.description || '',
      status: category.status || 'active',
    })
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingCategory(null)
    setFormData(EMPTY_FORM)
  }

  const saveCategory = async (event) => {
    event.preventDefault()
    try {
      setFormSaving(true)
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim() || undefined,
        description: formData.description.trim() || undefined,
      }

      if (editingCategory) {
        payload.status = formData.status
        await categoriesApi.update(editingCategory.id, payload)
      } else {
        await categoriesApi.create(payload)
      }

      closeForm()
      await fetchCategories()
    } catch (err) {
      setError(err?.message || 'Failed to save category.')
    } finally {
      setFormSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Archive this category?')) return
    try {
      await categoriesApi.remove(id)
      await fetchCategories()
    } catch (err) {
      setError(err?.message || 'Failed to archive category.')
    }
  }

  const handleSearch = (event) => {
    event.preventDefault()
    const nextSearch = searchInput.trim()
    if (nextSearch === search && page === 1) {
      fetchCategories()
      return
    }
    setPage(1)
    setSearch(nextSearch)
  }

  const openDrawer = (category) => {
    setSelectedCategoryId(category.id)
    setDetailData(null)
    setDrawerOpen(true)
  }

  return (
    <PageContainer
      title="Categories"
      subtitle="Organize product groups, track catalog coverage, and keep your inventory structure clean."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New Category
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
        <MetricCard icon={Tags} label="Total Categories" value={total} color={primaryColor} loading={loading} subtitle={`${stats.withCode} coded`} />
        <MetricCard icon={FolderKanban} label="Active Categories" value={stats.active} color={secondaryColor} loading={loading} />
        <MetricCard icon={Package} label="Products Assigned" value={stats.productCount} color="#8b5cf6" loading={loading} />
        <MetricCard icon={AlertCircle} label="Inactive Categories" value={stats.inactive} color="#f59e0b" loading={loading} />
      </div><br/>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <form onSubmit={handleSearch} className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by category name or code..."
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
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div><br/>

      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={fetchCategories}
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
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Products</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: pageSize }).map((_, i) => (
                    <tr key={i} className="border-b border-[var(--color-panel-border)] last:border-0">
                      <td className="px-4 py-3"><div className="h-4 w-40 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-20 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-16 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-20 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-24 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3 text-right"><div className="ml-auto h-4 w-20 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                    </tr>
                  ))
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-[var(--color-text-secondary)]">
                      {search || statusFilter ? 'No categories match your filters.' : 'No categories found.'}
                    </td>
                  </tr>
                ) : (
                  categories.map((category, index) => {
                    const categoryId = category.id || category.categoryId || `category-${index}`
                    return (
                      <tr
                        key={categoryId}
                        className="border-b border-[var(--color-panel-border)] last:border-0 hover:bg-black/5 dark:hover:bg-white/5"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-[var(--color-text-primary)]">
                            {category.name || 'Category'}
                          </div>
                          <div className="text-xs text-[var(--color-text-secondary)]">
                            {category.description || 'No description'}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[var(--color-text-secondary)]">
                          {category.code || '-'}
                        </td>
                        <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                          {Number(category.productCount ?? 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={category.status} />
                        </td>
                        <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                          {formatDate(category.updatedAt || category.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <RowActions
                            onView={() => openDrawer(category)}
                            onEdit={() => openEdit(category)}
                            onDelete={() => handleDelete(categoryId)}
                          />
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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

      <Modal isOpen={formOpen} onClose={closeForm} title={editingCategory ? 'Edit Category' : 'New Category'}>
        <form onSubmit={saveCategory} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Category Name"
            value={formData.name}
            onChange={(value) => setFormData((prev) => ({ ...prev, name: value }))}
            required
            placeholder="e.g. Beverages"
          />
          <Field
            label="Code"
            value={formData.code}
            onChange={(value) => setFormData((prev) => ({ ...prev, code: value }))}
            placeholder="e.g. BEV"
          />
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              rows={4}
              placeholder="Add a short explanation for this category..."
              className="w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
            />
          </div>
          {editingCategory && (
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
                className="h-11 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          )}
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
              {formSaving ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
            </button>
          </div>
        </form>
      </Modal>

      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title="Category Details">
        {detailLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
          </div>
        ) : detailData?.error ? (
          <p className="text-sm text-rose-500">{detailData.error}</p>
        ) : detailData ? (
          <CategoryDetails detailData={detailData} />
        ) : null}
      </Drawer>
    </PageContainer>
  )
}

function CategoryDetails({ detailData }) {
  const category = detailData.category || detailData

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-4">
        <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">{category.name || 'Category'}</h3>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          {category.description || 'No description provided.'}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusBadge status={category.status} />
          {category.code && (
            <span className="inline-flex items-center rounded-full border border-[var(--color-panel-border)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-secondary)]">
              {category.code}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <InfoLine label="Category ID" value={category.id} />
        <InfoLine label="Business ID" value={category.businessId} />
        <InfoLine label="Products Assigned" value={Number(category.productCount ?? 0).toLocaleString()} />
        <InfoLine label="Created" value={formatDate(category.createdAt)} />
        <InfoLine label="Updated" value={formatDate(category.updatedAt)} />
        <InfoLine label="Deleted" value={formatDate(category.deletedAt)} />
      </div>
    </div>
  )
}

export default CategoriesPage