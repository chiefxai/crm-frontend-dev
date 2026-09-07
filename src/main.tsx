import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App.tsx';
import AdminApp from './AdminApp.tsx';
import ProtectedRoute from './features/auth/ProtectedRoute.tsx';
import { KeycloakProvider } from './features/auth/KeycloakProvider.tsx';
import { FeatureFlagProvider } from './features/feature-flags/FeatureFlagContext.tsx';
import { ThemeProvider } from './shared/theme/ThemeContext.tsx';
import './index.css';

// Prefix all relative /api/* requests with the configured backend origin so
// the same build works whether the frontend is co-located with the API
// (empty VITE_API_URL, Caddy handles the proxy) or deployed separately.
const originalFetch = window.fetch;
window.fetch = (input, init) => {
  if (typeof input === 'string' && input.startsWith('/api/')) {
    const base = (import.meta as any).env.VITE_API_URL || '';
    return originalFetch(`${base}${input}`, init);
  }
  return originalFetch(input, init);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      {/* KeycloakProvider initialises the OIDC session before anything renders.
          With onLoad:'login-required' the browser is redirected to Keycloak
          immediately if unauthenticated — no login form in this app. */}
      <KeycloakProvider>
        <FeatureFlagProvider>
          <BrowserRouter>
            <Routes>
              {/* ── Admin shell (its own Keycloak client / roles) ── */}
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute allowedRoles={['Super Admin']}>
                    <AdminApp />
                  </ProtectedRoute>
                }
              />

              {/* ── Sentinel: Keycloak redirects back here post-login;
                  ProtectedRoute immediately forwards to the app. ── */}
              <Route
                path="/login"
                element={
                  <ProtectedRoute>
                    <Navigate to="/" replace />
                  </ProtectedRoute>
                }
              />

              {/* ── Unauthorized ── */}
              <Route
                path="/unauthorized"
                element={
                  <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-white">
                    <p className="text-4xl font-bold">403</p>
                    <p className="text-slate-400 text-sm">You don't have permission to access this page.</p>
                    <a href="/" className="text-indigo-400 text-sm underline">Go to dashboard</a>
                  </div>
                }
              />

              {/* ── Main CRM app — all tabs live inside App.tsx ── */}
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <App />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </FeatureFlagProvider>
      </KeycloakProvider>
    </ThemeProvider>
  </StrictMode>,
);
