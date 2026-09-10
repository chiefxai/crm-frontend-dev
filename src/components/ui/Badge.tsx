import React from 'react';

type BadgeColor = 'blue' | 'green' | 'amber' | 'rose' | 'slate' | 'purple' | 'indigo' | 'teal';

interface BadgeProps {
  children: React.ReactNode;
  color?: BadgeColor;
  dot?: boolean;
  className?: string;
}

const COLOR: Record<BadgeColor, string> = {
  blue:   'bg-blue-50   text-blue-700   dark:bg-blue-900/30   dark:text-blue-300',
  green:  'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  amber:  'bg-amber-50  text-amber-700  dark:bg-amber-900/30  dark:text-amber-300',
  rose:   'bg-rose-50   text-rose-700   dark:bg-rose-900/30   dark:text-rose-300',
  slate:  'bg-slate-100 text-slate-600  dark:bg-slate-700     dark:text-slate-300',
  purple: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  indigo: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  teal:   'bg-teal-50   text-teal-700   dark:bg-teal-900/30   dark:text-teal-300',
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
