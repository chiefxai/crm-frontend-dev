import React from 'react';
import { Users2 } from 'lucide-react';
import { getAllFlagGroups } from '../../features/feature-flags/flagGroups';

interface FlagGroupPickerProps {
  /** Flag keys allowed in this context (an org's own granted flags, or
   * every registry key for platform-admin screens). Groups referencing
   * flags outside this set are narrowed down or hidden entirely if empty. */
  availableKeys: string[];
  /** Called with the group's applicable flag keys — replaces the current
   * selection with exactly this set (fine-tune afterward with the
   * individual flag toggles below/beside the picker). */
  onApply: (flagKeys: string[]) => void;
  className?: string;
}

export default function FlagGroupPicker({ availableKeys, onApply, className = '' }: FlagGroupPickerProps) {
  const available = new Set(availableKeys);
  const groups = getAllFlagGroups()
    .map(g => ({ ...g, applicable: g.flagKeys.filter(k => available.has(k)) }))
    .filter(g => g.applicable.length > 0);

  if (groups.length === 0) return null;

  return (
    <div className={className}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Users2 className="h-3 w-3 text-amber-500" />
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Apply a Group</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {groups.map(g => (
          <button
            key={g.key}
            type="button"
            title={g.description}
            onClick={() => onApply(g.applicable)}
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold border bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 transition-all cursor-pointer"
          >
            {g.label}
          </button>
        ))}
      </div>
    </div>
  );
}
