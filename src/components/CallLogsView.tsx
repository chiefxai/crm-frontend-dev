import React, { useState } from 'react';
import { Phone, Search, X, PlayCircle } from 'lucide-react';
import { CallLog } from '../types';
import PageHeader from './PageHeader';
import { callCostInr, formatInr } from '../lib/pricing';
import { getPlayableRecordingUrl } from '../lib/api';
import Pagination from '../shared/components/Pagination';
import { usePagination } from '../shared/hooks/usePagination';

interface CallLogsViewProps {
  callLogs: CallLog[];
  costPerMinuteInr?: number;
}

const SENTIMENT_COLOR: Record<string, string> = {
  Positive: 'text-emerald-600 bg-emerald-50',
  Negative: 'text-rose-600 bg-rose-50',
  Neutral: 'text-slate-500 bg-slate-100',
  Unknown: 'text-slate-400 bg-slate-50'
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

  const filtered = callLogs.filter((c) => {
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

  // Quick summary for whatever's currently filtered — the full breakdown
  // (trends, sentiment, task-wise, cost) lives on the Reports page; this
  // is just a fast at-a-glance strip for the exact rows shown below.
  const totalDuration = filtered.reduce((sum, c) => sum + (c.duration || 0), 0);
  const totalCost = filtered.reduce((sum, c) => sum + callCostInr(c.duration || 0, costPerMinuteInr), 0);

  return (
    <div className="font-sans h-full overflow-y-auto">
      <PageHeader
        title="Call Logs"
        subtitle="Every real inbound and outbound call — transcript, recording, and sentiment, as it actually happened."
      />

      <div className="px-8 pb-8">
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div className="relative max-w-sm flex-1 min-w-[200px]">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by caller or summary…"
              className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">From</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">To</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500" />
          </div>
          {(fromDate || toDate) && (
            <button onClick={() => { setFromDate(''); setToDate(''); }} className="text-[11px] text-slate-400 hover:text-slate-600 underline mb-2">Clear dates</button>
          )}
        </div>

        <div className="flex flex-wrap gap-4 mb-4 text-xs">
          <span className="bg-white border border-slate-200 rounded-lg px-3 py-1.5"><strong className="text-slate-800">{filtered.length}</strong> <span className="text-slate-400">calls</span></span>
          <span className="bg-white border border-slate-200 rounded-lg px-3 py-1.5"><strong className="text-slate-800">{formatDuration(totalDuration)}</strong> <span className="text-slate-400">total duration</span></span>
          <span className="bg-white border border-slate-200 rounded-lg px-3 py-1.5"><strong className="text-slate-800">{formatInr(totalCost)}</strong> <span className="text-slate-400">total cost</span></span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="p-4 px-6">Caller</th>
                <th className="p-4 px-6">Duration</th>
                <th className="p-4 px-6">Cost</th>
                <th className="p-4 px-6">Status</th>
                <th className="p-4 px-6">Sentiment</th>
                <th className="p-4 px-6">When</th>
                <th className="p-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {pagination.paginatedItems.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50">
                  <td className="p-4 px-6 font-semibold text-slate-800">{c.leadName}</td>
                  <td className="p-4 px-6 font-mono">{formatDuration(c.duration)}</td>
                  <td className="p-4 px-6 font-mono">{formatInr(callCostInr(c.duration, costPerMinuteInr))}</td>
                  <td className="p-4 px-6">{c.status}</td>
                  <td className="p-4 px-6">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${SENTIMENT_COLOR[c.sentiment] || SENTIMENT_COLOR.Unknown}`}>
                      {c.sentiment}
                    </span>
                  </td>
                  <td className="p-4 px-6 text-slate-400">{new Date(c.createdAt).toLocaleString()}</td>
                  <td className="p-4 px-6 text-right">
                    <button onClick={() => setSelected(c)} className="text-blue-600 hover:underline font-semibold flex items-center gap-1 ml-auto">
                      <Phone className="h-3 w-3" /> View
                    </button>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400">No calls{searchTerm ? ' match your search' : ' yet — real inbound and outbound calls will appear here automatically.'}</td></tr>
              )}
            </tbody>
          </table>
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            pageSize={pagination.pageSize}
            onPageChange={pagination.setPage}
          />
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h3 className="font-semibold text-slate-800">{selected.leadName}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{new Date(selected.createdAt).toLocaleString()} • {formatDuration(selected.duration)} • {formatInr(callCostInr(selected.duration, costPerMinuteInr))}</p>
              </div>
              <button onClick={() => setSelected(null)}><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              {selected.recordingUrl && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                  <PlayCircle className="h-5 w-5 text-blue-600 shrink-0" />
                  <audio controls src={getPlayableRecordingUrl(selected.id, selected.recordingUrl)} className="w-full h-8" />
                </div>
              )}
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Transcript</h4>
                {selected.transcript.length === 0 ? (
                  <p className="text-xs text-slate-400">No transcript captured for this call.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selected.transcript.map((line, i) => (
                      <div key={i} className={`flex flex-col ${line.speaker === 'AI' ? 'items-start' : 'items-end'}`}>
                        <span className="text-[9px] text-slate-400 font-mono mb-0.5">{line.speaker} • {line.timestamp}</span>
                        <div className={`rounded-xl px-3 py-2 text-xs max-w-[85%] ${line.speaker === 'AI' ? 'bg-blue-50 text-blue-900' : 'bg-slate-100 text-slate-800'}`}>
                          {line.text}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selected.summary && (
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Summary</h4>
                  <p className="text-xs text-slate-600">{selected.summary}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
