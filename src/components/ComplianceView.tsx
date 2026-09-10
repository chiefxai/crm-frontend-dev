import React, { useEffect, useState } from 'react';
import { ShieldBan, Plus, Trash2, Clock, Loader2 } from 'lucide-react';
import { apiFetch } from '../lib/api';
import PageShell from './ui/PageShell';
import Widget from './ui/Widget';
import Button from './ui/Button';

interface DncEntry { id: string; phone: string; reason: string | null; createdAt: string; }
interface CallingWindow { enabled: boolean; startHour: number; endHour: number; timezone: string; }

export default function ComplianceView() {
  const [dnc, setDnc] = useState<DncEntry[]>([]);
  const [window_, setWindow] = useState<CallingWindow | null>(null);
  const [loading, setLoading] = useState(true);
  const [newPhone, setNewPhone] = useState('');
  const [newReason, setNewReason] = useState('');
  const [adding, setAdding] = useState(false);
  const [savingWindow, setSavingWindow] = useState(false);

  const loadAll = () => {
    Promise.all([
      apiFetch('/api/compliance/dnc').then(r => r.json()),
      apiFetch('/api/compliance/calling-window').then(r => r.json()),
    ]).then(([dncList, win]) => {
      setDnc(Array.isArray(dncList) ? dncList : []);
      setWindow(win);
    }).finally(() => setLoading(false));
  };

  useEffect(loadAll, []);

  const handleAddDnc = async () => {
    if (!newPhone.trim()) return;
    setAdding(true);
    const res = await apiFetch('/api/compliance/dnc', { method: 'POST', body: JSON.stringify({ phone: newPhone.trim(), reason: newReason.trim() || undefined }) });
    setAdding(false);
    if (res.ok) { const entry = await res.json(); setDnc(prev => [entry, ...prev]); setNewPhone(''); setNewReason(''); }
    else alert((await res.json()).error || 'Failed to add');
  };

  const handleRemoveDnc = async (id: string) => {
    const res = await apiFetch(`/api/compliance/dnc/${id}`, { method: 'DELETE' });
    if (res.ok) setDnc(prev => prev.filter(e => e.id !== id));
  };

  const handleSaveWindow = async () => {
    if (!window_) return;
    setSavingWindow(true);
    const res = await apiFetch('/api/compliance/calling-window', { method: 'POST', body: JSON.stringify(window_) });
    setSavingWindow(false);
    if (res.ok) setWindow(await res.json());
    else alert((await res.json()).error || 'Failed to save');
  };

  if (loading || !window_) return <div className="flex items-center justify-center h-full text-slate-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>;

  return (
    <PageShell title="Compliance" subtitle="Do-Not-Call list and calling-hour restrictions for outbound AI calls.">
      {/* Calling window */}
      <Widget colSpan={6} title="Calling Window" subtitle="Restrict outbound AI calls to specific hours." icon={Clock} accent="#2563eb" padding="md">
        <label className="flex items-center gap-2 text-sm text-slate-600 mb-4">
          <input type="checkbox" checked={window_.enabled} onChange={e => setWindow({ ...window_, enabled: e.target.checked })} />
          Restrict outbound calls to specific hours
        </label>
        {window_.enabled && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Start hour</label>
              <input type="number" min={0} max={23} value={window_.startHour} onChange={e => setWindow({ ...window_, startHour: Number(e.target.value) })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">End hour</label>
              <input type="number" min={0} max={23} value={window_.endHour} onChange={e => setWindow({ ...window_, endHour: Number(e.target.value) })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Timezone</label>
              <input value={window_.timezone} onChange={e => setWindow({ ...window_, timezone: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-sm" placeholder="Asia/Kolkata" />
            </div>
          </div>
        )}
        <Button variant="primary" size="sm" loading={savingWindow} onClick={handleSaveWindow}>Save</Button>
      </Widget>

      {/* DNC list */}
      <Widget colSpan={6} title="Do-Not-Call List" subtitle="Numbers permanently excluded from outbound AI dialing." icon={ShieldBan} accent="#e11d48" padding="md">
        <div className="flex gap-2 mb-4">
          <input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="Phone number" className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          <input value={newReason} onChange={e => setNewReason(e.target.value)} placeholder="Reason (optional)" className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          <Button variant="primary" size="sm" icon={Plus} loading={adding} onClick={handleAddDnc} />
        </div>
        <div className="space-y-1.5 max-h-80 overflow-y-auto">
          {dnc.length === 0 && <p className="text-xs text-slate-400">No numbers on the list.</p>}
          {dnc.map(e => (
            <div key={e.id} className="flex items-center justify-between bg-slate-50 dark:bg-[var(--bg-subtle)] rounded-lg px-3 py-2 text-sm">
              <div>
                <span className="font-medium text-slate-700">{e.phone}</span>
                {e.reason && <span className="text-xs text-slate-400 ml-2">{e.reason}</span>}
              </div>
              <button onClick={() => handleRemoveDnc(e.id)} className="text-slate-300 hover:text-rose-500">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </Widget>
    </PageShell>
  );
}
