import { request } from './client.js'

function buildQuery(params = {}) {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  return new URLSearchParams(entries).toString()
}

export const customersApi = {
  list: (params = {}) => {
    const query = buildQuery(params)
    return request(`/customers${query ? `?${query}` : ''}`)
  },
  detail: (id) => request(`/customers/${id}`),
  profile: (id) => request(`/customers/${id}/profile`),
  history: (id) => request(`/customers/${id}/history`),
  create: (payload) => request('/customers', { method: 'POST', body: payload }),
  update: (id, payload) => request(`/customers/${id}`, { method: 'PATCH', body: payload }),
  remove: (id) => request(`/customers/${id}`, { method: 'DELETE' }),
}
