import { request } from './client.js'

export const usersApi = {
  list: () => request('/users'),
  detail: (id) => request(`/users/${id}`),
  create: (payload) => request('/users', { method: 'POST', body: payload }),
  update: (id, payload) => request(`/users/${id}`, { method: 'PATCH', body: payload }),
  remove: (id) => request(`/users/${id}`, { method: 'DELETE' }),
  activate: (id) => request(`/users/${id}/activate`, { method: 'POST' }),
  deactivate: (id) => request(`/users/${id}/deactivate`, { method: 'POST' }),
  assignRole: (id, payload) => request(`/users/${id}/role`, { method: 'POST', body: payload }),
  assignPermissions: (id, payload) => request(`/users/${id}/permissions`, { method: 'POST', body: payload }),
  profile: (id) => request(`/users/${id}/profile`),
}

