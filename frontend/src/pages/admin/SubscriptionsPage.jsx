import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  Search,
  Filter,
  Calendar,
  CreditCard,
  CheckCircle,
  AlertCircle,
  X,
  Plus,
  Edit,
  Trash2,
  Clock,
  DollarSign,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { adminApi } from '../../api/admin.api.js';
import { subscriptionsApi } from '../../api/subscriptions.api.js';
import PageContainer from '../../layouts/PageContainer.jsx';
import { useThemeContext } from '../../context/ThemeContext.jsx';

// ---------- Helper Components ----------
function StatusBadge({ status }) {
  const statusMap = {
    active: { label: 'Active', color: 'emerald' },
    expired: { label: 'Expired', color: 'rose' },
    grace: { label: 'Grace', color: 'yellow' },
    pending_approval: { label: 'Pending Review', color: 'blue' },
    rejected: { label: 'Rejected', color: 'rose' },
    suspended: { label: 'Suspended', color: 'gray' },
    cancelled: { label: 'Cancelled', color: 'gray' },
    pending: { label: 'Pending', color: 'blue' },
  };
  const { label, color } = statusMap[status?.toLowerCase()] || { label: status, color: 'gray' };

  const colorClasses = {
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    yellow: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    gray: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClasses[color]}`}>
      <span className={`h-1.5 w-1.5 rounded-full bg-${color}-500`} />
      {label}
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

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'TZS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

// ---------- Main Component ----------
export function SubscriptionsPage() {
  const { darkMode, getBrandPrimary, getBrandSecondary } = useThemeContext();
  const primaryColor = getBrandPrimary?.() || '#064789';
  const secondaryColor = getBrandSecondary?.() || '#427aa1';

  // Tab state: 'subscriptions' | 'plans'
  const [activeTab, setActiveTab] = useState('subscriptions');

  // Subscriptions state
  const [subsLoading, setSubsLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState([]);
  const [subsTotal, setSubsTotal] = useState(0);
  const [subsPage, setSubsPage] = useState(1);
  const [subsPageSize, setSubsPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState('');
  const [subsError, setSubsError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Plans state
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState(null);

  // Modals
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [renewTarget, setRenewTarget] = useState(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState(null);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  // Form states
  const [renewForm, setRenewForm] = useState({
    planId: '',
    startDate: '',
    endDate: '',
    gracePeriodDays: 7,
  });
  const [statusForm, setStatusForm] = useState({ status: 'active', rejectionReason: '' });
  const [planForm, setPlanForm] = useState({
    name: '',
    billingCycle: 'monthly',
    price: 0,
    annualPrice: 0,
    durationDays: 30,
    isActive: true,
    features: '',
  });

  // ---------- Data fetching ----------
  const fetchSubscriptions = useCallback(async () => {
    try {
      setSubsLoading(true);
      setSubsError(null);
      const params = {
        page: subsPage,
        limit: subsPageSize,
      };
      if (statusFilter) params.status = statusFilter;
      Object.keys(params).forEach((key) => {
        if (params[key] === undefined || params[key] === '') delete params[key];
      });
      const data = await adminApi.subscriptions(params);
      setSubscriptions(data.items || []);
      setSubsTotal(data.total || 0);
    } catch (err) {
      setSubsError(err?.message || 'Failed to load subscriptions.');
    } finally {
      setSubsLoading(false);
    }
  }, [subsPage, subsPageSize, statusFilter]);

  const fetchPlans = useCallback(async () => {
    try {
      setPlansLoading(true);
      setPlansError(null);
      const data = await subscriptionsApi.plans();
      setPlans(data || []);
    } catch (err) {
      setPlansError(err?.message || 'Failed to load plans.');
    } finally {
      setPlansLoading(false);
    }
  }, []);

  const refreshAll = async () => {
    setRefreshing(true);
    await Promise.all([fetchSubscriptions(), fetchPlans()]);
    setRefreshing(false);
  };

  useEffect(() => {
    if (activeTab === 'subscriptions') fetchSubscriptions();
    else fetchPlans();
  }, [activeTab, fetchSubscriptions, fetchPlans]);

  useEffect(() => {
    setSubsPage(1);
  }, [statusFilter]);

  // ---------- Pagination Calculations ----------
  const totalSubsPages = Math.ceil(subsTotal / subsPageSize);
  const subsStartIndex = (subsPage - 1) * subsPageSize;

  const handleSubsPageSizeChange = (e) => {
    setSubsPageSize(Number(e.target.value));
    setSubsPage(1);
  };

  const goToSubsPage = (newPage) => {
    if (newPage >= 1 && newPage <= totalSubsPages) {
      setSubsPage(newPage);
    }
  };

  // ---------- Actions ----------
  const handleRenew = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        planId: renewForm.planId,
        startDate: renewForm.startDate,
        endDate: renewForm.endDate,
        gracePeriodDays: Number(renewForm.gracePeriodDays),
      };
      await adminApi.renewSubscription(renewTarget, payload);
      setRenewModalOpen(false);
      await fetchSubscriptions();
    } catch (err) {
      alert('Renewal failed: ' + err.message);
    }
  };

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    try {
      await adminApi.updateSubscriptionStatus(statusTarget, {
        status: statusForm.status,
        rejectionReason: statusForm.rejectionReason,
      });
      setStatusModalOpen(false);
      await fetchSubscriptions();
    } catch (err) {
      alert('Status update failed: ' + err.message);
    }
  };

  const handlePlanSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPlan) {
        await subscriptionsApi.updatePlan(editingPlan.id, planForm);
      } else {
        await subscriptionsApi.createPlan(planForm);
      }
      setPlanModalOpen(false);
      await fetchPlans();
    } catch (err) {
      alert('Plan save failed: ' + err.message);
    }
  };

  const handleDeletePlan = async (id) => {
    if (window.confirm('Are you sure you want to delete this plan?')) {
      try {
        await subscriptionsApi.deletePlan(id);
        await fetchPlans();
      } catch (err) {
        alert('Delete failed: ' + err.message);
      }
    }
  };

  const openRenewModal = (subId) => {
    const sub = subscriptions.find(s => s.id === subId);
    if (sub) {
      setRenewTarget(subId);
      setRenewForm({
        planId: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        gracePeriodDays: sub.gracePeriodDays || 7,
      });
      setRenewModalOpen(true);
    }
  };

  const openStatusModal = (subId) => {
    const sub = subscriptions.find((item) => item.id === subId);
    setStatusTarget(subId);
    setStatusForm({
      status: sub?.status || 'active',
      rejectionReason: sub?.latestPayment?.rejectionReason || '',
    });
    setStatusModalOpen(true);
  };

  const openPlanModal = (plan = null) => {
    if (plan) {
      setEditingPlan(plan);
      setPlanForm({
        name: plan.name,
        billingCycle: plan.billingCycle,
        price: plan.price,
        annualPrice: plan.annualPrice ?? 0,
        durationDays: plan.durationDays,
        isActive: plan.isActive,
        features: plan.features || '',
      });
    } else {
      setEditingPlan(null);
      setPlanForm({
        name: '',
        billingCycle: 'monthly',
        price: 0,
        annualPrice: 0,
        durationDays: 30,
        isActive: true,
        features: '',
      });
    }
    setPlanModalOpen(true);
  };

  // ---------- Render ----------
  return (
    <PageContainer
      title="Subscriptions"
      subtitle="Inspect subscription plans, renewals, and tenant subscription status."
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
      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-[var(--color-panel-border)]">
        <button
          type="button"
          onClick={() => setActiveTab('subscriptions')}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${
            activeTab === 'subscriptions'
              ? 'text-[var(--color-text-primary)]'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          Subscriptions
          {activeTab === 'subscriptions' && (
            <motion.span
              layoutId="tab-indicator"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--brand-primary)]"
            />
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('plans')}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${
            activeTab === 'plans'
              ? 'text-[var(--color-text-primary)]'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          Plans
          {activeTab === 'plans' && (
            <motion.span
              layoutId="tab-indicator"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--brand-primary)]"
            />
          )}
        </button>
      </div>

      {/* ---------- SUBSCRIPTIONS TAB ---------- */}
      {activeTab === 'subscriptions' && (
        <>
          {/* Filter */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-[var(--color-text-tertiary)]" />
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setSubsPage(1); }}
                className="h-10 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="grace">Grace</option>
                <option value="cancelled">Cancelled</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Total: {subsTotal} subscription{subsTotal !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--color-panel-border)] text-[var(--color-text-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Business</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Payment</th>
                  <th className="px-4 py-3 font-medium">Start</th>
                  <th className="px-4 py-3 font-medium">End</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subsLoading ? (
                  Array.from({ length: subsPageSize }).map((_, i) => (
                    <tr key={i} className="border-b border-[var(--color-panel-border)] last:border-0">
                      <td className="px-4 py-3"><div className="h-4 w-32 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-20 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-16 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-24 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-24 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-24 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3 text-right"><div className="ml-auto h-4 w-20 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                    </tr>
                  ))
                ) : subsError ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-red-600 dark:text-red-400">{subsError}</td></tr>
                ) : subscriptions.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">
                    {statusFilter ? 'No subscriptions match your filter.' : 'No subscriptions found.'}
                  </td></tr>
                ) : (
                  subscriptions.map((sub) => (
                    <tr key={sub.id} className="border-b border-[var(--color-panel-border)] last:border-0 hover:bg-black/5 dark:hover:bg-white/5">
                      <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">{sub.business}</td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{sub.plan}</td>
                      <td className="px-4 py-3"><StatusBadge status={sub.status} /></td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                        <div className="flex flex-col gap-1">
                          <span>{sub.latestPayment?.status || '-'}</span>
                          <span className="text-xs text-[var(--color-text-tertiary)]">
                            {sub.latestPayment?.proofPath ? 'Proof uploaded' : 'No proof yet'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{new Date(sub.startDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{new Date(sub.endDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openRenewModal(sub.id)}
                            className="rounded-lg p-1.5 text-[var(--color-text-secondary)] transition hover:bg-black/5 dark:hover:bg-white/5"
                            title="Renew"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openStatusModal(sub.id)}
                            className="rounded-lg p-1.5 text-[var(--color-text-secondary)] transition hover:bg-black/5 dark:hover:bg-white/5"
                            title="Review"
                          >
                          <Edit className="h-4 w-4" />
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
          {totalSubsPages > 0 && (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                <span>Rows per page:</span>
                <select
                  value={subsPageSize}
                  onChange={handleSubsPageSizeChange}
                  className="rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-2 py-1 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span className="hidden sm:inline">
                  {subsStartIndex + 1}–{Math.min(subsStartIndex + subsPageSize, subsTotal)} of {subsTotal}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => goToSubsPage(subsPage - 1)}
                  disabled={subsPage === 1}
                  className="rounded-lg border border-[var(--color-panel-border)] p-2 text-[var(--color-text-secondary)] transition hover:bg-[var(--color-panel-strong)] disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-3 text-sm text-[var(--color-text-secondary)]">
                  Page {subsPage} of {totalSubsPages}
                </span>
                <button
                  type="button"
                  onClick={() => goToSubsPage(subsPage + 1)}
                  disabled={subsPage === totalSubsPages}
                  className="rounded-lg border border-[var(--color-panel-border)] p-2 text-[var(--color-text-secondary)] transition hover:bg-[var(--color-panel-strong)] disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ---------- PLANS TAB ---------- */}
      {activeTab === 'plans' && (
        <>
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => openPlanModal()}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              New Plan
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--color-panel-border)] text-[var(--color-text-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Cycle</th>
                  <th className="px-4 py-3 font-medium">Monthly Price</th>
                  <th className="px-4 py-3 font-medium">Annual Price</th>
                  <th className="px-4 py-3 font-medium">Duration (days)</th>
                  <th className="px-4 py-3 font-medium">Active</th>
                  <th className="px-4 py-3 font-medium">Features</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {plansLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-[var(--color-panel-border)] last:border-0">
                      <td className="px-4 py-3"><div className="h-4 w-24 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-20 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-16 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-12 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-12 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-32 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-32 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3 text-right"><div className="ml-auto h-4 w-16 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                    </tr>
                  ))
                ) : plansError ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-red-600 dark:text-red-400">{plansError}</td></tr>
                ) : plans.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">No plans defined.</td></tr>
                ) : (
                  plans.map((plan) => (
                    <tr key={plan.id} className="border-b border-[var(--color-panel-border)] last:border-0 hover:bg-black/5 dark:hover:bg-white/5">
                      <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">{plan.name}</td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)] capitalize">{plan.billingCycle}</td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{formatCurrency(plan.price)}</td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{formatCurrency(plan.annualPrice ?? 0)}</td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{plan.durationDays}</td>
                      <td className="px-4 py-3">
                        {plan.isActive ? (
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <X className="h-4 w-4 text-rose-500" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)] max-w-xs truncate">{plan.features || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openPlanModal(plan)}
                            className="rounded-lg p-1.5 text-[var(--color-text-secondary)] transition hover:bg-black/5 dark:hover:bg-white/5"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePlan(plan.id)}
                            className="rounded-lg p-1.5 text-rose-500 transition hover:bg-rose-500/10"
                            title="Delete"
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
        </>
      )}

      {/* ---------- MODALS ---------- */}

      {/* Renew Modal */}
      <Modal isOpen={renewModalOpen} onClose={() => setRenewModalOpen(false)} title="Renew Subscription">
        <form onSubmit={handleRenew} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Plan</label>
            <select
              value={renewForm.planId}
              onChange={(e) => setRenewForm({ ...renewForm, planId: e.target.value })}
              required
              className="mt-1 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
            >
              <option value="">Select a plan</option>
              {plans.filter(p => p.isActive).map(p => (
                <option key={p.id} value={p.id}>{p.name} (${p.price})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Start Date</label>
              <input
                type="date"
                value={renewForm.startDate}
                onChange={(e) => setRenewForm({ ...renewForm, startDate: e.target.value })}
                required
                className="mt-1 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)]">End Date</label>
              <input
                type="date"
                value={renewForm.endDate}
                onChange={(e) => setRenewForm({ ...renewForm, endDate: e.target.value })}
                required
                className="mt-1 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Grace Period (days)</label>
            <input
              type="number"
              value={renewForm.gracePeriodDays}
              onChange={(e) => setRenewForm({ ...renewForm, gracePeriodDays: e.target.value })}
              min="0"
              className="mt-1 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setRenewModalOpen(false)} className="rounded-xl border border-[var(--color-panel-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-panel-strong)]">Cancel</button>
            <button type="submit" className="rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Renew</button>
          </div>
        </form>
      </Modal>

      {/* Status Update Modal */}
      <Modal isOpen={statusModalOpen} onClose={() => setStatusModalOpen(false)} title="Update Subscription Status">
        <form onSubmit={handleStatusUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)]">New Status</label>
            <select
              value={statusForm.status}
              onChange={(e) => setStatusForm((prev) => ({ ...prev, status: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
            >
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="grace">Grace</option>
              <option value="pending_approval">Pending Review</option>
              <option value="rejected">Rejected</option>
              <option value="suspended">Suspended</option>
              <option value="cancelled">Cancelled</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          {statusForm.status === 'rejected' && (
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Rejection reason</label>
              <textarea
                value={statusForm.rejectionReason}
                onChange={(e) => setStatusForm((prev) => ({ ...prev, rejectionReason: e.target.value }))}
                rows={4}
                className="mt-1 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
                placeholder="Explain why the proof was rejected"
              />
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setStatusModalOpen(false)} className="rounded-xl border border-[var(--color-panel-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-panel-strong)]">Cancel</button>
            <button type="submit" className="rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Update</button>
          </div>
        </form>
      </Modal>

      {/* Plan Create/Edit Modal */}
      <Modal isOpen={planModalOpen} onClose={() => setPlanModalOpen(false)} title={editingPlan ? 'Edit Plan' : 'Create Plan'}>
        <form onSubmit={handlePlanSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Name</label>
            <input
              type="text"
              value={planForm.name}
              onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
              required
              className="mt-1 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Billing Cycle</label>
              <select
                value={planForm.billingCycle}
                onChange={(e) => setPlanForm({ ...planForm, billingCycle: e.target.value })}
                className="mt-1 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Monthly Price (TZS)</label>
              <input
                type="number"
                value={planForm.price}
                onChange={(e) => setPlanForm({ ...planForm, price: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.01"
                required
                className="mt-1 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Annual Price (TZS)</label>
            <input
              type="number"
              value={planForm.annualPrice}
              onChange={(e) => setPlanForm({ ...planForm, annualPrice: parseFloat(e.target.value) || 0 })}
              min="0"
              step="0.01"
              className="mt-1 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Duration (days)</label>
              <input
                type="number"
                value={planForm.durationDays}
                onChange={(e) => setPlanForm({ ...planForm, durationDays: parseInt(e.target.value) || 30 })}
                min="1"
                required
                className="mt-1 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
              />
            </div>
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                <input
                  type="checkbox"
                  checked={planForm.isActive}
                  onChange={(e) => setPlanForm({ ...planForm, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-[var(--color-panel-border)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                />
                Active
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Features (comma separated)</label>
            <input
              type="text"
              value={planForm.features}
              onChange={(e) => setPlanForm({ ...planForm, features: e.target.value })}
              placeholder="POS, reports, inventory alerts"
              className="mt-1 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setPlanModalOpen(false)} className="rounded-xl border border-[var(--color-panel-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-panel-strong)]">Cancel</button>
            <button type="submit" className="rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
              {editingPlan ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
}

export default SubscriptionsPage;
