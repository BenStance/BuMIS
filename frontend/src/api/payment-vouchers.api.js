import { request } from './client.js'

function buildQuery(params = {}) {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  return new URLSearchParams(entries).toString()
}

export const paymentVouchersApi = {
  list: (params = {}) => {
    const query = buildQuery(params)
    return request(`/payment-vouchers${query ? `?${query}` : ''}`)
  },
  detail: (id) => request(`/payment-vouchers/${id}`),
  create: (payload) => request('/payment-vouchers', { method: 'POST', body: payload }),
  post: (id) => request(`/payment-vouchers/${id}/post`, { method: 'POST' }),
  void: (id, payload) => request(`/payment-vouchers/${id}/void`, { method: 'POST', body: payload }),
}
