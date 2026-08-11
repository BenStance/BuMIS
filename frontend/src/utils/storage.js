import { API_KEYS } from '../constants/apiKeys.js'

function readJson(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function getAccessToken() {
  return localStorage.getItem(API_KEYS.ACCESS_TOKEN) || ''
}

export function setAccessToken(token) {
  localStorage.setItem(API_KEYS.ACCESS_TOKEN, token || '')
}

export function getRefreshToken() {
  return localStorage.getItem(API_KEYS.REFRESH_TOKEN) || ''
}

export function setRefreshToken(token) {
  localStorage.setItem(API_KEYS.REFRESH_TOKEN, token || '')
}

export function getCurrentUser() {
  return readJson(API_KEYS.CURRENT_USER, null)
}

export function setCurrentUser(user) {
  writeJson(API_KEYS.CURRENT_USER, user)
}

export function clearSession() {
  localStorage.removeItem(API_KEYS.ACCESS_TOKEN)
  localStorage.removeItem(API_KEYS.REFRESH_TOKEN)
  localStorage.removeItem(API_KEYS.CURRENT_USER)
}
