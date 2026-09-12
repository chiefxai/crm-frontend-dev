import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  PhoneCall,
  DollarSign,
  UserCheck,
  RefreshCw,
  Clock,
  Flame,
  Phone,
  Activity,
  Sparkles,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { apiFetch } from '../lib/api';
import { Lead, Loan, CallLog, OrganizationSettings } from '../types';
import { COST_PER_MINUTE_INR_FALLBACK, formatInr } from '../lib/pricing';
import PageShell from './ui/PageShell';
import Widget from './ui/Widget';
import Button from './ui/Button';
import DataTable, { Column } from './ui/DataTable';
import EmptyState from './ui/EmptyState';
import KpiCard from './ui/KpiCard';
import Markdown from './ui/Markdown';

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
  const [insights, setInsights] = useState('');
  const [insightsDegraded, setInsightsDegraded] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

  const loadMetrics = () => {
    apiFetch('/api/dashboard/metrics')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: DashboardMetrics) => setMetrics(data))
      .catch(err => console.error('Failed to load dashboard metrics:', err));
  };

  useEffect(loadMetrics, [leads.length, loans.length, callLogs.length]);

  const fetchAIInsights = async () => {
    setLoadingInsights(true);
    setInsights('');
    try {
      const res = await fetch('/api/gemini/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads, loans, platformMode: orgSettings.industry || 'lending' }),
      });
      const data = await res.json();
      if (data.success) {
        setInsights(data.insights);
        setInsightsDegraded(!!data.degraded);
      } else {
        setInsights('Could not generate insights at this moment.');
        setInsightsDegraded(false);
      }
    } catch {
      setInsights('Simulation Server Offline: Defaulting to standard credit metrics.');
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => { fetchAIInsights(); }, [leads.length, loans.length]);

  const isLending = !orgSettings.industry || orgSettings.industry === 'lending';
  const primaryObject = metrics?.objectMetrics?.[0] || null;
  const totalLeadsCount = leads.length;
  const outstandingPortfolio = loans.reduce((s, l) => s + l.amount, 0);
  const daysLeft = Math.max(0, Math.round(
    (new Date(orgSettings.billingPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  ));

  // AI call conversion: % of completed calls with positive sentiment
  const completedCalls = callLogs.filter(c => c.status === 'Completed' || c.duration > 0);
  const positiveCalls = completedCalls.filter(c => c.sentiment === 'Positive');
  const aiCallConversionPct = completedCalls.length > 0
    ? Math.round((positiveCalls.length / completedCalls.length) * 100)
    : null;

  // ── Interested clients table columns ─────────────────────────────────────
  const clientColumns: Column<InterestedClient>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: r => <span className="font-semibold text-slate-800 dark:text-[var(--text-primary)]">{r.name}</span>,
    },
    {
      key: 'phone',
      header: 'Phone',
      cell: r => r.phone
        ? <span className="flex items-center gap-1.5 text-slate-500"><Phone className="h-3 w-3" />{r.phone}</span>
        : <span className="text-slate-300">—</span>,
    },
    {
      key: 'score',
      header: 'Score',
      cell: r => r.score != null
        ? <Badge color="green">{r.score}</Badge>
        : <span className="text-slate-300">—</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      cell: r => r.amountRequested != null
        ? <span className="text-slate-600">{formatInr(r.amountRequested)}</span>
        : <span className="text-slate-300">—</span>,
    },
    {
      key: 'intent',
      header: 'Intent',
      cell: r => <span className="text-slate-500">{r.intent || '—'}</span>,
    },
    {
      key: 'summary',
      header: 'Last Call Summary',
      cell: r => (
        <span className="text-slate-500 truncate block max-w-xs" title={r.lastCallSummary || ''}>
          {r.lastCallSummary || '—'}
        </span>
      ),
    },
  ];

  return (
    <PageShell
      title="Executive Strategic Desk"
      subtitle={
        isLending
          ? 'Real-time credit health, portfolio metrics, and automated dialing conversion stats.'
          : `Real-time ${primaryObject?.objectLabel || 'pipeline'} metrics and automated dialing conversion stats.`
      }
      action={
        <Button
          icon={RefreshCw}
          variant="secondary"
          size="sm"
          loading={loadingInsights}
          onClick={fetchAIInsights}
        >
          Refresh AI Model
        </Button>
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
        icon={PhoneCall}
        iconBg="#f0fdf4"
        iconColor="#16a34a"
        label="AI Call Conversion"
        value={aiCallConversionPct !== null ? `${aiCallConversionPct}%` : '—'}
        sub={`${positiveCalls.length} positive of ${completedCalls.length} calls`}
        badge={aiCallConversionPct !== null && aiCallConversionPct >= 50 ? 'Good' : completedCalls.length === 0 ? 'No data' : 'Low'}
        badgeColor={aiCallConversionPct !== null && aiCallConversionPct >= 50 ? 'green' : 'neutral'}
      />

      {/* ── Row 2: Charts ── */}

      {/* Area chart — portfolio/records trend */}
      <Widget
        colSpan={6}
        title={isLending ? 'Loan Portfolio Growth' : `${primaryObject?.objectLabel || 'Records'} Over Time`}
        subtitle={isLending ? 'Total loan amount disbursed per month, last 6 months.' : 'New records created per month, last 6 months.'}
        icon={TrendingUp}
        accent="#2563eb"
        padding="md"
        hover
      >
        <div className="h-64 w-full mt-1">
          {isLending
            ? metrics?.portfolioTrend?.some(m => m.loanCount > 0)
              ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.portfolioTrend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPortfolio" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip {...CHART_TOOLTIP} />
                    <Area type="monotone" dataKey="totalDisbursed" name="Total Disbursed" stroke="#2563eb" fillOpacity={1} fill="url(#colorPortfolio)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              )
              : <EmptyState heading="No loan activity yet" message="Loan data will appear here once disbursals are recorded." />
            : primaryObject?.recordsTrend?.some(m => m.count > 0)
              ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={primaryObject.recordsTrend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRecords" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip {...CHART_TOOLTIP} />
                    <Area type="monotone" dataKey="count" name="New Records" stroke="#2563eb" fillOpacity={1} fill="url(#colorRecords)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              )
              : <EmptyState heading="No records yet" />
          }
        </div>
      </Widget>

      {/* Bar chart — leads by source / pipeline stage */}
      <Widget
        colSpan={6}
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

      {/* ── Row 3: Interested Clients table ── */}
      <Widget
        colSpan={12}
        title="Interested Clients"
        subtitle="Leads whose most recent call had positive sentiment — ranked by lead score, call them back first."
        icon={Flame}
        accent="#e11d48"
        padding="none"
        hover
        scrollable
      >
        <DataTable
          bare
          columns={clientColumns}
          rows={metrics?.topInterestedClients ?? []}
          rowKey={r => r.leadId}
          emptyMessage="No positive-sentiment calls yet — interested clients will appear here as calls are analyzed."
        />
      </Widget>

      {/* ── Row 4: Gemini Strategic Advisory ── */}
      <Widget
        colSpan={12}
        title="Gemini Strategic Advisory Engine"
        subtitle="Real-time AI portfolio analysis generated dynamically based on active CRM pipeline leads"
        icon={Sparkles}
        accent="#2563eb"
        action={
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Advisor Online
          </span>
        }
        padding="md"
        className="theme-panel border relative overflow-hidden"
      >
        {/* Glow */}
        <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-5">
          {/* AI insights body */}
          {loadingInsights ? (
            <div className="space-y-2.5 py-2">
              <div className="h-3.5 rounded-md animate-pulse w-3/4" style={{ background: 'var(--panel-surface)' }} />
              <div className="h-3.5 rounded-md animate-pulse w-5/6" style={{ background: 'var(--panel-surface)' }} />
              <div className="h-3.5 rounded-md animate-pulse w-1/2" style={{ background: 'var(--panel-surface)' }} />
            </div>
          ) : (
            <div
              className="leading-relaxed text-xs p-5 rounded-xl"
              style={{ color: 'var(--panel-muted)', background: 'var(--panel-surface)', border: '1px solid var(--panel-border)' }}
            >
              {insights && insightsDegraded && (
                <div className="mb-3 flex items-center gap-1.5 text-amber-500 bg-amber-50 border border-amber-200 rounded px-2 py-1 font-sans font-semibold not-italic text-xs">
                  ⚠ Estimated — AI analysis temporarily unavailable, showing a generic brief
                </div>
              )}
              {insights ? (
                <Markdown variant="panel">{insights}</Markdown>
              ) : (
                <span style={{ color: 'var(--panel-text)' }}>
                  Strategic advice database is empty. Click "Refresh AI Model" to prompt the advisor.
                </span>
              )}
            </div>
          )}

          {/* Live metrics row */}
          <div className="grid grid-cols-3 gap-4 pt-4" style={{ borderTop: '1px solid var(--panel-border)' }}>
            <div className="rounded-xl p-3" style={{ background: 'var(--panel-surface)' }}>
              <p className="text-[10px] uppercase tracking-wider font-mono" style={{ color: 'var(--panel-muted)' }}>Calls Today</p>
              <p className="text-lg font-bold mt-1" style={{ color: 'var(--panel-text)' }}>{metrics?.callsToday ?? 0}</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: 'var(--panel-surface)' }}>
              <p className="text-[10px] uppercase tracking-wider font-mono" style={{ color: 'var(--panel-muted)' }}>Average Sentiment</p>
              <p className="text-lg font-bold text-emerald-500 mt-1">
                {metrics?.positiveSentimentPct != null ? `Positive (${metrics.positiveSentimentPct}%)` : 'No data yet'}
              </p>
            </div>
          </div>
        </div>
      </Widget>
    </PageShell>
  );
}
