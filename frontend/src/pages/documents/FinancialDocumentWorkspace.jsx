import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  FileText,
  Printer,
  Plus,
  RefreshCw,
  Search,
  X,
  XCircle,
  CheckCircle2,
  Clock3,
  BadgeDollarSign,
  ShoppingCart,
  ReceiptText,
  Landmark,
} from 'lucide-react'
import PageContainer from '../../layouts/PageContainer.jsx'
import Loader from '../../components/common/Loader.jsx'
import { useThemeContext } from '../../context/ThemeContext.jsx'
import { navigateTo } from '../../utils/navigation.js'
import { customersApi, paymentVouchersApi, productsApi, purchaseInvoicesApi, salesReceiptsApi, settingsApi, vendorsApi, invoicesApi } from '../../api/index.js'

const DOC_TYPES = {
  purchase: {
    key: 'purchase',
    title: 'Purchase Invoices',
    subtitle: 'Create purchase invoices, post stock in, and keep vendor balances accurate.',
    icon: ShoppingCart,
    listLabel: 'Purchase Invoices',
    createLabel: 'New Purchase Invoice',
    api: purchaseInvoicesApi,
    routeBase: '/purchase-invoices',
    numberKey: 'purchaseInvoiceNumber',
    numberLabel: 'Purchase No.',
    entityLabel: 'Purchase Invoice',
    primaryField: 'vendor',
    primaryLabel: 'Vendor',
    detailPath: 'purchase-invoices',
    documentKind: 'purchase-invoice',
    statusFilterKey: 'documentStatus',
    canVoid: false,
    canReverse: true,
    createDefaultTitle: 'Create Purchase Invoice',
    tab: 'purchase',
  },
  receipt: {
    key: 'receipt',
    title: 'Sales Receipts',
    subtitle: 'Record customer payments separately from invoice posting.',
    icon: ReceiptText,
    listLabel: 'Sales Receipts',
    createLabel: 'New Sales Receipt',
    api: salesReceiptsApi,
    routeBase: '/sales-receipts',
    numberKey: 'receiptNumber',
    numberLabel: 'Receipt No.',
    entityLabel: 'Sales Receipt',
    primaryField: 'customer',
    primaryLabel: 'Customer',
    detailPath: 'sales-receipts',
    documentKind: 'sales-receipt',
    statusFilterKey: 'status',
    canVoid: true,
    canReverse: false,
    createDefaultTitle: 'Create Sales Receipt',
    tab: 'sales',
  },
  voucher: {
    key: 'voucher',
    title: 'Payment Vouchers',
    subtitle: 'Pay vendors against purchase invoices and keep ledger records aligned.',
    icon: Landmark,
    listLabel: 'Payment Vouchers',
    createLabel: 'New Payment Voucher',
    api: paymentVouchersApi,
    routeBase: '/payment-vouchers',
    numberKey: 'voucherNumber',
    numberLabel: 'Voucher No.',
    entityLabel: 'Payment Voucher',
    primaryField: 'vendor',
    primaryLabel: 'Vendor',
    detailPath: 'payment-vouchers',
    documentKind: 'payment-voucher',
    statusFilterKey: 'status',
    canVoid: true,
    canReverse: false,
    createDefaultTitle: 'Create Payment Voucher',
    tab: 'purchase',
  },
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'TZS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0))
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

function normalizeList(data) {
  if (Array.isArray(data)) return data
  return data?.items || []
}

function cleanQueryParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  )
}

function normalizeUuidOrNull(value) {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  if (!normalized || normalized.toLowerCase() === 'undefined' || normalized.toLowerCase() === 'null') {
    return null
  }

  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(normalized)
    ? normalized
    : null
}

function StatusBadge({ status }) {
  const value = String(status || 'draft').toLowerCase()
  const tones = {
    draft: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    posted: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    unpaid: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    partially_paid: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    paid: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    cancelled: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    reversed: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    voided: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  }
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[value] || tones.draft}`}>{value.replace(/_/g, ' ')}</span>
}

function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-4xl' }) {
  if (!isOpen) return null
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.98 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className={`w-[min(94vw,70rem)] ${maxWidth} max-h-[92vh] overflow-y-auto rounded-3xl border border-[var(--color-panel-border)] bg-[var(--color-panel-strong)] p-5 shadow-2xl backdrop-blur-2xl pointer-events-auto`} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-text-tertiary)]">INVEXA Document</p>
              <h2 className="text-2xl font-black text-[var(--color-text-primary)]">{title}</h2>
            </div>
            <button type="button" onClick={onClose} className="rounded-xl p-2 text-[var(--color-text-secondary)] hover:bg-black/5 dark:hover:bg-white/5">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-5">{children}</div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

function Field({ label, value, onChange, type = 'text', required = false, placeholder, children }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">{label}</label>
      {children || (
        <input
          type={type}
          value={value}
          required={required}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
        />
      )}
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

function PrintWindow({ doc, config }) {
  const lines = doc.items || []
  const allocations = doc.allocations || []
  const title = config.title
  const number = doc[config.numberKey] || '-'
  const primary = doc[config.primaryField] || {}
  const amount = Number(doc.amount ?? doc.totalAmount ?? 0)
  const html = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${number}</title><style>
    body{margin:0;padding:24px;background:#f8fbff;color:#0f172a;font-family:Inter,ui-sans-serif,system-ui,sans-serif}
    .sheet{max-width:900px;margin:0 auto;background:#fff;border:1px solid #dbe4f0;border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(15,23,42,.08)}
    .hero{padding:26px 30px;background:linear-gradient(135deg,#064789,#427aa1);color:#fff}
    .content{padding:28px 30px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
    .card{border:1px solid #dbe4f0;border-radius:18px;padding:16px}
    table{width:100%;border-collapse:collapse;margin-top:18px}
    th,td{border-bottom:1px solid #e5edf6;padding:10px 12px;text-align:left;font-size:14px}
    th{text-transform:uppercase;letter-spacing:.12em;font-size:11px;color:#475569;background:#f6f9ff}
    .totals{display:grid;grid-template-columns:1fr 280px;gap:14px;margin-top:18px}
    .muted{color:#64748b}
    .total-row{display:flex;justify-content:space-between;margin:8px 0}
  </style></head><body><div class="sheet"><div class="hero"><h1 style="margin:0;font-size:24px">${title}</h1><div style="margin-top:6px;opacity:.9">${number}</div></div><div class="content"><div class="grid"><div class="card"><div class="muted">${config.primaryLabel}</div><div style="font-weight:700;margin-top:6px">${primary.name || primary.fullName || '-'}</div></div><div class="card"><div class="muted">Document</div><div style="font-weight:700;margin-top:6px">${config.entityLabel}</div></div></div><table><thead><tr>${config.documentKind === 'purchase-invoice' ? '<th>Description</th><th>Qty</th><th>Unit Cost</th><th>Total</th>' : config.documentKind === 'sales-receipt' || config.documentKind === 'payment-voucher' ? '<th>Invoice</th><th>Allocated</th>' : '<th>Description</th><th>Qty</th><th>Unit</th><th>Total</th>'}</tr></thead><tbody>${config.documentKind === 'purchase-invoice' ? lines.map((item) => `<tr><td>${item.description || item.productName || '-'}</td><td>${Number(item.quantity ?? 0).toLocaleString()}</td><td>${formatCurrency(item.unitCost)}</td><td>${formatCurrency(item.lineTotal)}</td></tr>`).join('') : allocations.map((item) => `<tr><td>${item.salesInvoiceNumber || item.purchaseInvoiceNumber || item.salesInvoiceId || item.purchaseInvoiceId}</td><td>${formatCurrency(item.allocatedAmount)}</td></tr>`).join('')}</tbody></table><div class="totals"><div>${doc.remarks ? `<div class="card"><div class="muted">Remarks</div><div style="margin-top:6px">${doc.remarks}</div></div>` : ''}</div><div class="card"><div class="total-row"><span>Amount</span><strong>${formatCurrency(amount)}</strong></div><div class="total-row"><span>Status</span><strong>${String(doc.status || doc.documentStatus || '-').replace(/_/g, ' ')}</strong></div></div></div></div></div></body></html>`
  const win = window.open('', '_blank', 'width=1200,height=900')
  if (!win) return
  win.document.open()
  win.document.write(html)
  win.document.close()
  setTimeout(() => win.print(), 300)
}

function AllocateList({ items, docKind, options, onChange }) {
  const resolveDefaultAmount = (docId) => {
    const selected = options.find((option) => option.value === docId)
    return selected?.defaultAmount ?? ''
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
        <ClipboardList className="h-4 w-4" />
        Allocations
      </div>
      {items.map((item, index) => (
        <div key={index} className="grid grid-cols-1 gap-3 rounded-2xl border border-[var(--color-panel-border)] p-3 sm:grid-cols-[1fr_140px_auto]">
          <SelectField
            label={docKind === 'receipt' ? 'Sales Invoice' : 'Purchase Invoice'}
            value={item.docId}
            onChange={(value) => onChange(index, { ...item, docId: value, amount: resolveDefaultAmount(value) || item.amount })}
            options={options}
            required
          />
          <Field label="Amount" type="number" value={item.amount} onChange={(value) => onChange(index, { ...item, amount: value })} />
          <div className="flex items-end">
            <button type="button" onClick={() => onChange(index, null)} className="h-11 rounded-xl border border-[var(--color-panel-border)] px-3 text-sm text-[var(--color-text-secondary)] hover:bg-black/5 dark:hover:bg-white/5">
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export function FinancialDocumentWorkspace({ docType, mode = 'list', initialDocumentId = null }) {
  const config = DOC_TYPES[docType]
  const { getBrandPrimary, getBrandSecondary } = useThemeContext()
  const primaryColor = getBrandPrimary?.() || '#064789'
  const secondaryColor = getBrandSecondary?.() || '#427aa1'
  const api = config.api

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [detailOpen, setDetailOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(mode !== 'list')
  const [saving, setSaving] = useState(false)

  const [products, setProducts] = useState([])
  const [vendors, setVendors] = useState([])
  const [customers, setCustomers] = useState([])
  const [salesInvoiceOptions, setSalesInvoiceOptions] = useState([])
  const [purchaseInvoiceOptions, setPurchaseInvoiceOptions] = useState([])
  const [form, setForm] = useState({
    vendorId: '',
    customerId: '',
    vendorInvoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    amount: '',
    cashOrBankAccountId: '',
    referenceNumber: '',
    remarks: '',
    items: [{ productId: '', description: '', quantity: 1, unitCost: '', discountAmount: 0, taxRate: 0, isInventoryItem: true }],
    allocations: [{ docId: '', amount: '' }],
  })

  const listParams = useMemo(
    () =>
      cleanQueryParams({
        page,
        limit,
        search,
        [config.statusFilterKey]: statusFilter,
      }),
    [page, limit, search, statusFilter, config.statusFilterKey],
  )

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const requests = [
        api.list(listParams),
        productsApi.list({ limit: 200 }),
        vendorsApi.list({ limit: 200 }),
        customersApi.list({ limit: 200 }),
      ]

      const needsSalesInvoices = docType === 'receipt'
      const needsPurchaseInvoices = docType === 'voucher'

      if (needsSalesInvoices) {
        requests.push(invoicesApi.list({ page: 1, limit: 200, status: 'posted' }))
      } else {
        requests.push(Promise.resolve(null))
      }

      if (needsPurchaseInvoices) {
        requests.push(purchaseInvoicesApi.list({ page: 1, limit: 200, documentStatus: 'posted' }))
      } else {
        requests.push(Promise.resolve(null))
      }

      const [listData, productsData, vendorsData, customersData, salesInvoicesData, purchaseInvoicesData] = await Promise.allSettled(requests)
      if (listData.status === 'fulfilled') {
        setItems(listData.value.items || [])
        setTotal(listData.value.total || 0)
      }
      if (productsData.status === 'fulfilled') setProducts(normalizeList(productsData.value))
      if (vendorsData.status === 'fulfilled') setVendors(normalizeList(vendorsData.value))
      if (customersData.status === 'fulfilled') setCustomers(normalizeList(customersData.value))
      if (salesInvoicesData?.status === 'fulfilled') setSalesInvoiceOptions(salesInvoicesData.value?.items || [])
      if (purchaseInvoicesData?.status === 'fulfilled') setPurchaseInvoiceOptions(purchaseInvoicesData.value?.items || [])
    } catch (err) {
      setError(err?.message || 'Failed to load documents.')
    } finally {
      setLoading(false)
    }
  }, [api, listParams])

  const openDetail = useCallback(async (id) => {
    try {
      setDetailLoading(true)
      const data = await api.detail(id)
      setSelected(data)
      setDetailOpen(true)
    } catch (err) {
      setError(err?.message || 'Failed to load document.')
    } finally {
      setDetailLoading(false)
    }
  }, [api])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (initialDocumentId) {
      openDetail(initialDocumentId)
    }
  }, [initialDocumentId, openDetail])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter])

  const refreshAll = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  const totalPages = Math.max(Math.ceil(total / limit), 1)

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { productId: '', description: '', quantity: 1, unitCost: '', discountAmount: 0, taxRate: 0, isInventoryItem: true }],
    }))
  }

  const updateItem = (index, nextItem) => {
    setForm((prev) => {
      const items = [...prev.items]
      if (!nextItem) {
        items.splice(index, 1)
      } else {
        items[index] = nextItem
      }
      return { ...prev, items: items.length ? items : [{ productId: '', description: '', quantity: 1, unitCost: '', discountAmount: 0, taxRate: 0, isInventoryItem: true }] }
    })
  }

  const updateAllocation = (index, nextItem) => {
    setForm((prev) => {
      const allocations = [...prev.allocations]
      if (!nextItem) {
        allocations.splice(index, 1)
      } else {
        allocations[index] = nextItem
      }
      return { ...prev, allocations: allocations.length ? allocations : [{ docId: '', amount: '' }] }
    })
  }

  const receiptInvoiceOptions = useMemo(() => {
    return salesInvoiceOptions
      .filter((invoice) => !form.customerId || invoice.customer?.id === form.customerId)
      .map((invoice) => ({
        value: invoice.id,
        defaultAmount: Number(invoice.balance ?? invoice.totalAmount ?? invoice.amount ?? 0),
        label: `${invoice.invoiceNumber}${invoice.customer?.fullName ? ` - ${invoice.customer.fullName}` : ''}`,
      }))
  }, [salesInvoiceOptions, form.customerId])

  const voucherInvoiceOptions = useMemo(() => {
    return purchaseInvoiceOptions
      .filter((invoice) => !form.vendorId || invoice.vendor?.id === form.vendorId)
      .map((invoice) => ({
        value: invoice.id,
        defaultAmount: Number(invoice.balance ?? invoice.totalAmount ?? invoice.amount ?? 0),
        label: `${invoice.purchaseInvoiceNumber}${invoice.vendor?.name ? ` - ${invoice.vendor.name}` : ''}`,
      }))
  }, [purchaseInvoiceOptions, form.vendorId])

  const receiptAmount = useMemo(
    () => form.allocations.reduce((sum, allocation) => sum + Number(allocation.amount || 0), 0),
    [form.allocations],
  )

  const voucherAmount = useMemo(
    () => form.allocations.reduce((sum, allocation) => sum + Number(allocation.amount || 0), 0),
    [form.allocations],
  )

  const submit = async (event) => {
    event.preventDefault()
    try {
      setSaving(true)
      if (docType === 'purchase') {
        const payload = {
          vendorId: form.vendorId,
          vendorInvoiceNumber: form.vendorInvoiceNumber || undefined,
          invoiceDate: form.invoiceDate || undefined,
          dueDate: form.dueDate || undefined,
          remarks: form.remarks || undefined,
          items: form.items.map((item) => ({
            productId: item.productId || undefined,
            description: item.description || undefined,
            quantity: Number(item.quantity),
            unitCost: Number(item.unitCost),
            discountAmount: Number(item.discountAmount || 0),
            taxRate: Number(item.taxRate || 0),
            isInventoryItem: item.isInventoryItem !== false,
          })),
          isDraft: true,
        }
        const created = await api.create(payload)
        setCreateOpen(false)
        await fetchData()
        navigateTo(`${config.routeBase}/${created.id}`)
      } else if (docType === 'receipt') {
        const validAllocations = form.allocations.filter((allocation) => allocation.docId && Number(allocation.amount || 0) > 0)
        if (!validAllocations.length) {
          throw new Error('Please select at least one sales invoice and amount before saving the receipt.')
        }
        const amount = Number(receiptAmount || 0)
        const payload = {
          customerId: form.customerId,
          receiptDate: form.paymentDate || undefined,
          paymentMethod: form.paymentMethod || undefined,
          cashOrBankAccountId: normalizeUuidOrNull(form.cashOrBankAccountId),
          amount,
          referenceNumber: form.referenceNumber || undefined,
          remarks: form.remarks || undefined,
          isDraft: true,
          allocations: validAllocations.map((allocation) => ({
            salesInvoiceId: allocation.docId,
            allocatedAmount: Number(allocation.amount || 0),
          })),
        }
        const created = await api.create(payload)
        setCreateOpen(false)
        await fetchData()
        navigateTo(`${config.routeBase}/${created.id}`)
      } else {
        const validAllocations = form.allocations.filter((allocation) => allocation.docId && Number(allocation.amount || 0) > 0)
        if (!validAllocations.length) {
          throw new Error('Please select at least one purchase invoice and amount before saving the voucher.')
        }
        const amount = Number(voucherAmount || 0)
        const payload = {
          vendorId: form.vendorId,
          paymentDate: form.paymentDate || undefined,
          paymentMethod: form.paymentMethod || undefined,
          cashOrBankAccountId: normalizeUuidOrNull(form.cashOrBankAccountId),
          amount,
          referenceNumber: form.referenceNumber || undefined,
          remarks: form.remarks || undefined,
          isDraft: true,
          allocations: validAllocations.map((allocation) => ({
            purchaseInvoiceId: allocation.docId,
            allocatedAmount: Number(allocation.amount || 0),
          })),
        }
        const created = await api.create(payload)
        setCreateOpen(false)
        await fetchData()
        navigateTo(`${config.routeBase}/${created.id}`)
      }
    } catch (err) {
      setError(err?.message || 'Failed to create document.')
    } finally {
      setSaving(false)
    }
  }

  const postDocument = async (id) => {
    try {
      await api.post(id)
      await fetchData()
      if (selected?.id === id) {
        await openDetail(id)
      }
    } catch (err) {
      setError(err?.message || 'Failed to post document.')
    }
  }

  const reverseOrVoid = async (id) => {
    const reason = window.prompt('Reason:')
    if (!reason) return
    try {
      if (docType === 'purchase') {
        await api.reverse(id, { reason })
      } else {
        await api.void(id, { reason })
      }
      await fetchData()
      if (selected?.id === id) {
        await openDetail(id)
      }
    } catch (err) {
      setError(err?.message || 'Failed to update document.')
    }
  }

  const createTitle = config.createDefaultTitle

  return (
    <PageContainer
      title={config.title}
      subtitle={config.subtitle}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
            <Plus className="h-4 w-4" />
            {config.createLabel}
          </button>
          <button type="button" onClick={refreshAll} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition hover:bg-[var(--color-panel-strong)] disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat icon={config.icon} label={config.listLabel} value={total} loading={loading} color={primaryColor} />
        <Stat icon={BadgeDollarSign} label="Open Balance" value={items.reduce((sum, item) => sum + Number(item.balance ?? 0), 0)} loading={loading} color={secondaryColor} />
        <Stat icon={Clock3} label="Drafts" value={items.filter((item) => String(item.documentStatus || item.status).toLowerCase() === 'draft').length} loading={loading} color="#f59e0b" />
      </div><br/>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchData(); }} className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={`Search ${config.title.toLowerCase()}...`}
              className="h-11 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] pl-9 pr-4 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:border-[var(--brand-primary)] focus:outline-none"
            />
          </div>
          <button type="submit" className="rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
            Search
          </button>
        </form>
        <div className="flex items-center gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-11 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none">
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="posted">Posted</option>
            <option value="unpaid">Unpaid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
            <option value="reversed">Reversed</option>
            <option value="voided">Voided</option>
          </select>
        </div>
      </div><br/>

      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button type="button" onClick={fetchData} className="mt-4 rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
            Retry
          </button>
        </div>
      ) : loading && !items.length ? (
        <div className="flex min-h-[18rem] items-center justify-center rounded-3xl border border-[var(--color-panel-border)] bg-[var(--color-panel)]">
          <Loader size="lg" label={`Loading ${config.title.toLowerCase()}...`} />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--color-panel-border)] text-[var(--color-text-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-medium">{config.numberLabel}</th>
                  <th className="px-4 py-3 font-medium">{config.primaryLabel}</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Balance</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-[var(--color-text-secondary)]">No documents found.</td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="border-b border-[var(--color-panel-border)] last:border-0 hover:bg-black/5 dark:hover:bg-white/5">
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs text-[var(--color-text-primary)]">{item[config.numberKey]}</div>
                        <div className="text-xs text-[var(--color-text-secondary)]">{formatDate(item.createdAt)}</div>
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{item[config.primaryField]?.name || item[config.primaryField]?.fullName || '-'}</td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{formatCurrency(item.amount ?? item.totalAmount)}</td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{formatCurrency(item.balance)}</td>
                      <td className="px-4 py-3"><StatusBadge status={item.paymentStatus || item.status || item.documentStatus} /></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => openDetail(item.id)} className="rounded-lg p-2 text-[var(--color-text-secondary)] transition hover:bg-black/5 hover:text-[var(--color-text-primary)] dark:hover:bg-white/5" title="View">
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3 text-sm text-[var(--color-text-secondary)]">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-1">
                <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-[var(--color-panel-border)] p-2 disabled:opacity-40">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-lg border border-[var(--color-panel-border)] p-2 disabled:opacity-40">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title={createTitle}>
        <form onSubmit={submit} className="space-y-4">
          {docType === 'purchase' && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField label="Vendor" value={form.vendorId} onChange={(value) => setForm((prev) => ({ ...prev, vendorId: value }))} options={vendors.map((vendor) => ({ value: vendor.id, label: vendor.name }))} required />
                <Field label="Vendor Invoice No." value={form.vendorInvoiceNumber} onChange={(value) => setForm((prev) => ({ ...prev, vendorInvoiceNumber: value }))} />
                <Field label="Invoice Date" type="date" value={form.invoiceDate} onChange={(value) => setForm((prev) => ({ ...prev, invoiceDate: value }))} />
                <Field label="Due Date" type="date" value={form.dueDate} onChange={(value) => setForm((prev) => ({ ...prev, dueDate: value }))} />
              </div>
              <div className="space-y-3">
                {form.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 gap-3 rounded-2xl border border-[var(--color-panel-border)] p-3 sm:grid-cols-3">
                    <SelectField label="Product" value={item.productId} onChange={(value) => updateItem(index, { ...item, productId: value })} options={products.map((product) => ({ value: product.id, label: `${product.productName} (${product.sku})` }))} />
                    <Field label="Qty" type="number" value={item.quantity} onChange={(value) => updateItem(index, { ...item, quantity: value })} />
                    <Field label="Unit Cost" type="number" value={item.unitCost} onChange={(value) => updateItem(index, { ...item, unitCost: value })} />
                  </div>
                ))}
                <button type="button" onClick={addItem} className="rounded-xl border border-[var(--color-panel-border)] px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-black/5 dark:hover:bg-white/5">Add Line</button>
              </div>
            </>
          )}

          {docType === 'receipt' && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField label="Customer" value={form.customerId} onChange={(value) => setForm((prev) => ({ ...prev, customerId: value }))} options={customers.map((customer) => ({ value: customer.id, label: customer.fullName }))} required />
                <Field label="Receipt Date" type="date" value={form.paymentDate} onChange={(value) => setForm((prev) => ({ ...prev, paymentDate: value }))} />
                <Field label="Payment Method" value={form.paymentMethod} onChange={(value) => setForm((prev) => ({ ...prev, paymentMethod: value }))} />
                <Field label="Reference Number" value={form.referenceNumber} onChange={(value) => setForm((prev) => ({ ...prev, referenceNumber: value }))} />
                <Field label="Cash/Bank Account ID" value={form.cashOrBankAccountId} onChange={(value) => setForm((prev) => ({ ...prev, cashOrBankAccountId: value }))} />
              </div>
              <AllocateList items={form.allocations} docKind="receipt" options={receiptInvoiceOptions} onChange={updateAllocation} />
              <div className="rounded-2xl border border-[var(--color-panel-border)] bg-black/5 px-4 py-3 text-sm text-[var(--color-text-secondary)] dark:bg-white/5">
                Total receipt amount: <span className="font-semibold text-[var(--color-text-primary)]">{formatCurrency(receiptAmount)}</span>
              </div>
              <button type="button" onClick={() => setForm((prev) => ({ ...prev, allocations: [...prev.allocations, { docId: '', amount: '' }] }))} className="rounded-xl border border-[var(--color-panel-border)] px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-black/5 dark:hover:bg-white/5">Add Allocation</button>
            </>
          )}

          {docType === 'voucher' && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField label="Vendor" value={form.vendorId} onChange={(value) => setForm((prev) => ({ ...prev, vendorId: value }))} options={vendors.map((vendor) => ({ value: vendor.id, label: vendor.name }))} required />
                <Field label="Payment Date" type="date" value={form.paymentDate} onChange={(value) => setForm((prev) => ({ ...prev, paymentDate: value }))} />
                <Field label="Payment Method" value={form.paymentMethod} onChange={(value) => setForm((prev) => ({ ...prev, paymentMethod: value }))} />
                <Field label="Reference Number" value={form.referenceNumber} onChange={(value) => setForm((prev) => ({ ...prev, referenceNumber: value }))} />
                <Field label="Cash/Bank Account ID" value={form.cashOrBankAccountId} onChange={(value) => setForm((prev) => ({ ...prev, cashOrBankAccountId: value }))} />
              </div>
              <AllocateList items={form.allocations} docKind="voucher" options={voucherInvoiceOptions} onChange={updateAllocation} />
              <div className="rounded-2xl border border-[var(--color-panel-border)] bg-black/5 px-4 py-3 text-sm text-[var(--color-text-secondary)] dark:bg-white/5">
                Total voucher amount: <span className="font-semibold text-[var(--color-text-primary)]">{formatCurrency(voucherAmount)}</span>
              </div>
              <button type="button" onClick={() => setForm((prev) => ({ ...prev, allocations: [...prev.allocations, { docId: '', amount: '' }] }))} className="rounded-xl border border-[var(--color-panel-border)] px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-black/5 dark:hover:bg-white/5">Add Allocation</button>
            </>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">Remarks</label>
            <textarea value={form.remarks} onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))} rows={4} className="w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="rounded-xl border border-[var(--color-panel-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-panel-strong)]">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">{saving ? 'Saving...' : 'Save Draft'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title={selected?.[config.numberKey] || config.entityLabel}>
        {detailLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
          </div>
        ) : selected ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Info label={config.numberLabel} value={selected[config.numberKey]} />
              <Info label={config.primaryLabel} value={selected[config.primaryField]?.name || selected[config.primaryField]?.fullName || '-'} />
              <Info label="Amount" value={formatCurrency(selected.amount ?? selected.totalAmount)} />
              <Info label="Balance" value={formatCurrency(selected.balance)} />
              <Info label="Status" value={selected.paymentStatus || selected.status || selected.documentStatus} />
              <Info label="Created" value={formatDate(selected.createdAt)} />
            </div>

            {selected.items?.length > 0 && (
              <div className="overflow-x-auto rounded-2xl border border-[var(--color-panel-border)]">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-[var(--color-panel-border)] text-[var(--color-text-secondary)]">
                    <tr>
                      <th className="px-4 py-3 font-medium">Item</th>
                      <th className="px-4 py-3 font-medium">Qty</th>
                      <th className="px-4 py-3 font-medium">Unit</th>
                      <th className="px-4 py-3 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.items.map((item, index) => (
                      <tr key={item.id || index} className="border-b border-[var(--color-panel-border)] last:border-0">
                        <td className="px-4 py-3">{item.description || item.productName || item.sku || '-'}</td>
                        <td className="px-4 py-3">{Number(item.quantity ?? 0).toLocaleString()}</td>
                        <td className="px-4 py-3">{formatCurrency(item.unitCost || item.unitPrice)}</td>
                        <td className="px-4 py-3">{formatCurrency(item.lineTotal || item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {selected.allocations?.length > 0 && (
              <div className="overflow-x-auto rounded-2xl border border-[var(--color-panel-border)]">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-[var(--color-panel-border)] text-[var(--color-text-secondary)]">
                    <tr>
                      <th className="px-4 py-3 font-medium">Allocation Ref</th>
                      <th className="px-4 py-3 font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.allocations.map((item, index) => (
                      <tr key={item.id || index} className="border-b border-[var(--color-panel-border)] last:border-0">
                        <td className="px-4 py-3">{item.salesInvoiceNumber || item.purchaseInvoiceNumber || item.salesInvoiceId || item.purchaseInvoiceId}</td>
                        <td className="px-4 py-3">{formatCurrency(item.allocatedAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => PrintWindow({ doc: selected, config })} className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
                <Printer className="h-4 w-4" />
                Print
              </button>
              {config.documentKind === 'purchase-invoice' && String(selected.documentStatus).toLowerCase() === 'draft' && (
                <button type="button" onClick={() => postDocument(selected.id)} className="inline-flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-500/20 dark:text-blue-300">
                  <CheckCircle2 className="h-4 w-4" />
                  Post Invoice
                </button>
              )}
              {config.documentKind !== 'purchase-invoice' && String(selected.status).toLowerCase() === 'draft' && (
                <button type="button" onClick={() => postDocument(selected.id)} className="inline-flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-500/20 dark:text-blue-300">
                  <CheckCircle2 className="h-4 w-4" />
                  Post
                </button>
              )}
              {(config.canVoid || config.canReverse) && (
                <button type="button" onClick={() => reverseOrVoid(selected.id)} className="inline-flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-500/20 dark:text-rose-300">
                  <XCircle className="h-4 w-4" />
                  {config.canReverse ? 'Reverse' : 'Void'}
                </button>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </PageContainer>
  )
}

function Stat({ icon: Icon, label, value, color, loading }) {
  return (
    <motion.div whileHover={{ y: -4 }} className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">{label}</p>
          {loading ? <div className="mt-2 h-8 w-20 animate-pulse rounded bg-[var(--color-panel-border)]" /> : <p className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">{typeof value === 'number' ? value.toLocaleString() : value}</p>}
        </div>
        <div className="rounded-xl p-2.5" style={{ backgroundColor: `${color}20`, color }}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  )
}

function Info({ label, value }) {
  return (
    <div className="rounded-2xl border border-[var(--color-panel-border)] px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">{label}</div>
      <div className="mt-1 text-sm font-medium text-[var(--color-text-primary)]">{value || '-'}</div>
    </div>
  )
}

export default FinancialDocumentWorkspace
