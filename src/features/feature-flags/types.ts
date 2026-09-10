// Auto-derived from registry.ts — do NOT add flags here manually.
// To add a new feature flag, add it to registry.ts instead.

import { FEATURE_REGISTRY } from './registry';

export type FeatureFlagKey = string;

export interface FeatureFlag {
  key: FeatureFlagKey;
  label: string;
  description: string;
  enabled: boolean;
}

export const DEFAULT_FLAGS: FeatureFlag[] = FEATURE_REGISTRY.map(f => ({
  key: f.key,
  label: f.label,
  description: f.description,
  enabled: f.enabledByDefault,
}));
