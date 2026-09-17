import React from 'react';

interface BreadcrumbTitleProps {
  /** The sidebar group's own label, e.g. "Campaign", "Administration". */
  group: string;
  /** The active sub-item's label, e.g. "Outbound Campaigns". */
  page: string;
}

// Page-header title for a page that lives under a sidebar group with
// sub-items (see Sidebar.tsx's SIDEBAR_GROUPS) — renders "Group / Page"
// with the sub-page half deliberately lighter and smaller than the group
// name, so it reads as a breadcrumb rather than one flat title.
export default function BreadcrumbTitle({ group, page }: BreadcrumbTitleProps) {
  return (
    <>
      {group}
      <span className="mx-1.5 font-normal text-slate-300 dark:text-[var(--text-muted)]">/</span>
      <span className="font-medium text-sm text-slate-400 dark:text-[var(--text-muted)]">{page}</span>
    </>
  );
}
