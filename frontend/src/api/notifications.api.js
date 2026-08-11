import { request } from './client.js'

function buildQuery(params = {}) {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  return new URLSearchParams(entries).toString()
}

export const notificationsApi = {
  list: (params = {}) => {
    const query = buildQuery(params)
    return request(`/notifications${query ? `?${query}` : ''}`)
  },
  markRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: (params = {}) => {
    const query = buildQuery(params)
    return request(`/notifications/read-all${query ? `?${query}` : ''}`, { method: 'POST' })
  },
}
