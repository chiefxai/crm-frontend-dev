import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import AdminApp from './AdminApp.tsx';
import { FeatureFlagProvider } from './features/feature-flags/FeatureFlagContext.tsx';
import { ThemeProvider } from './shared/theme/ThemeContext.tsx';
import { KeycloakProvider } from './features/auth/KeycloakProvider.tsx';
import './index.css';

// Global API Fetch Interceptor for separate deployment support
const originalFetch = window.fetch;
window.fetch = (input, init) => {
  if (typeof input === 'string' && input.startsWith('/api/')) {
    const apiBase = (import.meta as any).env.VITE_API_URL || '';
    return originalFetch(`${apiBase}${input}`, init);
  }
  return originalFetch(input, init);
};

// /admin is a genuinely separate application (own login, own shell — see
// AdminApp.tsx), not a tab inside the customer dashboard. Same bundle,
// split at render time by URL path — no router dependency needed for
// just two top-level destinations.
const isAdminRoute = window.location.pathname.startsWith('/admin');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <KeycloakProvider>
        <FeatureFlagProvider>
          {isAdminRoute ? <AdminApp /> : <App />}
        </FeatureFlagProvider>
      </KeycloakProvider>
    </ThemeProvider>
  </StrictMode>,
);
