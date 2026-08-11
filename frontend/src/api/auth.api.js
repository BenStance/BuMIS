import { request } from './client.js'

export function login(payload) {
  return request('/auth/login', { method: 'POST', body: payload, auth: false })
}

export function me() {
  return request('/auth/me')
}

export function forgotPassword(payload) {
  return request('/auth/forgot-password', { method: 'POST', body: payload, auth: false })
}

export function resetPassword(payload) {
  return request('/auth/reset-password', { method: 'POST', body: payload, auth: false })
}

export function changePassword(payload) {
  return request('/auth/change-password', { method: 'POST', body: payload })
}

export function refreshToken(payload) {
  return request('/auth/refresh', { method: 'POST', body: payload, auth: false })
}

export function logout(payload) {
  return request('/auth/logout', { method: 'POST', body: payload })
}
