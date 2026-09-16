import React from 'react';

type BadgeColor = 'blue' | 'green' | 'amber' | 'rose' | 'slate' | 'purple' | 'indigo' | 'teal';

interface BadgeProps {
  children: React.ReactNode;
  color?: BadgeColor;
  dot?: boolean;
  className?: string;
}

// Light-theme pairs deliberately go a step darker than a typical
// bg-*-50/text-*-700 combo (bg-*-100/text-*-800) — at this badge's tiny
// 10px size, the paler default read as washed-out/low-contrast on a white
// card (worst offender: slate was bg-slate-100 + text-slate-600, a nearly
// gray-on-gray pairing). Dark-theme pairs are untouched — no issue
// reported there.
const COLOR: Record<BadgeColor, string> = {
  blue:   'bg-blue-100   text-blue-800   dark:bg-blue-900/30   dark:text-blue-300',
  green:  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  amber:  'bg-amber-100  text-amber-800  dark:bg-amber-900/30  dark:text-amber-300',
  rose:   'bg-rose-100   text-rose-800   dark:bg-rose-900/30   dark:text-rose-300',
  slate:  'bg-slate-200  text-slate-700  dark:bg-slate-700     dark:text-slate-300',
  purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  indigo: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  teal:   'bg-teal-100   text-teal-800   dark:bg-teal-900/30   dark:text-teal-300',
};

const DOT: Record<BadgeColor, string> = {
  blue:   'bg-blue-500',
  green:  'bg-emerald-500',
  amber:  'bg-amber-500',
  rose:   'bg-rose-500',
  slate:  'bg-slate-400',
  purple: 'bg-purple-500',
  indigo: 'bg-indigo-500',
  teal:   'bg-teal-500',
};

export default function Badge({ children, color = 'slate', dot = false, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${COLOR[color]} ${className}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${DOT[color]}`} />}
      {children}
    </span>
  );
}
