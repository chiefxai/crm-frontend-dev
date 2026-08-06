import React, { useState } from 'react';
import { Phone, Search, X, PlayCircle } from 'lucide-react';
import { CallLog } from '../types';
import PageHeader from './PageHeader';
import { callCostInr, formatInr } from '../lib/pricing';

interface CallLogsViewProps {
  callLogs: CallLog[];
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

export default function CallLogsView({ callLogs }: CallLogsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<CallLog | null>(null);

  const filtered = callLogs.filter((c) =>
    !searchTerm.trim() ||
    c.leadName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.summary.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="font-sans h-full overflow-y-auto">
      <PageHeader
        title="Call Logs"
        subtitle="Every real inbound and outbound call — transcript, recording, and sentiment, as it actually happened."
      />

      <div className="px-8 pb-8">
        <div className="relative max-w-sm mb-4">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by caller or summary…"
            className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-xs focus:outline-none focus:border-blue-500"
          />
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
              {sorted.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50">
                  <td className="p-4 px-6 font-semibold text-slate-800">{c.leadName}</td>
                  <td className="p-4 px-6 font-mono">{formatDuration(c.duration)}</td>
                  <td className="p-4 px-6 font-mono">{formatInr(callCostInr(c.duration))}</td>
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
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h3 className="font-semibold text-slate-800">{selected.leadName}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{new Date(selected.createdAt).toLocaleString()} • {formatDuration(selected.duration)} • {formatInr(callCostInr(selected.duration))}</p>
              </div>
              <button onClick={() => setSelected(null)}><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              {selected.recordingUrl && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                  <PlayCircle className="h-5 w-5 text-blue-600 shrink-0" />
                  <audio controls src={selected.recordingUrl} className="w-full h-8" />
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
