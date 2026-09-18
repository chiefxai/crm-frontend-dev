import React, { useEffect, useState } from 'react';
import { Building2, Users, PhoneCall, Clock, Loader2, IndianRupee, Archive } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { Stats, TimeSeries, AuditRow } from './types';
import Widget from '../components/ui/Widget';
import LineChart from './charts/LineChart';
import BarChart from './charts/BarChart';
import DistributionBars from './charts/DistributionBars';

function StatWidget({ label, value, icon, accent }: { label: string; value: string | number; icon: React.ElementType; accent: string }) {
  return (
    <Widget colSpan={3} icon={icon} accent={accent} padding="md">
      <span className="text-xs font-medium text-slate-500 dark:text-[var(--text-secondary)]">{label}</span>
      <div className="text-2xl font-semibold text-slate-900 dark:text-[var(--text-primary)] mt-1">{value}</div>
    </Widget>
  );
}

function formatInr(n: number) {
  return `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [series, setSeries] = useState<TimeSeries | null>(null);
  const [activity, setActivity] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/platform/stats').then((r) => r.json()),
      apiFetch('/api/platform/timeseries').then((r) => r.json()),
      apiFetch('/api/platform/audit-log').then((r) => r.json())
    ]).then(([s, t, a]) => {
      setStats(s);
      setSeries(t);
      setActivity(Array.isArray(a) ? a.slice(0, 8) : []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading || !stats || !series) {
    return <div className="flex items-center justify-center h-64 text-slate-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading overview…</div>;
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      <StatWidget label="Organizations" value={stats.totalOrganizations} icon={Building2} accent="#2a78d6" />
      <StatWidget label="Registered users" value={stats.totalUsers} icon={Users} accent="#1baf7a" />
      <StatWidget label="Total calls" value={stats.totalCalls} icon={PhoneCall} accent="#eb6834" />
      <StatWidget label="Signups, last 30 days" value={series.signupsByDay.reduce((s, d) => s + d.count, 0)} icon={Clock} accent="#4a3aa7" />

      {/* Platform-wide cost — summed from each org's own accrued/locked-in
          figures (never today's rate applied retroactively). See the
          Cost page for per-provider rates. */}
      <Widget
        colSpan={6}
        title="Platform cost"
        subtitle="Summed across every organization's accrued call and AI token cost"
        icon={IndianRupee}
        accent="#0d9488"
        padding="md"
      >
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-50 dark:bg-[var(--bg-subtle)] p-4 rounded-xl text-center">
            <span className="text-[10px] text-slate-400 dark:text-[var(--text-muted)] uppercase tracking-wider block">Call cost</span>
            <strong className="text-md text-slate-800 dark:text-[var(--text-primary)] font-mono">{formatInr(stats.totalPhoneChargesInr)}</strong>
          </div>
          <div className="bg-slate-50 dark:bg-[var(--bg-subtle)] p-4 rounded-xl text-center">
            <span className="text-[10px] text-slate-400 dark:text-[var(--text-muted)] uppercase tracking-wider block">AI token cost</span>
            <strong className="text-md text-slate-800 dark:text-[var(--text-primary)] font-mono">{formatInr(stats.totalAiTokenCostInr)}</strong>
          </div>
          <div className="bg-slate-50 dark:bg-[var(--bg-subtle)] p-4 rounded-xl text-center">
            <span className="text-[10px] text-slate-400 dark:text-[var(--text-muted)] uppercase tracking-wider block">Active providers</span>
            <strong className="text-md text-slate-800 dark:text-[var(--text-primary)] font-mono">{stats.activeCostProviderCount}</strong>
          </div>
        </div>
        {stats.selfManagedCallOrgCount > 0 && (
          <p className="text-[10px] text-slate-400 dark:text-[var(--text-muted)] mt-3">
            Excludes {stats.selfManagedCallOrgCount} org{stats.selfManagedCallOrgCount === 1 ? '' : 's'} using their own connected call-provider account — the platform doesn't pay for those calls.
          </p>
        )}
      </Widget>

      <Widget
        colSpan={6}
        title="Deleted organizations"
        subtitle="Cost history kept permanently, even after the org itself is gone"
        icon={Archive}
        accent="#b45309"
        padding="md"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-semibold text-slate-900 dark:text-[var(--text-primary)]">{stats.archivedOrgCount}</div>
            <p className="text-xs text-slate-400 dark:text-[var(--text-muted)] mt-1">
              {stats.archivedOrgCount === 0 ? 'No organizations deleted yet.' : 'See the Cost page for each org\'s final cost snapshot.'}
            </p>
          </div>
        </div>
      </Widget>

      <Widget colSpan={6} title="New organizations" subtitle="Daily signups, last 30 days" padding="md">
        <LineChart data={series.signupsByDay} color="#2a78d6" />
      </Widget>
      <Widget colSpan={6} title="Call volume" subtitle="Calls placed per day, last 30 days" padding="md">
        <BarChart data={series.callsByDay} color="#eb6834" />
      </Widget>

      <Widget colSpan={6} title="Plan mix" padding="md">
        <DistributionBars rows={series.planDistribution.map((p) => ({ label: p.plan, count: p.count }))} />
      </Widget>
      <Widget colSpan={6} title="Industry mix" padding="md">
        <DistributionBars rows={series.industryDistribution.map((p) => ({ label: p.industry, count: p.count }))} />
      </Widget>

      <Widget colSpan={12} title="Recent activity across all organizations" padding="md">
        <div className="space-y-2">
          {activity.length === 0 && <p className="text-xs text-slate-400 dark:text-[var(--text-muted)]">No activity recorded yet.</p>}
          {activity.map((a) => (
            <div key={a.id} className="flex items-center justify-between text-xs py-2 border-b border-slate-50 dark:border-[var(--border)] last:border-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">{a.orgName}</span>
                <span className="text-slate-600 dark:text-[var(--text-secondary)]">{a.action}</span>
                <span className="text-slate-400 dark:text-[var(--text-muted)]">by {a.actorEmail}</span>
              </div>
              <span className="text-slate-400 dark:text-[var(--text-muted)]">{new Date(a.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </Widget>
    </div>
  );
}
