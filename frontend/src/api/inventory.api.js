import { request } from './client.js'

function buildQuery(params = {}) {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  return new URLSearchParams(entries).toString()
}

export const inventoryApi = {
  transactions: (params = {}) => {
    const query = buildQuery(params)
    return request(`/inventory/transactions${query ? `?${query}` : ''}`)
  },
  lowStock: (params = {}) => {
    const query = buildQuery(params)
    return request(`/inventory/low-stock${query ? `?${query}` : ''}`)
  },
  productStock: (productId) => request(`/inventory/products/${productId}/stock`),
  stockIn: (payload) => request('/inventory/stock-in', { method: 'POST', body: payload }),
  stockOut: (payload) => request('/inventory/stock-out', { method: 'POST', body: payload }),
  adjustment: (payload) => request('/inventory/adjustments', { method: 'POST', body: payload }),
}
