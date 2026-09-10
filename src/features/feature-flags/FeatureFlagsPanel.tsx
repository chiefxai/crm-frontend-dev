import React from 'react';
import { Flag, ToggleLeft, ToggleRight } from 'lucide-react';
import { useFeatureFlags } from './FeatureFlagContext';
import { FeatureFlagKey } from './types';

export default function FeatureFlagsPanel() {
  const { flags, orgFlags, setFlag } = useFeatureFlags();

  // Only show features the super admin has granted to this org
  const visible = orgFlags.length > 0 ? flags.filter(f => orgFlags.includes(f.key)) : flags;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <Flag className="h-5 w-5 text-blue-600" />
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Feature Access</h3>
          <p className="text-xs text-slate-500">Toggle which features are visible to your team. Features available to your org are controlled by your platform admin.</p>
        </div>
      </div>
      {visible.length === 0 ? (
        <p className="text-xs text-slate-400 py-4 text-center">No features have been granted to your organization yet. Contact your platform admin.</p>
      ) : (
        <div className="space-y-2">
          {visible.map(flag => (
            <div
              key={flag.key}
              className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:border-slate-200 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800">{flag.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{flag.description}</p>
              </div>
              <button
                onClick={() => setFlag(flag.key as FeatureFlagKey, !flag.enabled)}
                className="ml-4 shrink-0 transition-colors"
                title={flag.enabled ? 'Disable feature' : 'Enable feature'}
              >
                {flag.enabled ? (
                  <ToggleRight className="h-8 w-8 text-blue-600" />
                ) : (
                  <ToggleLeft className="h-8 w-8 text-slate-300" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
