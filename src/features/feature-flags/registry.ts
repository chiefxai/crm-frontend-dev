// Feature Flag Registry — single source of truth.
//
// To add a new gated feature:
//   1. Add ONE entry here.
//   2. Add the sidebar item in Sidebar.tsx (icon, label, id) — flagKey is
//      auto-attached from this registry by matching tabId.
//   3. Everything else (FeatureFlagKey type, DEFAULT_FLAGS, route guard in
//      App.tsx, Grant Feature Access in SettingsView) updates automatically.

export interface FeatureFlagDef {
  /** Unique key stored in DB and used in code — use snake_case. */
  key: string;
  /** Display label shown in UI (sidebar, admin grant panel). */
  label: string;
  /** One-line description shown in the org settings grant panel. */
  description: string;
  /** Sidebar tab id this flag controls (matches `id` in Sidebar.tsx allMenuItems). */
  tabId: string;
  /** Whether the flag is on by default for org admins (toggle in their settings). */
  enabledByDefault: boolean;
}

export const FEATURE_REGISTRY: FeatureFlagDef[] = [
  {
    key: 'executive_desk',
    label: 'Executive Desk',
    description: 'Main dashboard with KPIs and activity overview',
    tabId: 'dashboard',
    enabledByDefault: true,
  },
  {
    key: 'contact_directory',
    label: 'Contact Directory',
    description: 'Organisation-wide contact book',
    tabId: 'contacts',
    enabledByDefault: true,
  },
  {
    key: 'ai_campaigns',
    label: 'AI Campaigns',
    description: 'Automated outbound calling campaigns',
    tabId: 'campaigns',
    enabledByDefault: true,
  },
  {
    key: 'call_logs',
    label: 'Call Logs',
    description: 'Full history of inbound and outbound calls',
    tabId: 'call-logs',
    enabledByDefault: true,
  },
  {
    key: 'objects',
    label: 'Contacts (Objects)',
    description: 'Structured contact and company records',
    tabId: 'objects',
    enabledByDefault: true,
  },
  {
    key: 'workflows',
    label: 'Workflow Builder',
    description: 'Visual question-flow builder for call scripts',
    tabId: 'workflows',
    enabledByDefault: true,
  },
  {
    key: 'agent_studio',
    label: 'Agent Studio',
    description: 'AI agent configuration and training',
    tabId: 'agent-studio',
    enabledByDefault: true,
  },
  {
    key: 'knowledge_base',
    label: 'Knowledge Base',
    description: 'Internal document and FAQ repository',
    tabId: 'knowledge',
    enabledByDefault: true,
  },
  {
    key: 'compliance',
    label: 'Compliance',
    description: 'Regulatory compliance tracking',
    tabId: 'compliance',
    enabledByDefault: true,
  },
  {
    key: 'audit_log',
    label: 'Audit Log',
    description: 'Full activity audit trail',
    tabId: 'audit-log',
    enabledByDefault: true,
  },
  {
    key: 'reports',
    label: 'Reports',
    description: 'Analytics and performance reports',
    tabId: 'reports',
    enabledByDefault: true,
  },
  {
    key: 'unified_inbox',
    label: 'Unified Inbox',
    description: 'Cross-channel message inbox',
    tabId: 'inbox',
    enabledByDefault: true,
  },
  {
    key: 'loan_lifecycle',
    label: 'Loan Lifecycle',
    description: 'End-to-end loan processing (lending only)',
    tabId: 'loans',
    enabledByDefault: true,
  },
  {
    key: 'enquiries',
    label: 'Enquiries',
    description: 'Inbound enquiry management',
    tabId: 'enquiries',
    enabledByDefault: true,
  },
  {
    key: 'dialer',
    label: 'Voice Simulator',
    description: 'AI-powered outbound dialer',
    tabId: 'dialer',
    enabledByDefault: true,
  },
];

/** tabId → flag key — used in App.tsx route guard (replaces manual TAB_FLAG map). */
export const TAB_TO_FLAG: Record<string, string> = Object.fromEntries(
  FEATURE_REGISTRY.map(f => [f.tabId, f.key])
);
