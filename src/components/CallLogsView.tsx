import React, { useState } from 'react';
import { Phone, PlayCircle, Download, X, Check, ChevronDown } from 'lucide-react';
import Modal from './ui/Modal';
import { CallLog, Lead } from '../types';
import { callCostInr, formatInr } from '../lib/pricing';
import { normalizePhone, formatPhone } from '../lib/phone';
import { getPlayableRecordingUrl } from '../lib/api';
import Pagination from '../shared/components/Pagination';
import { usePagination } from '../shared/hooks/usePagination';
import PageShell from './ui/PageShell';
import Widget from './ui/Widget';
import Button from './ui/Button';
import Badge from './ui/Badge';
import FilterBar from './ui/FilterBar';
import EmptyState from './ui/EmptyState';

interface CallLogsViewProps {
  callLogs: CallLog[];
  costPerMinuteInr?: number;
  leads?: Lead[];
}

const SENTIMENT_COLOR: Record<string, 'green' | 'rose' | 'slate'> = {
  Positive: 'green',
  Negative: 'rose',
  Neutral: 'slate',
  Unknown: 'slate',
};

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// All exportable fields
const EXPORT_FIELDS = [
  { key: 'name',      label: 'Caller Name' },
  { key: 'phone',     label: 'Phone Number' },
  { key: 'direction', label: 'Direction' },
  { key: 'duration',  label: 'Duration (s)' },
  { key: 'cost',      label: 'Cost (INR)' },
  { key: 'status',    label: 'Status' },
  { key: 'sentiment', label: 'Sentiment' },
  { key: 'intent',    label: 'Intent' },
  { key: 'summary',   label: 'Summary' },
  { key: 'answers',   label: 'Q&A Answers' },
  { key: 'date',      label: 'Date & Time' },
];

function exportCSV(
  filename: string,
  fields: string[],
  rows: CallLog[],
  resolveName: (c: CallLog) => string,
  costPerMinute: number,
) {
  const headers = EXPORT_FIELDS.filter(f => fields.includes(f.key)).map(f => f.label);
  const data = rows.map(c => {
    const answers = (c as any).answers as Record<string, string> | undefined;
    const answersStr = answers
      ? Object.entries(answers).map(([q, a]) => `${q}: ${a}`).join(' | ')
      : '';
    return EXPORT_FIELDS
      .filter(f => fields.includes(f.key))
      .map(f => {
        switch (f.key) {
          case 'name':      return resolveName(c);
          case 'phone':     return c.callerNumber || '';
          case 'direction': return c.direction ?? 'unknown';
          case 'duration':  return String(c.duration ?? 0);
          case 'cost':      return callCostInr(c.duration, costPerMinute).toFixed(2);
          case 'status':    return c.status;
          case 'sentiment': return c.sentiment;
          case 'intent':    return c.intent;
          case 'summary':   return c.summary;
          case 'answers':   return answersStr;
          case 'date':      return new Date(c.createdAt).toLocaleString();
          default:          return '';
        }
      });
  });

  const csv = [headers, ...data]
    .map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function CallLogsView({ callLogs, costPerMinuteInr, leads = [] }: CallLogsViewProps) {
  const [searchTerm, setSearchTerm]   = useState('');
  const [selected, setSelected]       = useState<CallLog | null>(null);
  const [fromDate, setFromDate]       = useState('');
  const [toDate, setToDate]           = useState('');
  const [showExport, setShowExport]   = useState(false);
  const [exportFields, setExportFields] = useState<string[]>(EXPORT_FIELDS.map(f => f.key));

  function resolveCallerName(c: CallLog): string {
    if (c.leadName && c.leadName !== 'Unknown') return c.leadName;
    const match = leads.find(l => normalizePhone(l.phone) === c.callerNumber);
    if (match) return match.name;
    return formatPhone(c.callerNumber) || c.callerNumber || 'Unknown';
  }

  const filtered = callLogs.filter(c => {
    const displayName = resolveCallerName(c);
    const matchesSearch = !searchTerm.trim() ||
      displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.summary.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    const created = new Date(c.createdAt);
    if (fromDate && created < new Date(fromDate + 'T00:00:00')) return false;
    if (toDate && created > new Date(toDate + 'T23:59:59')) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const pagination = usePagination(sorted, 25);
  const totalDuration = filtered.reduce((sum, c) => sum + (c.duration || 0), 0);
  const totalCost = filtered.reduce((sum, c) => sum + callCostInr(c.duration || 0, costPerMinuteInr), 0);

  const selectedAnswers = selected ? (selected as any).answers as Record<string, string> | undefined : undefined;

  function toggleField(key: string) {
    setExportFields(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }

  return (
    <PageShell
      title="Call Logs"
      subtitle="Every real inbound and outbound call — transcript, recording, and sentiment."
      action={
        <div className="relative">
          <Button icon={Download} variant="secondary" size="sm" onClick={() => setShowExport(v => !v)}>
            Export CSV <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
          {showExport && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl shadow-xl border z-50 p-3 space-y-1"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Select fields to export</p>
              {EXPORT_FIELDS.map(f => (
                <label key={f.key} className="flex items-center gap-2 cursor-pointer rounded-lg px-2 py-1.5 hover:bg-[var(--bg-subtle)]">
                  <div
                    className={`h-4 w-4 rounded flex items-center justify-center shrink-0 border transition-colors ${exportFields.includes(f.key) ? 'bg-blue-600 border-blue-600' : 'border-[var(--border)]'}`}
                    onClick={() => toggleField(f.key)}
                  >
                    {exportFields.includes(f.key) && <Check className="h-2.5 w-2.5 text-white" />}
                  </div>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{f.label}</span>
                </label>
              ))}
              <div className="flex gap-2 mt-3 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                <button className="text-xs underline" style={{ color: 'var(--text-muted)' }}
                  onClick={() => setExportFields(EXPORT_FIELDS.map(f => f.key))}>All</button>
                <button className="text-xs underline" style={{ color: 'var(--text-muted)' }}
                  onClick={() => setExportFields([])}>None</button>
                <Button size="sm" className="ml-auto" onClick={() => {
                  exportCSV('call_logs.csv', exportFields, sorted, resolveCallerName, costPerMinuteInr ?? 0);
                  setShowExport(false);
                }}>
                  Download
                </Button>
              </div>
            </div>
          )}
        </div>
      }
    >
      <Widget colSpan={12} showHeader={false} padding="md">
        <FilterBar
          search={{ value: searchTerm, onChange: setSearchTerm, placeholder: 'Search by caller or summary…' }}
          dates={[
            { key: 'from', label: 'From', value: fromDate, onChange: setFromDate },
            { key: 'to', label: 'To', value: toDate, onChange: setToDate },
          ]}
          actions={
            <>
              {(fromDate || toDate) && (
                <button onClick={() => { setFromDate(''); setToDate(''); }} className="text-[11px] pb-0.5 underline" style={{ color: 'var(--text-muted)' }}>Clear</button>
              )}
              <span className="text-xs rounded-lg px-3 py-1.5 border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                <strong>{filtered.length}</strong> <span style={{ color: 'var(--text-muted)' }}>calls</span>
              </span>
              <span className="text-xs rounded-lg px-3 py-1.5 border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                <strong>{formatDuration(totalDuration)}</strong> <span style={{ color: 'var(--text-muted)' }}>duration</span>
              </span>
              <span className="text-xs rounded-lg px-3 py-1.5 border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                <strong>{formatInr(totalCost)}</strong> <span style={{ color: 'var(--text-muted)' }}>cost</span>
              </span>
            </>
          }
        />
      </Widget>

      <Widget colSpan={12} showHeader={false} padding="none" scrollable>
        <div>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-widest border-b" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                <th className="px-5 py-3">Caller</th>
                <th className="px-5 py-3">Duration</th>
                <th className="px-5 py-3">Cost</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Sentiment</th>
                <th className="px-5 py-3">When</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
              {pagination.paginatedItems.map(c => (
                <tr key={c.id} className="hover:bg-[var(--bg-subtle)]">
                  <td className="px-5 py-3 font-semibold" style={{ color: 'var(--text-primary)' }}>
                    <div>{resolveCallerName(c)}</div>
                    {c.direction && <div className="text-[10px] font-normal mt-0.5" style={{ color: 'var(--text-muted)' }}>{c.direction}</div>}
                  </td>
                  <td className="px-5 py-3 font-mono">{formatDuration(c.duration)}</td>
                  <td className="px-5 py-3 font-mono">{formatInr(callCostInr(c.duration, costPerMinuteInr))}</td>
                  <td className="px-5 py-3">{c.status}</td>
                  <td className="px-5 py-3">
                    <Badge color={SENTIMENT_COLOR[c.sentiment] ?? 'slate'}>{c.sentiment}</Badge>
                  </td>
                  <td className="px-5 py-3" style={{ color: 'var(--text-muted)' }}>{new Date(c.createdAt).toLocaleString()}</td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => setSelected(c)} className="text-blue-600 hover:underline font-semibold flex items-center gap-1 ml-auto text-xs">
                      <Phone className="h-3 w-3" /> View
                    </button>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr><td colSpan={7}><EmptyState heading={searchTerm ? 'No calls match your search' : 'No calls yet'} message="Real inbound and outbound calls will appear here automatically." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={pagination.page} totalPages={pagination.totalPages} totalItems={pagination.totalItems} pageSize={pagination.pageSize} onPageChange={pagination.setPage} />
      </Widget>

      {/* Detail modal */}
      {selected && (
        <Modal
          open
          onClose={() => setSelected(null)}
          title={resolveCallerName(selected)}
          subtitle={`${new Date(selected.createdAt).toLocaleString()} · ${formatDuration(selected.duration)} · ${formatInr(callCostInr(selected.duration, costPerMinuteInr))} · ${selected.direction ?? 'unknown'}`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-5">

            {/* Recording */}
            {selected.recordingUrl && (
              <div className="rounded-xl p-3 flex items-center gap-3 border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border)' }}>
                <PlayCircle className="h-5 w-5 text-blue-600 shrink-0" />
                <audio controls src={getPlayableRecordingUrl(selected.id, selected.recordingUrl)} className="w-full h-8" />
              </div>
            )}

            {/* Meta row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Status',    value: selected.status },
                { label: 'Sentiment', value: selected.sentiment },
                { label: 'Intent',    value: selected.intent },
              ].map(item => (
                <div key={item.label} className="rounded-xl p-3 border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{item.value}</p>
                </div>
              ))}
            </div>

            {/* AI Summary */}
            {selected.summary && (
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>AI Summary</h4>
                <p className="text-xs leading-relaxed rounded-xl p-3 border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                  {selected.summary}
                </p>
              </div>
            )}

            {/* Q&A Answers */}
            {selectedAnswers && Object.keys(selectedAnswers).length > 0 && (
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Workflow Answers</h4>
                <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border)' }}>
                        <th className="px-4 py-2 text-left font-bold text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Question</th>
                        <th className="px-4 py-2 text-left font-bold text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Answer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                      {Object.entries(selectedAnswers).map(([q, a]) => (
                        <tr key={q} className="hover:bg-[var(--bg-subtle)]">
                          <td className="px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>{q}</td>
                          <td className="px-4 py-2.5 font-semibold" style={{ color: 'var(--text-primary)' }}>{a || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Transcript */}
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Transcript</h4>
              {selected.transcript.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No transcript captured for this call.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {selected.transcript.map((line, i) => (
                    <div key={i} className={`flex flex-col ${line.speaker === 'AI' ? 'items-start' : 'items-end'}`}>
                      <span className="text-[9px] font-mono mb-0.5" style={{ color: 'var(--text-muted)' }}>{line.speaker} · {line.timestamp}</span>
                      <div
                        className="rounded-xl px-3 py-2 text-xs max-w-[85%]"
                        style={line.speaker === 'AI'
                          ? { background: '#eff6ff', color: '#1e3a5f' }
                          : { background: 'var(--bg-subtle)', color: 'var(--text-primary)' }
                        }
                      >
                        {line.text}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Export this call */}
            <div className="pt-2 border-t flex justify-end" style={{ borderColor: 'var(--border)' }}>
              <Button icon={Download} variant="secondary" size="sm" onClick={() => {
                exportCSV(
                  `call_${selected.id}.csv`,
                  EXPORT_FIELDS.map(f => f.key),
                  [selected],
                  resolveCallerName,
                  costPerMinuteInr ?? 0,
                );
              }}>
                Export this call
              </Button>
            </div>

          </div>
        </Modal>
      )}
    </PageShell>
  );
}
