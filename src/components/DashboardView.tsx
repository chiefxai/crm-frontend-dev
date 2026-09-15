import React, { useState, useEffect, useMemo } from 'react';
import {
  PhoneIncoming,
  DollarSign,
  UserCheck,
  Clock,
  Activity,
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
} from 'recharts';
import { apiFetch } from '../lib/api';
import { Lead, Loan, CallLog, OrganizationSettings } from '../types';
import { COST_PER_MINUTE_INR_FALLBACK, formatInr } from '../lib/pricing';
import PageShell from './ui/PageShell';
import Widget from './ui/Widget';
import EmptyState from './ui/EmptyState';
import KpiCard from './ui/KpiCard';

interface DashboardViewProps {
  leads: Lead[];
  loans: Loan[];
  callLogs: CallLog[];
  orgSettings: OrganizationSettings;
  costPerMinuteInr?: number;
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
  orgSettings,
  costPerMinuteInr = COST_PER_MINUTE_INR_FALLBACK,
}: DashboardViewProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

  const loadMetrics = () => {
    apiFetch('/api/dashboard/metrics')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: DashboardMetrics) => setMetrics(data))
      .catch(err => console.error('Failed to load dashboard metrics:', err));
  };

  useEffect(loadMetrics, [leads.length, loans.length, callLogs.length]);

  const isLending = !orgSettings.industry || orgSettings.industry === 'lending';
  const primaryObject = metrics?.objectMetrics?.[0] || null;
  const totalLeadsCount = leads.length;
  const outstandingPortfolio = loans.reduce((s, l) => s + l.amount, 0);
  const daysLeft = Math.max(0, Math.round(
    (new Date(orgSettings.billingPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  ));

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

  const callVolumeTrend = useMemo(() => {
    const buckets: Record<string, { period: string; inbound: number; outbound: number }> = {};
    for (const c of callsInPeriod) {
      const key = new Date(c.createdAt).toISOString().slice(0, 10);
      if (!buckets[key]) buckets[key] = { period: key, inbound: 0, outbound: 0 };
      if (c.direction === 'inbound') buckets[key].inbound++;
      else if (c.direction === 'outbound') buckets[key].outbound++;
    }
    return Object.values(buckets).sort((a, b) => a.period.localeCompare(b.period));
  }, [callsInPeriod]);

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
        icon={UserCheck}
        iconBg="#eff6ff"
        iconColor="#2563eb"
        label={isLending ? 'Active Loan Leads' : `Total ${primaryObject?.objectLabel || 'Records'}`}
        value={isLending ? totalLeadsCount : (primaryObject?.totalRecords ?? 0)}
        badge="+12.5%"
        badgeColor="green"
      />


      <KpiCard
        colSpan={3}
        icon={DollarSign}
        iconBg="#fffbeb"
        iconColor="#d97706"
        label={isLending ? 'Outstanding Portfolio' : 'New This Month'}
        value={isLending
          ? `$${(outstandingPortfolio / 1000).toFixed(0)}k`
          : (primaryObject?.recordsTrend?.[primaryObject.recordsTrend.length - 1]?.count ?? 0)
        }
        badge="Active"
        badgeColor="amber"
      />

      <KpiCard
        colSpan={3}
        icon={Clock}
        iconBg="var(--bg-subtle)"
        iconColor="var(--text-secondary)"
        label="AI Voice Minutes This Period"
        value={`${orgSettings.aiMinutesUsed.toFixed(2)} min`}
        sub={`${formatInr(orgSettings.aiMinutesUsed * costPerMinuteInr)} at ₹${costPerMinuteInr}/min`}
        badge={`${daysLeft}d Left`}
        badgeColor="neutral"
      />

      <KpiCard
        colSpan={3}
        icon={PhoneIncoming}
        iconBg="#eff6ff"
        iconColor="#2563eb"
        label="Calls This Period"
        value={callsInPeriod.length}
        sub="Last 30 days"
      />

      {/* ── Row 2: Charts ── */}

      {/* Bar chart — leads by source / pipeline stage */}
      <Widget
        colSpan={12}
        title={isLending ? 'Leads by Source' : `${primaryObject?.objectLabel || 'Pipeline'} by Stage`}
        subtitle={isLending ? 'How your leads are actually arriving.' : 'Where records currently sit in the pipeline.'}
        icon={Activity}
        accent="#7c3aed"
        padding="md"
        hover
      >
        <div className="h-64 w-full mt-1">
          {isLending
            ? metrics?.channelPerformance && metrics.channelPerformance.length > 0
              ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.channelPerformance} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="source" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip {...CHART_TOOLTIP} />
                    <Bar dataKey="count" name="Leads" fill="#7c3aed" radius={[4, 4, 0, 0]} barSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              )
              : <EmptyState heading="No leads yet" />
            : primaryObject?.stageDistribution && primaryObject.stageDistribution.length > 0
              ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={primaryObject.stageDistribution} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="stage" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip {...CHART_TOOLTIP} />
                    <Bar dataKey="count" name="Records" fill="#7c3aed" radius={[4, 4, 0, 0]} barSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              )
              : <EmptyState heading="No pipeline stages configured yet" />
          }
        </div>
      </Widget>

      {/* Call volume over time — same chart Reports uses, fixed to the last
          30 days here since this is a glance-at-it overview, not a
          configurable report (see Reports > Report by Task for filters). */}
      <Widget colSpan={12} title="Call Volume Over Time" subtitle="Incoming vs. outgoing calls, last 30 days." icon={PhoneIncoming} accent="#2563eb" padding="md" hover>
        <div className="h-64 w-full mt-1">
          {callVolumeTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={callVolumeTrend} barGap={2} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="period" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip {...CHART_TOOLTIP} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="inbound" name="Incoming" fill="#2563eb" radius={[3, 3, 0, 0]} />
                <Bar dataKey="outbound" name="Outgoing" fill="#f97316" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState heading="No calls in the last 30 days" />
          )}
        </div>
      </Widget>

    </PageShell>
  );
}
