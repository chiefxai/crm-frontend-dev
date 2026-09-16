import React from 'react';

type BadgeColor = 'blue' | 'green' | 'amber' | 'rose' | 'slate' | 'purple' | 'indigo' | 'teal';

interface BadgeProps {
  children: React.ReactNode;
  color?: BadgeColor;
  dot?: boolean;
  className?: string;
}

// Light-theme pairs go a step darker than a typical bg-*-50/text-*-700
// combo (bg-*-100/text-*-800), PLUS a matching-hue border — at this
// badge's tiny 10px size, a tinted fill alone can still read as a plain
// gray chip on some displays/color-blindness profiles (confirmed:
// indigo/teal ["aqua blue"] and rose/amber ["pink"/"yellow"] all looked
// washed-out-to-gray). A crisp same-hue border makes the color
// unambiguous even when the fill itself looks pale. Dark-theme pairs are
// untouched — no issue reported there.
const COLOR: Record<BadgeColor, string> = {
  blue:   'bg-blue-100   text-blue-800   border border-blue-300   dark:bg-blue-900/30   dark:text-blue-300   dark:border-transparent',
  green:  'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-transparent',
  amber:  'bg-amber-100  text-amber-800  border border-amber-300  dark:bg-amber-900/30  dark:text-amber-300  dark:border-transparent',
  rose:   'bg-rose-100   text-rose-800   border border-rose-300   dark:bg-rose-900/30   dark:text-rose-300   dark:border-transparent',
  slate:  'bg-slate-200  text-slate-700  border border-slate-300  dark:bg-slate-700     dark:text-slate-300  dark:border-transparent',
  purple: 'bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-transparent',
  indigo: 'bg-indigo-100 text-indigo-800 border border-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-transparent',
  teal:   'bg-teal-100   text-teal-800   border border-teal-300   dark:bg-teal-900/30   dark:text-teal-300   dark:border-transparent',
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
