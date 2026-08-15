import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Plus,
  RefreshCw,
  Search,
  Eye,
  Printer,
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  CalendarDays,
  UserCircle2,
  BadgeDollarSign,
  CreditCard,
  Trash2,
  AlertTriangle,
  Receipt,
  Clock3,
  Phone,
} from 'lucide-react'
import PageContainer from '../../layouts/PageContainer.jsx'
import Loader from '../../components/common/Loader.jsx'
import logoImage from '../../assets/images/logo.png'
import { useThemeContext } from '../../context/ThemeContext.jsx'
import { navigateTo } from '../../utils/navigation.js'
import { useQueryHash } from '../../hooks/useQueryHash.js'
import { customersApi, invoicesApi, productsApi, settingsApi } from '../../api/index.js'

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'credit', label: 'Credit' },
]

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

function isUuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim())
}

function normalizeId(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeListItems(data) {
  if (Array.isArray(data)) return data
  return data?.items || data?.data || data?.results || []
}

function StatusBadge({ status }) {
  const value = String(status || 'draft').toLowerCase()
  const tones = {
    paid: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    posted: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    draft: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    partially_paid: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
    cancelled: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  }
  const dots = {
    paid: 'bg-emerald-500',
    posted: 'bg-blue-500',
    draft: 'bg-yellow-500',
    partially_paid: 'bg-cyan-500',
    cancelled: 'bg-rose-500',
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[value] || tones.draft}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dots[value] || dots.draft}`} />
      {value.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase())}
    </span>
  )
}

function InvoiceStat({ icon: Icon, label, value, color, loading }) {
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
            <p className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">{value}</p>
          )}
        </div>
        <div className="rounded-xl p-2.5" style={{ backgroundColor: `${color}20`, color }}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  )
}

function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-4xl' }) {
  if (!isOpen) return null
  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Modal Container - centered */}
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 20 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <motion.div
          className={`w-[min(94vw,64rem)] ${maxWidth} max-h-[92vh] overflow-y-auto rounded-3xl border border-[var(--color-panel-border)] bg-[var(--color-panel-strong)] p-5 shadow-2xl backdrop-blur-2xl sm:p-6 pointer-events-auto`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-text-tertiary)]">INVEXA Invoice</p>
              <h2 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)]">{title}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-[var(--color-text-secondary)] hover:bg-black/5 dark:hover:bg-white/5"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-5">{children}</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function Drawer({ isOpen, onClose, title, children, className = '' }) {
  if (!isOpen) return null
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 210, damping: 24 }}
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-4xl overflow-y-auto border-l border-[var(--color-panel-border)] bg-[var(--color-panel-strong)] p-5 shadow-2xl backdrop-blur-2xl sm:p-6 ${className}`.trim()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-text-tertiary)]">Invoice Details</p>
            <h2 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)]">{title}</h2>
          </div>
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
    </AnimatePresence>
  )
}

function makePrintWindow(invoice) {
  const business = invoice?.business || {}
  const customer = invoice?.customer || {}
  const items = invoice?.items || []
  const footer = invoice?.printConfig?.footer || 'Thank you for your business.'
  const logo = business.logo
  const totalAmount = Number(invoice?.totalAmount ?? 0)
  const subtotal = Number(invoice?.subtotal ?? 0)
  const discountTotal = Number(invoice?.discountTotal ?? 0)
  const taxTotal = Number(invoice?.taxTotal ?? 0)
  const amountPaid = Number(invoice?.amountPaid ?? 0)
  const balance = Number(invoice?.balance ?? 0)
  const paymentMethod = String(invoice?.paymentMethod || '').replace(/_/g, ' ')

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${invoice?.invoiceNumber || 'Invoice'}</title>
  <style>
    :root { --brand:#064789; --brand2:#427aa1; --ink:#0f172a; --muted:#64748b; --line:#dbe4f0; --soft:#f8fbff; --accent:#eff6ff; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      background: linear-gradient(135deg, #f8fbff 0%, #edf4ff 100%);
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .sheet {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      border: 1px solid var(--line);
      border-radius: 28px;
      overflow: hidden;
      box-shadow: 0 22px 60px rgba(15, 23, 42, 0.10);
    }
    .hero {
      position: relative;
      padding: 28px 32px 24px;
      color: white;
      background: linear-gradient(135deg, var(--brand), var(--brand2));
    }
    .hero:before {
      content: "";
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at top right, rgba(255,255,255,.20), transparent 42%);
      pointer-events: none;
    }
    .hero-grid {
      position: relative;
      display: flex;
      justify-content: space-between;
      gap: 24px;
      align-items: flex-start;
    }
    .brand {
      display: flex;
      gap: 14px;
      align-items: center;
    }
    .brand-mark {
      width: 56px;
      height: 56px;
      border-radius: 18px;
      background: rgba(255,255,255,0.16);
      backdrop-filter: blur(10px);
      display: grid;
      place-items: center;
      border: 1px solid rgba(255,255,255,0.18);
      overflow: hidden;
    }
    .brand-mark img { width: 100%; height: 100%; object-fit: cover; }
    .brand-text h1 { margin: 0; font-size: 1.7rem; line-height: 1.1; }
    .brand-text p { margin: 5px 0 0; opacity: .92; font-size: .95rem; }
    .hero-meta {
      min-width: 300px;
      text-align: right;
    }
    .hero-meta .invoice-no {
      display: inline-block;
      padding: 8px 14px;
      border-radius: 999px;
      background: rgba(255,255,255,.14);
      border: 1px solid rgba(255,255,255,.18);
      font-size: .82rem;
      letter-spacing: .12em;
      text-transform: uppercase;
      margin-bottom: 14px;
    }
    .hero-meta .dates {
      display: grid;
      gap: 6px;
      color: rgba(255,255,255,.94);
      font-size: .95rem;
    }
    .content { padding: 28px 32px 34px; }
    .grid {
      display: grid;
      grid-template-columns: 1.2fr .8fr;
      gap: 16px;
      margin-bottom: 18px;
    }
    .card {
      border: 1px solid var(--line);
      border-radius: 20px;
      background: linear-gradient(180deg, white, #fbfdff);
      padding: 18px;
    }
    .label { color: var(--muted); text-transform: uppercase; letter-spacing: .14em; font-size: .72rem; font-weight: 700; }
    .value { margin-top: 6px; font-size: .98rem; font-weight: 600; color: var(--ink); }
    .table {
      width: 100%;
      border-collapse: collapse;
      overflow: hidden;
      border-radius: 20px;
      border: 1px solid var(--line);
    }
    .table th {
      text-align: left;
      padding: 14px 16px;
      background: #f6f9ff;
      color: #334155;
      font-size: .78rem;
      letter-spacing: .14em;
      text-transform: uppercase;
      border-bottom: 1px solid var(--line);
    }
    .table td {
      padding: 14px 16px;
      border-bottom: 1px solid var(--line);
      vertical-align: top;
      font-size: .95rem;
    }
    .table tr:last-child td { border-bottom: 0; }
    .summary {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: 16px;
      margin-top: 18px;
      align-items: start;
    }
    .totals {
      border: 1px solid var(--line);
      border-radius: 20px;
      padding: 18px;
      background: linear-gradient(180deg, #ffffff, #f8fbff);
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin: 10px 0;
      color: #334155;
    }
    .grand {
      padding-top: 12px;
      margin-top: 12px;
      border-top: 1px solid var(--line);
      font-weight: 800;
      font-size: 1.05rem;
      color: var(--ink);
    }
    .note {
      border-left: 4px solid var(--brand);
      background: var(--soft);
      padding: 14px 16px;
      border-radius: 16px;
      color: #334155;
      margin-top: 18px;
    }
    .footer {
      padding: 14px 32px 28px;
      text-align: center;
      color: var(--muted);
      font-size: .84rem;
    }
    @media print {
      body { padding: 0; background: white; }
      .sheet { box-shadow: none; border-radius: 0; border: 0; }
    }
    @media (max-width: 720px) {
      .hero-grid, .grid, .summary { grid-template-columns: 1fr; }
      .hero-meta { min-width: 0; text-align: left; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="hero">
      <div class="hero-grid">
        <div class="brand">
          <div class="brand-mark">${logo || logoImage ? `<img src="${logo || logoImage}" alt="${business.businessName || 'Logo'}" />` : `<span style="font-weight:900;font-size:1.5rem;">B</span>`}</div>
          <div class="brand-text">
            <h1>${business.businessName || 'INVEXA Business'}</h1>
            <p>${business.address || 'Business address not set'}${business.phone ? ` • ${business.phone}` : ''}${business.email ? ` • ${business.email}` : ''}</p>
          </div>
        </div>
        <div class="hero-meta">
          <div class="invoice-no">${invoice?.invoiceNumber || 'Invoice'}</div>
          <div class="dates">
            <div><strong>Date:</strong> ${formatDate(invoice?.invoiceDate)}</div>
            <div><strong>Due:</strong> ${formatDate(invoice?.dueDate)}</div>
            <div><strong>Method:</strong> ${paymentMethod || 'N/A'}</div>
          </div>
        </div>
      </div>
    </div>
    <div class="content">
      <div class="grid">
        <div class="card">
          <div class="label">Bill To</div>
          <div class="value">${customer?.fullName || 'Walk-in Customer'}</div>
          <div style="margin-top:8px;color:var(--muted);font-size:.94rem;">
            ${customer?.contactPerson ? `${customer.contactPerson}<br/>` : ''}
            ${customer?.email ? `${customer.email}<br/>` : ''}
            ${customer?.phone ? `${customer.phone}<br/>` : ''}
            ${customer?.address ? `${customer.address}` : ''}
          </div>
        </div>
        <div class="card">
          <div class="label">Invoice Summary</div>
          <div style="margin-top:10px;display:grid;gap:8px;">
            <div><strong>Status:</strong> ${String(invoice?.status || '').replace(/_/g, ' ')}</div>
            <div><strong>Paid:</strong> ${formatCurrency(amountPaid)}</div>
            <div><strong>Balance:</strong> ${formatCurrency(balance)}</div>
            <div><strong>Tax:</strong> ${formatCurrency(taxTotal)}</div>
          </div>
        </div>
      </div>
      <table class="table">
        <thead>
          <tr>
            <th style="width:44%;">Item</th>
            <th>Qty</th>
            <th>Unit</th>
            <th>Discount</th>
            <th>Tax</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              (item) => `
            <tr>
              <td>
                <strong>${item.productName || 'Product'}</strong><br />
                <span style="color:var(--muted);font-size:.84rem;">${item.sku || ''}</span>
              </td>
              <td>${Number(item.quantity ?? 0).toLocaleString()}</td>
              <td>${formatCurrency(item.unitPrice)}</td>
              <td>${formatCurrency(item.discount)}</td>
              <td>${formatCurrency(item.tax)}</td>
              <td><strong>${formatCurrency(item.total)}</strong></td>
            </tr>`,
            )
            .join('')}
        </tbody>
      </table>
      <div class="summary">
        <div>
          ${invoice?.notes ? `<div class="note"><strong>Notes:</strong><br/>${invoice.notes}</div>` : ''}
          
        </div>
        <div class="totals">
          <div class="total-row"><span>Subtotal</span><strong>${formatCurrency(subtotal)}</strong></div>
          <div class="total-row"><span>Discount</span><strong>${formatCurrency(discountTotal)}</strong></div>
          <div class="total-row"><span>Tax</span><strong>${formatCurrency(taxTotal)}</strong></div>
          <div class="total-row grand"><span>Grand Total</span><span>${formatCurrency(totalAmount)}</span></div>
          <div class="total-row"><span>Amount Paid</span><strong>${formatCurrency(amountPaid)}</strong></div>
          <div class="total-row"><span>Balance Due</span><strong>${formatCurrency(balance)}</strong></div>
        </div>
      </div>
    </div>
    <div class="footer">
      Generated by INVEXA • ${formatDate(new Date().toISOString())}
    </div>
  </div>
</body>
</html>`

  const win = window.open('', '_blank', 'width=1200,height=900')
  if (!win) return
  win.document.open()
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => {
    win.print()
  }, 300)
}

function InvoiceForm({ onSubmit, onCancel, saving, customers, products, settings }) {
  const [form, setForm] = useState({
    customerId: '',
    paymentMethod: 'cash',
    invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
    notes: '',
    invoiceDiscount: 0,
    invoiceDiscountType: 'fixed',
    taxRate: 0,
    isDraft: false,
    items: [{ productId: '', quantity: 1, unitPrice: '', discount: 0, discountType: 'fixed', tax: 0 }],
  })
  const [formError, setFormError] = useState(null)

  const productMap = useMemo(
    () => new Map(products.map((product) => [normalizeId(product.id || product.productId || product.uuid), product])),
    [products],
  )

  const calculateRowTotal = (row) => {
    const product = productMap.get(normalizeId(row.productId))
    const unit = Number(row.unitPrice || product?.sellingPrice || 0)
    const qty = Number(row.quantity || 0)
    const gross = unit * qty
    const discount = Number(row.discount || 0)
    const afterDiscount = Math.max(gross - discount, 0)
    const tax = Number(row.tax || 0)
    return afterDiscount + tax
  }

  const invoiceTotals = useMemo(() => {
    const subtotal = form.items.reduce(
      (sum, row) => sum + Number(Number(row.unitPrice || productMap.get(normalizeId(row.productId))?.sellingPrice || 0) * Number(row.quantity || 0)),
      0,
    )
    const discountTotal = form.items.reduce((sum, row) => sum + Number(row.discount || 0), 0) + Number(form.invoiceDiscount || 0)
    const taxTotal = form.items.reduce((sum, row) => sum + Number(row.tax || 0), 0)
    return {
      subtotal,
      discountTotal,
      taxTotal,
      total: Math.max(subtotal - discountTotal + taxTotal, 0),
    }
  }, [form, productMap])

  const updateItem = (index, field, value) => {
    setForm((prev) => {
      const items = [...prev.items]
      const current = { ...items[index], [field]: field === 'productId' ? normalizeId(value) : value }
      if (field === 'productId' && value && !current.unitPrice) {
        const product = productMap.get(normalizeId(value))
        current.unitPrice = product?.sellingPrice ?? ''
      }
      items[index] = current
      return { ...prev, items }
    })
  }

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { productId: '', quantity: 1, unitPrice: '', discount: 0, discountType: 'fixed', tax: 0 }],
    }))
  }

  const removeItem = (index) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.length === 1 ? prev.items : prev.items.filter((_, currentIndex) => currentIndex !== index),
    }))
  }

  const submit = (event) => {
    event.preventDefault()
    setFormError(null)

    const normalizedItems = form.items
      .map((item) => {
        const productId = normalizeId(item.productId)
        if (!productId) {
          return null
        }

        const product = productMap.get(productId)
        if (!product) {
          return { invalidProductId: productId }
        }

        return {
          productId,
          quantity: Number(item.quantity || 0),
          unitPrice: item.unitPrice === '' ? Number(product.sellingPrice || 0) : Number(item.unitPrice),
          discount: item.discount === '' ? undefined : Number(item.discount),
          discountType: item.discountType || 'fixed',
          tax: item.tax === '' ? undefined : Number(item.tax),
        }
      })
      .filter(Boolean)

    const invalidItem = normalizedItems.find((item) => item.invalidProductId)
    if (invalidItem) {
      setFormError('One or more selected products could not be found in the loaded product list.')
      return
    }

    if (!normalizedItems.length) {
      setFormError('Please add at least one valid product item before creating the invoice.')
      return
    }

    const payload = {
      customerId: form.customerId || undefined,
      paymentMethod: form.paymentMethod,
      invoiceDate: form.invoiceDate ? new Date(form.invoiceDate).toISOString() : undefined,
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
      notes: form.notes || undefined,
      invoiceDiscount: Number(form.invoiceDiscount || 0),
      invoiceDiscountType: form.invoiceDiscountType,
      taxRate: Number(form.taxRate || 0),
      isDraft: form.isDraft,
      items: normalizedItems,
    }
    onSubmit(payload, invoiceTotals)
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-5 xl:grid-cols-[1.6fr_0.9fr]">
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Customer" icon={UserCircle2}>
            <select
              value={form.customerId}
              onChange={(e) => setForm((prev) => ({ ...prev, customerId: normalizeId(e.target.value) }))}
              className="h-11 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
            >
              <option value="">Walk-in Customer</option>
              {customers.map((customer, index) => {
                const customerId = normalizeId(customer.id || customer.customerId || customer.uuid || '')
                return (
                  <option key={customerId || customer.fullName || customer.email || `customer-${index}`} value={customerId}>
                    {customer.fullName || customer.contactPerson || customer.email || customer.name || 'Customer'}
                  </option>
                )
              })}
            </select>
          </Field>
          <Field label="Payment Method" icon={CreditCard}>
            <select
              value={form.paymentMethod}
              onChange={(e) => setForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
              className="h-11 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Invoice Date" icon={CalendarDays}>
            <input
              type="date"
              value={form.invoiceDate}
              onChange={(e) => setForm((prev) => ({ ...prev, invoiceDate: e.target.value }))}
              className="h-11 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
            />
          </Field>
          <Field label="Due Date" icon={Clock3}>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))}
              className="h-11 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
            />
          </Field>
          <Field label="Invoice Discount" icon={BadgeDollarSign}>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.invoiceDiscount}
                onChange={(e) => setForm((prev) => ({ ...prev, invoiceDiscount: e.target.value }))}
                className="h-11 flex-1 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
              />
              <select
                value={form.invoiceDiscountType}
                onChange={(e) => setForm((prev) => ({ ...prev, invoiceDiscountType: e.target.value }))}
                className="h-11 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
              >
                <option value="fixed">Fixed</option>
                <option value="percentage">%</option>
              </select>
            </div>
          </Field>
          <Field label="Tax Rate" icon={Receipt}>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.taxRate}
              onChange={(e) => setForm((prev) => ({ ...prev, taxRate: e.target.value }))}
              className="h-11 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
            />
          </Field>
        </div>

        <div className="rounded-3xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Invoice Items</h3>
              <p className="text-sm text-[var(--color-text-secondary)]">Add products, prices, discounts and taxes</p>
            </div>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Add Item
            </button>
          </div>

          <div className="space-y-4">
            {form.items.map((item, index) => (
              <div key={`${item.productId}-${index}`} className="rounded-2xl border border-[var(--color-panel-border)] p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
                  <div className="xl:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">Product</label>
                    <select
                      value={item.productId}
                      onChange={(e) => updateItem(index, 'productId', normalizeId(e.target.value))}
                      required
                      className="h-11 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
                    >
                      <option value="">Select product</option>
                      {products.map((product, index) => {
                        const productId = normalizeId(product.id || product.productId || product.uuid || '')
                        return (
                          <option key={productId || product.productName || product.sku || `product-${index}`} value={productId}>
                            {product.productName || product.name || 'Product'} ({product.sku || product.code || 'SKU'})
                          </option>
                        )
                      })}
                    </select>
                  </div>
                  <Field label="Qty">
                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                      className="h-11 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
                    />
                  </Field>
                  <Field label="Unit Price">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                      className="h-11 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
                    />
                  </Field>
                  <Field label="Discount">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.discount}
                      onChange={(e) => updateItem(index, 'discount', e.target.value)}
                      className="h-11 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
                    />
                  </Field>
                  <Field label="Discount Type">
                    <select
                      value={item.discountType}
                      onChange={(e) => updateItem(index, 'discountType', e.target.value)}
                      className="h-11 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
                    >
                      <option value="fixed">Fixed</option>
                      <option value="percentage">%</option>
                    </select>
                  </Field>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">Tax</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.tax}
                        onChange={(e) => updateItem(index, 'tax', e.target.value)}
                        className="h-11 flex-1 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="rounded-xl border border-[var(--color-panel-border)] p-2.5 text-[var(--color-text-secondary)] transition hover:bg-[var(--color-panel-strong)]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-right text-sm text-[var(--color-text-secondary)]">
                  Row total: <span className="font-semibold text-[var(--color-text-primary)]">{formatCurrency(calculateRowTotal(item))}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-4 shadow-sm">
          <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            rows={4}
            className="w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
            placeholder="Add invoice notes or payment terms"
          />
          <label className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <input
              type="checkbox"
              checked={form.isDraft}
              onChange={(e) => setForm((prev) => ({ ...prev, isDraft: e.target.checked }))}
            />
            Save as draft
          </label>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-3xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Totals</h3>
          <div className="mt-4 space-y-3">
            <SummaryRow label="Subtotal" value={formatCurrency(invoiceTotals.subtotal)} />
            <SummaryRow label="Discount" value={formatCurrency(invoiceTotals.discountTotal)} />
            <SummaryRow label="Tax" value={formatCurrency(invoiceTotals.taxTotal)} />
            <div className="border-t border-[var(--color-panel-border)] pt-3">
              <SummaryRow label="Grand Total" value={formatCurrency(invoiceTotals.total)} strong />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Print-ready</h3>
          <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
            When the invoice is saved, we can open the modern print layout immediately so the sales desk can print a polished document.
          </p>
          {formError && (
            <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-600 dark:text-rose-400">
              {formError}
            </div>
          )}
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              <FileText className="h-4 w-4" />
              {saving ? 'Saving...' : 'Create Invoice'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-[var(--color-panel-border)] px-4 py-3 text-sm font-medium text-[var(--color-text-primary)] transition hover:bg-[var(--color-panel-strong)]"
            >
              Cancel
            </button>
          </div>
        </div>

        {settings?.business && (
          <div className="rounded-3xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Business Defaults</h3>
            <div className="mt-3 space-y-2 text-sm text-[var(--color-text-secondary)]">
              <p>{settings.business.businessName}</p>
              <p>{settings.business.address || 'No address set'}</p>
              <p>{settings.business.phone || 'No phone set'}</p>
            </div>
          </div>
        )}
      </div>
    </form>
  )
}

function Field({ label, icon: Icon, children }) {
  return (
    <div>
      <label className="mb-1 flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)]">
        {Icon && <Icon className="h-4 w-4" />}
        {label}
      </label>
      {children}
    </div>
  )
}

function SummaryRow({ label, value, strong = false }) {
  return (
    <div className={`flex items-center justify-between gap-4 text-sm ${strong ? 'font-bold text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function InvoiceListTable({ invoices, onView, onPrint, onCancel }) {
  return (
    <div className="overflow-x-auto rounded-3xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] shadow-sm ">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-[var(--color-panel-border)] text-[var(--color-text-secondary)]">
          <tr>
            <th className="px-4 py-3 font-medium">Invoice</th>
            <th className="px-4 py-3 font-medium">Customer</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Method</th>
            <th className="px-4 py-3 font-medium">Total</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {invoices.length ? (
            invoices.map((invoice, index) => (
              <tr key={invoice.id || invoice.invoiceNumber || `invoice-${index}`} className="border-b border-[var(--color-panel-border)] last:border-0 hover:bg-black/5 dark:hover:bg-white/5">
                <td className="px-4 py-3">
                  <div className="font-medium text-[var(--color-text-primary)]">{invoice.invoiceNumber}</div>
                  <div className="text-xs text-[var(--color-text-secondary)]">Paid {formatCurrency(invoice.amountPaid || 0)}</div>
                </td>
                <td className="px-4 py-3 text-[var(--color-text-secondary)]">{invoice.customer?.fullName || 'Walk-in Customer'}</td>
                <td className="px-4 py-3 text-[var(--color-text-secondary)]">{formatDate(invoice.invoiceDate)}</td>
                <td className="px-4 py-3 text-[var(--color-text-secondary)]">{String(invoice.paymentMethod || '-').toUpperCase()}</td>
                <td className="px-4 py-3 font-semibold text-[var(--color-text-primary)]">{formatCurrency(invoice.totalAmount)}</td>
                <td className="px-4 py-3"><StatusBadge status={invoice.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onView(invoice.id)}
                      className="rounded-lg p-2 text-[var(--color-text-secondary)] transition hover:bg-black/5 hover:text-[var(--color-text-primary)] dark:hover:bg-white/5"
                      title="View invoice"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onPrint(invoice.id)}
                      className="rounded-lg p-2 text-[var(--color-text-secondary)] transition hover:bg-black/5 hover:text-[var(--color-text-primary)] dark:hover:bg-white/5"
                      title="Print invoice"
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                    {invoice.status !== 'cancelled' && String(invoice.paymentStatus || 'unpaid').toLowerCase() === 'unpaid' && (
                      <button
                        type="button"
                        onClick={() => onCancel(invoice.id)}
                        className="rounded-lg p-2 text-[var(--color-text-secondary)] transition hover:bg-black/5 hover:text-rose-600 dark:hover:bg-white/5"
                        title="Cancel invoice"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-[var(--color-text-secondary)]">
                No invoices found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function InvoiceDetailCard({ invoice, onPrint, onCancel, onClose }) {
  if (!invoice) return null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-text-tertiary)]">Invoice</p>
              <h3 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)]">{invoice.invoiceNumber}</h3>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{formatDate(invoice.invoiceDate)}</p>
            </div>
            <StatusBadge status={invoice.status} />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoBlock icon={UserCircle2} label="Customer" value={invoice.customer?.fullName || 'Walk-in Customer'} />
            <InfoBlock icon={CreditCard} label="Payment" value={String(invoice.paymentMethod || '-').toUpperCase()} />
            <InfoBlock icon={CalendarDays} label="Due Date" value={formatDate(invoice.dueDate)} />
            <InfoBlock icon={BadgeDollarSign} label="Balance" value={formatCurrency(invoice.balance)} />
          </div>
        </div>
        <div className="rounded-3xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Actions</h3>
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => onPrint(invoice.id)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              <Printer className="h-4 w-4" />
              Print Invoice
            </button>
            {invoice.status !== 'cancelled' && String(invoice.paymentStatus || 'unpaid').toLowerCase() === 'unpaid' && (
              <button
                type="button"
                onClick={() => onCancel(invoice.id)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-500/20 dark:text-rose-400"
              >
                <Trash2 className="h-4 w-4" />
                {invoice.status === 'draft' ? 'Cancel Draft' : 'Reverse Invoice'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--color-panel-border)] px-4 py-3 text-sm font-medium text-[var(--color-text-primary)] transition hover:bg-[var(--color-panel-strong)]"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Line Items</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--color-panel-border)] text-[var(--color-text-secondary)]">
              <tr>
                <th className="pb-2 pr-4 font-medium">Product</th>
                <th className="pb-2 pr-4 font-medium">Qty</th>
                <th className="pb-2 pr-4 font-medium">Unit</th>
                <th className="pb-2 pr-4 font-medium">Discount</th>
                <th className="pb-2 pr-4 font-medium">Tax</th>
                <th className="pb-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item, index) => (
                <tr key={item.id || item.productId || item.sku || `item-${index}`} className="border-b border-[var(--color-panel-border)] last:border-0">
                  <td className="py-3 pr-4">
                    <div className="font-medium text-[var(--color-text-primary)]">{item.productName || 'Product'}</div>
                    <div className="text-xs text-[var(--color-text-secondary)]">{item.sku || '-'}</div>
                  </td>
                  <td className="py-3 pr-4 text-[var(--color-text-secondary)]">{Number(item.quantity ?? 0).toLocaleString()}</td>
                  <td className="py-3 pr-4 text-[var(--color-text-secondary)]">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-3 pr-4 text-[var(--color-text-secondary)]">{formatCurrency(item.discount)}</td>
                  <td className="py-3 pr-4 text-[var(--color-text-secondary)]">{formatCurrency(item.tax)}</td>
                  <td className="py-3 font-semibold text-[var(--color-text-primary)]">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-3xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Business & Customer</h3>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoBlock icon={Receipt} label="Business" value={invoice.business?.businessName || '-'} />
            <InfoBlock icon={FileText} label="Business Email" value={invoice.business?.email || '-'} />
            <InfoBlock icon={Phone} label="Business Phone" value={invoice.business?.phone || '-'} />
            <InfoBlock icon={AlertTriangle} label="Business TIN" value={invoice.business?.tin || '-'} />
          </div>
          {invoice.notes && <div className="mt-4 rounded-2xl border border-[var(--color-panel-border)] bg-black/5 p-4 text-sm text-[var(--color-text-secondary)] dark:bg-white/5">{invoice.notes}</div>}
        </div>
        <div className="rounded-3xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Totals</h3>
          <div className="mt-4 space-y-3">
            <SummaryRow label="Subtotal" value={formatCurrency(invoice.subtotal)} />
            <SummaryRow label="Discount" value={formatCurrency(invoice.discountTotal)} />
            <SummaryRow label="Tax" value={formatCurrency(invoice.taxTotal)} />
            <div className="border-t border-[var(--color-panel-border)] pt-3">
              <SummaryRow label="Grand Total" value={formatCurrency(invoice.totalAmount)} strong />
            </div>
            <SummaryRow label="Amount Paid" value={formatCurrency(invoice.amountPaid)} />
            <SummaryRow label="Balance" value={formatCurrency(invoice.balance)} />
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoBlock({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-[var(--color-panel-border)] px-3 py-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-sm font-medium text-[var(--color-text-primary)]">{value || '-'}</p>
    </div>
  )
}

function useInvoiceId() {
  const path = useQueryHash()
  const match = path.match(/^\/invoices\/([^/]+)$/)
  return match?.[1] || null
}

function useInvoiceData() {
  const [businessSettings, setBusinessSettings] = useState(null)
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])

  useEffect(() => {
    const load = async () => {
      try {
        const [settingsResult, customerResult, productResult] = await Promise.allSettled([
          settingsApi.all(),
          customersApi.list({ limit: 100 }),
          productsApi.list({ limit: 100 }),
        ])

        if (settingsResult.status === 'fulfilled') {
          setBusinessSettings(settingsResult.value)
        }

        if (customerResult.status === 'fulfilled') {
          setCustomers(normalizeListItems(customerResult.value))
        }

        if (productResult.status === 'fulfilled') {
          setProducts(normalizeListItems(productResult.value))
        }
      } catch (error) {
        // Keep the form usable even if one auxiliary request fails.
        console.warn('Invoice workspace preload failed', error)
      }
    }
    load()
  }, [])

  return { businessSettings, customers, products }
}

export function InvoiceWorkspace({ mode = 'list' }) {
  const { getBrandPrimary, getBrandSecondary } = useThemeContext()
  const primaryColor = getBrandPrimary?.() || '#064789'
  const secondaryColor = getBrandSecondary?.() || '#427aa1'
  const invoiceId = useInvoiceId()

  const { businessSettings, customers, products } = useInvoiceData()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(mode === 'create')
  const [createSaving, setCreateSaving] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)

  const fetchInvoices = useCallback(async () => {
    try {
      setRefreshing(true)
      setError(null)
      const data = await invoicesApi.list({
        page,
        limit,
        search: search || undefined,
        status: statusFilter || undefined,
        paymentMethod: paymentFilter || undefined,
      })
      setInvoices(data.items || [])
      setTotal(data.total || 0)
    } catch (err) {
      setError(err?.message || 'Failed to load invoices.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [page, limit, search, statusFilter, paymentFilter])

  useEffect(() => {
    if (mode !== 'detail') {
      fetchInvoices()
    }
  }, [fetchInvoices, mode])

  useEffect(() => {
    if (mode !== 'detail' || !invoiceId) return

    const loadDetail = async () => {
      try {
        setDetailLoading(true)
        const data = await invoicesApi.detail(invoiceId)
        setSelectedInvoice(data)
        setDetailOpen(true)
      } catch (err) {
        setError(err?.message || 'Failed to load invoice details.')
      } finally {
        setLoading(false)
        setDetailLoading(false)
      }
    }

    loadDetail()
  }, [invoiceId, mode])

  const stats = useMemo(() => {
    const paid = invoices.filter((item) => item.status === 'paid').length
    const draft = invoices.filter((item) => item.status === 'draft').length
    const totalRevenue = invoices.reduce((sum, item) => sum + Number(item.totalAmount ?? 0), 0)
    const balance = invoices.reduce((sum, item) => sum + Number(item.balance ?? 0), 0)
    return { paid, draft, totalRevenue, balance }
  }, [invoices])

  const openDetail = async (id) => {
    try {
      setDetailLoading(true)
      const data = await invoicesApi.detail(id)
      setSelectedInvoice(data)
      setDetailOpen(true)
    } catch (err) {
      setError(err?.message || 'Failed to load invoice details.')
    } finally {
      setDetailLoading(false)
    }
  }

  const doPrint = async (id, fallbackData) => {
    try {
      const data = fallbackData || (await invoicesApi.printData(id))
      makePrintWindow(data)
    } catch (err) {
      setError(err?.message || 'Failed to load print data.')
    }
  }

  const cancelInvoice = async (id) => {
    const reason = window.prompt('Reason for cancellation:')
    if (!reason) return
    try {
      await invoicesApi.cancel(id, { reason })
      await fetchInvoices()
      if (detailOpen && selectedInvoice?.id === id) {
        const refreshed = await invoicesApi.detail(id)
        setSelectedInvoice(refreshed)
      }
    } catch (err) {
      setError(err?.message || 'Failed to cancel invoice.')
    }
  }

  const submitCreate = async (payload) => {
    try {
      setCreateSaving(true)
      const created = await invoicesApi.create(payload)
      setCreateOpen(false)
      await fetchInvoices()
      await doPrint(created.id, created)
      if (mode === 'create') {
        navigateTo(`/invoices/${created.id}`)
      }
    } catch (err) {
      setError(err?.message || 'Failed to create invoice.')
    } finally {
      setCreateSaving(false)
    }
  }

  const totalPages = Math.max(Math.ceil(total / limit), 1)

  const listContent = (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InvoiceStat icon={Receipt} label="Invoices" value={total.toLocaleString()} color={primaryColor} loading={loading} />
        <InvoiceStat icon={BadgeDollarSign} label="Revenue" value={formatCurrency(stats.totalRevenue)} color={secondaryColor} loading={loading} />
        <InvoiceStat icon={CreditCard} label="Paid" value={stats.paid.toLocaleString()} color="#10b981" loading={loading} />
        <InvoiceStat icon={AlertTriangle} label="Drafts" value={stats.draft.toLocaleString()} color="#f59e0b" loading={loading} />
      </div><br/>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchInvoices(); }} className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by invoice, customer, or notes..."
              className="h-11 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] pl-9 pr-4 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:border-[var(--brand-primary)] focus:outline-none"
            />
          </div>
          <button type="submit" className="rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="h-11 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="paid">Paid</option>
            <option value="posted">Posted</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={paymentFilter}
            onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }}
            className="h-11 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
          >
            <option value="">All payment methods</option>
            <option value="cash">Cash</option>
            <option value="credit">Credit</option>
          </select>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New Invoice
          </button>
          <button
            type="button"
            onClick={fetchInvoices}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition hover:bg-[var(--color-panel-strong)] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div><br/>

      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button type="button" onClick={fetchInvoices} className="mt-4 rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
            Retry
          </button>
        </div>
      ) : loading && !invoices.length ? (
        <div className="flex min-h-[24rem] items-center justify-center rounded-3xl border border-[var(--color-panel-border)] bg-[var(--color-panel)]">
          <Loader size="lg" label="Loading invoices..." />
        </div>
      ) : (
        <>
          <InvoiceListTable
            invoices={loading ? Array.from({ length: 5 }).map((_, index) => ({ id: `sk-${index}` })) : invoices}
            onView={openDetail}
            onPrint={doPrint}
            onCancel={cancelInvoice}
          />
          {totalPages > 1 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[var(--color-text-secondary)]">
                Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
              </p>
              <div className="flex gap-1">
                <button type="button" onClick={() => setPage((current) => Math.max(current - 1, 1))} disabled={page === 1} className="rounded-lg border border-[var(--color-panel-border)] p-2 text-[var(--color-text-secondary)] transition hover:bg-[var(--color-panel-strong)] disabled:opacity-40">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setPage((current) => Math.min(current + 1, totalPages))} disabled={page === totalPages} className="rounded-lg border border-[var(--color-panel-border)] p-2 text-[var(--color-text-secondary)] transition hover:bg-[var(--color-panel-strong)] disabled:opacity-40">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )

  return (
    <PageContainer
      title="Invoices"
      subtitle="Create, print, and manage invoices with a polished sales workflow."
      actions={null}
    >
      {mode !== 'detail' && listContent}

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create Invoice">
        <InvoiceForm
          onSubmit={submitCreate}
          onCancel={() => setCreateOpen(false)}
          saving={createSaving}
          customers={customers}
          products={products}
          settings={businessSettings}
        />
      </Modal>

      <Drawer
        isOpen={detailOpen || mode === 'detail'}
        onClose={() => {
          if (mode !== 'detail') setDetailOpen(false)
          if (mode === 'detail') navigateTo('/invoices')
        }}
        title={selectedInvoice?.invoiceNumber || invoiceId || 'Invoice'}
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
          </div>
        ) : selectedInvoice ? (
          <InvoiceDetailCard
            invoice={selectedInvoice}
            onPrint={async (id) => doPrint(id, selectedInvoice)}
            onCancel={cancelInvoice}
            onClose={() => {
              if (mode !== 'detail') setDetailOpen(false)
              if (mode === 'detail') navigateTo('/invoices')
            }}
          />
        ) : null}
      </Drawer>
    </PageContainer>
  )
}

export default InvoiceWorkspace
