import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  Search,
  Plus,
  Edit,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { permissionsApi } from '../../api/index.js';
import PageContainer from '../../layouts/PageContainer.jsx';
import { useThemeContext } from '../../context/ThemeContext.jsx';

// ---------- Helper Components ----------
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

// ---------- Main Component ----------
export function AdminPermissionsPage() {
  const { darkMode, getBrandPrimary, getBrandSecondary } = useThemeContext();
  const primaryColor = getBrandPrimary?.() || '#064789';
  const secondaryColor = getBrandSecondary?.() || '#427aa1';

  // State
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState([]);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    module: '',
    description: '',
  });

  // ---------- Data fetching ----------
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await permissionsApi.list();
      setPermissions(data || []);
    } catch (err) {
      setError(err?.message || 'Failed to load permissions.');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAll = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  // ---------- Search filter ----------
  const filteredPermissions = useMemo(() => {
    if (!searchTerm.trim()) return permissions;
    const term = searchTerm.toLowerCase().trim();
    return permissions.filter(
      (perm) =>
        perm.code?.toLowerCase().includes(term) ||
        perm.name?.toLowerCase().includes(term) ||
        perm.module?.toLowerCase().includes(term) ||
        perm.description?.toLowerCase().includes(term)
    );
  }, [permissions, searchTerm]);

  // ---------- Pagination ----------
  const totalItems = filteredPermissions.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedPermissions = filteredPermissions.slice(startIndex, endIndex);

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setPage(1);
  };

  const goToPage = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  // ---------- Modal handlers ----------
  const openCreateModal = () => {
    setEditingPermission(null);
    setFormData({ code: '', name: '', module: '', description: '' });
    setModalOpen(true);
  };

  const openEditModal = (perm) => {
    setEditingPermission(perm);
    setFormData({
      code: perm.code || '',
      name: perm.name || '',
      module: perm.module || '',
      description: perm.description || '',
    });
    setModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ---------- CRUD actions ----------
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPermission) {
        await permissionsApi.update(editingPermission.id, {
          name: formData.name,
          description: formData.description,
          module: formData.module,
        });
      } else {
        await permissionsApi.create({
          code: formData.code,
          name: formData.name,
          module: formData.module,
          description: formData.description,
        });
      }
      setModalOpen(false);
      await fetchData();
    } catch (err) {
      alert('Failed to save permission: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this permission?')) return;
    try {
      await permissionsApi.remove(id);
      await fetchData();
    } catch (err) {
      alert('Failed to delete permission: ' + err.message);
    }
  };

  // ---------- Render ----------
  return (
    <PageContainer
      title="Admin Permissions"
      subtitle="Review and manage the permissions available across the platform."
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
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Add Permission
          </button>
        </div>
      }
    >
      {/* Search and total count */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
          <input
            type="text"
            placeholder="Search by code, name, module, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] pl-9 pr-4 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:border-[var(--brand-primary)] focus:outline-none"
          />
        </div>
        <div className="text-sm text-[var(--color-text-secondary)]">
          Total: {totalItems} permission{totalItems !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={fetchData}
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
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Module</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: pageSize }).map((_, i) => (
                    <tr key={i} className="border-b border-[var(--color-panel-border)] last:border-0">
                      <td className="px-4 py-3"><div className="h-4 w-24 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-32 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-20 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-40 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="ml-auto h-4 w-16 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                    </tr>
                  ))
                ) : paginatedPermissions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">
                      {searchTerm ? 'No permissions match your search.' : 'No permissions found.'}
                    </td>
                  </tr>
                ) : (
                  paginatedPermissions.map((perm) => (
                    <tr key={perm.id} className="border-b border-[var(--color-panel-border)] last:border-0 hover:bg-black/5 dark:hover:bg-white/5">
                      <td className="px-4 py-3 font-mono text-xs text-[var(--color-text-primary)]">
                        {perm.code}
                      </td>
                      <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">
                        {perm.name}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-primary)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--brand-primary)]">
                          {perm.module || 'general'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)] max-w-xs truncate">
                        {perm.description || '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(perm)}
                            className="rounded-lg p-1.5 text-[var(--color-text-secondary)] transition hover:bg-black/5 dark:hover:bg-white/5"
                            title="Edit permission"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(perm.id)}
                            className="rounded-lg p-1.5 text-rose-500 transition hover:bg-rose-500/10"
                            title="Delete permission"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
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
                  {startIndex + 1}–{endIndex} of {totalItems}
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

      {/* ---------- Create/Edit Modal ---------- */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingPermission ? 'Edit Permission' : 'Add New Permission'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Permission Code *</label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleFormChange}
              required
              disabled={!!editingPermission}
              className="mt-1 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none disabled:opacity-60"
              placeholder="e.g. report.export"
            />
            {editingPermission && (
              <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">Code cannot be changed.</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              required
              className="mt-1 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
              placeholder="e.g. Export reports"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Module</label>
            <input
              type="text"
              name="module"
              value={formData.module}
              onChange={handleFormChange}
              className="mt-1 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
              placeholder="e.g. reports"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleFormChange}
              rows={3}
              className="mt-1 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none resize-none"
              placeholder="Describe what this permission allows"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-xl border border-[var(--color-panel-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-panel-strong)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              {editingPermission ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
}

export default AdminPermissionsPage;