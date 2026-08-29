import React, { useMemo, useState } from 'react';
import { apiFetch } from '../lib/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { PhoneIncoming, PhoneOutgoing, Clock, DollarSign, Smile, CheckCircle2, ListChecks, FileDown, ChevronDown, ChevronRight, Download } from 'lucide-react';
import PageHeader from './PageHeader';
import { CallLog } from '../types';
import { callCostInr, formatInr, COST_PER_MINUTE_INR_FALLBACK } from '../lib/pricing';
import PrintableReport from './PrintableReport';

// Colors chosen to match this app's existing conventions (blue = primary/
// AI accent used throughout, amber = the paired categorical hue) rather
// than a new palette — same blue/orange pairing the dataviz reference
// palette validates as its first two categorical slots.
const DIRECTION_COLOR = { inbound: '#2563eb', outbound: '#f97316' };
const SENTIMENT_COLOR: Record<string, string> = {
  Positive: '#059669',
  Negative: '#e11d48',
  Neutral: '#64748b',
  Unknown: '#94a3b8'
};

type Granularity = 'day' | 'month' | 'year';
type DirectionFilter = 'all' | 'inbound' | 'outbound';

interface DialTaskCallResult {
  status: 'Pending' | 'Calling' | 'Completed' | 'No Answer' | 'Skipped';
  duration: number;
  sentiment: 'Positive' | 'Neutral' | 'Negative' | 'Unknown';
  intent: 'Interested' | 'Not Interested' | 'Callback Scheduled' | 'Wrong Number' | 'Unknown';
  summary: string;
  recordingUrl?: string;
}

interface DialTask {
  id: string;
  name: string;
  leadIds: string[];
  status: string;
  createdAt: string;
  callResults: Record<string, DialTaskCallResult>;
}

interface ReportsViewProps {
  callLogs: CallLog[];
  dialerTasks: DialTask[];
  leads: { id: string; name: string; phone: string }[];
  costPerMinuteInr?: number;
  orgName?: string;
}

function bucketKey(dateStr: string, granularity: Granularity): string {
  const d = new Date(dateStr);
  if (granularity === 'year') return String(d.getFullYear());
  if (granularity === 'month') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return d.toISOString().slice(0, 10);
}

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function ReportsView({ callLogs, dialerTasks, leads, costPerMinuteInr = COST_PER_MINUTE_INR_FALLBACK, orgName = 'ChiefXAI' }: ReportsViewProps) {
  const [direction, setDirection] = useState<DirectionFilter>('all');
  const [granularity, setGranularity] = useState<Granularity>('day');
  const [fromDate, setFromDate] = useState(daysAgo(30));
  const [toDate, setToDate] = useState(daysAgo(0));
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  // Answers are keyed by call_id, not by lead — the Reports page only knows
  // a lead's phone number, so this fetches per-phone and caches by phone to
  // avoid re-fetching on every expand/collapse.
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  const [answersByPhone, setAnswersByPhone] = useState<Record<string, { question: string; answer: string }[]>>({});
  const [loadingAnswersFor, setLoadingAnswersFor] = useState<string | null>(null);
  const [exportingCsv, setExportingCsv] = useState(false);

  async function toggleLeadExpand(leadId: string, phone: string) {
    if (expandedLeadId === leadId) {
      setExpandedLeadId(null);
      return;
    }
    setExpandedLeadId(leadId);
    if (!phone || answersByPhone[phone]) return;
    setLoadingAnswersFor(phone);
    try {
      const res = await apiFetch(`/api/lead-responses?phone=${encodeURIComponent(phone)}`);
      const data = await res.json();
      setAnswersByPhone((prev) => ({ ...prev, [phone]: Array.isArray(data) ? data : [] }));
    } catch {
      setAnswersByPhone((prev) => ({ ...prev, [phone]: [] }));
    } finally {
      setLoadingAnswersFor(null);
    }
  }

  const filteredCalls = useMemo(() => {
    const from = new Date(fromDate + 'T00:00:00');
    const to = new Date(toDate + 'T23:59:59');
    return callLogs.filter((c) => {
      const created = new Date(c.createdAt);
      if (created < from || created > to) return false;
      if (direction !== 'all' && c.direction !== direction) return false;
      return true;
    });
  }, [callLogs, fromDate, toDate, direction]);

  const summary = useMemo(() => {
    const total = filteredCalls.length;
    const totalDuration = filteredCalls.reduce((sum, c) => sum + (c.duration || 0), 0);
    const totalCost = filteredCalls.reduce((sum, c) => sum + callCostInr(c.duration || 0, costPerMinuteInr), 0);
    const sentimentCounts = { Positive: 0, Neutral: 0, Negative: 0, Unknown: 0 } as Record<string, number>;
    const statusCounts: Record<string, number> = {};
    for (const c of filteredCalls) {
      sentimentCounts[c.sentiment] = (sentimentCounts[c.sentiment] || 0) + 1;
      statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
    }
    const positivePct = total > 0 ? Math.round((sentimentCounts.Positive / total) * 100) : 0;
    return { total, totalDuration, totalCost, sentimentCounts, statusCounts, positivePct };
  }, [filteredCalls, costPerMinuteInr]);

  const trendData = useMemo(() => {
    const buckets: Record<string, { period: string; inbound: number; outbound: number }> = {};
    for (const c of filteredCalls) {
      const key = bucketKey(c.createdAt, granularity);
      if (!buckets[key]) buckets[key] = { period: key, inbound: 0, outbound: 0 };
      if (c.direction === 'inbound') buckets[key].inbound++;
      else if (c.direction === 'outbound') buckets[key].outbound++;
    }
    return Object.values(buckets).sort((a, b) => a.period.localeCompare(b.period));
  }, [filteredCalls, granularity]);

  const selectedTask = dialerTasks.find((t) => t.id === selectedTaskId) || null;
  const taskReport = useMemo(() => {
    if (!selectedTask) return null;
    const rows = selectedTask.leadIds.map((leadId) => {
      const lead = leads.find((l) => l.id === leadId);
      const result = selectedTask.callResults[leadId];
      return {
        leadId,
        name: lead?.name || 'Unknown',
        phone: lead?.phone || '',
        status: result?.status || 'Pending',
        duration: result?.duration || 0,
        sentiment: result?.sentiment || 'Unknown',
        intent: result?.intent || 'Unknown',
        recordingUrl: result?.recordingUrl
      };
    });
    const completed = rows.filter((r) => r.status === 'Completed').length;
    const interested = rows.filter((r) => r.intent === 'Interested').length;
    const conversionRate = completed > 0 ? Math.round((interested / completed) * 100) : 0;
    return { rows, completed, interested, conversionRate, total: rows.length };
  }, [selectedTask, leads]);

  // Fetches every lead's answers (reusing the same cache the expandable
  // rows use) and lays them out wide — one row per lead, Q1/A1/Q2/A2...
  // columns — since that's what reads cleanly in Excel/Sheets.
  async function exportTaskCsv(task: DialTask, report: typeof taskReport) {
    if (!report) return;
    setExportingCsv(true);
    try {
      const perLead = await Promise.all(
        report.rows.map(async (r) => {
          if (!r.phone) return { ...r, answers: [] as { question: string; answer: string }[] };
          if (answersByPhone[r.phone]) return { ...r, answers: answersByPhone[r.phone] };
          try {
            const res = await apiFetch(`/api/lead-responses?phone=${encodeURIComponent(r.phone)}`);
            const data = await res.json();
            const answers = Array.isArray(data) ? data : [];
            setAnswersByPhone((prev) => ({ ...prev, [r.phone]: answers }));
            return { ...r, answers };
          } catch {
            return { ...r, answers: [] as { question: string; answer: string }[] };
          }
        })
      );

      const maxAnswers = Math.max(0, ...perLead.map((r) => r.answers.length));
      const qaHeaders: string[] = [];
      for (let i = 0; i < maxAnswers; i++) qaHeaders.push(`Question ${i + 1}`, `Answer ${i + 1}`);

      const escapeCsv = (val: string) => `"${String(val ?? '').replace(/"/g, '""')}"`;
      const header = ['Name', 'Phone', 'Status', 'Duration', 'Sentiment', 'Intent', ...qaHeaders];
      const lines = [header.map(escapeCsv).join(',')];
      for (const r of perLead) {
        const qaCells: string[] = [];
        for (let i = 0; i < maxAnswers; i++) {
          qaCells.push(r.answers[i]?.question || '', r.answers[i]?.answer || '');
        }
        const row = [r.name, r.phone, r.status, formatDuration(r.duration), r.sentiment, r.intent, ...qaCells];
        lines.push(row.map(escapeCsv).join(','));
      }

      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${task.name.replace(/[^a-z0-9]+/gi, '_')}_report.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportingCsv(false);
    }
  }

  return (
    <div className="font-sans h-full overflow-y-auto bg-slate-50/50">
      <PageHeader
        title="Reports"
        subtitle="Call analytics — day, month, or year, incoming or outgoing, overall or per task."
      />

      <div className="px-8 pb-12 space-y-6">
        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Direction</label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as DirectionFilter)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="all">All calls</option>
              <option value="inbound">Incoming only</option>
              <option value="outbound">Outgoing only</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Group by</label>
            <select
              value={granularity}
              onChange={(e) => setGranularity(e.target.value as Granularity)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="day">Day</option>
              <option value="month">Month</option>
              <option value="year">Year</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2 ml-auto items-end">
            {[7, 30, 90].map((n) => (
              <button
                key={n}
                onClick={() => { setFromDate(daysAgo(n)); setToDate(daysAgo(0)); }}
                className="px-3 py-2 text-[11px] font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600"
              >
                Last {n}d
              </button>
            ))}
            <button
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              <FileDown className="h-3.5 w-3.5" /> Preview & Download PDF
            </button>
          </div>
        </div>

        {/* Summary stat tiles */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatTile icon={PhoneIncoming} label="Total Calls" value={String(summary.total)} />
          <StatTile icon={Clock} label="Total Duration" value={formatDuration(summary.totalDuration)} />
          <StatTile icon={DollarSign} label="Total Cost" value={formatInr(summary.totalCost)} sub={`at ₹${costPerMinuteInr}/min`} />
          <StatTile icon={Smile} label="Positive Sentiment" value={`${summary.positivePct}%`} />
          <StatTile icon={CheckCircle2} label="Completed" value={String(summary.statusCounts['Completed'] || 0)} />
        </div>

        {/* Trend chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Call Volume Over Time</h3>
          {trendData.length === 0 ? (
            <p className="text-xs text-slate-400 py-12 text-center">No calls in this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={trendData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#898781' }} axisLine={{ stroke: '#c3c2b7' }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#898781' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e1e0d9' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="inbound" name="Incoming" fill={DIRECTION_COLOR.inbound} radius={[3, 3, 0, 0]} />
                <Bar dataKey="outbound" name="Outgoing" fill={DIRECTION_COLOR.outbound} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Sentiment breakdown */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Sentiment Breakdown</h3>
          <div className="flex h-3 rounded-full overflow-hidden bg-slate-100">
            {(['Positive', 'Neutral', 'Negative', 'Unknown'] as const).map((s) => {
              const count = summary.sentimentCounts[s] || 0;
              const pct = summary.total > 0 ? (count / summary.total) * 100 : 0;
              return pct > 0 ? <div key={s} style={{ width: `${pct}%`, backgroundColor: SENTIMENT_COLOR[s] }} title={`${s}: ${count}`} /> : null;
            })}
          </div>
          <div className="flex flex-wrap gap-4 mt-3">
            {(['Positive', 'Neutral', 'Negative', 'Unknown'] as const).map((s) => (
              <div key={s} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SENTIMENT_COLOR[s] }} />
                {s} ({summary.sentimentCounts[s] || 0})
              </div>
            ))}
          </div>
        </div>

        {/* Task-wise report */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><ListChecks className="h-4 w-4" /> Report by Task</h3>
            <div className="flex items-center gap-2">
              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 min-w-[200px]"
              >
                <option value="">Select an outbound task…</option>
                {dialerTasks.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              {selectedTask && (
                <button
                  onClick={() => exportTaskCsv(selectedTask, taskReport)}
                  disabled={exportingCsv}
                  className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg"
                >
                  <Download className="h-3.5 w-3.5" /> {exportingCsv ? 'Exporting…' : 'Export to CSV'}
                </button>
              )}
            </div>
          </div>
          {!selectedTask && <p className="text-xs text-slate-400 text-center py-8">Pick a task above to see its per-lead outcomes and conversion rate.</p>}
          {taskReport && (
            <>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <StatTile icon={PhoneOutgoing} label="Leads in Task" value={String(taskReport.total)} compact />
                <StatTile icon={CheckCircle2} label="Completed" value={String(taskReport.completed)} compact />
                <StatTile icon={Smile} label="Conversion Rate" value={`${taskReport.conversionRate}%`} compact />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <th className="py-2 pr-2 w-6"></th>
                      <th className="py-2 pr-4">Lead</th>
                      <th className="py-2 pr-4">Phone</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Duration</th>
                      <th className="py-2 pr-4">Sentiment</th>
                      <th className="py-2 pr-4">Intent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {taskReport.rows.map((r) => {
                      const isExpanded = expandedLeadId === r.leadId;
                      const answers = r.phone ? answersByPhone[r.phone] : undefined;
                      return (
                        <React.Fragment key={r.leadId}>
                          <tr
                            className="cursor-pointer hover:bg-slate-50/75"
                            onClick={() => toggleLeadExpand(r.leadId, r.phone)}
                          >
                            <td className="py-2 pr-2 text-slate-400">
                              {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                            </td>
                            <td className="py-2 pr-4 font-medium text-slate-700">{r.name}</td>
                            <td className="py-2 pr-4 text-slate-500">{r.phone}</td>
                            <td className="py-2 pr-4">{r.status}</td>
                            <td className="py-2 pr-4">{formatDuration(r.duration)}</td>
                            <td className="py-2 pr-4">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{ color: SENTIMENT_COLOR[r.sentiment], backgroundColor: `${SENTIMENT_COLOR[r.sentiment]}1a` }}>
                                {r.sentiment}
                              </span>
                            </td>
                            <td className="py-2 pr-4">{r.intent}</td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-slate-50/50">
                              <td colSpan={7} className="px-4 pb-3 pt-1">
                                {loadingAnswersFor === r.phone ? (
                                  <p className="text-[11px] text-slate-400 py-2">Loading answers…</p>
                                ) : !answers || answers.length === 0 ? (
                                  <p className="text-[11px] text-slate-400 py-2">No answers captured for this call.</p>
                                ) : (
                                  <div className="space-y-1.5 py-1">
                                    {answers.map((a, i) => (
                                      <div key={i} className="flex gap-2 text-[11px]">
                                        <span className="text-slate-400 shrink-0 min-w-[16px]">{i + 1}.</span>
                                        <span className="text-slate-500 font-medium min-w-[180px]">{a.question}</span>
                                        <span className="text-slate-700">{a.answer}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Detailed call list */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <h3 className="text-sm font-bold text-slate-700 p-5 pb-0">Calls in Period ({filteredCalls.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs mt-3">
              <thead>
                <tr className="bg-slate-50/75 border-y border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="p-3 px-5">Caller</th>
                  <th className="p-3 px-5">Direction</th>
                  <th className="p-3 px-5">Duration</th>
                  <th className="p-3 px-5">Cost</th>
                  <th className="p-3 px-5">Sentiment</th>
                  <th className="p-3 px-5">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...filteredCalls].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 200).map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="p-3 px-5 font-semibold text-slate-800">{c.leadName}</td>
                    <td className="p-3 px-5 text-slate-500 capitalize">{c.direction || '—'}</td>
                    <td className="p-3 px-5 font-mono">{formatDuration(c.duration)}</td>
                    <td className="p-3 px-5 font-mono">{formatInr(callCostInr(c.duration, costPerMinuteInr))}</td>
                    <td className="p-3 px-5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{ color: SENTIMENT_COLOR[c.sentiment], backgroundColor: `${SENTIMENT_COLOR[c.sentiment]}1a` }}>
                        {c.sentiment}
                      </span>
                    </td>
                    <td className="p-3 px-5 text-slate-400">{new Date(c.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
                {filteredCalls.length === 0 && (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-400">No calls match this filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showPreview && (
        <PrintableReport
          onClose={() => setShowPreview(false)}
          orgName={orgName}
          fromDate={fromDate}
          toDate={toDate}
          direction={direction}
          granularity={granularity}
          filteredCalls={filteredCalls}
          dialerTasks={dialerTasks}
          leads={leads}
          costPerMinuteInr={costPerMinuteInr}
        />
      )}
    </div>
  );
}

function StatTile({ icon: Icon, label, value, sub, compact }: { icon: React.ElementType; label: string; value: string; sub?: string; compact?: boolean }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-2xl ${compact ? 'p-3' : 'p-4'} flex flex-col justify-between`}>
      <div className="flex items-center justify-between">
        <div className="bg-blue-50 text-blue-600 p-1.5 rounded-lg">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3">
        <p className="text-slate-500 text-[11px] font-medium">{label}</p>
        <h3 className="text-xl font-bold tracking-tight text-slate-800 mt-0.5">{value}</h3>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
