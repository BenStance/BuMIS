import { request } from './client.js'

function buildQuery(params = {}) {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  return new URLSearchParams(entries).toString()
}

export const invoicesApi = {
  list: (params = {}) => {
    const query = buildQuery(params)
    return request(`/invoices${query ? `?${query}` : ''}`)
  },
  search: (params = {}) => {
    const query = buildQuery(params)
    return request(`/invoices/search${query ? `?${query}` : ''}`)
  },
  detail: (id) => request(`/invoices/${id}`),
  printData: (id) => request(`/invoices/${id}/print-data`),
  create: (payload) => request('/invoices', { method: 'POST', body: payload }),
  updateDraft: (id, payload) => request(`/invoices/${id}`, { method: 'PATCH', body: payload }),
  cancel: (id, payload) => request(`/invoices/${id}/cancel`, { method: 'POST', body: payload }),
}
