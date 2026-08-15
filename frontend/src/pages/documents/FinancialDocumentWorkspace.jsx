import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
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

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function PrintWindow({ doc, config, business = {}, primaryColor = '#064789', secondaryColor = '#427aa1' }) {
  const lines = doc.items || []
  const allocations = doc.allocations || []
  const title = config.entityLabel
  const number = escapeHtml(doc[config.numberKey] || '-')
  const primary = doc[config.primaryField] || {}
  const amount = Number(doc.amount ?? doc.totalAmount ?? 0)
  const isPurchase = config.documentKind === 'purchase-invoice'
  const documentDate = doc.invoiceDate || doc.receiptDate || doc.paymentDate || doc.createdAt
  const status = String(doc.paymentStatus || doc.status || doc.documentStatus || '-').replace(/_/g, ' ')
  const partyName = primary.name || primary.fullName || '-'
  const partyDetails = [primary.contactPerson, primary.email, primary.phone, primary.address]
    .filter(Boolean).map((value) => escapeHtml(value)).join('<br/>')
  const logoUrl = business.logo ? new URL(business.logo, window.location.origin).href : ''
  const logo = logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Company logo"/>` : `<span>${escapeHtml((business.businessName || 'I').charAt(0))}</span>`
  const rows = isPurchase
    ? lines.map((item) => `<tr><td><strong>${escapeHtml(item.productName || item.description || 'Item')}</strong>${item.sku ? `<small>${escapeHtml(item.sku)}</small>` : ''}</td><td>${Number(item.quantity ?? 0).toLocaleString()}</td><td>${formatCurrency(item.unitCost)}</td><td>${formatCurrency(item.discountAmount)}</td><td>${formatCurrency(item.taxAmount)}</td><td class="right"><strong>${formatCurrency(item.lineTotal)}</strong></td></tr>`).join('')
    : allocations.map((item) => `<tr><td><strong>${escapeHtml(item.salesInvoiceNumber || item.purchaseInvoiceNumber || item.salesInvoiceId || item.purchaseInvoiceId || '-')}</strong></td><td class="right"><strong>${formatCurrency(item.allocatedAmount)}</strong></td></tr>`).join('')
  const html = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${number}</title><style>
    :root{--brand:${primaryColor};--brand2:${secondaryColor};--ink:#0f172a;--muted:#64748b;--line:#dbe4f0;--soft:#f6f9ff}*{box-sizing:border-box}body{margin:0;padding:24px;background:#eef4fb;color:var(--ink);font-family:Inter,Arial,sans-serif}.sheet{max-width:920px;min-height:1120px;margin:auto;background:#fff;border:1px solid var(--line);border-radius:26px;overflow:hidden;box-shadow:0 22px 60px rgba(15,23,42,.1)}.hero{padding:30px 34px;color:#fff;background:linear-gradient(135deg,var(--brand),var(--brand2));position:relative}.hero:after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 90% 5%,rgba(255,255,255,.24),transparent 38%)}.hero-grid{position:relative;z-index:1;display:flex;justify-content:space-between;gap:24px}.brand{display:flex;align-items:center;gap:15px}.logo{width:62px;height:62px;border:1px solid rgba(255,255,255,.3);border-radius:18px;background:rgba(255,255,255,.16);display:grid;place-items:center;overflow:hidden;font-size:25px;font-weight:900}.logo img{width:100%;height:100%;object-fit:contain;background:#fff}.company h1,.doc-title h2{margin:0}.company p{margin:6px 0 0;font-size:13px;line-height:1.55;opacity:.92}.doc-title{text-align:right}.doc-title h2{font-size:25px;text-transform:uppercase;letter-spacing:.08em}.doc-number{display:inline-block;margin-top:10px;padding:7px 12px;border:1px solid rgba(255,255,255,.28);border-radius:999px;background:rgba(255,255,255,.12);font-size:12px;letter-spacing:.1em}.content{padding:28px 34px}.meta{display:grid;grid-template-columns:1.15fr .85fr;gap:16px;margin-bottom:20px}.card{border:1px solid var(--line);border-radius:18px;padding:17px;background:linear-gradient(180deg,#fff,#fbfdff)}.label{color:var(--muted);font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}.name{font-size:17px;font-weight:800;margin:7px 0}.details{font-size:13px;line-height:1.55;color:#475569}.facts{display:grid;grid-template-columns:auto 1fr;gap:8px 14px;font-size:13px}.facts span:nth-child(odd){color:var(--muted)}.facts span:nth-child(even){text-align:right;font-weight:700;text-transform:capitalize}table{width:100%;border-collapse:separate;border-spacing:0;border:1px solid var(--line);border-radius:18px;overflow:hidden}th{padding:12px 13px;text-align:left;background:var(--soft);color:#475569;font-size:10px;letter-spacing:.12em;text-transform:uppercase}td{padding:13px;border-top:1px solid var(--line);font-size:13px}td small{display:block;margin-top:4px;color:var(--muted)}.right{text-align:right}.summary{display:grid;grid-template-columns:1fr 310px;gap:18px;margin-top:20px;align-items:start}.note{border-left:4px solid var(--brand);background:var(--soft);padding:15px;border-radius:14px;font-size:13px;line-height:1.55}.totals{border:1px solid var(--line);border-radius:18px;padding:16px}.total-row{display:flex;justify-content:space-between;gap:12px;margin:9px 0;font-size:13px}.grand{border-top:1px solid var(--line);padding-top:12px;margin-top:12px;font-size:16px;font-weight:900}.footer{margin:26px 34px 0;padding:18px 0 26px;border-top:1px solid var(--line);display:flex;justify-content:space-between;color:var(--muted);font-size:11px}.status{color:var(--brand);font-weight:900;text-transform:uppercase}@page{size:A4;margin:10mm}@media print{body{padding:0;background:#fff}.sheet{min-height:auto;border:0;border-radius:0;box-shadow:none}.hero{-webkit-print-color-adjust:exact;print-color-adjust:exact}thead{display:table-header-group}tr{break-inside:avoid}.footer{break-inside:avoid}}@media(max-width:700px){.hero-grid,.meta,.summary{display:grid;grid-template-columns:1fr}.doc-title{text-align:left}}
  </style></head><body><main class="sheet"><header class="hero"><div class="hero-grid"><div class="brand"><div class="logo">${logo}</div><div class="company"><h1>${escapeHtml(business.businessName || 'INVEXA Business')}</h1><p>${escapeHtml(business.address || 'Business address not set')}<br/>${escapeHtml([business.phone, business.email].filter(Boolean).join(' • '))}${business.tin ? `<br/>TIN: ${escapeHtml(business.tin)}` : ''}</p></div></div><div class="doc-title"><h2>${escapeHtml(title)}</h2><div class="doc-number">${number}</div></div></div></header><section class="content"><div class="meta"><div class="card"><div class="label">${escapeHtml(config.primaryLabel)}</div><div class="name">${escapeHtml(partyName)}</div><div class="details">${partyDetails || 'Contact details not provided.'}${primary.tin ? `<br/>TIN: ${escapeHtml(primary.tin)}` : ''}</div></div><div class="card"><div class="label">Document Details</div><div class="facts"><span>Date</span><span>${escapeHtml(formatDate(documentDate))}</span>${doc.dueDate ? `<span>Due date</span><span>${escapeHtml(formatDate(doc.dueDate))}</span>` : ''}${doc.vendorInvoiceNumber ? `<span>Vendor ref.</span><span>${escapeHtml(doc.vendorInvoiceNumber)}</span>` : ''}${doc.referenceNumber ? `<span>Reference</span><span>${escapeHtml(doc.referenceNumber)}</span>` : ''}${doc.paymentMethod ? `<span>Payment method</span><span>${escapeHtml(String(doc.paymentMethod).replace(/_/g, ' '))}</span>` : ''}<span>Status</span><span class="status">${escapeHtml(status)}</span></div></div></div><table><thead><tr>${isPurchase ? '<th style="width:38%">Item / Description</th><th>Qty</th><th>Unit Cost</th><th>Discount</th><th>Tax</th><th class="right">Total</th>' : '<th>Invoice Allocation</th><th class="right">Amount</th>'}</tr></thead><tbody>${rows || `<tr><td colspan="${isPurchase ? 6 : 2}" style="text-align:center;color:var(--muted)">No line details available</td></tr>`}</tbody></table><div class="summary"><div>${doc.remarks ? `<div class="note"><div class="label">Remarks</div><div style="margin-top:7px">${escapeHtml(doc.remarks)}</div></div>` : ''}</div><div class="totals">${isPurchase ? `<div class="total-row"><span>Subtotal</span><strong>${formatCurrency(doc.subtotal)}</strong></div><div class="total-row"><span>Discount</span><strong>${formatCurrency(doc.discountTotal)}</strong></div><div class="total-row"><span>Tax</span><strong>${formatCurrency(doc.taxTotal)}</strong></div><div class="total-row grand"><span>Grand Total</span><span>${formatCurrency(amount)}</span></div><div class="total-row"><span>Amount Paid</span><strong>${formatCurrency(doc.amountPaid)}</strong></div><div class="total-row"><span>Balance Due</span><strong>${formatCurrency(doc.balance)}</strong></div>` : `<div class="total-row grand" style="border-top:0;padding-top:0;margin-top:0"><span>Total Amount</span><span>${formatCurrency(amount)}</span></div>`}</div></div></section><footer class="footer"><span>Generated by INVEXA</span><span>${escapeHtml(formatDate(new Date()))}</span></footer></main></body></html>`
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
  const [businessProfile, setBusinessProfile] = useState({})
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

      requests.push(settingsApi.all())

      const [listData, productsData, vendorsData, customersData, salesInvoicesData, purchaseInvoicesData, settingsData] = await Promise.allSettled(requests)
      if (listData.status === 'fulfilled') {
        setItems(listData.value.items || [])
        setTotal(listData.value.total || 0)
      }
      if (productsData.status === 'fulfilled') setProducts(normalizeList(productsData.value))
      if (vendorsData.status === 'fulfilled') setVendors(normalizeList(vendorsData.value))
      if (customersData.status === 'fulfilled') setCustomers(normalizeList(customersData.value))
      if (salesInvoicesData?.status === 'fulfilled') setSalesInvoiceOptions(salesInvoicesData.value?.items || [])
      if (purchaseInvoicesData?.status === 'fulfilled') setPurchaseInvoiceOptions(purchaseInvoicesData.value?.items || [])
      if (settingsData?.status === 'fulfilled') setBusinessProfile(settingsData.value?.business || {})
    } catch (err) {
      setError(err?.message || 'Failed to load documents.')
    } finally {
      setLoading(false)
    }
  }, [api, docType, listParams])

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
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(searchInput.trim()); }} className="flex flex-1 flex-col gap-3 sm:flex-row">
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
            <div
              className="overflow-hidden rounded-3xl p-6 text-white shadow-lg"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
            >
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                <div className="flex items-center gap-4">
                  <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/25 bg-white/15 text-2xl font-black">
                    {businessProfile.logo ? <img src={businessProfile.logo} alt="Company logo" className="h-full w-full bg-white object-contain" /> : (businessProfile.businessName || 'I').charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-black">{businessProfile.businessName || 'INVEXA Business'}</h3>
                    <p className="mt-1 max-w-xl text-sm text-white/80">{[businessProfile.address, businessProfile.phone, businessProfile.email].filter(Boolean).join(' • ') || 'Business contact details'}</p>
                  </div>
                </div>
                <div className="sm:text-right">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">{config.entityLabel}</p>
                  <p className="mt-1 text-xl font-black">{selected[config.numberKey]}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-2xl border border-[var(--color-panel-border)] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">{config.primaryLabel} Details</p>
                <p className="mt-2 text-lg font-bold text-[var(--color-text-primary)]">{selected[config.primaryField]?.name || selected[config.primaryField]?.fullName || '-'}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">
                  {[selected[config.primaryField]?.contactPerson, selected[config.primaryField]?.email, selected[config.primaryField]?.phone, selected[config.primaryField]?.address].filter(Boolean).join(' • ') || 'No additional contact details provided.'}
                </p>
                {selected[config.primaryField]?.tin && <p className="mt-1 text-sm text-[var(--color-text-secondary)]">TIN: {selected[config.primaryField].tin}</p>}
              </div>
              <div className="rounded-2xl border border-[var(--color-panel-border)] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">Document Details</p>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <span className="text-[var(--color-text-secondary)]">Date</span><span className="text-right font-semibold text-[var(--color-text-primary)]">{formatDate(selected.invoiceDate || selected.receiptDate || selected.paymentDate || selected.createdAt)}</span>
                  <span className="text-[var(--color-text-secondary)]">Reference</span><span className="text-right font-semibold text-[var(--color-text-primary)]">{selected.vendorInvoiceNumber || selected.referenceNumber || '-'}</span>
                  <span className="text-[var(--color-text-secondary)]">Payment</span><span className="text-right font-semibold capitalize text-[var(--color-text-primary)]">{String(selected.paymentMethod || '-').replace(/_/g, ' ')}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Info label={config.numberLabel} value={selected[config.numberKey]} />
              <Info label={config.primaryLabel} value={selected[config.primaryField]?.name || selected[config.primaryField]?.fullName || '-'} />
              <Info label="Amount" value={formatCurrency(selected.amount ?? selected.totalAmount)} />
              {config.documentKind === 'purchase-invoice' && <Info label="Tax" value={formatCurrency(selected.taxTotal)} />}
              {config.documentKind === 'purchase-invoice' && <Info label="Amount Paid" value={formatCurrency(selected.amountPaid)} />}
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
                      <th className="px-4 py-3 font-medium">Discount</th>
                      <th className="px-4 py-3 font-medium">Tax</th>
                      <th className="px-4 py-3 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.items.map((item, index) => (
                      <tr key={item.id || index} className="border-b border-[var(--color-panel-border)] last:border-0">
                        <td className="px-4 py-3">{item.description || item.productName || item.sku || '-'}</td>
                        <td className="px-4 py-3">{Number(item.quantity ?? 0).toLocaleString()}</td>
                        <td className="px-4 py-3">{formatCurrency(item.unitCost || item.unitPrice)}</td>
                        <td className="px-4 py-3">{formatCurrency(item.discountAmount || item.discount)}</td>
                        <td className="px-4 py-3">{formatCurrency(item.taxAmount || item.tax)}</td>
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
              <button type="button" onClick={() => PrintWindow({ doc: selected, config, business: businessProfile, primaryColor, secondaryColor })} className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
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
              {((config.canVoid && String(selected.status).toLowerCase() === 'posted') ||
                (config.canReverse && String(selected.documentStatus).toLowerCase() === 'posted' && String(selected.paymentStatus).toLowerCase() === 'unpaid')) && (
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
