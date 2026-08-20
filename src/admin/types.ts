export interface Stats {
  totalOrganizations: number;
  totalUsers: number;
  totalCalls: number;
}

export interface TimeSeries {
  signupsByDay: { date: string; count: number }[];
  callsByDay: { date: string; count: number }[];
  planDistribution: { plan: string; count: number }[];
  industryDistribution: { industry: string; count: number }[];
}

export interface OrgRow {
  id: string;
  name: string;
  workspaceName: string;
  industry: string;
  subscriptionPlan: string;
  status?: 'Active' | 'Suspended';
  aiMinutesUsed: number;
  totalCostInr: number;
  billingPeriodEnd?: string;
  memberCount: number;
  leadCount: number;
  createdAt: string;
}

export interface OrgDetail {
  id: string;
  name: string;
  workspaceName: string;
  industry: string;
  subscriptionPlan: string;
  status?: 'Active' | 'Suspended';
  aiMinutesLimit?: number | null;
  aiMinutesUsed: number;
  totalCostInr: number;
  billingPeriodEnd: string | null;
  createdAt: string;
  settings: Record<string, unknown>;
  counts: { leads: number; workflows: number; campaigns: number; members: number };
  members: { id: string; name: string; email: string; role: string; status: string; hasAccount: boolean; createdAt: string }[];
  recentCalls: { id: string; callerNumber: string; agentName: string; durationSeconds: number; sentiment: string | null; recordingUrl: string | null; createdAt: string }[];
  recentActivity: { id: string; actorEmail: string | null; action: string; metadata: Record<string, unknown>; createdAt: string }[];
}

export interface UserRow {
  id: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
  orgId: string | null;
  orgName: string | null;
  role: string | null;
}

export interface CallRow {
  id: string;
  orgId: string;
  orgName: string;
  callerNumber: string;
  agentName: string;
  language: string;
  durationSeconds: number;
  sentiment: string | null;
  recordingUrl: string | null;
  transcript: string | null;
  summary: string | null;
  createdAt: string;
}

export interface AuditRow {
  id: string;
  orgId: string;
  orgName: string;
  actorEmail: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}
