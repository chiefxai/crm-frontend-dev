import React from 'react';
import { X, Printer } from 'lucide-react';
import { CallLog } from '../types';
import { callCostInr, formatInr } from '../lib/pricing';

interface DialTaskCallResult {
  status: string;
  duration: number;
  sentiment: string;
  intent: string;
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

interface LeadRef {
  id: string;
  name: string;
  phone: string;
}

interface PrintableReportProps {
  onClose: () => void;
  orgName: string;
  fromDate: string;
  toDate: string;
  direction: 'all' | 'inbound' | 'outbound';
  granularity: string;
  filteredCalls: CallLog[];
  dialerTasks: DialTask[];
  leads: LeadRef[];
  costPerMinuteInr: number;
}

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function CallTable({ calls, costPerMinuteInr }: { calls: CallLog[]; costPerMinuteInr: number }) {
  if (calls.length === 0) return <p className="text-xs text-slate-400 italic">No calls in this section.</p>;
  return (
    <table className="w-full text-left text-[10px] border-collapse mb-2">
      <thead>
        <tr className="border-b-2 border-slate-800">
          <th className="py-1.5 pr-2">Caller</th>
          <th className="py-1.5 pr-2">Date / Time</th>
          <th className="py-1.5 pr-2">Duration</th>
          <th className="py-1.5 pr-2">Cost</th>
          <th className="py-1.5 pr-2">Status</th>
          <th className="py-1.5 pr-2">Sentiment</th>
          <th className="py-1.5 pr-2">Intent</th>
          <th className="py-1.5 pr-2">Summary</th>
          <th className="py-1.5">Recording</th>
        </tr>
      </thead>
      <tbody>
        {calls.map((c) => (
          <tr key={c.id} className="border-b border-slate-200 align-top">
            <td className="py-1.5 pr-2 font-semibold">{c.leadName}</td>
            <td className="py-1.5 pr-2 whitespace-nowrap">{new Date(c.createdAt).toLocaleString()}</td>
            <td className="py-1.5 pr-2 whitespace-nowrap">{formatDuration(c.duration)}</td>
            <td className="py-1.5 pr-2 whitespace-nowrap">{formatInr(callCostInr(c.duration, costPerMinuteInr))}</td>
            <td className="py-1.5 pr-2">{c.status}</td>
            <td className="py-1.5 pr-2">{c.sentiment}</td>
            <td className="py-1.5 pr-2">{c.intent}</td>
            <td className="py-1.5 pr-2 max-w-[220px]">{c.summary || '—'}</td>
            <td className="py-1.5 max-w-[140px] break-all">{c.recordingUrl ? c.recordingUrl : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function PrintableReport({
  onClose,
  orgName,
  fromDate,
  toDate,
  direction,
  granularity,
  filteredCalls,
  dialerTasks,
  leads,
  costPerMinuteInr
}: PrintableReportProps) {
  const inboundCalls = filteredCalls.filter((c) => c.direction === 'inbound');
  const outboundCalls = filteredCalls.filter((c) => c.direction === 'outbound');

  const totalDuration = filteredCalls.reduce((sum, c) => sum + (c.duration || 0), 0);
  const totalCost = filteredCalls.reduce((sum, c) => sum + callCostInr(c.duration || 0, costPerMinuteInr), 0);
  const sentimentCounts: Record<string, number> = {};
  for (const c of filteredCalls) sentimentCounts[c.sentiment] = (sentimentCounts[c.sentiment] || 0) + 1;

  // Tasks whose creation falls anywhere near the report window are included
  // in full — a task's calls happen after it's created, so this is a
  // deliberately loose filter rather than trying to date-match every
  // individual call result back to the task.
  const relevantTasks = dialerTasks.filter((t) => {
    const created = new Date(t.createdAt);
    return created >= new Date(fromDate + 'T00:00:00') && created <= new Date(toDate + 'T23:59:59');
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 print:p-0 print:bg-white print:static">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-report-root, #printable-report-root * { visibility: visible; }
          #printable-report-root { position: absolute; top: 0; left: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto print:max-h-none print:rounded-none print:shadow-none print:max-w-none">
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h2 className="text-sm font-bold text-slate-800">Report Preview</h2>
          <div className="flex items-center gap-3">
            <button onClick={() => window.print()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg">
              <Printer className="h-3.5 w-3.5" /> Download PDF
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div id="printable-report-root" className="p-8 text-slate-800">
          <div className="mb-6 border-b-2 border-slate-800 pb-4">
            <h1 className="text-xl font-bold">{orgName} — Call Report</h1>
            <p className="text-xs text-slate-500 mt-1">
              Period: {fromDate} to {toDate} · Grouped by {granularity} · Direction: {direction === 'all' ? 'All calls' : direction === 'inbound' ? 'Incoming only' : 'Outgoing only'}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">Generated {new Date().toLocaleString()}</p>
          </div>

          {/* Summary */}
          <section className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wide mb-2 bg-slate-100 px-2 py-1">Summary</h2>
            <div className="grid grid-cols-4 gap-3 text-xs">
              <div><span className="text-slate-400 block">Total Calls</span><strong>{filteredCalls.length}</strong></div>
              <div><span className="text-slate-400 block">Total Duration</span><strong>{formatDuration(totalDuration)}</strong></div>
              <div><span className="text-slate-400 block">Total Cost</span><strong>{formatInr(totalCost)}</strong></div>
              <div><span className="text-slate-400 block">Rate</span><strong>₹{costPerMinuteInr}/min</strong></div>
              <div><span className="text-slate-400 block">Incoming</span><strong>{inboundCalls.length}</strong></div>
              <div><span className="text-slate-400 block">Outgoing</span><strong>{outboundCalls.length}</strong></div>
              <div><span className="text-slate-400 block">Positive Sentiment</span><strong>{sentimentCounts.Positive || 0}</strong></div>
              <div><span className="text-slate-400 block">Negative Sentiment</span><strong>{sentimentCounts.Negative || 0}</strong></div>
            </div>
          </section>

          {/* Inbound section */}
          {direction !== 'outbound' && (
            <section className="mb-6">
              <h2 className="text-sm font-bold uppercase tracking-wide mb-2 bg-slate-100 px-2 py-1">Incoming Calls ({inboundCalls.length})</h2>
              <CallTable calls={inboundCalls} costPerMinuteInr={costPerMinuteInr} />
            </section>
          )}

          {/* Outbound — by task */}
          {direction !== 'inbound' && (
            <section className="mb-6">
              <h2 className="text-sm font-bold uppercase tracking-wide mb-2 bg-slate-100 px-2 py-1">Outgoing Calls — By Task</h2>
              {relevantTasks.length === 0 && <p className="text-xs text-slate-400 italic mb-4">No dialer tasks created in this period.</p>}
              {relevantTasks.map((task) => {
                const rows = task.leadIds.map((leadId) => {
                  const lead = leads.find((l) => l.id === leadId);
                  const result = task.callResults[leadId];
                  return {
                    leadId,
                    name: lead?.name || 'Unknown',
                    phone: lead?.phone || '',
                    status: result?.status || 'Pending',
                    duration: result?.duration || 0,
                    sentiment: result?.sentiment || 'Unknown',
                    intent: result?.intent || 'Unknown',
                    summary: result?.summary || '',
                    recordingUrl: result?.recordingUrl
                  };
                });
                const completed = rows.filter((r) => r.status === 'Completed').length;
                const interested = rows.filter((r) => r.intent === 'Interested').length;
                const conversionRate = completed > 0 ? Math.round((interested / completed) * 100) : 0;
                return (
                  <div key={task.id} className="mb-5 break-inside-avoid">
                    <h3 className="text-xs font-bold mb-1">{task.name} <span className="font-normal text-slate-400">({rows.length} leads, {completed} completed, {conversionRate}% conversion)</span></h3>
                    <table className="w-full text-left text-[10px] border-collapse mb-2">
                      <thead>
                        <tr className="border-b-2 border-slate-800">
                          <th className="py-1.5 pr-2">Lead</th>
                          <th className="py-1.5 pr-2">Phone</th>
                          <th className="py-1.5 pr-2">Status</th>
                          <th className="py-1.5 pr-2">Duration</th>
                          <th className="py-1.5 pr-2">Sentiment</th>
                          <th className="py-1.5 pr-2">Intent</th>
                          <th className="py-1.5 pr-2">Summary</th>
                          <th className="py-1.5">Recording</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => (
                          <tr key={r.leadId} className="border-b border-slate-200 align-top">
                            <td className="py-1.5 pr-2 font-semibold">{r.name}</td>
                            <td className="py-1.5 pr-2">{r.phone}</td>
                            <td className="py-1.5 pr-2">{r.status}</td>
                            <td className="py-1.5 pr-2 whitespace-nowrap">{formatDuration(r.duration)}</td>
                            <td className="py-1.5 pr-2">{r.sentiment}</td>
                            <td className="py-1.5 pr-2">{r.intent}</td>
                            <td className="py-1.5 pr-2 max-w-[200px]">{r.summary || '—'}</td>
                            <td className="py-1.5 max-w-[120px] break-all">{r.recordingUrl || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </section>
          )}

          {/* Outbound — raw log (covers ad-hoc dials not tied to a task) */}
          {direction !== 'inbound' && (
            <section className="mb-6">
              <h2 className="text-sm font-bold uppercase tracking-wide mb-2 bg-slate-100 px-2 py-1">Outgoing Calls — Full Log ({outboundCalls.length})</h2>
              <CallTable calls={outboundCalls} costPerMinuteInr={costPerMinuteInr} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
