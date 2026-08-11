export function navigateTo(path, { replace = false } = {}) {
  if (typeof window === 'undefined') {
    return;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (replace) {
    window.history.replaceState({}, '', normalizedPath);
  } else {
    window.history.pushState({}, '', normalizedPath);
  }
  window.dispatchEvent(new PopStateEvent('popstate'));
}

