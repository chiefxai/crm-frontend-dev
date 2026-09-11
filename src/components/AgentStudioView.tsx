import React, { useEffect, useRef, useState } from 'react';
import {
  Sparkles, Send, Loader2, Mic, Check, Plus, Trash2, Edit2,
  Phone, PhoneOff, Bot, ChevronDown, Globe, Zap,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import PageShell from './ui/PageShell';
import Widget from './ui/Widget';
import Modal from './ui/Modal';

// ─── Types ───────────────────────────────────────────────────────────────────

interface VirtualNumber {
  id: string;
  number: string;
  friendly_name?: string;
  provider?: string;
  agent_id?: string | null;
}

interface Agent {
  id: string;
  name: string;
  systemPrompt?: string;
  activeVoice: string;
  emotion: number;
  speed: number;
  friendliness: number;
  language: string;
  assignedNumber?: VirtualNumber | null;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const VOICES = ['Arjun', 'Priya', 'Dev', 'Kavya'];
const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'ta', label: 'Tamil' },
  { value: 'hi', label: 'Hindi' },
  { value: 'te', label: 'Telugu' },
  { value: 'kn', label: 'Kannada' },
  { value: 'ml', label: 'Malayalam' },
];
const PRESETS = ['Tanglish', 'Support', 'Sales'];

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-slate-600">{label}</label>
        <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{value}</span>
      </div>
      <input
        type="range" min={0} max={100} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-indigo-600 h-1.5"
      />
      <div className="flex justify-between text-[10px] text-slate-400 mt-1">
        <span>0</span><span>50</span><span>100</span>
      </div>
    </div>
  );
}

function emptyForm(): Omit<Agent, 'id'> {
  return {
    name: '',
    systemPrompt: '',
    activeVoice: 'Arjun',
    emotion: 78,
    speed: 52,
    friendliness: 82,
    language: 'en',
    assignedNumber: null,
  };
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AgentStudioView() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [numbers, setNumbers] = useState<VirtualNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Omit<Agent, 'id'>>(emptyForm());
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [applyingPreset, setApplyingPreset] = useState<string | null>(null);

  // Preview
  const [previewMessage, setPreviewMessage] = useState('Hi, I wanted to check on my order status.');
  const [previewReply, setPreviewReply] = useState('');
  const [previewing, setPreviewing] = useState(false);

  const savedRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [agentsRes, numsRes] = await Promise.all([
        apiFetch('/api/agents').then(r => r.json()),
        apiFetch('/api/settings/numbers').then(r => r.json()),
      ]);
      setAgents(Array.isArray(agentsRes) ? agentsRes : []);
      setNumbers(Array.isArray(numsRes) ? numsRes : []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const freeNumbers = (editingId: string | null) =>
    numbers.filter(n => !n.agent_id || n.agent_id === editingId);

  const openCreate = () => {
    setForm(emptyForm());
    setCreating(true);
    setEditingAgent(null);
    setSaveStatus('idle');
    setPreviewReply('');
  };

  const openEdit = (agent: Agent) => {
    setForm({
      name: agent.name,
      systemPrompt: agent.systemPrompt ?? '',
      activeVoice: agent.activeVoice,
      emotion: agent.emotion,
      speed: agent.speed,
      friendliness: agent.friendliness,
      language: agent.language,
      assignedNumber: agent.assignedNumber ?? null,
    });
    setEditingAgent(agent);
    setCreating(false);
    setSaveStatus('idle');
    setPreviewReply('');
  };

  const closeForm = () => { setCreating(false); setEditingAgent(null); };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaveStatus('saving');
    try {
      let saved: Agent;
      if (creating) {
        const res = await apiFetch('/api/agents', {
          method: 'POST',
          body: JSON.stringify({
            name: form.name, systemPrompt: form.systemPrompt,
            activeVoice: form.activeVoice, emotion: form.emotion,
            speed: form.speed, friendliness: form.friendliness, language: form.language,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Create failed');
        saved = await res.json();
      } else if (editingAgent) {
        const res = await apiFetch(`/api/agents/${editingAgent.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: form.name, systemPrompt: form.systemPrompt,
            activeVoice: form.activeVoice, emotion: form.emotion,
            speed: form.speed, friendliness: form.friendliness, language: form.language,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Update failed');
        saved = await res.json();
      } else return;

      const wantedNumberId = form.assignedNumber?.id ?? null;
      const currentNumberId = editingAgent?.assignedNumber?.id ?? null;
      if (wantedNumberId !== currentNumberId) {
        await apiFetch(`/api/agents/${saved.id}/assign-number`, {
          method: 'PUT',
          body: JSON.stringify({ numberId: wantedNumberId }),
        });
      }

      setSaveStatus('saved');
      if (savedRef.current) clearTimeout(savedRef.current);
      savedRef.current = setTimeout(() => setSaveStatus('idle'), 1500);
      await loadData();
      closeForm();
    } catch (err: any) {
      setSaveStatus('error');
      alert(err.message || 'Save failed');
    }
  };

  const handleDelete = async (agentId: string) => {
    if (!confirm('Delete this agent? Any assigned phone number will be unlinked.')) return;
    setDeletingId(agentId);
    try {
      await apiFetch(`/api/agents/${agentId}`, { method: 'DELETE' });
      await loadData();
      if (editingAgent?.id === agentId) closeForm();
    } finally { setDeletingId(null); }
  };

  const handleApplyPreset = async (presetName: string) => {
    setApplyingPreset(presetName);
    try {
      const res = await apiFetch('/api/config/preset', {
        method: 'POST',
        body: JSON.stringify({ name: presetName }),
      });
      if (res.ok) {
        const data = await res.json();
        setForm(f => ({ ...f, systemPrompt: data.systemPrompt ?? f.systemPrompt }));
      }
    } finally { setApplyingPreset(null); }
  };

  const handlePreview = async () => {
    if (!previewMessage.trim()) return;
    setPreviewing(true);
    setPreviewReply('');
    const res = await apiFetch('/api/config/preview', {
      method: 'POST',
      body: JSON.stringify({ message: previewMessage }),
    });
    setPreviewing(false);
    if (res.ok) setPreviewReply((await res.json()).reply);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  const isModalOpen = creating || !!editingAgent;
  const assignableNumbers = freeNumbers(editingAgent?.id ?? null);

  return (
    <PageShell
      title="Agent Studio"
      subtitle="Create AI calling agents — each with its own voice, persona, and phone number."
      action={
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> New Agent
        </button>
      }
    >
      {/* ── Agent list ── */}
      <div className="col-span-12">
        <Widget colSpan={12} showHeader={false} padding="none">
          {agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-16 w-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
                <Bot className="h-8 w-8 text-indigo-400" />
              </div>
              <p className="text-sm font-semibold text-slate-600">No agents yet</p>
              <p className="text-xs text-slate-400 mt-1.5 max-w-xs">
                Create an agent with its own voice and persona, then assign a phone number so it handles calls on that line.
              </p>
              <button
                onClick={openCreate}
                className="mt-5 px-5 py-2.5 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
              >
                Create your first agent
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 divide-x divide-y divide-slate-100">
              {agents.map(agent => (
                <div key={agent.id} className="p-5 hover:bg-[var(--bg-subtle)] transition-colors group">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-sm">
                        <Bot className="h-5 w-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{agent.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {LANGUAGES.find(l => l.value === agent.language)?.label ?? agent.language} · {agent.activeVoice}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => openEdit(agent)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(agent.id)}
                        disabled={deletingId === agent.id}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        {deletingId === agent.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">E {agent.emotion}</span>
                    <span className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">S {agent.speed}</span>
                    <span className="text-[10px] font-semibold bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full">F {agent.friendliness}</span>
                  </div>

                  {/* Number */}
                  {agent.assignedNumber ? (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-xl">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {agent.assignedNumber.number}
                      {agent.assignedNumber.friendly_name && (
                        <span className="text-emerald-500 font-normal">· {agent.assignedNumber.friendly_name}</span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl">
                      <PhoneOff className="h-3 w-3" /> No number assigned
                    </div>
                  )}

                  <button
                    onClick={() => openEdit(agent)}
                    className="mt-3 w-full text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 py-1.5 rounded-lg transition-colors border border-indigo-100"
                  >
                    Edit Agent
                  </button>
                </div>
              ))}
            </div>
          )}
        </Widget>
      </div>

      {/* ── Agent create / edit modal ── */}
      <Modal
        open={isModalOpen}
        onClose={closeForm}
        title={creating ? 'Create New Agent' : `Edit Agent`}
        subtitle={creating
          ? 'Configure your agent\'s voice, persona, and phone number.'
          : `Editing ${editingAgent?.name ?? ''} — changes save when you click Save.`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-6">

          {/* Agent Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Agent Name</label>
            <input
              autoFocus
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Sales Agent, Support Bot, Loan Advisor"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
            />
          </div>

          <div className="border-t border-slate-100" />

          {/* Voice & Language */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Mic className="h-4 w-4 text-violet-500" />
              <p className="text-xs font-semibold text-slate-700 uppercase tracking-widest">Voice & Language</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">Voice</label>
                <div className="flex gap-2 flex-wrap">
                  {VOICES.map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, activeVoice: v }))}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-xl border-2 transition-all cursor-pointer ${
                        form.activeVoice === v
                          ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">Language</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <select
                    value={form.language}
                    onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                    className="w-full pl-8 pr-8 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 appearance-none bg-slate-50"
                  >
                    {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100" />

          {/* Delivery sliders */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-blue-500" />
              <p className="text-xs font-semibold text-slate-700 uppercase tracking-widest">Delivery</p>
            </div>
            <div className="grid grid-cols-3 gap-6">
              <Slider label="Emotion" value={form.emotion} onChange={v => setForm(f => ({ ...f, emotion: v }))} />
              <Slider label="Speed" value={form.speed} onChange={v => setForm(f => ({ ...f, speed: v }))} />
              <Slider label="Friendliness" value={form.friendliness} onChange={v => setForm(f => ({ ...f, friendliness: v }))} />
            </div>
          </div>

          <div className="border-t border-slate-100" />

          {/* System Prompt */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-widest">System Prompt</p>
              </div>
              {/* Presets */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 mr-1">Presets:</span>
                {PRESETS.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    disabled={applyingPreset !== null}
                    className="text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 disabled:opacity-50 cursor-pointer transition-colors"
                  >
                    {applyingPreset === p ? '…' : p}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={form.systemPrompt}
              onChange={e => setForm(f => ({ ...f, systemPrompt: e.target.value }))}
              rows={5}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-mono text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all resize-none"
              placeholder="Write the agent's system prompt here, or apply a preset above…"
            />
          </div>

          <div className="border-t border-slate-100" />

          {/* Phone number */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Phone className="h-4 w-4 text-emerald-500" />
              <p className="text-xs font-semibold text-slate-700 uppercase tracking-widest">Phone Number</p>
            </div>
            <div className="relative">
              <select
                value={form.assignedNumber?.id ?? ''}
                onChange={e => {
                  const id = e.target.value;
                  const num = id ? numbers.find(n => n.id === id) ?? null : null;
                  setForm(f => ({ ...f, assignedNumber: num }));
                }}
                className="w-full pr-8 pl-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 appearance-none bg-slate-50"
              >
                <option value="">— No number assigned —</option>
                {assignableNumbers.map(n => (
                  <option key={n.id} value={n.id}>
                    {n.number}{n.friendly_name ? ` · ${n.friendly_name}` : ''}{n.provider ? ` (${n.provider})` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
            {numbers.length === 0 && (
              <p className="text-[11px] text-slate-400 mt-2">No virtual numbers yet. Add one in Settings → Virtual Numbers.</p>
            )}
            {numbers.length > 0 && assignableNumbers.length === 0 && (
              <p className="text-[11px] text-amber-600 mt-2">All virtual numbers are already assigned to other agents.</p>
            )}
          </div>

          <div className="border-t border-slate-100" />

          {/* Live preview */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Send className="h-4 w-4 text-indigo-500" />
              <p className="text-xs font-semibold text-slate-700 uppercase tracking-widest">Live Preview</p>
            </div>
            <div className="flex gap-2">
              <input
                value={previewMessage}
                onChange={e => setPreviewMessage(e.target.value)}
                placeholder="Type what a customer might say…"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={handlePreview}
                disabled={previewing}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition-colors shrink-0"
              >
                {previewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                {previewing ? 'Generating…' : 'Preview'}
              </button>
            </div>
            {previewReply && (
              <div className="mt-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-sm text-indigo-900">
                {previewReply}
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeForm}
              className="text-sm text-slate-500 hover:text-slate-700 font-medium px-4 py-2.5 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!form.name.trim() || saveStatus === 'saving'}
              className={`flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-xl shadow-sm transition-all disabled:opacity-60 ${
                saveStatus === 'saved'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {saveStatus === 'saving' && <Loader2 className="h-4 w-4 animate-spin" />}
              {saveStatus === 'saved' && <Check className="h-4 w-4" />}
              {saveStatus === 'saved' ? 'Saved!' : saveStatus === 'saving' ? 'Saving…' : creating ? 'Create Agent' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
