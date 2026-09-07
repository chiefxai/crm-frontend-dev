import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import type KeycloakType from 'keycloak-js';
import keycloak from './keycloak';
import { Layers, AlertCircle, RefreshCw } from 'lucide-react';

// ─── Context ────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  /** Mapped from Keycloak realm/client roles */
  role: string;
  /** Raw Keycloak token claims */
  tokenParsed: KeycloakType['tokenParsed'];
}

interface AuthContextValue {
  /** Keycloak is fully initialised and the user is authenticated */
  ready: boolean;
  user: AuthUser | null;
  /** Always-fresh access token — call this instead of keycloak.token directly */
  getToken: () => Promise<string>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside KeycloakProvider');
  return ctx;
}

// ─── Token helpers ───────────────────────────────────────────────────────────

function extractUser(kc: KeycloakType): AuthUser {
  const p = kc.tokenParsed ?? {};
  // Prefer realm roles, fall back to client roles, then 'user'
  const realmRoles: string[] = (p as any)?.realm_access?.roles ?? [];
  const clientRoles: string[] = (p as any)?.resource_access?.[kc.clientId!]?.roles ?? [];
  const appRoles = [...realmRoles, ...clientRoles].filter(
    r => !['offline_access', 'uma_authorization', 'default-roles-chiefvoice'].includes(r)
  );

  // Map Keycloak roles to the app's UserRole type
  const ROLE_MAP: Record<string, string> = {
    'super-admin':         'Super Admin',
    'org-admin':           'Organization Admin',
    'sales-manager':       'Sales Manager',
    'loan-agent':          'Loan Agent',
    'collection-agent':    'Collection Agent',
    'ai-agent-manager':    'AI Agent Manager',
  };
  const role = ROLE_MAP[appRoles[0]] ?? appRoles[0] ?? 'user';

  return {
    id:          (p as any).sub ?? '',
    email:       (p as any).email ?? '',
    name:        (p as any).name ?? (p as any).preferred_username ?? null,
    role,
    tokenParsed: kc.tokenParsed,
  };
}

// ─── Provider ───────────────────────────────────────────────────────────────

type InitState = 'loading' | 'ready' | 'error';

export function KeycloakProvider({ children }: { children: React.ReactNode }) {
  const [initState, setInitState] = useState<InitState>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  // Track if we've started init — StrictMode double-invokes effects; the ref
  // guards against calling keycloak.init() twice (it throws on a second call).
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    keycloak
      .init({
        // PKCE (S256) — recommended for SPAs, no client secret needed.
        pkceMethod:         'S256',
        // Redirect back to the current page after Keycloak login.
        onLoad:             'login-required',
        // Avoid relying on the hidden iframe check that requires
        // third-party cookies (broken in Safari / Firefox strict mode).
        checkLoginIframe:   false,
        // Keep tokens in sessionStorage (per-tab isolation, same policy
        // the old custom token storage used).
        // keycloak-js defaults to in-memory; 'sessionStorage' matches
        // the previous behaviour.
        responseMode:       'fragment',
      })
      .then(authenticated => {
        if (authenticated) {
          setUser(extractUser(keycloak));
          setInitState('ready');
        } else {
          // onLoad:'login-required' should always redirect; reaching here
          // means the adapter resolved as not-authenticated without
          // redirecting — force the redirect manually.
          keycloak.login();
        }
      })
      .catch(err => {
        console.error('Keycloak init failed:', err);
        setErrorMsg(
          err?.message ??
          'Could not connect to the authentication server. Check VITE_KEYCLOAK_URL.'
        );
        setInitState('error');
      });

    // Keep the in-memory token fresh: refresh 30 s before expiry.
    keycloak.onTokenExpired = () => {
      keycloak.updateToken(30).catch(() => {
        // Refresh failed (session likely ended server-side) → force re-login
        keycloak.login();
      });
    };

    keycloak.onAuthRefreshSuccess = () => {
      setUser(extractUser(keycloak));
    };

    keycloak.onAuthLogout = () => {
      setUser(null);
      setInitState('loading');
    };
  }, []);

  const getToken = useCallback(async (): Promise<string> => {
    // Ensure token is valid for at least the next 10 seconds
    await keycloak.updateToken(10).catch(() => keycloak.login());
    return keycloak.token ?? '';
  }, []);

  const logout = useCallback(() => {
    keycloak.logout({ redirectUri: window.location.origin });
  }, []);

  // ── Loading splash ────────────────────────────────────────────────────────
  if (initState === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/40 animate-pulse">
          <Layers className="h-7 w-7 text-white" />
        </div>
        <p className="text-slate-400 text-sm font-medium animate-pulse">Connecting to identity provider…</p>
      </div>
    );
  }

  // ── Error splash ──────────────────────────────────────────────────────────
  if (initState === 'error') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6 p-6">
        <div className="h-14 w-14 rounded-2xl bg-rose-600/20 flex items-center justify-center">
          <AlertCircle className="h-7 w-7 text-rose-400" />
        </div>
        <div className="text-center max-w-sm">
          <h2 className="text-white font-bold text-lg mb-2">Authentication unavailable</h2>
          <p className="text-slate-400 text-sm leading-relaxed">{errorMsg}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
        <p className="text-xs text-slate-600 text-center max-w-xs">
          Check that <code className="font-mono text-slate-400">VITE_KEYCLOAK_URL</code>,{' '}
          <code className="font-mono text-slate-400">VITE_KEYCLOAK_REALM</code> and{' '}
          <code className="font-mono text-slate-400">VITE_KEYCLOAK_CLIENT_ID</code> are set correctly in your environment.
        </p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ ready: true, user, getToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
