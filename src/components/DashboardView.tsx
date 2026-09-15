import React, { useState, useEffect, useMemo } from 'react';
import {
  PhoneIncoming,
  UserCheck,
  MessageCircleQuestion,
  Flame,
  Activity,
  PieChart as PieChartIcon,
  BarChart3,
  History,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
} from 'recharts';
import { apiFetch } from '../lib/api';
import { Lead, Loan, CallLog, OrganizationSettings } from '../types';
import { COST_PER_MINUTE_INR_FALLBACK } from '../lib/pricing';
import PageShell from './ui/PageShell';
import Widget from './ui/Widget';
import EmptyState from './ui/EmptyState';
import KpiCard from './ui/KpiCard';
import PieChart from './ui/PieChart';
import DataTable, { Column } from './ui/DataTable';

// Loosely typed like ReportsView's DialTask — this page only needs
// workflowName + each lead's call outcome, not the full shape.
interface DashboardDialTask {
  id: string;
  workflowName?: string;
  // Despite the name, this is the wizard-selected AI calling agent's id
  // (org_agents), not a human team member — same field DialerSimulator.tsx
  // uses to resolve which agent placed a campaign's calls.
  assignedTeamMemberId?: string;
  callResults: Record<string, { status: string; callAnswered?: boolean }>;
}

interface DashboardViewProps {
  leads: Lead[];
  loans: Loan[];
  callLogs: CallLog[];
  dialerTasks?: DashboardDialTask[];
  orgSettings: OrganizationSettings;
  costPerMinuteInr?: number;
}

// One readable label + color for a call's actual outcome — same
// definition ReportsView uses (status + callAnswered folded together).
const OUTCOME_COLORS: Record<string, string> = {
  'Answered': '#059669',
  'Not Answered': '#e11d48',
  'No Answer': '#94a3b8',
  'Answering Machine': '#d97706',
  'Callback Scheduled': '#2563eb',
};
const OUTCOME_ORDER = Object.keys(OUTCOME_COLORS);
function getCallOutcome(status: string, callAnswered?: boolean): string {
  if (status === 'Completed') return callAnswered === false ? 'Not Answered' : 'Answered';
  return OUTCOME_COLORS[status] ? status : 'No Answer';
}

const SENTIMENT_COLOR: Record<string, string> = {
  Positive: '#059669',
  Negative: '#e11d48',
  Neutral: '#64748b',
  Unknown: '#94a3b8',
};

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}m ${s}s`;
}

interface ObjectMetrics {
  objectKey: string;
  objectLabel: string;
  totalRecords: number;
  stageDistribution: { stage: string; count: number }[];
  recordsTrend: { month: string; count: number }[];
}

interface InterestedClient {
  leadId: string;
  name: string;
  phone: string | null;
  amountRequested: number | null;
  score: number | null;
  intent: string | null;
  lastCallSummary: string | null;
  lastCallAt: string;
}

interface DashboardMetrics {
  portfolioTrend: { month: string; totalDisbursed: number; loanCount: number }[];
  channelPerformance: { source: string; count: number }[];
  callsToday: number;
  positiveSentimentPct: number | null;
  objectMetrics: ObjectMetrics[];
  topInterestedClients: InterestedClient[];
}

const CHART_TOOLTIP = {
  contentStyle: {
    background: 'var(--tooltip-bg, #1e293b)',
    border: 'none',
    borderRadius: 10,
    color: 'var(--tooltip-text, #f8fafc)',
    fontSize: 12,
  },
};

export default function DashboardView({
  leads,
  loans,
  callLogs,
  dialerTasks = [],
  orgSettings,
  costPerMinuteInr = COST_PER_MINUTE_INR_FALLBACK,
}: DashboardViewProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [enquiriesTotal, setEnquiriesTotal] = useState<number | null>(null);
  const [agentNames, setAgentNames] = useState<Record<string, string>>({});

  const loadMetrics = () => {
    apiFetch('/api/dashboard/metrics')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: DashboardMetrics) => setMetrics(data))
      .catch(err => console.error('Failed to load dashboard metrics:', err));
    // Cheapest way to get a total count without pulling every row — one
    // page of size 1, just for the `total` the paginated response carries.
    apiFetch('/api/enquiries?page=1&limit=1')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: { total?: number }) => setEnquiriesTotal(data.total ?? 0))
      .catch(err => console.error('Failed to load enquiries total:', err));
    // Just for id -> name resolution (Agent Performance) — dialerTasks
    // only carries the agent's id (assignedTeamMemberId).
    apiFetch('/api/agents')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: { id: string; name: string }[]) => {
        setAgentNames(Object.fromEntries((Array.isArray(data) ? data : []).map(a => [a.id, a.name])));
      })
      .catch(err => console.error('Failed to load agents:', err));
  };

  useEffect(loadMetrics, [leads.length, loans.length, callLogs.length]);

  const isLending = !orgSettings.industry || orgSettings.industry === 'lending';
  const primaryObject = metrics?.objectMetrics?.[0] || null;

  // Success = actually answered (see callFinalizer.js's callAnswered) —
  // "Completed" alone doesn't mean the callee engaged; a call answered
  // by a machine or cut short with no real talk isn't a success here.
  const successCallsCount = callLogs.filter(c => c.status === 'Completed' && c.callAnswered !== false).length;
  // "Successful outcome" = the same bar Reports/topInterestedClients use
  // for conversion — the caller's own intent came back Interested.
  const successfulOutcomesCount = callLogs.filter(c => c.intent === 'Interested').length;

  // Calls in period + volume-over-time trend — same "Report by Task" view
  // from ReportsView, ported here so the exec desk gives a quick pulse
  // without needing to jump to the full Reports page. Fixed to the last 30
  // days, one bar per day — this is a glance-at-it overview, not a
  // configurable report, so no date-range/granularity controls here.
  const callsInPeriod = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return callLogs.filter(c => new Date(c.createdAt) >= cutoff);
  }, [callLogs]);

  // Sentiment counts are nested (not flattened into stackable keys) since
  // they're shown via the custom tooltip below, not as their own stacked
  // segments — stacking direction (2 segments) AND sentiment (3-4 more)
  // in the same bar would be unreadable; the tooltip gives the sentiment
  // detail without cluttering the chart itself.
  const callVolumeTrend = useMemo(() => {
    const buckets: Record<string, { period: string; inbound: number; outbound: number; sentiment: Record<string, number> }> = {};
    for (const c of callsInPeriod) {
      const key = new Date(c.createdAt).toISOString().slice(0, 10);
      if (!buckets[key]) buckets[key] = { period: key, inbound: 0, outbound: 0, sentiment: {} };
      if (c.direction === 'inbound') buckets[key].inbound++;
      else if (c.direction === 'outbound') buckets[key].outbound++;
      const sentiment = c.sentiment || 'Unknown';
      buckets[key].sentiment[sentiment] = (buckets[key].sentiment[sentiment] || 0) + 1;
    }
    return Object.values(buckets).sort((a, b) => a.period.localeCompare(b.period));
  }, [callsInPeriod]);

  // Custom tooltip for Call Volume Over Time — direction totals plus a
  // same-day sentiment breakdown, since the bar itself only stacks
  // Incoming/Outgoing (stacking sentiment in too would be unreadable).
  function CallVolumeTooltip({ active, payload, label }: { active?: boolean; payload?: { payload: (typeof callVolumeTrend)[number] }[]; label?: string }) {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload;
    const total = row.inbound + row.outbound;
    return (
      <div className="rounded-lg px-3 py-2 text-xs" style={CHART_TOOLTIP.contentStyle}>
        <p className="font-semibold mb-1.5">{label}</p>
        <div className="space-y-0.5">
          <p><span style={{ color: '#2563eb' }}>●</span> Incoming: {row.inbound}</p>
          <p><span style={{ color: '#f97316' }}>●</span> Outgoing: {row.outbound}</p>
          <p className="opacity-70">Total: {total}</p>
        </div>
        {Object.keys(row.sentiment).length > 0 && (
          <div className="mt-1.5 pt-1.5 border-t border-white/15 space-y-0.5">
            {Object.entries(row.sentiment).map(([sentiment, count]) => (
              <p key={sentiment}><span style={{ color: SENTIMENT_COLOR[sentiment] || '#94a3b8' }}>●</span> {sentiment}: {count}</p>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Custom tooltip for Campaign Performance — the stacked outcome
  // breakdown plus the same campaign's overall success rate, so "Success
  // Rate by Campaign" doesn't need to be its own separate widget.
  function CampaignPerformanceTooltip({ active, payload, label }: { active?: boolean; payload?: { payload: (typeof campaignPerformance)[number] }[]; label?: string }) {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload;
    const rate = row.total > 0 ? Math.round(((row['Answered'] || 0) / row.total) * 100) : 0;
    return (
      <div className="rounded-lg px-3 py-2 text-xs" style={CHART_TOOLTIP.contentStyle}>
        <p className="font-semibold mb-1.5">{label}</p>
        <div className="space-y-0.5">
          {OUTCOME_ORDER.filter(o => row[o]).map(outcome => (
            <p key={outcome}><span style={{ color: OUTCOME_COLORS[outcome] }}>●</span> {outcome}: {row[outcome]}</p>
          ))}
          <p className="opacity-70">Total: {row.total}</p>
        </div>
        <p className="mt-1.5 pt-1.5 border-t border-white/15 font-semibold">Success Rate: {rate}%</p>
      </div>
    );
  }

  // Call Outcome donut — every call in the period, bucketed into the same
  // 5 outcomes used everywhere else this concept shows up (Reports' Call
  // Outcome column, Campaign's "Not Answered" badges).
  const outcomeBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of callsInPeriod) {
      const outcome = getCallOutcome(c.status, c.callAnswered);
      counts[outcome] = (counts[outcome] || 0) + 1;
    }
    return OUTCOME_ORDER
      .map(label => ({ label, value: counts[label] || 0, color: OUTCOME_COLORS[label] }))
      .filter(s => s.value > 0);
  }, [callsInPeriod]);

  // Campaign Performance — each outbound workflow's leads, broken down by
  // outcome. Only dialer tasks (campaigns) have a workflow at all; inbound
  // calls never go through one, so this is outbound-only by nature. Top 8
  // campaigns by volume, so the chart stays readable.
  const campaignPerformance = useMemo(() => {
    const byWorkflow: Record<string, Record<string, number>> = {};
    for (const task of dialerTasks) {
      const name = task.workflowName || 'Other';
      for (const result of Object.values(task.callResults || {})) {
        if (!result?.status) continue;
        const outcome = getCallOutcome(result.status, result.callAnswered);
        if (!byWorkflow[name]) byWorkflow[name] = {};
        byWorkflow[name][outcome] = (byWorkflow[name][outcome] || 0) + 1;
      }
    }
    return Object.entries(byWorkflow)
      .map(([campaign, counts]) => ({ campaign, ...counts, total: Object.values(counts).reduce((s, n) => s + n, 0) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [dialerTasks]);

  // Agent Performance — which AI calling agent placed each campaign call
  // (dialerTasks.assignedTeamMemberId, despite the name — see
  // DashboardDialTask above), total vs. successfully-answered. A task with
  // no agent assigned falls into "Unassigned" rather than being dropped,
  // since that itself is worth surfacing (a campaign nobody configured an
  // agent for).
  const agentPerformance = useMemo(() => {
    const byAgent: Record<string, { total: number; success: number }> = {};
    for (const task of dialerTasks) {
      const agentId = task.assignedTeamMemberId || 'unassigned';
      for (const result of Object.values(task.callResults || {})) {
        if (!result?.status) continue;
        if (!byAgent[agentId]) byAgent[agentId] = { total: 0, success: 0 };
        byAgent[agentId].total++;
        if (getCallOutcome(result.status, result.callAnswered) === 'Answered') byAgent[agentId].success++;
      }
    }
    return Object.entries(byAgent)
      .map(([agentId, { total, success }]) => ({
        agent: agentId === 'unassigned' ? 'Unassigned' : (agentNames[agentId] || 'Unknown Agent'),
        total,
        success,
        notSuccess: total - success,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [dialerTasks, agentNames]);

  // Call Outcomes Over Time — same daily buckets as Call Volume, but split
  // by outcome instead of direction.
  const outcomesOverTime = useMemo(() => {
    const buckets: Record<string, { period: string } & Record<string, number>> = {};
    for (const c of callsInPeriod) {
      const key = new Date(c.createdAt).toISOString().slice(0, 10);
      if (!buckets[key]) buckets[key] = { period: key } as { period: string } & Record<string, number>;
      const outcome = getCallOutcome(c.status, c.callAnswered);
      buckets[key][outcome] = (buckets[key][outcome] || 0) + 1;
    }
    return Object.values(buckets).sort((a, b) => a.period.localeCompare(b.period));
  }, [callsInPeriod]);

  // Recent Calls — most recent, org-wide, not scoped to the 30-day period
  // (a brand-new org with its first few calls outside a rolling window
  // shouldn't see an empty table).
  const recentCalls = useMemo(
    () => [...callLogs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10),
    [callLogs]
  );

  return (
    <PageShell
      title="Executive Strategic Desk"
      subtitle={
        isLending
          ? 'Real-time credit health, portfolio metrics, and automated dialing conversion stats.'
          : `Real-time ${primaryObject?.objectLabel || 'pipeline'} metrics and automated dialing conversion stats.`
      }
      onRefresh={loadMetrics}
    >
      {/* ── Row 1: KPI tiles ── */}

      <KpiCard
        colSpan={3}
        icon={PhoneIncoming}
        iconBg="#eff6ff"
        iconColor="#2563eb"
        label="Total Calls"
        value={callLogs.length}
        sub="All time"
      />

      <KpiCard
        colSpan={3}
        icon={UserCheck}
        iconBg="#f0fdf4"
        iconColor="#16a34a"
        label="Success Calls"
        value={successCallsCount}
        sub={callLogs.length > 0 ? `${Math.round((successCallsCount / callLogs.length) * 100)}% of all calls` : undefined}
      />

      <KpiCard
        colSpan={3}
        icon={MessageCircleQuestion}
        iconBg="#fffbeb"
        iconColor="#d97706"
        label="Enquiries"
        value={enquiriesTotal ?? '—'}
      />

      <KpiCard
        colSpan={3}
        icon={Flame}
        iconBg="#fdf4ff"
        iconColor="#9333ea"
        label="Successful Outcomes"
        value={successfulOutcomesCount}
        sub="Interested intent"
      />

      {/* ── Row 2: Charts, in the requested order: Call Outcome, Call
          Volume Over Time, Call Outcomes Over Time, Campaign Performance,
          Agent Performance, Recent Calls ── */}

      {/* Call Outcome donut */}
      <Widget colSpan={12} title="Call Outcome" subtitle="Last 30 days." icon={PieChartIcon} accent="#059669" padding="md" hover>
        {outcomeBreakdown.length > 0 ? (
          <div className="flex flex-col items-center gap-4 mt-1">
            <PieChart slices={outcomeBreakdown} size={160} />
            <div className="w-full max-w-xs space-y-1.5">
              {outcomeBreakdown.map(s => (
                <div key={s.label} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    {s.label}
                  </span>
                  <span className="font-semibold text-slate-700">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState heading="No calls in the last 30 days" />
        )}
      </Widget>

      {/* Call volume over time — same chart Reports uses, fixed to the last
          30 days here since this is a glance-at-it overview, not a
          configurable report (see Reports > Report by Task for filters). */}
      <Widget colSpan={12} title="Call Volume Over Time" subtitle="Incoming vs. outgoing calls (stacked), with sentiment on hover — last 30 days." icon={PhoneIncoming} accent="#2563eb" padding="md" hover>
        <div className="h-64 w-full mt-1">
          {callVolumeTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={callVolumeTrend} barGap={2} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="period" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CallVolumeTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="inbound" name="Incoming" stackId="calls" fill="#2563eb" />
                <Bar dataKey="outbound" name="Outgoing" stackId="calls" fill="#f97316" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState heading="No calls in the last 30 days" />
          )}
        </div>
      </Widget>

      {/* Call Outcomes Over Time — same daily buckets as Call Volume, split by outcome */}
      <Widget colSpan={12} title="Call Outcomes Over Time" subtitle="Daily outcome breakdown, last 30 days." icon={Activity} accent="#2563eb" padding="md" hover>
        <div className="h-64 w-full mt-1">
          {outcomesOverTime.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={outcomesOverTime} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="period" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip {...CHART_TOOLTIP} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {OUTCOME_ORDER.map(outcome => (
                  <Line key={outcome} type="monotone" dataKey={outcome} name={outcome} stroke={OUTCOME_COLORS[outcome]} strokeWidth={2} dot={false} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState heading="No calls in the last 30 days" />
          )}
        </div>
      </Widget>

      {/* Campaign Performance — horizontal stacked bar, one row per workflow
          (same-named campaigns/workflow runs are already merged into a
          single row — see campaignPerformance above). Hover a bar for the
          outcome breakdown plus that campaign's success rate. */}
      <Widget colSpan={12} title="Campaign Performance" subtitle="Outbound workflow leads by outcome, last 30 days — hover a bar for its success rate." icon={BarChart3} accent="#7c3aed" padding="md" hover>
        <div className="w-full mt-1" style={{ height: Math.max(160, campaignPerformance.length * 48) }}>
          {campaignPerformance.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={campaignPerformance} layout="vertical" margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="campaign" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={140} />
                <Tooltip content={<CampaignPerformanceTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {OUTCOME_ORDER.map(outcome => (
                  <Bar key={outcome} dataKey={outcome} name={outcome} stackId="outcome" fill={OUTCOME_COLORS[outcome]} radius={outcome === OUTCOME_ORDER[OUTCOME_ORDER.length - 1] ? [0, 3, 3, 0] : undefined} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState heading="No campaign calls yet" message="Run a dialing task from Campaign to see performance here." />
          )}
        </div>
      </Widget>

      {/* Agent Performance — total vs. successfully-answered calls per AI calling agent */}
      <Widget colSpan={12} title="Agent Performance" subtitle="Total calls vs. successfully answered, per AI calling agent, last 30 days." icon={UserCheck} accent="#2563eb" padding="md" hover>
        <div className="w-full mt-1" style={{ height: Math.max(160, agentPerformance.length * 48) }}>
          {agentPerformance.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agentPerformance} layout="vertical" margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="agent" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={140} />
                <Tooltip {...CHART_TOOLTIP} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="success" name="Answered" stackId="agent" fill="#059669" />
                <Bar dataKey="notSuccess" name="Not Answered / No Answer" stackId="agent" fill="#e11d48" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState heading="No campaign calls yet" message="Run a dialing task from Campaign to see agent performance here." />
          )}
        </div>
      </Widget>

      {/* Recent Calls */}
      <Widget colSpan={12} title="Recent Calls" icon={History} accent="#64748b" padding="none" hover scrollable>
        {(() => {
          const columns: Column<CallLog>[] = [
            { key: 'caller', header: 'Caller', cell: (c) => <span className="font-semibold text-slate-800">{c.leadName}</span> },
            { key: 'direction', header: 'Direction', cell: (c) => <span className="text-slate-500 capitalize">{c.direction || '—'}</span> },
            {
              key: 'outcome',
              header: 'Outcome',
              cell: (c) => {
                const outcome = getCallOutcome(c.status, c.callAnswered);
                return (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap" style={{ color: OUTCOME_COLORS[outcome], backgroundColor: `${OUTCOME_COLORS[outcome]}1a` }}>
                    {outcome}
                  </span>
                );
              },
            },
            { key: 'duration', header: 'Duration', cell: (c) => <span className="font-mono">{formatDuration(c.duration)}</span> },
            {
              key: 'sentiment',
              header: 'Sentiment',
              cell: (c) => (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{ color: SENTIMENT_COLOR[c.sentiment], backgroundColor: `${SENTIMENT_COLOR[c.sentiment]}1a` }}>
                  {c.sentiment}
                </span>
              ),
            },
            { key: 'when', header: 'When', cell: (c) => <span className="text-slate-400 whitespace-nowrap">{new Date(c.createdAt).toLocaleString()}</span> },
          ];
          return (
            <DataTable
              bare
              columns={columns}
              rows={recentCalls}
              rowKey={(c) => c.id}
              emptyMessage="No calls logged yet."
            />
          );
        })()}
      </Widget>

    </PageShell>
  );
}
