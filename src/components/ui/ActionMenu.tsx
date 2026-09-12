import React, { useEffect, useRef, useState } from 'react';
import { Plus, Loader2, LucideIcon } from 'lucide-react';
import Tooltip from './Tooltip';

// Consolidates several actions (e.g. "Manage Groups", "Bulk Upload", "Add
// Contact" in a page header, or "Enable/Disable", "Edit", "Delete" on a
// card) behind a single icon button instead of a row of separate buttons.
// Click opens a dropdown menu; outside-click closes it — same interaction
// pattern as NotificationBell.tsx's dropdown, reused here instead of a
// second bespoke implementation. The trigger itself is a Tooltip-wrapped
// icon button, matching IconButton.tsx elsewhere so it reads consistently.
export interface ActionMenuItem {
  key: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  /** Renders this item in red — for a destructive action like Delete. */
  danger?: boolean;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  tooltipLabel?: string;
  /** Defaults to Plus (the header "+" use case). Pass a different icon
   * (e.g. MoreVertical) for a card-level options menu. */
  triggerIcon?: LucideIcon;
  /** 'primary' (default) = solid blue button, for page-header "+" menus.
   * 'ghost' = subtle icon button matching existing card action buttons
   * (Edit/Delete icon buttons elsewhere) — for a card's 3-dot menu. */
  triggerVariant?: 'primary' | 'ghost';
  disabled?: boolean;
  /** Shows a spinning loader in place of triggerIcon and disables the trigger. */
  loading?: boolean;
}

export default function ActionMenu({
  items,
  tooltipLabel = 'Add',
  triggerIcon: TriggerIcon = Plus,
  triggerVariant = 'primary',
  disabled = false,
  loading = false,
}: ActionMenuProps) {
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

  const triggerCls = triggerVariant === 'primary'
    ? 'flex items-center justify-center h-9 w-9 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/10 transition-all cursor-pointer disabled:opacity-50'
    : 'flex items-center justify-center h-7 w-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50';

  return (
    <div ref={ref} className="relative">
      <Tooltip label={tooltipLabel} side="bottom">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          disabled={disabled || loading}
          aria-label={tooltipLabel}
          className={triggerCls}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <TriggerIcon className="h-4 w-4" />}
        </button>
      </Tooltip>
      {open && (
        <div className={`theme-dropdown absolute right-0 ${triggerVariant === 'primary' ? 'top-11' : 'top-8'} min-w-[180px] rounded-xl shadow-2xl border z-50 overflow-hidden py-1.5`}>
          {items.map(item => (
            <button
              key={item.key}
              type="button"
              onClick={() => { setOpen(false); item.onClick(); }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold transition-colors cursor-pointer text-left ${
                item.danger ? 'text-rose-600 hover:bg-rose-50' : 'hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <item.icon className={`h-4 w-4 shrink-0 ${item.danger ? 'text-rose-500' : 'text-blue-600'}`} />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
