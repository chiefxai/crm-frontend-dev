import React, { useState } from 'react';
import { Phone, PlayCircle, Download } from 'lucide-react';
import Modal from './ui/Modal';
import { downloadCSV } from '../shared/lib/exporters';
import { CallLog } from '../types';
import { callCostInr, formatInr } from '../lib/pricing';
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

export default function CallLogsView({ callLogs, costPerMinuteInr }: CallLogsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<CallLog | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const filtered = callLogs.filter(c => {
    const matchesSearch = !searchTerm.trim() ||
      c.leadName.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  return (
    <PageShell
      title="Call Logs"
      subtitle="Every real inbound and outbound call — transcript, recording, and sentiment."
      action={
        <Button
          icon={Download}
          variant="secondary"
          size="sm"
          onClick={() => downloadCSV('call_logs.csv',
            ['Name', 'Direction', 'Duration (s)', 'Cost (INR)', 'Status', 'Sentiment', 'Intent', 'Summary', 'Date'],
            sorted.map(c => [c.leadName, c.direction ?? 'unknown', c.duration, callCostInr(c.duration, costPerMinuteInr ?? 0).toFixed(2), c.status, c.sentiment, c.intent, c.summary, new Date(c.createdAt).toLocaleString()])
          )}
        >
          Export CSV
        </Button>
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
                  <td className="px-5 py-3 font-semibold" style={{ color: 'var(--text-primary)' }}>{c.leadName}</td>
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
          title={selected.leadName}
          subtitle={`${new Date(selected.createdAt).toLocaleString()} • ${formatDuration(selected.duration)} • ${formatInr(callCostInr(selected.duration, costPerMinuteInr))}`}
          maxWidth="max-w-2xl"
        >
            <div className="space-y-4">
              {selected.recordingUrl && (
                <div className="rounded-xl p-3 flex items-center gap-3 border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border)' }}>
                  <PlayCircle className="h-5 w-5 text-blue-600 shrink-0" />
                  <audio controls src={getPlayableRecordingUrl(selected.id, selected.recordingUrl)} className="w-full h-8" />
                </div>
              )}
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Transcript</h4>
                {selected.transcript.length === 0 ? (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No transcript captured for this call.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selected.transcript.map((line, i) => (
                      <div key={i} className={`flex flex-col ${line.speaker === 'AI' ? 'items-start' : 'items-end'}`}>
                        <span className="text-[9px] font-mono mb-0.5" style={{ color: 'var(--text-muted)' }}>{line.speaker} • {line.timestamp}</span>
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
              {selected.summary && (
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Summary</h4>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{selected.summary}</p>
                </div>
              )}
            </div>
        </Modal>
      )}
    </PageShell>
  );
}
