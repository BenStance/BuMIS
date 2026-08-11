export function formatDateTime(value) {
  if (!value) {
    return '-'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function formatDate(value) {
  if (!value) {
    return '-'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(date)
}

export function formatCurrency(value, currency = 'TZS') {
  const amount = Number(value ?? 0)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isNaN(amount) ? 0 : amount)
}

export function formatNumber(value) {
  const amount = Number(value ?? 0)
  return new Intl.NumberFormat('en-US').format(Number.isNaN(amount) ? 0 : amount)
}

export function formatPercent(value) {
  const amount = Number(value ?? 0)
  return `${(Number.isNaN(amount) ? 0 : amount * 100).toFixed(1)}%`
}
