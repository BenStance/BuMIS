import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  Search,
  Plus,
  Edit,
  Trash2,
  X,
  Key,
  Users,
  Shield,
} from 'lucide-react';
import { rolesApi, permissionsApi } from '../../api/index.js';
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
export function AdminRolesPage() {
  const { darkMode, getBrandPrimary, getBrandSecondary } = useThemeContext();
  const primaryColor = getBrandPrimary?.() || '#064789';
  const secondaryColor = getBrandSecondary?.() || '#427aa1';

  // State
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [permissionsTarget, setPermissionsTarget] = useState(null);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  // ---------- Data fetching ----------
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [rolesData, permissionsData] = await Promise.all([
        rolesApi.list(),
        permissionsApi.list(),
      ]);
      setRoles(rolesData || []);
      setAllPermissions(permissionsData || []);
    } catch (err) {
      setError(err?.message || 'Failed to load roles data.');
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

  // ---------- Search filter ----------
  const filteredRoles = useMemo(() => {
    if (!searchTerm.trim()) return roles;
    const term = searchTerm.toLowerCase().trim();
    return roles.filter(
      (role) =>
        role.name?.toLowerCase().includes(term) ||
        role.description?.toLowerCase().includes(term)
    );
  }, [roles, searchTerm]);

  // ---------- Modal handlers ----------
  const openCreateModal = () => {
    setEditingRole(null);
    setFormData({ name: '', description: '' });
    setRoleModalOpen(true);
  };

  const openEditModal = (role) => {
    setEditingRole(role);
    setFormData({
      name: role.name || '',
      description: role.description || '',
    });
    setRoleModalOpen(true);
  };

  const openPermissionsModal = async (role) => {
    setPermissionsTarget(role);
    // Fetch role detail to get current permissions
    try {
      const detail = await rolesApi.detail(role.id);
      const permIds = detail.permissions?.map(p => p.id) || [];
      setSelectedPermissionIds(permIds);
    } catch (err) {
      setSelectedPermissionIds([]);
    }
    setPermissionsModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePermissionToggle = (permId) => {
    setSelectedPermissionIds((prev) =>
      prev.includes(permId) ? prev.filter(id => id !== permId) : [...prev, permId]
    );
  };

  // ---------- CRUD actions ----------
  const handleSubmitRole = async (e) => {
    e.preventDefault();
    try {
      if (editingRole) {
        await rolesApi.update(editingRole.id, {
          name: formData.name,
          description: formData.description,
        });
      } else {
        await rolesApi.create({
          name: formData.name,
          description: formData.description,
        });
      }
      setRoleModalOpen(false);
      await fetchData();
    } catch (err) {
      alert('Failed to save role: ' + err.message);
    }
  };

  const handleDeleteRole = async (id) => {
    if (!window.confirm('Are you sure you want to delete this role?')) return;
    try {
      await rolesApi.remove(id);
      await fetchData();
    } catch (err) {
      alert('Failed to delete role: ' + err.message);
    }
  };

  const handleAssignPermissions = async () => {
    if (!permissionsTarget) return;
    try {
      await rolesApi.assignPermissions(permissionsTarget.id, {
        permissionIds: selectedPermissionIds,
      });
      setPermissionsModalOpen(false);
      await fetchData();
    } catch (err) {
      alert('Failed to assign permissions: ' + err.message);
    }
  };

  // ---------- Render ----------
  return (
    <PageContainer
      title="Admin Roles"
      subtitle="Manage platform roles and define the access model for each tenant."
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
            Add Role
          </button>
        </div>
      }
    >
      {/* Search */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
          <input
            type="text"
            placeholder="Search by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] pl-9 pr-4 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:border-[var(--brand-primary)] focus:outline-none"
          />
        </div>
        <div className="text-sm text-[var(--color-text-secondary)]">
          Total: {filteredRoles.length} role{filteredRoles.length !== 1 ? 's' : ''}
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
        <div className="overflow-x-auto rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--color-panel-border)] text-[var(--color-text-secondary)]">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Assigned Users</th>
                <th className="px-4 py-3 font-medium">Permissions</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[var(--color-panel-border)] last:border-0">
                    <td className="px-4 py-3"><div className="h-4 w-32 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-40 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-12 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-12 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                    <td className="px-4 py-3"><div className="ml-auto h-4 w-16 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                  </tr>
                ))
              ) : filteredRoles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">
                    {searchTerm ? 'No roles match your search.' : 'No roles found.'}
                  </td>
                </tr>
              ) : (
                filteredRoles.map((role) => (
                  <tr key={role.id} className="border-b border-[var(--color-panel-border)] last:border-0 hover:bg-black/5 dark:hover:bg-white/5">
                    <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">
                      {role.name}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                      {role.description || '-'}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                      {role.assignedUsers ?? 0}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                      {role.assignedPermissions ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(role)}
                          className="rounded-lg p-1.5 text-[var(--color-text-secondary)] transition hover:bg-black/5 dark:hover:bg-white/5"
                          title="Edit role"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openPermissionsModal(role)}
                          className="rounded-lg p-1.5 text-[var(--color-text-secondary)] transition hover:bg-black/5 dark:hover:bg-white/5"
                          title="Manage permissions"
                        >
                          <Key className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRole(role.id)}
                          className="rounded-lg p-1.5 text-rose-500 transition hover:bg-rose-500/10"
                          title="Delete role"
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
      )}

      {/* ---------- Role Create/Edit Modal ---------- */}
      <Modal
        isOpen={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        title={editingRole ? 'Edit Role' : 'Add New Role'}
      >
        <form onSubmit={handleSubmitRole} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Role Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              required
              className="mt-1 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
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
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setRoleModalOpen(false)}
              className="rounded-xl border border-[var(--color-panel-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-panel-strong)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              {editingRole ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ---------- Permissions Assignment Modal ---------- */}
      <Modal
        isOpen={permissionsModalOpen}
        onClose={() => setPermissionsModalOpen(false)}
        title={`Manage Permissions for "${permissionsTarget?.name || 'Role'}"`}
      >
        <div className="max-h-96 overflow-y-auto space-y-2">
          {allPermissions.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)]">No permissions available.</p>
          ) : (
            allPermissions.map((perm) => (
              <label
                key={perm.id}
                className="flex items-center gap-3 rounded-xl border border-[var(--color-panel-border)] px-4 py-2 cursor-pointer hover:bg-[var(--color-panel-strong)] transition"
              >
                <input
                  type="checkbox"
                  checked={selectedPermissionIds.includes(perm.id)}
                  onChange={() => handlePermissionToggle(perm.id)}
                  className="h-4 w-4 rounded border-[var(--color-panel-border)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                />
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">{perm.name}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">{perm.description || perm.resource}</p>
                </div>
              </label>
            ))
          )}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setPermissionsModalOpen(false)}
            className="rounded-xl border border-[var(--color-panel-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-panel-strong)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAssignPermissions}
            className="rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Save Permissions
          </button>
        </div>
      </Modal>
    </PageContainer>
  );
}

export default AdminRolesPage;