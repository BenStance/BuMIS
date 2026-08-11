import { request } from './client.js'

export const subscriptionsApi = {
  plans: () => request('/subscriptions/plans'),
  my: () => request('/subscriptions/me'),
  request: (payload) => request('/subscriptions/businesses/request', { method: 'POST', body: payload }),
  createPlan: (payload) => request('/subscriptions/plans', { method: 'POST', body: payload }),
  updatePlan: (id, payload) => request(`/subscriptions/plans/${id}`, { method: 'PATCH', body: payload }),
  deletePlan: (id) => request(`/subscriptions/plans/${id}`, { method: 'DELETE' }),
  createBusinessSubscription: (payload) => request('/subscriptions/businesses', { method: 'POST', body: payload }),
  renew: (id, payload) => request(`/subscriptions/${id}/renew`, { method: 'POST', body: payload }),
  business: (businessId) => request(`/subscriptions/businesses/${businessId}`),
}
