import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Users, PhoneCall, ScrollText, Pencil, Ban, PlayCircle, Trash2, AlertTriangle, ToggleLeft, ToggleRight, Hash, Plus, X } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { OrgDetail } from './types';
import { callCostInr, formatInr } from '../lib/pricing';
import SlideOver from '../components/ui/SlideOver';
import Modal from '../components/ui/Modal';
import { FEATURE_REGISTRY } from '../features/feature-flags/registry';

export default function OrgDetailPanel({ orgId, onClose, onChanged }: { orgId: string; onClose: () => void; onChanged: () => void }) {
  const [detail, setDetail] = useState<OrgDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', workspaceName: '', industry: '', subscriptionPlan: '', aiMinutesLimit: '' });
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const deleteInputRef = useRef<HTMLInputElement>(null);
  const [enabledFlags, setEnabledFlags] = useState<string[]>([]);
  const [flagsBusy, setFlagsBusy] = useState(false);

  // Virtual numbers
  const [numbers, setNumbers] = useState<any[]>([]);
  const [numbersLoading, setNumbersLoading] = useState(false);
  const [addNumberForm, setAddNumberForm] = useState(false);
  const [newNum, setNewNum] = useState({ number: '', friendlyName: '', provider: 'Twilio' });
  const [numBusy, setNumBusy] = useState(false);

  const loadNumbers = () => {
    setNumbersLoading(true);
    apiFetch(`/api/platform/organizations/${orgId}/numbers`)
      .then(r => r.json())
      .then(d => setNumbers(Array.isArray(d) ? d : []))
      .catch(() => setNumbers([]))
      .finally(() => setNumbersLoading(false));
  };

  const handleAddNumber = async () => {
    if (!newNum.number.trim()) return;
    setNumBusy(true);
    try {
      const res = await apiFetch(`/api/platform/organizations/${orgId}/numbers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: newNum.number.trim(), friendlyName: newNum.friendlyName.trim(), provider: newNum.provider, status: 'Active' }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      setNewNum({ number: '', friendlyName: '', provider: 'Twilio' });
      setAddNumberForm(false);
      loadNumbers();
    } catch { /* ignore */ } finally { setNumBusy(false); }
  };

  const handleDeleteNumber = async (numberId: string) => {
    if (!confirm('Remove this virtual number?')) return;
    await apiFetch(`/api/platform/organizations/${orgId}/numbers/${encodeURIComponent(numberId)}`, { method: 'DELETE' });
    setNumbers(prev => prev.filter(n => n.id !== numberId));
  };

  const loadFlags = () => {
    apiFetch(`/api/platform/organizations/${orgId}/features`)
      .then((r) => r.json())
      .then((d) => d?.featureFlags && setEnabledFlags(d.featureFlags))
      .catch(() => {});
  };

  const toggleFlag = async (key: string) => {
    const prev = enabledFlags;
    const updated = enabledFlags.includes(key)
      ? enabledFlags.filter((k) => k !== key)
      : [...enabledFlags, key];
    setEnabledFlags(updated);
    setFlagsBusy(true);
    try {
      await apiFetch(`/api/platform/organizations/${orgId}/features`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureFlags: updated }),
      });
    } catch {
      setEnabledFlags(prev);
    } finally {
      setFlagsBusy(false);
    }
  };

  const load = () => {
    setLoading(true);
    apiFetch(`/api/platform/organizations/${orgId}`)
      .then((r) => r.json())
      .then((d) => {
        setDetail(d);
        setEditForm({
          name: d.name || '',
          workspaceName: d.workspaceName || '',
          industry: d.industry || '',
          subscriptionPlan: d.subscriptionPlan || '',
          aiMinutesLimit: d.aiMinutesLimit != null ? String(d.aiMinutesLimit) : ''
        });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); loadFlags(); loadNumbers(); }, [orgId]);

  const handleSaveEdit = async () => {
    setBusy(true);
    setActionError(null);
    try {
      const res = await apiFetch(`/api/platform/organizations/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          workspaceName: editForm.workspaceName,
          industry: editForm.industry,
          subscriptionPlan: editForm.subscriptionPlan,
          aiMinutesLimit: editForm.aiMinutesLimit ? Number(editForm.aiMinutesLimit) : null
        })
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Update failed');
      setEditing(false);
      load();
      onChanged();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleToggleSuspend = async () => {
    if (!detail) return;
    const suspending = detail.status !== 'Suspended';
    if (!window.confirm(suspending ? `Suspend "${detail.name}"? Their team will be locked out immediately.` : `Reactivate "${detail.name}"?`)) return;
    setBusy(true);
    setActionError(null);
    try {
      const res = await apiFetch(`/api/platform/organizations/${orgId}/${suspending ? 'suspend' : 'reactivate'}`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json()).error || 'Action failed');
      load();
      onChanged();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const openDeleteModal = () => {
    setDeleteConfirm('');
    setDeleteModal(true);
    setTimeout(() => deleteInputRef.current?.focus(), 50);
  };

  const handleDelete = async () => {
    if (!detail || deleteConfirm !== detail.name) return;
    setDeleteModal(false);
    setBusy(true);
    setActionError(null);
    try {
      const res = await apiFetch(`/api/platform/organizations/${orgId}?confirm=${encodeURIComponent(detail.name)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Delete failed');
      onChanged();
      onClose();
    } catch (err: any) {
      setActionError(err.message);
      setBusy(false);
    }
  };

  return (
    <>
    <SlideOver open onClose={onClose}>
      <div className="-mx-6 -my-5 flex flex-col min-h-full">
        {loading || !detail ? (
          <div className="flex items-center justify-center h-64 text-slate-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>
        ) : (
          <>
            <div className="bg-white border-b border-slate-200 p-6 sticky top-0 z-10">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900">{detail.name}</h2>
                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${detail.status === 'Suspended' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {detail.status || 'Active'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-1">{detail.workspaceName} · {detail.industry}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={() => setEditing((v) => !v)}
                  disabled={busy}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                >
                  <Pencil className="h-3.5 w-3.5" /> {editing ? 'Cancel Edit' : 'Edit'}
                </button>
                <button
                  onClick={handleToggleSuspend}
                  disabled={busy}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50 ${
                    detail.status === 'Suspended' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  {detail.status === 'Suspended' ? <PlayCircle className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                  {detail.status === 'Suspended' ? 'Reactivate' : 'Suspend'}
                </button>
                <button
                  onClick={openDeleteModal}
                  disabled={busy}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-50 ml-auto"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete Org
                </button>
              </div>

              {actionError && <p className="text-xs text-rose-600 mt-2">{actionError}</p>}

              {editing && (
                <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Name</label>
                      <input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Workspace</label>
                      <input value={editForm.workspaceName} onChange={(e) => setEditForm((f) => ({ ...f, workspaceName: e.target.value }))} className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Industry</label>
                      <input value={editForm.industry} onChange={(e) => setEditForm((f) => ({ ...f, industry: e.target.value }))} className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Plan</label>
                      <input value={editForm.subscriptionPlan} onChange={(e) => setEditForm((f) => ({ ...f, subscriptionPlan: e.target.value }))} className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">AI Minutes Limit</label>
                      <input value={editForm.aiMinutesLimit} onChange={(e) => setEditForm((f) => ({ ...f, aiMinutesLimit: e.target.value }))} placeholder="Unlimited" className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5" />
                    </div>
                  </div>
                  <button onClick={handleSaveEdit} disabled={busy} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50">
                    {busy ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                  <div className="text-lg font-semibold text-slate-800">{detail.counts.members}</div>
                  <div className="text-[10px] text-slate-400 uppercase">Members</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                  <div className="text-lg font-semibold text-slate-800">{detail.counts.leads}</div>
                  <div className="text-[10px] text-slate-400 uppercase">Leads</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                  <div className="text-lg font-semibold text-slate-800">{detail.counts.workflows}</div>
                  <div className="text-[10px] text-slate-400 uppercase">Workflows</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                  <div className="text-lg font-semibold text-slate-800">{detail.counts.campaigns}</div>
                  <div className="text-[10px] text-slate-400 uppercase">Campaigns</div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Plan & Usage</h4>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-slate-500">Plan</span>
                  <span className="font-semibold text-slate-800">{detail.subscriptionPlan}</span>
                </div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-slate-500">AI minutes</span>
                  <span className="font-semibold text-slate-800">{detail.aiMinutesUsed}</span>
                </div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-slate-500">AI voice cost</span>
                  <span className="font-semibold text-slate-800">{formatInr(detail.totalCostInr)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Signed up</span>
                  <span className="text-slate-600">{new Date(detail.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Team</h4>
                <div className="space-y-2">
                  {detail.members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium text-slate-700">{m.name}</span>
                        <span className="text-slate-400 ml-2 text-xs">{m.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {!m.hasAccount && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">invited</span>}
                        <span className="text-xs text-slate-500">{m.role}</span>
                      </div>
                    </div>
                  ))}
                  {detail.members.length === 0 && <p className="text-xs text-slate-400">No team members.</p>}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5"><PhoneCall className="h-3.5 w-3.5" /> Recent Calls</h4>
                <div className="space-y-2">
                  {detail.recentCalls.map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">{c.callerNumber || 'Unknown'} · {c.agentName}</span>
                      <span className="text-slate-400">{c.durationSeconds}s · {formatInr(callCostInr(c.durationSeconds))} · {new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                  {detail.recentCalls.length === 0 && <p className="text-xs text-slate-400">No calls yet.</p>}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5"><ScrollText className="h-3.5 w-3.5" /> Recent Activity</h4>
                <div className="space-y-2">
                  {detail.recentActivity.map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">{a.action}</span>
                      <span className="text-slate-400">{new Date(a.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                  {detail.recentActivity.length === 0 && <p className="text-xs text-slate-400">No activity yet.</p>}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5" /> Virtual Numbers
                    {numbersLoading && <Loader2 className="h-3 w-3 animate-spin ml-1 text-slate-400" />}
                  </h4>
                  <button
                    onClick={() => setAddNumberForm(v => !v)}
                    className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                  >
                    {addNumberForm ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                    {addNumberForm ? 'Cancel' : 'Add'}
                  </button>
                </div>
                {addNumberForm && (
                  <div className="mb-3 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        placeholder="Phone number (E.164)"
                        value={newNum.number}
                        onChange={e => setNewNum(f => ({ ...f, number: e.target.value }))}
                        className="col-span-2 text-xs border border-slate-200 rounded-lg px-2 py-1.5 font-mono"
                      />
                      <select
                        value={newNum.provider}
                        onChange={e => setNewNum(f => ({ ...f, provider: e.target.value }))}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1.5"
                      >
                        <option>Twilio</option>
                        <option>Vobiz.ai</option>
                        <option>TeleCMI</option>
                      </select>
                    </div>
                    <input
                      placeholder="Label (optional)"
                      value={newNum.friendlyName}
                      onChange={e => setNewNum(f => ({ ...f, friendlyName: e.target.value }))}
                      className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5"
                    />
                    <button
                      onClick={handleAddNumber}
                      disabled={numBusy || !newNum.number.trim()}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {numBusy ? 'Adding…' : 'Add Number'}
                    </button>
                  </div>
                )}
                {numbers.length === 0 && !numbersLoading && (
                  <p className="text-xs text-slate-400">No virtual numbers registered.</p>
                )}
                <div className="space-y-2">
                  {numbers.map(n => (
                    <div key={n.id} className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono font-medium text-slate-700">{n.number}</span>
                        {n.friendlyName && <span className="text-slate-400 ml-2">{n.friendlyName}</span>}
                        <span className="ml-2 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{n.provider}</span>
                      </div>
                      <button onClick={() => handleDeleteNumber(n.id)} className="text-rose-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                  <ToggleRight className="h-3.5 w-3.5" /> Feature Access
                  {flagsBusy && <Loader2 className="h-3 w-3 animate-spin ml-1 text-slate-400" />}
                </h4>
                <p className="text-[10px] text-slate-400 mb-3">Toggle which app modules this org can access. Org admins can further distribute enabled features to their team.</p>
                <div className="space-y-2">
                  {FEATURE_REGISTRY.map((f) => {
                    const on = enabledFlags.includes(f.key);
                    return (
                      <div key={f.key} className="flex items-center justify-between gap-3">
                        <div>
                          <p className={`text-xs font-medium ${on ? 'text-slate-700' : 'text-slate-400'}`}>{f.label}</p>
                          <p className="text-[10px] text-slate-400">{f.description}</p>
                        </div>
                        <button
                          onClick={() => toggleFlag(f.key)}
                          disabled={flagsBusy}
                          className="shrink-0 disabled:opacity-50"
                          title={on ? 'Disable' : 'Enable'}
                        >
                          {on
                            ? <ToggleRight className="h-5 w-5 text-amber-500" />
                            : <ToggleLeft className="h-5 w-5 text-slate-300" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </SlideOver>

    {/* Delete confirmation modal */}
    {deleteModal && detail && (
      <Modal open onClose={() => setDeleteModal(false)} maxWidth="max-w-md" zIndex="z-[400]">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Delete organization</h3>
              <p className="text-slate-500 text-xs mt-0.5">This permanently deletes all data and cannot be undone.</p>
            </div>
          </div>

          <p className="text-xs text-slate-600 mb-3">
            Type <strong className="font-mono text-slate-900">{detail.name}</strong> to confirm:
          </p>
          <input
            ref={deleteInputRef}
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleDelete()}
            placeholder={detail.name}
            className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-rose-500"
          />

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setDeleteModal(false)}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteConfirm !== detail.name}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Delete permanently
            </button>
          </div>
        </div>
      </Modal>
    )}
    </>
  );
}
