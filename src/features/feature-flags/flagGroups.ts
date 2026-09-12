// Feature Flag Groups — bundles of individual flags that map to common
// roles, so an admin can grant a role's worth of access in one click
// instead of ticking each flag by hand. Used both in Platform Admin (org
// creation / org flag editing) and Org Admin (team member creation /
// per-member flag editing).
//
// For now these are DEFAULT_FLAG_GROUPS — hardcoded, built into the app.
// To add custom (org-defined) groups later: fetch them from a backend
// endpoint (e.g. GET /api/settings/flag-groups, scoped per org) and pass
// them into getAllFlagGroups(customGroups) — every call site already goes
// through that one function, so nothing consuming flag groups needs to
// change when custom groups are introduced.

import { FEATURE_REGISTRY } from './registry';

export interface FlagGroup {
  /** Unique key — use snake_case, 'custom_' prefix reserved for future org-defined groups. */
  key: string;
  /** Display label shown as the group's button/chip. */
  label: string;
  /** One-line description shown as a tooltip. */
  description: string;
  /** Feature flag keys this group grants. */
  flagKeys: string[];
}

export const DEFAULT_FLAG_GROUPS: FlagGroup[] = [
  {
    key: 'full_access',
    label: 'Full Access',
    description: 'Every available feature',
    flagKeys: FEATURE_REGISTRY.map(f => f.key),
  },
  {
    key: 'sales_team',
    label: 'Sales Team',
    description: 'Contacts, campaigns, dialer, call logs, reports',
    flagKeys: ['executive_desk', 'contact_directory', 'ai_campaigns', 'dialer', 'call_logs', 'reports'],
  },
  {
    key: 'support_team',
    label: 'Support Team',
    description: 'Inbox, enquiries, knowledge base, call logs',
    flagKeys: ['executive_desk', 'unified_inbox', 'enquiries', 'knowledge_base', 'call_logs'],
  },
  {
    key: 'loan_ops',
    label: 'Loan Operations',
    description: 'Loan lifecycle, compliance, contacts, call logs',
    flagKeys: ['executive_desk', 'loan_lifecycle', 'compliance', 'contact_directory', 'call_logs'],
  },
  {
    key: 'agent_ops',
    label: 'AI Agent Manager',
    description: 'Agent Studio, workflow builder, knowledge base, call logs',
    flagKeys: ['executive_desk', 'agent_studio', 'workflows', 'knowledge_base', 'call_logs'],
  },
  {
    key: 'read_only',
    label: 'Read-Only / Viewer',
    description: 'Dashboard and reports only — no operational tools',
    flagKeys: ['executive_desk', 'reports'],
  },
];

/** A group may reference a flag that isn't actually available in the
 * current context (e.g. an org hasn't been granted it at the platform
 * level) — narrow down to only what's usable before applying. */
export function applicableFlagKeys(group: FlagGroup, availableKeys: string[]): string[] {
  const available = new Set(availableKeys);
  return group.flagKeys.filter(k => available.has(k));
}

/** Single seam for "get every flag group" — see file header for how this
 * extends to custom groups later. */
export function getAllFlagGroups(customGroups: FlagGroup[] = []): FlagGroup[] {
  return [...DEFAULT_FLAG_GROUPS, ...customGroups];
}
