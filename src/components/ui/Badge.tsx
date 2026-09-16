import React from 'react';

type BadgeColor = 'blue' | 'green' | 'amber' | 'rose' | 'slate' | 'purple' | 'indigo' | 'teal';

interface BadgeProps {
  children: React.ReactNode;
  color?: BadgeColor;
  dot?: boolean;
  className?: string;
}

// Light theme: a solid "filled" chip — background is the SATURATED shade
// (what used to be the text color), text is the PALE shade (what used to
// be the background color). A tinted-fill-plus-dark-text chip at this
// badge's tiny 10px size could still read as a plain gray chip on some
// displays (confirmed: indigo/teal ["aqua blue"] and rose/amber
// ["pink"/"yellow"] all looked washed-out-to-gray) — inverting to a solid
// color block makes the hue unambiguous regardless of display/contrast
// settings. Dark-theme pairs are untouched — no issue reported there.
const COLOR: Record<BadgeColor, string> = {
  blue:   'bg-blue-700    text-blue-50    dark:bg-blue-900/30   dark:text-blue-300',
  green:  'bg-emerald-700 text-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-300',
  amber:  'bg-amber-600   text-amber-50   dark:bg-amber-900/30  dark:text-amber-300',
  rose:   'bg-rose-700    text-rose-50    dark:bg-rose-900/30   dark:text-rose-300',
  slate:  'bg-slate-700   text-slate-100  dark:bg-slate-700     dark:text-slate-300',
  purple: 'bg-purple-700  text-purple-50  dark:bg-purple-900/30 dark:text-purple-300',
  indigo: 'bg-indigo-700  text-indigo-50  dark:bg-indigo-900/30 dark:text-indigo-300',
  teal:   'bg-teal-700    text-teal-50    dark:bg-teal-900/30   dark:text-teal-300',
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
