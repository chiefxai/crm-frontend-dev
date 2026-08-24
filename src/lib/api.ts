// Thin fetch wrapper that attaches the Supabase-issued session token
// (stored at signup/login) to every backend request. In dev-mode
// fallback (no Supabase configured on the backend) the token is a
// placeholder and the backend ignores auth entirely — see
// services/auth.js. Once Supabase is configured, this token is what
// backend/services/auth.js verifies to resolve the request's org.

const TOKEN_KEY = 'chiefx_auth_token';

// sessionStorage, not localStorage — it's per-tab. localStorage is shared
// across every tab of the same browser, so logging into a second org in
// another tab silently overwrote the token for tabs already open on a
// different org, making them authenticate (and display data) as the wrong
// organization.
export function getAuthToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

// Vobiz-hosted recordings (media.vobiz.ai) require X-Auth-ID/X-Auth-Token
// headers the browser can't attach to a plain <audio src> — the backend's
// /api/vobiz/recording/:callLogId route proxies them instead, authenticated
// via ?token= (the same query-param fallback used for EventSource, since
// <audio> can't set an Authorization header either). Non-Vobiz recordings
// (e.g. older Supabase-hosted ones) are already public — use the URL as-is.
export function getPlayableRecordingUrl(callLogId: string, recordingUrl: string): string {
  if (!recordingUrl.includes('media.vobiz.ai')) return recordingUrl;
  const apiBase = (import.meta as any).env.VITE_API_URL || '';
  const token = getAuthToken();
  return `${apiBase}/api/vobiz/recording/${callLogId}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
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
