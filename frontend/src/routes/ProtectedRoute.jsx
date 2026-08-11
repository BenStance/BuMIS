export function ProtectedRoute({ isAuthenticated, children }) {
  if (!isAuthenticated) {
    window.history.replaceState({}, '', '/login')
    window.dispatchEvent(new PopStateEvent('popstate'))
    return null
  }

  return children
}
