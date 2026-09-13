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
import { PhoneIncoming, PhoneOutgoing, Clock, DollarSign, Smile, CheckCircle2, ListChecks, FileDown, ChevronDown, ChevronRight, Download, FileText } from 'lucide-react';
import PageShell from './ui/PageShell';
import Button from './ui/Button';
import Widget from './ui/Widget';
import KpiCard from './ui/KpiCard';
import { CallLog } from '../types';
import { callCostInr, formatInr, COST_PER_MINUTE_INR_FALLBACK } from '../lib/pricing';
import PrintableReport from './PrintableReport';
import FilterBar from './ui/FilterBar';

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
  // The real call_logs id, matching lead_responses.call_id one-to-one —
  // lets the Q&A lookup target this exact call instead of guessing by
  // phone (which returns every answer that number ever gave, across every
  // call/task). Absent on data captured before this field existed.
  callId?: string;
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
  // Prefer callId when a task result has one (exact match against exactly
  // this call, via /api/calls/:id/lead-responses) — phone alone returns
  // every answer that number ever gave across every call/task, which is
  // wrong the moment the same lead gets dialed more than once. callId is
  // absent on data captured before this field existed, so phone stays as
  // the fallback for that older data. Cached by whichever key was used.
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  const [answersCache, setAnswersCache] = useState<Record<string, { label?: string; question: string; answer: string }[]>>({});
  const [loadingAnswersFor, setLoadingAnswersFor] = useState<string | null>(null);
  const [exportingCsv, setExportingCsv] = useState(false);

  async function fetchAnswers(callId: string | undefined, phone: string): Promise<{ label?: string; question: string; answer: string }[]> {
    const cacheKey = callId || phone;
    if (!cacheKey) return [];
    if (answersCache[cacheKey]) return answersCache[cacheKey];
    try {
      const res = await apiFetch(
        callId ? `/api/calls/${encodeURIComponent(callId)}/lead-responses` : `/api/lead-responses?phone=${encodeURIComponent(phone)}`
      );
      const data = await res.json();
      const answers = Array.isArray(data) ? data : [];
      setAnswersCache((prev) => ({ ...prev, [cacheKey]: answers }));
      return answers;
    } catch {
      setAnswersCache((prev) => ({ ...prev, [cacheKey]: [] }));
      return [];
    }
  }

  async function toggleLeadExpand(leadId: string, phone: string, callId?: string) {
    if (expandedLeadId === leadId) {
      setExpandedLeadId(null);
      return;
    }
    setExpandedLeadId(leadId);
    const cacheKey = callId || phone;
    if (!cacheKey || answersCache[cacheKey]) return;
    setLoadingAnswersFor(cacheKey);
    await fetchAnswers(callId, phone);
    setLoadingAnswersFor(null);
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
        recordingUrl: result?.recordingUrl,
        callId: result?.callId
      };
    });
    const completed = rows.filter((r) => r.status === 'Completed').length;
    const interested = rows.filter((r) => r.intent === 'Interested').length;
    const conversionRate = completed > 0 ? Math.round((interested / completed) * 100) : 0;
    return { rows, completed, interested, conversionRate, total: rows.length };
  }, [selectedTask, leads]);

  // Fetches every lead's answers (reusing the same cache the expandable
  // rows use) and lays them out wide — one row per lead, one column per
  // question headed by its label — since that's what reads cleanly in
  // Excel/Sheets.
  async function exportTaskCsv(task: DialTask, report: typeof taskReport) {
    if (!report) return;
    setExportingCsv(true);
    try {
      const perLead = await Promise.all(
        report.rows.map(async (r) => ({ ...r, answers: await fetchAnswers(r.callId, r.phone) }))
      );

      const maxAnswers = Math.max(0, ...perLead.map((r) => r.answers.length));
      // Header per question = its label (falls back to the full question
      // text for pre-migration data with no label) — take it from whichever
      // lead answered the most questions, since all leads in a task
      // normally share the same question set in the same order.
      const labelSource = perLead.find((r) => r.answers.length === maxAnswers)?.answers ?? [];
      const qaHeaders: string[] = [];
      for (let i = 0; i < maxAnswers; i++) qaHeaders.push(labelSource[i]?.label || labelSource[i]?.question || `Question ${i + 1}`);

      const escapeCsv = (val: string) => `"${String(val ?? '').replace(/"/g, '""')}"`;
      // Excel auto-detects a long digit string as a number and mangles it
      // into scientific notation (9.18939E+11) — confirmed live. Wrapping
      // it as an Excel formula that returns text ( ="..." ) forces Excel
      // to keep it as a literal string instead of "helpfully" reformatting it.
      const escapePhoneCsv = (val: string) => `"=""${String(val ?? '').replace(/"/g, '""')}"""`;
      const header = ['Name', 'Phone', 'Status', 'Duration', 'Sentiment', 'Intent', ...qaHeaders];
      const lines = [header.map(escapeCsv).join(',')];
      for (const r of perLead) {
        const qaCells: string[] = [];
        for (let i = 0; i < maxAnswers; i++) qaCells.push(r.answers[i]?.answer || '');
        const row = [escapeCsv(r.name), escapePhoneCsv(r.phone), escapeCsv(r.status), escapeCsv(formatDuration(r.duration)), escapeCsv(r.sentiment), escapeCsv(r.intent), ...qaCells.map(escapeCsv)];
        lines.push(row.join(','));
      }

      const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
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
    <PageShell
      title="Reports"
      subtitle="Call analytics — day, month, or year, incoming or outgoing, overall or per task."
      action={
        <Button icon={FileText} onClick={() => setShowPreview(true)}>
          Preview Report
        </Button>
      }
    >
        {/* Summary stat tiles */}
        <KpiCard colSpan={2} icon={PhoneIncoming} iconBg="#eff6ff" iconColor="#2563eb" label="Total Calls" value={summary.total} />
        <KpiCard colSpan={2} icon={Clock} iconBg="#f0fdf4" iconColor="#16a34a" label="Total Duration" value={formatDuration(summary.totalDuration)} />
        <KpiCard colSpan={3} icon={DollarSign} iconBg="#fffbeb" iconColor="#d97706" label="Total Cost" value={formatInr(summary.totalCost)} sub={`at ₹${costPerMinuteInr}/min`} />
        <KpiCard colSpan={2} icon={Smile} iconBg="#fdf4ff" iconColor="#9333ea" label="Positive Sentiment" value={`${summary.positivePct}%`} />
        <KpiCard colSpan={3} icon={CheckCircle2} iconBg="#f0fdf4" iconColor="#16a34a" label="Completed" value={summary.statusCounts['Completed'] || 0} />

        {/* Filters */}
        <Widget colSpan={12} showHeader={false} padding="md">
          <FilterBar
            selects={[
              {
                key: 'direction',
                label: 'Direction',
                value: direction,
                onChange: (v) => setDirection(v as DirectionFilter),
                options: [
                  { label: 'All calls', value: 'all' },
                  { label: 'Incoming only', value: 'inbound' },
                  { label: 'Outgoing only', value: 'outbound' },
                ],
              },
              {
                key: 'granularity',
                label: 'Group by',
                value: granularity,
                onChange: (v) => setGranularity(v as Granularity),
                options: [
                  { label: 'Day', value: 'day' },
                  { label: 'Month', value: 'month' },
                  { label: 'Year', value: 'year' },
                ],
              },
            ]}
            dates={[
              { key: 'from', label: 'From', value: fromDate, onChange: setFromDate },
              { key: 'to', label: 'To', value: toDate, onChange: setToDate },
            ]}
            actions={
              <>
                {[7, 30, 90].map((n) => (
                  <button
                    key={n}
                    onClick={() => { setFromDate(daysAgo(n)); setToDate(daysAgo(0)); }}
                    className="px-3 py-1.5 text-[11px] font-semibold rounded-lg border transition-colors"
                    style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--border)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-subtle)'; }}
                  >
                    Last {n}d
                  </button>
                ))}
              </>
            }
          />
        </Widget>

        {/* Trend chart */}
        <Widget colSpan={12} title="Call Volume Over Time" padding="none">
          <div className="p-5">
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
        </Widget>

        {/* Sentiment breakdown */}
        <Widget colSpan={12} title="Sentiment Breakdown" padding="md">
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
        </Widget>

        {/* Task-wise report */}
        <Widget colSpan={12} title="Report by Task" icon={ListChecks} padding="none" scrollable
          action={
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
          }
        >
        <div className="p-5">
          {!selectedTask && <p className="text-xs text-slate-400 text-center py-8">Pick a task above to see its per-lead outcomes and conversion rate.</p>}
          {taskReport && (
            <>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <KpiCard icon={PhoneOutgoing} iconBg="#eff6ff" iconColor="#2563eb" label="Leads in Task" value={taskReport.total} />
                <KpiCard icon={CheckCircle2} iconBg="#f0fdf4" iconColor="#16a34a" label="Completed" value={taskReport.completed} />
                <KpiCard icon={Smile} iconBg="#fdf4ff" iconColor="#9333ea" label="Conversion Rate" value={`${taskReport.conversionRate}%`} />
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
                      const cacheKey = r.callId || r.phone;
                      const answers = cacheKey ? answersCache[cacheKey] : undefined;
                      return (
                        <React.Fragment key={r.leadId}>
                          <tr
                            className="cursor-pointer hover:bg-[var(--bg-subtle)]"
                            onClick={() => toggleLeadExpand(r.leadId, r.phone, r.callId)}
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
                            <tr className="bg-slate-50/40">
                              <td colSpan={7} className="px-4 pb-4 pt-1">
                                {loadingAnswersFor === cacheKey ? (
                                  <div className="flex items-center gap-2 py-3 text-[11px] text-slate-400">
                                    <span className="h-3 w-3 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
                                    Loading answers…
                                  </div>
                                ) : (
                                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                                    <table className="w-full text-left text-xs">
                                      <thead>
                                        <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                          <th className="py-2 px-3.5">Field</th>
                                          <th className="py-2 px-3.5">Value</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        <tr>
                                          <td className="py-2 px-3.5 font-semibold text-slate-500 uppercase tracking-wide text-[10px] whitespace-nowrap align-top">Name</td>
                                          <td className="py-2 px-3.5 text-slate-700">{r.name}</td>
                                        </tr>
                                        <tr>
                                          <td className="py-2 px-3.5 font-semibold text-slate-500 uppercase tracking-wide text-[10px] whitespace-nowrap align-top">Phone</td>
                                          <td className="py-2 px-3.5 text-slate-700">{r.phone}</td>
                                        </tr>
                                        <tr>
                                          <td className="py-2 px-3.5 font-semibold text-slate-500 uppercase tracking-wide text-[10px] whitespace-nowrap align-top">Sentiment</td>
                                          <td className="py-2 px-3.5">
                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{ color: SENTIMENT_COLOR[r.sentiment], backgroundColor: `${SENTIMENT_COLOR[r.sentiment]}1a` }}>
                                              {r.sentiment}
                                            </span>
                                          </td>
                                        </tr>
                                        {answers && answers.length > 0 ? (
                                          answers.map((a, i) => (
                                            <tr key={i}>
                                              <td className="py-2 px-3.5 font-semibold text-slate-500 uppercase tracking-wide text-[10px] whitespace-nowrap align-top">{a.label || a.question}</td>
                                              <td className="py-2 px-3.5 text-slate-700 break-words">{a.answer}</td>
                                            </tr>
                                          ))
                                        ) : (
                                          <tr>
                                            <td colSpan={2} className="py-2 px-3.5 text-slate-400 italic">No workflow answers captured for this call.</td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>
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
        </Widget>

        {/* Detailed call list */}
        <Widget colSpan={12} title={`Calls in Period (${filteredCalls.length})`} padding="none" scrollable>
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
                  <tr key={c.id} className="hover:bg-[var(--bg-subtle)]">
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
        </Widget>

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
    </PageShell>
  );
}

