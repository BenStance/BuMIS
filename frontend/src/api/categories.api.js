import { request } from './client.js'

function buildQuery(params = {}) {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  return new URLSearchParams(entries).toString()
}

export const categoriesApi = {
  list: (params = {}) => {
    const query = buildQuery(params)
    return request(`/categories${query ? `?${query}` : ''}`)
  },
  detail: (id) => request(`/categories/${id}`),
  create: (payload) => request('/categories', { method: 'POST', body: payload }),
  update: (id, payload) => request(`/categories/${id}`, { method: 'PATCH', body: payload }),
  remove: (id) => request(`/categories/${id}`, { method: 'DELETE' }),
}
