export const API_BASE_URL = (typeof window !== 'undefined' && window.location && window.location.port === '5173')
  ? 'http://localhost:3001/api'
  : '/api'
