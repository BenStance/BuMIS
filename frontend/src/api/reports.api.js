import { request } from './client.js'

function buildQuery(params = {}) {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  return new URLSearchParams(entries).toString()
}

export const reportsApi = {
  dailySales: (params = {}) => {
    const query = buildQuery(params)
    return request(`/reports/sales/daily${query ? `?${query}` : ''}`)
  },
  monthlySales: (params = {}) => {
    const query = buildQuery(params)
    return request(`/reports/sales/monthly${query ? `?${query}` : ''}`)
  },
  annualSales: (params = {}) => {
    const query = buildQuery(params)
    return request(`/reports/sales/annual${query ? `?${query}` : ''}`)
  },
  customerReport: (id) => request(`/reports/customers/${id}`),
  productReports: (params = {}) => {
    const query = buildQuery(params)
    return request(`/reports/products${query ? `?${query}` : ''}`)
  },
  inventoryReports: () => request('/reports/inventory'),
  invoiceReports: (params = {}) => {
    const query = buildQuery(params)
    return request(`/reports/invoices${query ? `?${query}` : ''}`)
  },
  salesTrends: (params = {}) => {
    const query = buildQuery(params)
    return request(`/reports/trends${query ? `?${query}` : ''}`)
  },
}
