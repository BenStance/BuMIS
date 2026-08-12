import { request } from './client.js'

function buildQuery(params = {}) {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  return new URLSearchParams(entries).toString()
}

export const purchaseInvoicesApi = {
  list: (params = {}) => {
    const query = buildQuery(params)
    return request(`/purchase-invoices${query ? `?${query}` : ''}`)
  },
  detail: (id) => request(`/purchase-invoices/${id}`),
  create: (payload) => request('/purchase-invoices', { method: 'POST', body: payload }),
  post: (id) => request(`/purchase-invoices/${id}/post`, { method: 'POST' }),
  reverse: (id, payload) => request(`/purchase-invoices/${id}/reverse`, { method: 'POST', body: payload }),
}
