import { request } from './client.js'

export const rolesApi = {
  list: () => request('/roles'),
  detail: (id) => request(`/roles/${id}`),
  create: (payload) => request('/roles', { method: 'POST', body: payload }),
  update: (id, payload) => request(`/roles/${id}`, { method: 'PATCH', body: payload }),
  remove: (id) => request(`/roles/${id}`, { method: 'DELETE' }),
  assignPermissions: (id, permissionIds) => request(`/roles/${id}/permissions`, { method: 'POST', body: { permissionIds } }),
}

