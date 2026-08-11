import { request } from './client.js'

export const auditApi = {
  logs: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/audit/logs${query ? `?${query}` : ''}`)
  },
  summary: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/audit/summary${query ? `?${query}` : ''}`)
  },
}
