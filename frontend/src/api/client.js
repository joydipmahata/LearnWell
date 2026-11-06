const API_BASE = '/api';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('learnwell_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  // If body is FormData (e.g. CSV upload), remove Content-Type header so browser sets multipart boundary
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // If unauthorized in normal mode, could clear token
    // In DEMO_MODE backend never 401s for logged in user
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.detail || 'An error occurred';
    throw new Error(errorMsg);
  }

  return data;
}
