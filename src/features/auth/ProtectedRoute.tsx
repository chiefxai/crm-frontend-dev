import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './KeycloakProvider';
import { Layers } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Optional: restrict to specific Keycloak roles */
  allowedRoles?: string[];
}

/**
 * Guards a route behind Keycloak authentication.
 *
 * Behaviour:
 * - Provider not ready (init in flight)  → branded loading splash
 * - Keycloak not authenticated            → keycloak.login() redirect (never
 *   shows a custom login UI — Keycloak hosts that page)
 * - Authenticated but wrong role          → /unauthorized
 * - Authenticated with correct role       → renders children
 */
export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { ready, user } = useAuth();
  const location = useLocation();

  // Still initialising — Keycloak.init() hasn't resolved yet.
  // KeycloakProvider shows its own splash while this is true; if somehow
  // a ProtectedRoute renders before the provider resolves, show a minimal
  // fallback rather than a blank screen.
  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center animate-pulse">
          <Layers className="h-6 w-6 text-white" />
        </div>
      </div>
    );
  }

  // Keycloak resolved as not-authenticated. This path is normally unreachable
  // because KeycloakProvider uses onLoad:'login-required' which redirects the
  // browser to Keycloak before the React tree mounts — but guard it anyway so
  // the route is safe against any future config change (e.g. switching to
  // check-sso in embedded contexts).
  if (!user) {
    // Store the attempted location so we can return here after login.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role gate — only applied when the route specifies allowedRoles.
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
