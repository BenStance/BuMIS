import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  Search,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  X,
  User,
  Mail,
  Phone,
  Briefcase,
  Shield,
  Key,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { usersApi, rolesApi, permissionsApi } from '../../api/index.js';
import { adminApi } from '../../api/admin.api.js';
import PageContainer from '../../layouts/PageContainer.jsx';
import { useThemeContext } from '../../context/ThemeContext.jsx';

// ---------- Helper Components ----------
function StatusBadge({ status }) {
  const isActive = status?.toLowerCase() === 'active';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isActive
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
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

// ---------- Main Component ----------
export function AdminUsersPage() {
  const { darkMode, getBrandPrimary, getBrandSecondary } = useThemeContext();
  const primaryColor = getBrandPrimary?.() || '#064789';
  const secondaryColor = getBrandSecondary?.() || '#427aa1';

  // State
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal states
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [permissionsTarget, setPermissionsTarget] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    position: '',
    roleId: '',
    businessId: '',
    password: '',
  });
  const [permissionsForm, setPermissionsForm] = useState([]);

  useEffect(() => {
    if (!editingUser) {
      setFormData((prev) => ({
        ...prev,
        roleId: prev.roleId || roles[0]?.id || '',
        businessId: prev.businessId || businesses[0]?.id || '',
      }));
    }
  }, [editingUser, roles, businesses]);

  // ---------- Data fetching ----------
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [usersData, rolesData, businessesData, permissionsData] = await Promise.all([
        usersApi.list(),
        rolesApi.list(),
        adminApi.businesses({ limit: 100 }),
        permissionsApi.list(),
      ]);
      setUsers(usersData || []);
      setRoles(rolesData || []);
      setBusinesses(businessesData.items || []);
      setPermissions(permissionsData || []);
    } catch (err) {
      setError(err?.message || 'Failed to load users data.');
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
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    const term = searchTerm.toLowerCase().trim();
    return users.filter(
      (user) =>
        user.fullName?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.position?.toLowerCase().includes(term)
    );
  }, [users, searchTerm]);

  // ---------- Pagination ----------
  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

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
    setEditingUser(null);
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      position: '',
      roleId: roles.length > 0 ? roles[0].id : '',
      businessId: businesses.length > 0 ? businesses[0].id : '',
      password: '',
    });
    setUserModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      fullName: user.fullName || '',
      email: user.email || '',
      phone: user.phone || '',
      position: user.position || '',
      roleId: user.role?.id || user.roleId || '',
      businessId: user.businessId || '',
      password: '',
    });
    setUserModalOpen(true);
  };

  const openPermissionsModal = (user) => {
    setPermissionsTarget(user);
    const fetchUserPermissions = async () => {
      try {
        const detail = await usersApi.detail(user.id);
        const userPermIds = detail.permissions?.map(p => p.id) || [];
        setPermissionsForm(userPermIds);
      } catch (err) {
        setPermissionsForm([]);
      }
    };
    fetchUserPermissions();
    setPermissionsModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePermissionToggle = (permId) => {
    setPermissionsForm((prev) =>
      prev.includes(permId) ? prev.filter(id => id !== permId) : [...prev, permId]
    );
  };

  // ---------- CRUD actions ----------
  const handleSubmitUser = async (e) => {
    e.preventDefault();
    if (!formData.roleId) {
      alert('Please select a valid role before saving.');
      return;
    }
    if (!formData.businessId) {
      alert('Please select a business before saving.');
      return;
    }
    try {
      if (editingUser) {
        await usersApi.update(editingUser.id, {
          fullName: formData.fullName,
          phone: formData.phone,
          position: formData.position,
          roleId: formData.roleId,
          businessId: formData.businessId,
        });
      } else {
        await usersApi.create({
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          position: formData.position,
          roleId: formData.roleId,
          businessId: formData.businessId,
          password: formData.password,
        });
      }
      setUserModalOpen(false);
      await fetchData();
    } catch (err) {
      alert('Failed to save user: ' + err.message);
    }
  };

  const handleToggleStatus = async (user) => {
    const action = user.status === 'active' ? 'deactivate' : 'activate';
    try {
      if (action === 'activate') {
        await usersApi.activate(user.id);
      } else {
        await usersApi.deactivate(user.id);
      }
      await fetchData();
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await usersApi.remove(id);
      await fetchData();
    } catch (err) {
      alert('Failed to delete user: ' + err.message);
    }
  };

  const handleAssignPermissions = async () => {
    if (!permissionsTarget) return;
    try {
      await usersApi.assignPermissions(permissionsTarget.id, {
        permissionIds: permissionsForm,
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
      title="Users"
      subtitle="Manage platform users, roles, permissions, and account status."
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
            Add User
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
            placeholder="Search by name, email, or position..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] pl-9 pr-4 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:border-[var(--brand-primary)] focus:outline-none"
          />
        </div>
        <div className="text-sm text-[var(--color-text-secondary)]">
          Total: {totalItems} user{totalItems !== 1 ? 's' : ''}
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
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Position</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Business</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: pageSize }).map((_, i) => (
                    <tr key={i} className="border-b border-[var(--color-panel-border)] last:border-0">
                      <td className="px-4 py-3"><div className="h-4 w-32 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-28 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-24 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-20 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-24 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-16 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="ml-auto h-4 w-16 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                    </tr>
                  ))
                ) : paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">
                      {searchTerm ? 'No users match your search.' : 'No users found.'}
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user) => (
                    <tr key={user.id} className="border-b border-[var(--color-panel-border)] last:border-0 hover:bg-black/5 dark:hover:bg-white/5">
                      <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">
                        {user.fullName || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{user.email}</td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{user.position || '-'}</td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                        {roles.find(r => r.id === user.roleId)?.name || user.role?.name || '-'}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                        {businesses.find(b => b.id === user.businessId)?.businessName || user.business?.businessName || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={user.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(user)}
                            className="rounded-lg p-1.5 text-[var(--color-text-secondary)] transition hover:bg-black/5 dark:hover:bg-white/5"
                            title="Edit user"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(user)}
                            className="rounded-lg p-1.5 text-[var(--color-text-secondary)] transition hover:bg-black/5 dark:hover:bg-white/5"
                            title={user.status === 'active' ? 'Deactivate' : 'Activate'}
                          >
                            {user.status === 'active' ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => openPermissionsModal(user)}
                            className="rounded-lg p-1.5 text-[var(--color-text-secondary)] transition hover:bg-black/5 dark:hover:bg-white/5"
                            title="Manage permissions"
                          >
                            <Key className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user.id)}
                            className="rounded-lg p-1.5 text-rose-500 transition hover:bg-rose-500/10"
                            title="Delete user"
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

      {/* ---------- User Create/Edit Modal ---------- */}
      <Modal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title={editingUser ? 'Edit User' : 'Add New User'}
      >
        <form onSubmit={handleSubmitUser} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Full Name *</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleFormChange}
              required
              className="mt-1 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleFormChange}
              required
              disabled={!!editingUser}
              className="mt-1 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none disabled:opacity-60"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Phone</label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleFormChange}
              className="mt-1 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Position</label>
            <input
              type="text"
              name="position"
              value={formData.position}
              onChange={handleFormChange}
              className="mt-1 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Role *</label>
            <select
              name="roleId"
              value={formData.roleId}
              onChange={handleFormChange}
              required
              disabled={roles.length === 0}
              className="mt-1 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">{roles.length === 0 ? 'Loading roles...' : 'Select a role'}</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Business *</label>
            <select
              name="businessId"
              value={formData.businessId}
              onChange={handleFormChange}
              required
              disabled={businesses.length === 0}
              className="mt-1 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">{businesses.length === 0 ? 'Loading businesses...' : 'Select a business'}</option>
              {businesses.map((biz) => (
                <option key={biz.id} value={biz.id}>
                  {biz.businessName}
                </option>
              ))}
            </select>
          </div>
          {!editingUser && (
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Password *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleFormChange}
                required
                minLength={6}
                className="mt-1 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
              />
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setUserModalOpen(false)}
              className="rounded-xl border border-[var(--color-panel-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-panel-strong)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formData.roleId || !formData.businessId}
              className="rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {editingUser ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ---------- Permissions Assignment Modal ---------- */}
      <Modal
        isOpen={permissionsModalOpen}
        onClose={() => setPermissionsModalOpen(false)}
        title={`Manage Permissions for ${permissionsTarget?.fullName || 'User'}`}
      >
        <div className="max-h-96 overflow-y-auto space-y-2">
          {permissions.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)]">No permissions available.</p>
          ) : (
            permissions.map((perm) => (
              <label
                key={perm.id}
                className="flex items-center gap-3 rounded-xl border border-[var(--color-panel-border)] px-4 py-2 cursor-pointer hover:bg-[var(--color-panel-strong)] transition"
              >
                <input
                  type="checkbox"
                  checked={permissionsForm.includes(perm.id)}
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

export default AdminUsersPage;