import { request } from './client.js'

export const permissionsApi = {
  list: () => request('/permissions'),
  detail: (id) => request(`/permissions/${id}`),
  create: (payload) => request('/permissions', { method: 'POST', body: payload }),
  update: (id, payload) => request(`/permissions/${id}`, { method: 'PATCH', body: payload }),
  remove: (id) => request(`/permissions/${id}`, { method: 'DELETE' }),
}

