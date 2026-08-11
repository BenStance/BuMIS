import { request } from './client.js'

export const settingsApi = {
  all: () => request('/settings'),
  category: (category) => request(`/settings/${category}`),
  updateBusiness: (payload) => request('/settings/business', { method: 'PATCH', body: payload }),
  updateSmtp: (payload) => request('/settings/smtp', { method: 'PATCH', body: payload }),
  updateInvoice: (payload) => request('/settings/invoice', { method: 'PATCH', body: payload }),
  updateCurrency: (payload) => request('/settings/currency', { method: 'PATCH', body: payload }),
  updateTax: (payload) => request('/settings/tax', { method: 'PATCH', body: payload }),
}
