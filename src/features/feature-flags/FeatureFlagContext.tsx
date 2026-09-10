// FeatureFlagContext.tsx
// Provides feature flag state to the component tree.
// The actual fetch lives in userFlagsStore.ts — this context just subscribes.

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { FeatureFlag, FeatureFlagKey, DEFAULT_FLAGS } from './types';
import { loadFromStorage, saveToStorage } from '../../lib/storage';
import { subscribe } from './userFlagsStore';
import { useAuth } from '../auth/KeycloakProvider';

const ADMIN_ROLES = new Set(['Organization Admin', 'Super Admin']);

// Use the DB membership role (from /api/settings/me) as the authoritative source.
// The JWT role from Keycloak can diverge if the user's KC realm role differs from
// the role stored in the org membership table (e.g. default KC roles bleeding through).
function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.has(role);
}

interface FeatureFlagContextValue {
  flags: FeatureFlag[];
  isEnabled: (key: FeatureFlagKey) => boolean;
  setFlag: (key: FeatureFlagKey, enabled: boolean) => void;
}

const FeatureFlagContext = createContext<FeatureFlagContextValue | null>(null);

// isAdminUser: org admins and platform admins have no flag restriction.
// isAdminUser=false: restricted roles see only what's in `granted`; empty grants = nothing flagged.
function buildFlags(granted: string[], loaded: boolean, isAdminUser: boolean): FeatureFlag[] {
  if (!loaded) {
    // Still fetching — disable all flagged tabs until we know what the user can see.
    return DEFAULT_FLAGS.map(f => ({ ...f, enabled: false }));
  }
  if (isAdminUser) {
    // Org admins / super admins: respect stored toggle prefs, fall back to defaults.
    const stored = loadFromStorage<Partial<Record<FeatureFlagKey, boolean>>>('chiefx_feature_flags', {});
    return DEFAULT_FLAGS.map(f => ({
      ...f,
      enabled: stored[f.key] !== undefined ? stored[f.key]! : f.enabled,
    }));
  }
  // Restricted user: show ONLY explicitly granted flags; anything not in the list is off.
  return DEFAULT_FLAGS.map(f => ({ ...f, enabled: granted.includes(f.key) }));
}

export function FeatureFlagProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  // JWT role is used only as the initial optimistic guess while /api/settings/me is in-flight.
  // Once the store resolves, the DB membership role takes over as the authoritative source.
  const jwtIsAdmin = isAdminRole(user?.role ?? '');

  const [flags, setFlags] = useState<FeatureFlag[]>(() => buildFlags([], false, jwtIsAdmin));

  // Re-build whenever JWT role changes (e.g. user switch) — reset to loading state.
  useEffect(() => {
    setFlags(buildFlags([], false, jwtIsAdmin));
  }, [jwtIsAdmin]);

  // Subscribe to the store — when userFlagsStore fetches (triggered from App.tsx),
  // use the DB membership role as the authoritative admin check.
  useEffect(() => {
    const unsub = subscribe((granted, loaded, dbRole) => {
      const adminByDb = isAdminRole(dbRole);
      setFlags(buildFlags(granted, loaded, adminByDb));
    });
    return unsub;
  }, []);

  const isEnabled = useCallback(
    (key: FeatureFlagKey) => flags.find(f => f.key === key)?.enabled ?? false,
    [flags]
  );

  const setFlag = useCallback((key: FeatureFlagKey, enabled: boolean) => {
    setFlags(prev => {
      const updated = prev.map(f => (f.key === key ? { ...f, enabled } : f));
      const stored = Object.fromEntries(updated.map(f => [f.key, f.enabled]));
      saveToStorage('chiefx_feature_flags', stored);
      return updated;
    });
  }, []);

  return (
    <FeatureFlagContext.Provider value={{ flags, isEnabled, setFlag }}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlags() {
  const ctx = useContext(FeatureFlagContext);
  if (!ctx) throw new Error('useFeatureFlags must be used inside FeatureFlagProvider');
  return ctx;
}
