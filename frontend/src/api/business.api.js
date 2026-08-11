import { request } from './client.js'

function buildQuery(params = {}) {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  return new URLSearchParams(entries).toString()
}

export const businessApi = {
  list: (params = {}) => {
    const query = buildQuery(params)
    return request(`/businesses${query ? `?${query}` : ''}`)
  },
  detail: (id) => request(`/businesses/${id}`),
  create: (payload) => request('/businesses', { method: 'POST', body: payload }),
  register: (payload) => request('/businesses/register', { method: 'POST', body: payload, auth: false }),
  update: (id, payload) => request(`/businesses/${id}`, { method: 'PATCH', body: payload }),
  profile: (id) => request(`/businesses/${id}/profile`),
}

