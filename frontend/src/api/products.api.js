import { request } from './client.js'

export const productsApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/products${query ? `?${query}` : ''}`)
  },
  lowStock: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/products/low-stock${query ? `?${query}` : ''}`)
  },
  detail: (id) => request(`/products/${id}`),
  history: (id) => request(`/products/${id}/history`),
  create: (payload) => request('/products', { method: 'POST', body: payload }),
  update: (id, payload) => request(`/products/${id}`, { method: 'PATCH', body: payload }),
  remove: (id) => request(`/products/${id}`, { method: 'DELETE' }),
}
