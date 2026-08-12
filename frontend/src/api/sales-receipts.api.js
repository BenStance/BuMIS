import { request } from './client.js'

function buildQuery(params = {}) {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  return new URLSearchParams(entries).toString()
}

export const salesReceiptsApi = {
  list: (params = {}) => {
    const query = buildQuery(params)
    return request(`/sales-receipts${query ? `?${query}` : ''}`)
  },
  detail: (id) => request(`/sales-receipts/${id}`),
  create: (payload) => request('/sales-receipts', { method: 'POST', body: payload }),
  post: (id) => request(`/sales-receipts/${id}/post`, { method: 'POST' }),
  void: (id, payload) => request(`/sales-receipts/${id}/void`, { method: 'POST', body: payload }),
}
