// Thin fetch wrapper that attaches the Supabase-issued session token
// (stored at signup/login) to every backend request. In dev-mode
// fallback (no Supabase configured on the backend) the token is a
// placeholder and the backend ignores auth entirely — see
// services/auth.js. Once Supabase is configured, this token is what
// backend/services/auth.js verifies to resolve the request's org.

const TOKEN_KEY = 'chiefx_auth_token';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  // FormData bodies (file uploads) need the browser to set their own
  // multipart boundary in Content-Type — forcing application/json here
  // would break the upload.
  if (options.body && !headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(url, { ...options, headers });
}
