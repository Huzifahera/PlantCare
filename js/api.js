// PlantCare - API Configuration & Reusable Request Layer

const API_BASE_URL = 'http://127.0.0.1:8000';

const TOKEN_KEYS = {
  access: 'plantcare_access_token',
  refresh: 'plantcare_refresh_token',
  username: 'plantcare_username',
};

function getAccessToken() {
  return localStorage.getItem(TOKEN_KEYS.access);
}

function getRefreshToken() {
  return localStorage.getItem(TOKEN_KEYS.refresh);
}

function getStoredUsername() {
  return localStorage.getItem(TOKEN_KEYS.username);
}

function setAuthTokens({ access, refresh, username }) {
  if (access) localStorage.setItem(TOKEN_KEYS.access, access);
  if (refresh) localStorage.setItem(TOKEN_KEYS.refresh, refresh);
  if (username) localStorage.setItem(TOKEN_KEYS.username, username);
}

function clearAuthTokens() {
  localStorage.removeItem(TOKEN_KEYS.access);
  localStorage.removeItem(TOKEN_KEYS.refresh);
  localStorage.removeItem(TOKEN_KEYS.username);
}

function isAuthenticated() {
  return Boolean(getAccessToken());
}

function resolveMediaUrl(path) {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

function extractApiError(payload, fallback = 'Request failed. Please check your input.') {
  if (!payload) return fallback;
  if (typeof payload === 'string') return payload;
  if (payload.detail) return payload.detail;

  const messages = [];
  for (const [field, value] of Object.entries(payload)) {
    if (Array.isArray(value)) {
      messages.push(`${field}: ${value.join(', ')}`);
    } else if (typeof value === 'string') {
      messages.push(`${field}: ${value}`);
    }
  }
  return messages.length ? messages.join(' | ') : fallback;
}

let refreshPromise = null;

async function refreshAccessToken() {
  const refresh = getRefreshToken();
  if (!refresh) return null;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/accounts/token/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh }),
        });
        if (!res.ok) {
          clearAuthTokens();
          return null;
        }
        const data = await res.json();
        if (data.access) {
          setAuthTokens({ access: data.access });
          return data.access;
        }
        clearAuthTokens();
        return null;
      } catch {
        clearAuthTokens();
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

/**
 * Reusable fetch wrapper with JWT Authorization, FormData support, and 401 token refresh.
 */
async function apiRequest(endpoint, { method = 'GET', body = null, auth = true, retry = true } = {}) {
  const headers = {};
  const isFormData = body instanceof FormData;

  if (!isFormData && body !== null) {
    headers['Content-Type'] = 'application/json';
  }

  if (auth) {
    const token = getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: isFormData ? body : body !== null ? JSON.stringify(body) : null,
  });

  if (response.status === 401 && auth && retry) {
    const newAccess = await refreshAccessToken();
    if (newAccess) {
      return apiRequest(endpoint, { method, body, auth, retry: false });
    }
    clearAuthTokens();
    window.dispatchEvent(new CustomEvent('plantcare:auth-expired'));
    throw new Error('Session expired. Please log in again.');
  }

  if (response.status === 204) {
    return null;
  }

  let data = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  }

  if (!response.ok) {
    throw new Error(extractApiError(data, `Error ${response.status}`));
  }

  return data;
}

window.PlantCareAPI = {
  API_BASE_URL,
  getAccessToken,
  getRefreshToken,
  getStoredUsername,
  setAuthTokens,
  clearAuthTokens,
  isAuthenticated,
  resolveMediaUrl,
  apiRequest,
};
