import { request } from './client.js'

function buildQuery(params = {}) {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  return new URLSearchParams(entries).toString()
}

export const adminApi = {
  dashboard: () => request('/admin/dashboard'),
  businesses: (params = {}) => {
    const query = buildQuery(params)
    return request(`/admin/businesses${query ? `?${query}` : ''}`)
  },
  business: (id) => request(`/admin/businesses/${id}`),
  statistics: () => request('/admin/statistics'),
  activeUsers: (params = {}) => {
    const query = buildQuery(params)
    return request(`/admin/users/active${query ? `?${query}` : ''}`)
  },
  subscriptions: (params = {}) => {
    const query = buildQuery(params)
    return request(`/admin/subscriptions${query ? `?${query}` : ''}`)
  },
  revenue: () => request('/admin/revenue'),
  loginAsBusiness: (id) => request(`/admin/login-as-business/${id}`, { method: 'POST', body: {} }),
  renewSubscription: (id, payload) => request(`/admin/subscriptions/${id}/renew`, { method: 'PATCH', body: payload }),
  updateSubscriptionStatus: (id, payload) => request(`/admin/subscriptions/${id}/status`, { method: 'PATCH', body: payload }),
}
