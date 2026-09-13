import { useEffect, useMemo, useState, ReactNode } from 'react';
import { apiFetch } from '../lib/api';
import { PhoneOutgoing, Clock, DollarSign, Smile, CheckCircle2, ListChecks, FileDown, Download, FileText } from 'lucide-react';
import PageShell from './ui/PageShell';
import Button from './ui/Button';
import Widget from './ui/Widget';
import PieChart from './ui/PieChart';
import KpiCard from './ui/KpiCard';
import SlideOver from './ui/SlideOver';
import { CallLog } from '../types';
import { callCostInr, formatInr, COST_PER_MINUTE_INR_FALLBACK } from '../lib/pricing';
import PrintableReport from './PrintableReport';
import FilterBar from './ui/FilterBar';
import DataTable, { Column } from './ui/DataTable';

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
  workflowId?: string;
  workflowName?: string;
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

  // Default to the most recently created task instead of an empty/org-wide
  // view — and fall back to it again if the current selection stops
  // existing (e.g. tasks reloaded). This is the whole page's primary
  // driver now: everything below reflects whichever task is selected.
  useEffect(() => {
    if (dialerTasks.length === 0) return;
    if (selectedTaskId && dialerTasks.some((t) => t.id === selectedTaskId)) return;
    const latest = [...dialerTasks].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
    setSelectedTaskId(latest.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialerTasks]);

  // Groups tasks by the workflow they were created from, so repeated runs
  // of the same workflow ("Loan Follow-up — Week 1", "...— Week 2") sit
  // together in the dropdown instead of being an undifferentiated flat
  // list. Tasks created before workflowName existed have no group to join
  // — they fall back into "Other Tasks". Groups are ordered by their own
  // most-recently-created task, and tasks within a group newest-first.
  const taskGroups = useMemo(() => {
    const byWorkflow = new Map<string, DialTask[]>();
    for (const t of dialerTasks) {
      const key = t.workflowName || 'Other Tasks';
      if (!byWorkflow.has(key)) byWorkflow.set(key, []);
      byWorkflow.get(key)!.push(t);
    }
    const groups = Array.from(byWorkflow.entries()).map(([label, tasks]) => ({
      label,
      tasks: [...tasks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    }));
    groups.sort((a, b) => new Date(b.tasks[0].createdAt).getTime() - new Date(a.tasks[0].createdAt).getTime());
    return groups;
  }, [dialerTasks]);
  const [showPreview, setShowPreview] = useState(false);
  // Prefer callId when a task result has one (exact match against exactly
  // this call, via /api/calls/:id/lead-responses) — phone alone returns
  // every answer that number ever gave across every call/task, which is
  // wrong the moment the same lead gets dialed more than once. callId is
  // absent on data captured before this field existed, so phone stays as
  // the fallback for that older data. Cached by whichever key was used.
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [answersCache, setAnswersCache] = useState<Record<string, { label?: string; question: string; answer: string }[]>>({});
  const [loadingAnswersFor, setLoadingAnswersFor] = useState<string | null>(null);
  const [exportingCsv, setExportingCsv] = useState(false);

  // Clear the selected lead whenever the task changes — a lead id from the
  // previous task's table has no meaning against the new one.
  useEffect(() => {
    setSelectedLeadId(null);
  }, [selectedTaskId]);

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

  async function selectLead(leadId: string, phone: string, callId?: string) {
    if (selectedLeadId === leadId) {
      setSelectedLeadId(null);
      return;
    }
    setSelectedLeadId(leadId);
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
    const totalDuration = rows.reduce((sum, r) => sum + (r.duration || 0), 0);
    const totalCost = rows.reduce((sum, r) => sum + callCostInr(r.duration || 0, costPerMinuteInr), 0);
    const sentimentCounts = { Positive: 0, Neutral: 0, Negative: 0, Unknown: 0 } as Record<string, number>;
    for (const r of rows) sentimentCounts[r.sentiment] = (sentimentCounts[r.sentiment] || 0) + 1;
    const positivePct = rows.length > 0 ? Math.round((sentimentCounts.Positive / rows.length) * 100) : 0;
    return { rows, completed, interested, conversionRate, total: rows.length, totalDuration, totalCost, sentimentCounts, positivePct };
  }, [selectedTask, leads, costPerMinuteInr]);

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
      subtitle={selectedTask ? `Report by Task — ${selectedTask.name}` : 'Report by Task — pick a task below, defaults to your most recent.'}
      action={
        <Button icon={FileText} onClick={() => setShowPreview(true)}>
          Preview Report
        </Button>
      }
    >
        {/* Task-scoped KPI tiles — reflect whichever task is selected below */}
        <KpiCard colSpan={2} icon={PhoneOutgoing} iconBg="#eff6ff" iconColor="#2563eb" label="Leads in Task" value={taskReport?.total ?? 0} />
        <KpiCard colSpan={2} icon={CheckCircle2} iconBg="#f0fdf4" iconColor="#16a34a" label="Completed" value={taskReport?.completed ?? 0} />
        <KpiCard colSpan={2} icon={Smile} iconBg="#fdf4ff" iconColor="#9333ea" label="Conversion Rate" value={`${taskReport?.conversionRate ?? 0}%`} />
        <KpiCard colSpan={2} icon={Clock} iconBg="#f0fdf4" iconColor="#16a34a" label="Total Duration" value={formatDuration(taskReport?.totalDuration ?? 0)} />
        <KpiCard colSpan={2} icon={DollarSign} iconBg="#fffbeb" iconColor="#d97706" label="Total Cost" value={formatInr(taskReport?.totalCost ?? 0)} sub={`at ₹${costPerMinuteInr}/min`} />
        <KpiCard colSpan={2} icon={Smile} iconBg="#fdf4ff" iconColor="#9333ea" label="Positive Sentiment" value={`${taskReport?.positivePct ?? 0}%`} />

        {/* Filters — task dropdown (grouped by source workflow, so repeated
            runs of the same workflow sit together) drives the whole page;
            direction/date-range/granularity are separate and only scope the
            Preview Report / CSV export tools further down. */}
        <Widget colSpan={12} showHeader={false} padding="md">
          <FilterBar
            selects={[
              {
                key: 'task',
                label: 'Task',
                value: selectedTaskId,
                onChange: setSelectedTaskId,
                groups: taskGroups.map((g) => ({
                  label: g.label,
                  options: g.tasks.map((t) => ({ label: t.name, value: t.id })),
                })),
                placeholder: dialerTasks.length === 0 ? 'No tasks yet' : 'Select a task…',
              },
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
                {selectedTask && (
                  <button
                    onClick={() => exportTaskCsv(selectedTask, taskReport)}
                    disabled={exportingCsv}
                    className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg"
                  >
                    <Download className="h-3.5 w-3.5" /> {exportingCsv ? 'Exporting…' : 'Export to CSV'}
                  </button>
                )}
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

        {/* Sentiment breakdown — for the selected task's calls */}
        <Widget colSpan={12} title="Sentiment Breakdown" padding="md">
          <div className="flex flex-col sm:flex-row items-center gap-8">
            {/* Chart left */}
            <div className="shrink-0">
              <PieChart
                size={160}
                slices={(['Positive', 'Neutral', 'Negative', 'Unknown'] as const).map((s) => ({
                  label: s,
                  value: taskReport?.sentimentCounts[s] || 0,
                  color: SENTIMENT_COLOR[s],
                }))}
              />
            </div>

            {/* Breakdown table right */}
            <div className="flex-1 w-full">
              {(() => {
                type SentimentRow = { s: 'Positive' | 'Neutral' | 'Negative' | 'Unknown' };
                const rows: SentimentRow[] = (['Positive', 'Neutral', 'Negative', 'Unknown'] as const).map((s) => ({ s }));
                const columns: Column<SentimentRow>[] = [
                  {
                    key: 'sentiment',
                    header: 'Sentiment',
                    cell: ({ s }) => (
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: SENTIMENT_COLOR[s] }} />
                        <span className="font-medium text-slate-700">{s}</span>
                      </div>
                    ),
                  },
                  { key: 'calls', header: 'Calls', cell: ({ s }) => <span className="text-slate-600">{taskReport?.sentimentCounts[s] || 0}</span> },
                  {
                    key: 'share',
                    header: 'Share',
                    cell: ({ s }) => {
                      const count = taskReport?.sentimentCounts[s] || 0;
                      const pct = taskReport && taskReport.total > 0 ? Math.round((count / taskReport.total) * 100) : 0;
                      return <span className="text-slate-600">{pct}%</span>;
                    },
                  },
                ];
                return <DataTable bare resizable columns={columns} rows={rows} rowKey={(r) => r.s} />;
              })()}
            </div>
          </div>
        </Widget>

        {/* Table 1 — leads in this task. Click a row to load its captured
            answers into the table below; row count here is fixed (one per
            lead in the task) regardless of which workflow created it. */}
        <Widget colSpan={12} title={selectedTask ? selectedTask.name : 'Report by Task'} icon={ListChecks} padding="none">
          {!selectedTask && <p className="text-xs text-slate-400 text-center py-8">{dialerTasks.length === 0 ? 'No dialer tasks yet — create one from the Voice Simulator.' : 'Pick a task above to see its per-lead outcomes and conversion rate.'}</p>}
          {taskReport && (() => {
            type TaskReportRow = typeof taskReport.rows[number];
            const columns: Column<TaskReportRow>[] = [
              { key: 'lead', header: 'Lead', cell: (r) => <span className="font-medium text-slate-700">{r.name}</span> },
              { key: 'phone', header: 'Phone', cell: (r) => <span className="text-slate-500">{r.phone}</span> },
              { key: 'status', header: 'Status', cell: (r) => <>{r.status}</> },
              { key: 'duration', header: 'Duration', cell: (r) => <>{formatDuration(r.duration)}</> },
              {
                key: 'sentiment',
                header: 'Sentiment',
                cell: (r) => (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{ color: SENTIMENT_COLOR[r.sentiment], backgroundColor: `${SENTIMENT_COLOR[r.sentiment]}1a` }}>
                    {r.sentiment}
                  </span>
                ),
              },
              { key: 'intent', header: 'Intent', cell: (r) => <>{r.intent}</> },
            ];
            return (
              <DataTable
                bare
                resizable
                paginated
                columns={columns}
                rows={taskReport.rows}
                rowKey={(r) => r.leadId}
                onRowClick={(r) => selectLead(r.leadId, r.phone, r.callId)}
                rowClassName={(r) => (selectedLeadId === r.leadId ? 'bg-[var(--bg-subtle)] shadow-[inset_3px_0_0_#2563eb]' : '')}
              />
            );
          })()}
        </Widget>

        {/* Lead detail sidebar — opens on clicking a row in the table above.
            Row count inside is NOT fixed: Name/Phone/Sentiment plus one row
            per workflow variable, so it grows/shrinks depending on which
            task/workflow the selected lead belongs to. */}
        {(() => {
          const selectedRow = taskReport?.rows.find((r) => r.leadId === selectedLeadId) || null;
          const cacheKey = selectedRow ? (selectedRow.callId || selectedRow.phone) : undefined;
          const answers = cacheKey ? answersCache[cacheKey] : undefined;
          return (
            <SlideOver
              open={!!selectedRow}
              onClose={() => setSelectedLeadId(null)}
              title={selectedRow?.name}
              subtitle={selectedTask?.workflowName || selectedTask?.name}
            >
              {selectedRow && (
                loadingAnswersFor === cacheKey ? (
                  <div className="flex items-center gap-2 py-8 justify-center text-[11px] text-slate-400">
                    <span className="h-3 w-3 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
                    Loading answers…
                  </div>
                ) : (() => {
                  type FieldRow = { key: string; field: string; value: ReactNode };
                  const rows: FieldRow[] = [
                    { key: 'name', field: 'Name', value: selectedRow.name },
                    { key: 'phone', field: 'Phone', value: selectedRow.phone },
                    { key: 'status', field: 'Status', value: selectedRow.status },
                    { key: 'duration', field: 'Duration', value: formatDuration(selectedRow.duration) },
                    {
                      key: 'sentiment',
                      field: 'Sentiment',
                      value: (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{ color: SENTIMENT_COLOR[selectedRow.sentiment], backgroundColor: `${SENTIMENT_COLOR[selectedRow.sentiment]}1a` }}>
                          {selectedRow.sentiment}
                        </span>
                      ),
                    },
                    { key: 'intent', field: 'Intent', value: selectedRow.intent },
                    ...(answers && answers.length > 0
                      ? answers.map((a, i) => ({ key: `answer-${i}`, field: a.label || a.question, value: <span className="break-words">{a.answer}</span> }))
                      : []),
                  ];
                  const columns: Column<FieldRow>[] = [
                    { key: 'field', header: 'Field', width: '35%', cell: (r) => <span className="font-semibold text-slate-500 uppercase tracking-wide text-[10px] whitespace-nowrap">{r.field}</span> },
                    { key: 'value', header: 'Value', cell: (r) => <span className="text-slate-700">{r.value}</span> },
                  ];
                  return (
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                      <DataTable bare resizable columns={columns} rows={rows} rowKey={(r) => r.key} />
                      {(!answers || answers.length === 0) && (
                        <p className="py-2 px-3.5 text-slate-400 italic text-xs border-t border-slate-100">No workflow answers captured for this call.</p>
                      )}
                    </div>
                  );
                })()
              )}
            </SlideOver>
          );
        })()}

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

