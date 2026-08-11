import { request } from './client.js'

function buildQuery(params = {}) {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  return new URLSearchParams(entries).toString()
}

export const vendorsApi = {
  list: (params = {}) => {
    const query = buildQuery(params)
    return request(`/vendors${query ? `?${query}` : ''}`)
  },
  detail: (id) => request(`/vendors/${id}`),
  profile: (id) => request(`/vendors/${id}/profile`),
  create: (payload) => request('/vendors', { method: 'POST', body: payload }),
  update: (id, payload) => request(`/vendors/${id}`, { method: 'PATCH', body: payload }),
  remove: (id) => request(`/vendors/${id}`, { method: 'DELETE' }),
}
