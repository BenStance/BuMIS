import { getAccessToken, getRefreshToken, setAccessToken } from '../utils/storage.js'
import { navigateTo } from '../utils/navigation.js'

const defaultBaseUrl = '/api'
const isDev = import.meta.env.DEV

function logRequest(direction, method, path, statusOrMessage, durationMs) {
  if (!isDev) {
    return
  }

  const label = `[API] ${direction} ${method} ${path}`
  if (direction === 'ERROR') {
    console.error(`${label} ${statusOrMessage}${durationMs != null ? ` (${durationMs}ms)` : ''}`)
    return
  }

  console.info(`${label} ${statusOrMessage}${durationMs != null ? ` (${durationMs}ms)` : ''}`)
}

function isFormDataLike(value) {
  if (!value || typeof value !== 'object') {
    return false
  }

  if (typeof FormData !== 'undefined' && value instanceof FormData) {
    return true
  }

  return Object.prototype.toString.call(value) === '[object FormData]'
}

async function tryRefreshAccessToken(baseUrl) {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    return null
  }

  try {
    const response = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    if (data?.accessToken) {
      setAccessToken(data.accessToken)
      return data.accessToken
    }
  } catch {
    return null
  }

  return null
}

export async function request(path, options = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    auth = true,
    retryOnAuthFailure = true,
  } = options

  const baseUrl = import.meta.env.VITE_API_BASE_URL || defaultBaseUrl
  const startedAt = performance.now()
  logRequest('->', method, path, auth ? 'auth' : 'public')

  let response
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(isFormDataLike(body) ? {} : { 'Content-Type': 'application/json' }),
        ...(auth ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
        ...headers,
      },
      body:
        body === undefined || body === null
          ? undefined
          : isFormDataLike(body)
            ? body
            : JSON.stringify(body),
    })
  } catch (error) {
    logRequest('ERROR', method, path, error instanceof Error ? error.message : String(error), Math.round(performance.now() - startedAt))
    throw error
  }

  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text()
  const elapsed = Math.round(performance.now() - startedAt)

  if (!response.ok) {
    const message = typeof data === 'string' ? data : data?.message || data?.error || 'Request failed'
    const error = new Error(Array.isArray(message) ? message.join(', ') : message)
    error.status = response.status
    error.data = data

    if (response.status === 401 && auth && retryOnAuthFailure && !path.startsWith('/auth/refresh')) {
      const refreshedToken = await tryRefreshAccessToken(baseUrl)
      if (refreshedToken) {
        return request(path, { ...options, retryOnAuthFailure: false })
      }
    }

    if (
      response.status === 403 &&
      typeof data === 'object' &&
      data &&
      (data.redirect || String(data.message || '').toLowerCase().includes('subscription required'))
    ) {
      navigateTo(data.redirect || '/subscription-control', { replace: true })
    }
    logRequest('ERROR', method, path, `${response.status} ${error.message}`, elapsed)
    throw error
  }

  logRequest('<-', method, path, response.status, elapsed)
  return data
}
