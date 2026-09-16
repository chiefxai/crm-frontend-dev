import React, { useEffect, useState } from 'react';
import { UserPlus, Plus, Edit, Trash2, ArrowRightCircle, Phone, Mail } from 'lucide-react';
import { Prospect } from '../types';
import { apiFetch } from '../lib/api';
import { formatPhone } from '../lib/phone';
import PageShell from './ui/PageShell';
import Widget from './ui/Widget';
import Modal from './ui/Modal';
import Badge from './ui/Badge';
import EmptyState from './ui/EmptyState';
import DataTable, { Column } from './ui/DataTable';

// Leads = raw/unqualified prospects, a pipeline stage BEFORE a real
// Contact exists (Contact Directory's data, confusingly also called
// "leads" at the API/DB layer — see types.ts's Prospect interface for the
// full disambiguation). This page owns its own data directly against
// /api/prospects (fetch + immediate per-action mutation) rather than the
// local-array + periodic-full-sync pattern Contact Directory uses for
// "leads" — that pattern's blanket delete-and-reinsert on every sync was
// the exact root cause of a real data-loss bug fixed earlier in this
// project (see db.replaceLeads's history); a brand-new page has no reason
// to inherit that risk when simple CRUD calls work just as well here.
const STATUS_COLOR: Record<Prospect['status'], 'blue' | 'amber' | 'green' | 'rose' | 'slate'> = {
  New: 'blue',
  Contacted: 'amber',
  Qualified: 'green',
  Disqualified: 'rose',
  Converted: 'slate',
};

interface FormState {
  name: string;
  phone: string;
  email: string;
  source: string;
  notes: string;
}
const EMPTY_FORM: FormState = { name: '', phone: '', email: '', source: 'Manual Entry', notes: '' };

export default function LeadsView() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    apiFetch('/api/prospects')
      .then((r) => (r.ok ? r.json() : []))
      .then((result: Prospect[] | null) => setProspects(Array.isArray(result) ? result : []))
      .catch((err) => console.error('Failed to load leads:', err))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const openAdd = () => { setEditingId(null); setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (p: Prospect) => {
    setEditingId(p.id);
    setForm({ name: p.name, phone: p.phone, email: p.email || '', source: p.source, notes: p.notes || '' });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        const res = await apiFetch(`/api/prospects/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(), source: form.source.trim(), notes: form.notes.trim() }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to update lead');
      } else {
        const res = await apiFetch('/api/prospects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(), source: form.source.trim() || 'Manual Entry', notes: form.notes.trim() }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to add lead');
      }
      setModalOpen(false);
      load();
    } catch (err: any) {
      alert(err.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this lead? This cannot be undone.')) return;
    const previous = prospects;
    setProspects(prospects.filter((p) => p.id !== id));
    const res = await apiFetch(`/api/prospects/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      alert('Failed to delete — restoring.');
      setProspects(previous);
    }
  };

  const [convertingId, setConvertingId] = useState<string | null>(null);
  const handleConvert = async (p: Prospect) => {
    if (!confirm(`Convert "${p.name}" into a full contact? This creates a new Contact Directory entry.`)) return;
    setConvertingId(p.id);
    try {
      const res = await apiFetch(`/api/prospects/${p.id}/convert`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to convert lead');
      load();
    } catch (err: any) {
      alert(err.message || 'Something went wrong.');
    } finally {
      setConvertingId(null);
    }
  };

  const columns: Column<Prospect>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (p) => (
        <div>
          <p className="font-semibold text-slate-800 dark:text-[var(--text-primary)]">{p.name}</p>
          <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-400 dark:text-[var(--text-muted)]">
            <Phone className="h-3 w-3" /> {formatPhone(p.phone) || p.phone}
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      cell: (p) => p.email
        ? <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-[var(--text-secondary)]"><Mail className="h-3 w-3" /> {p.email}</span>
        : <span className="text-slate-300 italic text-xs">—</span>,
    },
    { key: 'source', header: 'Source', cell: (p) => <span className="text-xs text-slate-500 dark:text-[var(--text-secondary)]">{p.source}</span> },
    { key: 'status', header: 'Status', cell: (p) => <Badge color={STATUS_COLOR[p.status]}>{p.status}</Badge> },
    { key: 'notes', header: 'Notes', cell: (p) => p.notes ? <span className="text-xs text-slate-500 italic line-clamp-1">{p.notes}</span> : <span className="text-slate-300 italic text-xs">—</span> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (p) => (
        <div className="flex items-center justify-end gap-1.5">
          {p.status !== 'Converted' && (
            <button
              onClick={() => handleConvert(p)}
              disabled={convertingId === p.id}
              className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 disabled:opacity-50 px-2 py-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/10 cursor-pointer"
              title="Convert to a full Contact"
            >
              <ArrowRightCircle className="h-3.5 w-3.5" /> {convertingId === p.id ? 'Converting…' : 'Convert'}
            </button>
          )}
          <button onClick={() => openEdit(p)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-[var(--bg-subtle)] cursor-pointer" title="Edit">
            <Edit className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => handleDelete(p.id)} className="text-rose-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer" title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <PageShell
      title="Leads"
      subtitle="Raw, unqualified prospects — convert one into a full Contact once it's worth pursuing."
      onRefresh={load}
      layout="fill"
    >
      <div className="flex-1 flex flex-col overflow-hidden px-8 pb-8 pt-6">
        <Widget
          className="flex-1"
          showHeader
          title="Leads"
          icon={UserPlus}
          accent="#2563eb"
          padding="none"
          action={
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Add Lead
            </button>
          }
        >
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400 text-sm">Loading…</div>
          ) : prospects.length === 0 ? (
            <EmptyState icon={UserPlus} heading="No leads yet" message='Click "Add Lead" to log a raw prospect before it becomes a full contact.' />
          ) : (
            <DataTable bare resizable paginated columns={columns} rows={prospects} rowKey={(p) => p.id} />
          )}
        </Widget>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Lead' : 'Add Lead'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Name</label>
            <input
              type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Phone</label>
              <input
                type="text" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email <span className="text-slate-400 font-normal">(optional)</span></label>
              <input
                type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Source</label>
            <input
              type="text" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
              placeholder="e.g. Website, Facebook, Referral"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Notes <span className="text-slate-400 font-normal">(optional)</span></label>
            <textarea
              rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
            />
          </div>
          <div className="flex justify-end pt-1">
            <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-semibold rounded-xl px-6 py-2.5 transition-all cursor-pointer shadow-sm">
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Lead'}
            </button>
          </div>
        </form>
      </Modal>
    </PageShell>
  );
}
