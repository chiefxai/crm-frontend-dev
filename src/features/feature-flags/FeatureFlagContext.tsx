import React, { createContext, useContext, useState, useCallback } from 'react';
import { FeatureFlag, FeatureFlagKey, DEFAULT_FLAGS } from './types';
import { loadFromStorage, saveToStorage } from '../../lib/storage';

interface FeatureFlagContextValue {
  flags: FeatureFlag[];
  isEnabled: (key: FeatureFlagKey) => boolean;
  setFlag: (key: FeatureFlagKey, enabled: boolean) => void;
}

const FeatureFlagContext = createContext<FeatureFlagContextValue | null>(null);

export function FeatureFlagProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState<FeatureFlag[]>(() => {
    const stored = loadFromStorage<Partial<Record<FeatureFlagKey, boolean>>>('chiefx_feature_flags', {});
    return DEFAULT_FLAGS.map(f => ({
      ...f,
      enabled: stored[f.key] !== undefined ? stored[f.key]! : f.enabled,
    }));
  });

  const isEnabled = useCallback(
    (key: FeatureFlagKey) => flags.find(f => f.key === key)?.enabled ?? true,
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
