import React, { useEffect, useRef, useState } from 'react';
import { Plus, LucideIcon } from 'lucide-react';
import Tooltip from './Tooltip';

// Consolidates several page-header actions (e.g. "Manage Groups", "Bulk
// Upload", "Add Contact") behind a single "+" icon button instead of a row
// of separate buttons. Click opens a dropdown menu; outside-click closes
// it — same interaction pattern as NotificationBell.tsx's dropdown, reused
// here instead of a second bespoke implementation. The trigger itself is a
// Tooltip-wrapped icon button, matching IconButton.tsx's header buttons
// elsewhere so a single "+" reads the same way across the app.
export interface ActionMenuItem {
  key: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  tooltipLabel?: string;
}

export default function ActionMenu({ items, tooltipLabel = 'Add' }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <Tooltip label={tooltipLabel} side="bottom">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-label={tooltipLabel}
          className="flex items-center justify-center h-9 w-9 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/10 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
        </button>
      </Tooltip>
      {open && (
        <div className="theme-dropdown absolute right-0 top-11 min-w-[200px] rounded-xl shadow-2xl border z-50 overflow-hidden py-1.5">
          {items.map(item => (
            <button
              key={item.key}
              type="button"
              onClick={() => { setOpen(false); item.onClick(); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer text-left"
            >
              <item.icon className="h-4 w-4 text-blue-600 shrink-0" />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
