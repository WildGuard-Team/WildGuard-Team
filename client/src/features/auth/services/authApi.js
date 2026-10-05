const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/+$/, '');

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${apiBaseUrl}/auth${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
  } catch {
    throw new Error('Unable to reach WildGuard. Check that the API is running and try again.');
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status >= 500) throw new Error('WildGuard is temporarily unavailable. Check that the API is running and try again.');
    throw new Error(payload?.error?.message ?? 'The request could not be completed.');
  }
  return payload;
}

export function registerMember({ fullName, email, password }) {
  return request('/register', { method: 'POST', body: JSON.stringify({ fullName, email, password }) });
}

export function loginMember({ email, password }) {
  return request('/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export function getCurrentMember() {
  return request('/me', { method: 'GET' });
}

export function logoutMember() {
  return request('/logout', { method: 'POST' });
}
