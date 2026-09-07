export type FeatureFlagKey =
  | 'workflows'
  | 'agent_studio'
  | 'knowledge_base'
  | 'compliance'
  | 'audit_log'
  | 'billing'
  | 'reports'
  | 'unified_inbox'
  | 'loan_lifecycle'
  | 'enquiries'
  | 'dialer';

export interface FeatureFlag {
  key: FeatureFlagKey;
  label: string;
  description: string;
  enabled: boolean;
}

export const DEFAULT_FLAGS: FeatureFlag[] = [
  { key: 'workflows', label: 'Workflow Builder', description: 'Visual question-flow builder for call scripts', enabled: true },
  { key: 'agent_studio', label: 'Agent Studio', description: 'AI agent configuration and training', enabled: true },
  { key: 'knowledge_base', label: 'Knowledge Base', description: 'Internal document and FAQ repository', enabled: true },
  { key: 'compliance', label: 'Compliance', description: 'Regulatory compliance tracking', enabled: true },
  { key: 'audit_log', label: 'Audit Log', description: 'Full activity audit trail', enabled: true },
  { key: 'billing', label: 'Billing & Usage', description: 'Subscription and usage management', enabled: true },
  { key: 'reports', label: 'Reports', description: 'Analytics and performance reports', enabled: true },
  { key: 'unified_inbox', label: 'Unified Inbox', description: 'Cross-channel message inbox', enabled: true },
  { key: 'loan_lifecycle', label: 'Loan Lifecycle', description: 'End-to-end loan processing (lending only)', enabled: true },
  { key: 'enquiries', label: 'Enquiries', description: 'Inbound enquiry management', enabled: true },
  { key: 'dialer', label: 'Voice Simulator', description: 'AI-powered outbound dialer', enabled: true },
];
