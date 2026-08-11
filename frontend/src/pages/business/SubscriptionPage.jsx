import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CheckCircle,
  Clock,
  CreditCard,
  FileCheck,
  FileUp,
  RefreshCw,
  ShieldAlert,
  X,
} from 'lucide-react'
import { subscriptionsApi } from '../../api/index.js'
import PageContainer from '../../layouts/PageContainer.jsx'

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'TZS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function statusMeta(status) {
  const normalized = String(status || '').toLowerCase()
  const map = {
    active: { label: 'Active', tone: 'emerald' },
    pending: { label: 'Awaiting Review', tone: 'blue' },
    pending_approval: { label: 'Awaiting Review', tone: 'blue' },
    rejected: { label: 'Rejected', tone: 'rose' },
    expired: { label: 'Expired', tone: 'amber' },
    suspended: { label: 'Suspended', tone: 'slate' },
    cancelled: { label: 'Cancelled', tone: 'slate' },
  }
  return map[normalized] || { label: status || 'Unknown', tone: 'slate' }
}

function StatusBadge({ status }) {
  const meta = statusMeta(status)
  const toneClasses = {
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    slate: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${toneClasses[meta.tone]}`}>
      <span className={`h-1.5 w-1.5 rounded-full bg-current`} />
      {meta.label}
    </span>
  )
}

function Modal({ isOpen, onClose, title, children }) {
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
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          className="pointer-events-auto w-full max-w-2xl overflow-hidden rounded-[2rem] border border-[var(--color-panel-border)] bg-[var(--color-panel-strong)] shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-[var(--color-panel-border)] px-6 py-4">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-[var(--color-text-secondary)] transition hover:bg-black/5 dark:hover:bg-white/5"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="px-6 py-5">{children}</div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export function SubscriptionPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [plans, setPlans] = useState([])
  const [subscriptionData, setSubscriptionData] = useState(null)

  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('bank transfer')
  const [transactionReference, setTransactionReference] = useState('')
  const [proofFile, setProofFile] = useState(null)
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [submitting, setSubmitting] = useState(false)

  const activeSubscription = subscriptionData?.subscription || null
  const latestPayment = subscriptionData?.latestPayment || activeSubscription?.latestPayment || null
  const currentStatus = String(activeSubscription?.status || latestPayment?.status || '').toLowerCase()
  const isActive = currentStatus === 'active'
  const isAwaiting = currentStatus === 'pending' || currentStatus === 'pending_approval'
  const isRejected = currentStatus === 'rejected'
  const isExpired = currentStatus === 'expired'
  const needsSubscription = Boolean(subscriptionData?.needsSubscription ?? true)

  const selectedPlanPricing = useMemo(() => {
    if (!selectedPlan) return null
    return {
      monthly: formatCurrency(selectedPlan.price),
      yearly: formatCurrency(selectedPlan.annualPrice || selectedPlan.price * 10),
      duration: `${selectedPlan.durationDays} days`,
    }
  }, [selectedPlan])

  const getPlanPrice = (plan, cycle) => {
    if (!plan) return 0
    return cycle === 'yearly' ? Number(plan.annualPrice || plan.price * 10) : Number(plan.price || 0)
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      setError('')
      const [plansData, subscriptionPayload] = await Promise.all([subscriptionsApi.plans(), subscriptionsApi.my()])
      setPlans(Array.isArray(plansData) ? plansData : [])
      setSubscriptionData(subscriptionPayload || null)
    } catch (err) {
      setError(err?.message || 'Failed to load subscription data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const refreshAll = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  const openPaymentModal = (plan, cycle = 'monthly') => {
    setSelectedPlan(plan)
    setPaymentMethod('bank transfer')
    setTransactionReference('')
    setProofFile(null)
    setBillingCycle(cycle)
    setPaymentModalOpen(true)
  }

  const handleSubmitPayment = async (event) => {
    event.preventDefault()
    if (!selectedPlan || !proofFile) {
      return
    }

    try {
      setSubmitting(true)
      const planId = selectedPlan.id || selectedPlan.Id || selectedPlan.planId || selectedPlan.PlanId || ''
      const formData = new FormData()
      formData.append('planId', String(planId))
      formData.append('billingCycle', billingCycle)
      formData.append('paymentMethod', paymentMethod)
      if (transactionReference.trim()) {
        formData.append('transactionReference', transactionReference.trim())
      }
      formData.append('proof', proofFile, proofFile.name)
      await subscriptionsApi.request(formData)
      setPaymentModalOpen(false)
      await fetchData()
    } catch (err) {
      setError(err?.message || 'Failed to submit payment proof.')
    } finally {
      setSubmitting(false)
    }
  }

  const currentPlanName = activeSubscription?.plan?.name || selectedPlan?.name || 'Choose a plan'

  return (
    <PageContainer
      title="Subscription Control"
      subtitle="Choose a plan, submit payment proof, and wait for approval before accessing the platform."
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
      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
            <p className="text-sm text-[var(--color-text-secondary)]">Loading subscription details...</p>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/5 p-8 text-center">
          <ShieldAlert className="mx-auto h-12 w-12 text-rose-500" />
          <p className="mt-4 text-sm text-rose-600 dark:text-rose-300">{error}</p>
          <button
            type="button"
            onClick={fetchData}
            className="mt-5 rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[2rem] border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-tertiary)]">Current access</p>
                  <h2 className="mt-2 text-2xl font-bold text-[var(--color-text-primary)]">{currentPlanName}</h2>
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    {activeSubscription?.plan?.billingCycle || 'No active billing cycle yet'}
                  </p>
                </div>
                <StatusBadge status={currentStatus || (needsSubscription ? 'expired' : 'active')} />
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel-strong)] p-4">
                  <p className="text-xs text-[var(--color-text-tertiary)]">Plan price</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--color-text-primary)]">
                    {activeSubscription?.plan ? formatCurrency(activeSubscription.plan.price) : '-'}
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel-strong)] p-4">
                  <p className="text-xs text-[var(--color-text-tertiary)]">Ends</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--color-text-primary)]">
                    {formatDate(activeSubscription?.endDate)}
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel-strong)] p-4">
                  <p className="text-xs text-[var(--color-text-tertiary)]">Submitted</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--color-text-primary)]">
                    {formatDate(latestPayment?.createdAt)}
                  </p>
                </div>
              </div>

              {isActive && (
                <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-700 dark:text-emerald-300">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <p>Your subscription is active. You can continue using the platform normally.</p>
                </div>
              )}

              {isAwaiting && (
                <div className="mt-5 flex items-start gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 text-sm text-blue-700 dark:text-blue-300">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0" />
                  <p>Your payment proof has been submitted and is waiting for admin approval.</p>
                </div>
              )}

              {isRejected && (
                <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-700 dark:text-rose-300">
                  <FileCheck className="mt-0.5 h-5 w-5 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-medium">Payment rejected</p>
                    <p>{latestPayment?.rejectionReason || 'Please upload another payment proof.'}</p>
                  </div>
                </div>
              )}

              {isExpired && (
                <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-700 dark:text-amber-300">
                  <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
                  <p>Your subscription has expired. Please choose a new plan and submit fresh payment proof.</p>
                </div>
              )}
            </div>

            <div className="rounded-[2rem] border border-[var(--color-panel-border)] bg-[linear-gradient(135deg,var(--brand-primary),var(--brand-secondary))] p-6 text-white shadow-lg">
              <p className="text-xs uppercase tracking-[0.22em] text-white/70">Payment instructions</p>
              <h3 className="mt-2 text-xl font-semibold">How to pay</h3>
              <div className="mt-5 space-y-3 text-sm text-white/90">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-white/70">Bank</p>
                  <p className="font-medium">CRDB Bank</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-white/70">Account name</p>
                  <p className="font-medium">ACT Limited</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-white/70">Account number</p>
                    <p className="font-medium">123456789</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-white/70">Amount</p>
                    <p className="font-medium">
                      {selectedPlan ? formatCurrency(getPlanPrice(selectedPlan, billingCycle)) : 'Select a plan'}
                    </p>
                  </div>
                </div>
                <p className="rounded-2xl bg-white/10 p-4">
                  Upload a clear payment proof after transfer. The approval team will review it and activate the business once confirmed.
                </p>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-tertiary)]">Available plans</p>
                <h3 className="mt-1 text-lg font-semibold text-[var(--color-text-primary)]">Choose the subscription tier that fits your business</h3>
              </div>
              <p className="hidden text-sm text-[var(--color-text-secondary)] md:block">
                {plans.length} plan{plans.length === 1 ? '' : 's'} available
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {plans.map((plan, index) => {
                const features = String(plan.features || '')
                  .split(',')
                  .map((item) => item.trim())
                  .filter(Boolean)

                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.06 }}
                    className="rounded-[1.75rem] border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-6 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="text-xl font-bold text-[var(--color-text-primary)]">{plan.name}</h4>
                        <p className="text-sm text-[var(--color-text-secondary)] capitalize">{plan.billingCycle}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-[var(--color-text-primary)]">{formatCurrency(plan.price)}</p>
                        <p className="text-xs text-[var(--color-text-tertiary)]">monthly</p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-black/5 px-4 py-3 text-sm dark:bg-white/5">
                        <p className="text-[var(--color-text-tertiary)]">Monthly</p>
                        <p className="mt-1 font-semibold text-[var(--color-text-primary)]">{formatCurrency(plan.price)}</p>
                      </div>
                      <div className="rounded-2xl bg-black/5 px-4 py-3 text-sm dark:bg-white/5">
                        <p className="text-[var(--color-text-tertiary)]">Yearly</p>
                        <p className="mt-1 font-semibold text-[var(--color-text-primary)]">
                          {formatCurrency(plan.annualPrice || plan.price * 10)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 text-sm text-[var(--color-text-secondary)]">
                      <div className="flex items-center justify-between rounded-2xl bg-black/5 px-4 py-3 dark:bg-white/5">
                        <span>Duration</span>
                        <span className="font-medium text-[var(--color-text-primary)]">{plan.durationDays} days</span>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl bg-black/5 px-4 py-3 dark:bg-white/5">
                        <span>Status</span>
                        <span className="font-medium text-[var(--color-text-primary)]">{plan.isActive ? 'Active' : 'Hidden'}</span>
                      </div>
                    </div>

                    {features.length > 0 && (
                      <div className="mt-5 space-y-2">
                        {features.map((feature) => (
                          <div key={feature} className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => openPaymentModal(plan, 'monthly')}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--brand-primary)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                      >
                        <CreditCard className="h-4 w-4" />
                        Monthly
                      </button>
                      <button
                        type="button"
                        onClick={() => openPaymentModal(plan, 'yearly')}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--color-panel-border)] px-4 py-3 text-sm font-semibold text-[var(--color-text-primary)] transition hover:bg-black/5 dark:hover:bg-white/5"
                      >
                        <CreditCard className="h-4 w-4" />
                        Yearly
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </section>

          {activeSubscription && (
            <section className="rounded-[2rem] border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Latest request</h3>
                <StatusBadge status={latestPayment?.status || activeSubscription.status} />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel-strong)] p-4">
                  <p className="text-xs text-[var(--color-text-tertiary)]">Payment method</p>
                  <p className="mt-1 text-sm font-medium text-[var(--color-text-primary)]">{latestPayment?.paymentMethod || '-'}</p>
                </div>
                <div className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel-strong)] p-4">
                  <p className="text-xs text-[var(--color-text-tertiary)]">Transaction reference</p>
                  <p className="mt-1 text-sm font-medium text-[var(--color-text-primary)]">{latestPayment?.transactionReference || '-'}</p>
                </div>
                <div className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel-strong)] p-4">
                  <p className="text-xs text-[var(--color-text-tertiary)]">Proof uploaded</p>
                  <p className="mt-1 text-sm font-medium text-[var(--color-text-primary)]">
                    {latestPayment?.proofPath ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title={selectedPlan ? `Submit proof for ${selectedPlan.name}` : 'Submit payment proof'}
      >
        <form onSubmit={handleSubmitPayment} className="space-y-5">
          <div className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel-strong)] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">Selected plan</p>
            <p className="mt-1 text-lg font-semibold text-[var(--color-text-primary)]">{selectedPlan?.name || '-'}</p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {selectedPlanPricing
                ? `${billingCycle === 'yearly' ? selectedPlanPricing.yearly : selectedPlanPricing.monthly} for ${billingCycle} access`
                : 'Pick a plan to continue'}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                billingCycle === 'monthly'
                  ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white'
                  : 'border-[var(--color-panel-border)] text-[var(--color-text-secondary)] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              Monthly billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('yearly')}
              className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                billingCycle === 'yearly'
                  ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white'
                  : 'border-[var(--color-panel-border)] text-[var(--color-text-secondary)] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              Yearly billing
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="block text-sm font-medium text-[var(--color-text-secondary)]">Payment method</span>
              <input
                type="text"
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
                className="w-full rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
                placeholder="Bank transfer"
              />
            </label>
            <label className="space-y-2">
              <span className="block text-sm font-medium text-[var(--color-text-secondary)]">Transaction reference</span>
              <input
                type="text"
                value={transactionReference}
                onChange={(event) => setTransactionReference(event.target.value)}
                className="w-full rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
                placeholder="Optional reference number"
              />
            </label>
          </div>

          <label className="block space-y-2">
            <span className="block text-sm font-medium text-[var(--color-text-secondary)]">Payment proof</span>
            <div className="rounded-2xl border border-dashed border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-6 text-center">
              <FileUp className="mx-auto h-6 w-6 text-[var(--color-text-tertiary)]" />
              <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
                {proofFile ? proofFile.name : 'Choose a receipt, screenshot, or statement image'}
              </p>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(event) => setProofFile(event.target.files?.[0] || null)}
                className="mt-4 block w-full text-sm text-[var(--color-text-secondary)] file:mr-4 file:rounded-xl file:border-0 file:bg-[var(--brand-primary)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:opacity-90"
              />
            </div>
          </label>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setPaymentModalOpen(false)}
              className="rounded-2xl border border-[var(--color-panel-border)] px-4 py-3 text-sm font-medium text-[var(--color-text-secondary)] transition hover:bg-black/5 dark:hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedPlan || !proofFile}
              className="inline-flex items-center gap-2 rounded-2xl bg-[var(--brand-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <FileCheck className="h-4 w-4" />
                  Submit Proof
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  )
}

export default SubscriptionPage
