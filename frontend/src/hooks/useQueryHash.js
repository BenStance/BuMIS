import { useEffect, useState } from 'react'

function readPath() {
  if (typeof window === 'undefined') {
    return '/';
  }

  return window.location.pathname || '/';
}

export function useQueryHash() {
  const [path, setPath] = useState(readPath)

  useEffect(() => {
    const onChange = () => setPath(readPath())
    window.addEventListener('popstate', onChange)
    window.addEventListener('hashchange', onChange)
    return () => {
      window.removeEventListener('popstate', onChange)
      window.removeEventListener('hashchange', onChange)
    }
  }, [])

  return path
}
