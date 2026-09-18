import React from 'react';

interface BreadcrumbTitleProps {
  /** The sidebar group's own label, e.g. "Campaign", "Administration". */
  group: string;
  /** The active sub-item's label, e.g. "Outbound Campaigns". */
  page: string;
}

// Page-header title for a page that lives under a sidebar group with
// sub-items (see Sidebar.tsx's SIDEBAR_GROUPS) — renders "Group / Page"
// with the group half deliberately lighter and smaller, and the active
// sub-page half carrying the full page-title weight — since the sub-page
// is the thing actually being looked at, it should read as the headline,
// with the group name as its (de-emphasized) context.
export default function BreadcrumbTitle({ group, page }: BreadcrumbTitleProps) {
  return (
    <>
      <span className="font-medium text-sm text-slate-400 dark:text-[var(--text-muted)]">{group}</span>
      <span className="mx-1.5 font-normal text-slate-300 dark:text-[var(--text-muted)]">/</span>
      {page}
    </>
  );
}
