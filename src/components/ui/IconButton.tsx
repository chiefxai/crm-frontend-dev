import React from 'react';
import { LucideIcon } from 'lucide-react';
import Tooltip from './Tooltip';

// Icon-only action button with a hover tooltip showing its name — the
// shared replacement for page headers that used to show a big "Add X" /
// "Create X" text button. Reuses Tooltip (see ui/Tooltip.tsx) rather than
// each header rolling its own hover label.
interface IconButtonProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export default function IconButton({ icon: Icon, label, onClick, variant = 'primary', side = 'bottom', className = '' }: IconButtonProps) {
  const variantCls = variant === 'primary'
    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/10'
    : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm';

  return (
    <Tooltip label={label} side={side}>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={`flex items-center justify-center h-9 w-9 rounded-xl transition-all cursor-pointer ${variantCls} ${className}`}
      >
        <Icon className="h-4 w-4" />
      </button>
    </Tooltip>
  );
}
