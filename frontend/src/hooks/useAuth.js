import { useEffect, useState } from 'react'
import { logout as logoutRequest, me as fetchMe } from '../api/auth.api.js'
import { clearSession, getAccessToken, getCurrentUser, getRefreshToken, setAccessToken, setCurrentUser, setRefreshToken } from '../utils/storage.js'
import { navigateTo } from '../utils/navigation.js'

export function useAuth() {
  const [token, setToken] = useState(getAccessToken())
  const [user, setUser] = useState(getCurrentUser())
  const [loading, setLoading] = useState(Boolean(getAccessToken()) && !getCurrentUser())

  useEffect(() => {
    const sync = () => {
      setToken(getAccessToken())
      setUser(getCurrentUser())
    }

    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  useEffect(() => {
    if (!token || user) {
      return
    }

    let active = true
    setLoading(true)

    fetchMe()
      .then((profile) => {
        if (!active) {
          return
        }
        setUser(profile)
        setCurrentUser(profile)
      })
      .catch(() => {
        if (!active) {
          return
        }
        clearSession()
        setToken('')
        setUser(null)
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [token, user])

  const setSession = (session) => {
    const nextUser = session.user
      ? {
          ...session.user,
          subscription: session.subscription ?? session.user.subscription ?? null,
          needsSubscription: Boolean(session.needsSubscription),
        }
      : null
    setAccessToken(session.accessToken || '')
    setRefreshToken(session.refreshToken || '')
    if (nextUser) {
      setCurrentUser(nextUser)
      setUser(nextUser)
    }
    setToken(session.accessToken || '')
    window.dispatchEvent(new Event('storage'))
  }

  const logout = async () => {
    const refreshToken = getRefreshToken()

    if (refreshToken) {
      try {
        await logoutRequest({ refreshToken })
      } catch {
        // Local logout should still succeed even if the server token is already invalid.
      }
    }

    clearSession()
    setToken('')
    setUser(null)
    window.dispatchEvent(new Event('storage'))
    navigateTo('/login', { replace: true })
  }

  return {
    token,
    user,
    loading,
    isAuthenticated: Boolean(token),
    setSession,
    logout,
  }
}
