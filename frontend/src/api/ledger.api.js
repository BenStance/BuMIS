import { request } from './client.js'

function buildQuery(params = {}) {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  return new URLSearchParams(entries).toString()
}

export const ledgerApi = {
  accounts: (params = {}) => {
    const query = buildQuery(params)
    return request(`/ledger/accounts${query ? `?${query}` : ''}`)
  },
  entries: (params = {}) => {
    const query = buildQuery(params)
    return request(`/ledger/entries${query ? `?${query}` : ''}`)
  },
}
