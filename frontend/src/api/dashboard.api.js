import { request } from './client.js'

export const dashboardApi = {
  summary: () => request('/dashboard/summary'),
  todaySales: () => request('/dashboard/today-sales'),
  recentInvoices: () => request('/dashboard/recent-invoices'),
  lowStock: () => request('/dashboard/low-stock'),
  bestSellingProducts: () => request('/dashboard/best-selling-products'),
}
