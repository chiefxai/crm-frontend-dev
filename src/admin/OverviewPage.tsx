import React, { useEffect, useState } from 'react';
import { Building2, Users, PhoneCall, Clock, Loader2 } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { Stats, TimeSeries, AuditRow } from './types';
import StatTile from './StatTile';
import LineChart from './charts/LineChart';
import BarChart from './charts/BarChart';
import DistributionBars from './charts/DistributionBars';

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
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatTile label="Organizations" value={stats.totalOrganizations} icon={Building2} accent="#2a78d6" />
        <StatTile label="Registered users" value={stats.totalUsers} icon={Users} accent="#1baf7a" />
        <StatTile label="Total calls" value={stats.totalCalls} icon={PhoneCall} accent="#eb6834" />
        <StatTile label="Signups, last 30 days" value={series.signupsByDay.reduce((s, d) => s + d.count, 0)} icon={Clock} accent="#4a3aa7" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-1">New organizations</h3>
          <p className="text-xs text-slate-400 mb-4">Daily signups, last 30 days</p>
          <LineChart data={series.signupsByDay} color="#2a78d6" />
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-1">Call volume</h3>
          <p className="text-xs text-slate-400 mb-4">Calls placed per day, last 30 days</p>
          <BarChart data={series.callsByDay} color="#eb6834" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Plan mix</h3>
          <DistributionBars rows={series.planDistribution.map((p) => ({ label: p.plan, count: p.count }))} />
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Industry mix</h3>
          <DistributionBars rows={series.industryDistribution.map((p) => ({ label: p.industry, count: p.count }))} />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Recent activity across all organizations</h3>
        <div className="space-y-2">
          {activity.length === 0 && <p className="text-xs text-slate-400">No activity recorded yet.</p>}
          {activity.map((a) => (
            <div key={a.id} className="flex items-center justify-between text-xs py-2 border-b border-slate-50 last:border-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{a.orgName}</span>
                <span className="text-slate-600">{a.action}</span>
                <span className="text-slate-400">by {a.actorEmail}</span>
              </div>
              <span className="text-slate-400">{new Date(a.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
