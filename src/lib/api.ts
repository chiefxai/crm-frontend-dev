// API fetch layer — token management now delegated to Keycloak.
// The old setAuthToken / getAuthToken / clearAuthToken helpers that read
// from sessionStorage are removed; the Keycloak adapter owns the token
// lifecycle (PKCE, refresh, expiry). apiFetch calls getKeycloakToken()
// which calls keycloak.updateToken(10) before every request, so the
// Bearer is always fresh and the app never silently fails with a 401.

import keycloak from '../features/auth/keycloak';

// ── Token access ─────────────────────────────────────────────────────────────

/**
 * Returns a valid (auto-refreshed) Keycloak access token.
 * Triggers a re-login if the session has expired server-side.
 */
async function getKeycloakToken(): Promise<string | null> {
  if (!keycloak.authenticated) return null;
  try {
    await keycloak.updateToken(10);
  } catch {
    keycloak.login();
    return null;
  }
  return keycloak.token ?? null;
}

// Kept for places that need a synchronous URL (EventSource, <audio src>).
// Use the token already in memory — caller is responsible for ensuring it
// is fresh before constructing the URL (e.g. call getKeycloakToken() first).
export function getAuthToken(): string | null {
  return keycloak.token ?? null;
}

// No-ops preserved for any code that still imports them — actual cleanup is
// done by keycloak.logout() / KeycloakProvider.logout().
export function setAuthToken(_token: string): void { /* noop — Keycloak manages tokens */ }
export function clearAuthToken(): void             { /* noop — use logout() instead   */ }

// ── Base URL ─────────────────────────────────────────────────────────────────

export function getApiBase(): string {
  return (import.meta as any).env.VITE_API_URL || '';
}

// ── Recording URL helper ─────────────────────────────────────────────────────

export function getPlayableRecordingUrl(callLogId: string, recordingUrl: string): string {
  if (!recordingUrl.includes('media.vobiz.ai')) return recordingUrl;
  const token = keycloak.token;
  return `${getApiBase()}/api/vobiz/recording/${callLogId}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
}

// ── apiFetch ─────────────────────────────────────────────────────────────────

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getKeycloakToken();
  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(url, { ...options, headers });
  // 401 with a valid token means the backend rejected it (revoked session,
  // realm change, etc.) — force a fresh login rather than silently failing.
  if (res.status === 401 && token) {
    keycloak.login();
  }
  return res;
}
