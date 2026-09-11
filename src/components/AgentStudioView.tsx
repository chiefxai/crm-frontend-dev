import React, { useEffect, useRef, useState } from 'react';
import {
  Sparkles, Send, Loader2, Mic, Check, Plus, Trash2, Edit2,
  Phone, PhoneOff, Bot, X, ChevronDown, Globe,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import PageShell from './ui/PageShell';
import Widget from './ui/Widget';
import Modal from './ui/Modal';

// ─── Types ──────────────────────────────────────────────────────────────────

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
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
        <span className="text-xs font-mono text-slate-400">{value}</span>
      </div>
      <input
        type="range" min={0} max={100} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-indigo-600"
      />
    </div>
  );
}

// ─── Empty form state ────────────────────────────────────────────────────────

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

// ─── Main component ──────────────────────────────────────────────────────────

export default function AgentStudioView() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [numbers, setNumbers] = useState<VirtualNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Omit<Agent, 'id'>>(emptyForm());
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Preview
  const [previewMessage, setPreviewMessage] = useState('Hi, I wanted to check on my order status.');
  const [previewReply, setPreviewReply] = useState('');
  const [previewing, setPreviewing] = useState(false);

  // Preset loading
  const [applyingPreset, setApplyingPreset] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ── Derived: which numbers are free to assign ──────────────────────────────
  const freeNumbers = (editingId: string | null) =>
    numbers.filter(n => !n.agent_id || n.agent_id === editingId);

  // ── Open create form ───────────────────────────────────────────────────────
  const openCreate = () => {
    setForm(emptyForm());
    setCreating(true);
    setEditingAgent(null);
    setSaveStatus('idle');
    setPreviewReply('');
  };

  // ── Open edit form ─────────────────────────────────────────────────────────
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

  // ── Save (create or update) ────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaveStatus('saving');
    try {
      let saved: Agent;
      if (creating) {
        const res = await apiFetch('/api/agents', {
          method: 'POST',
          body: JSON.stringify({
            name: form.name,
            systemPrompt: form.systemPrompt,
            activeVoice: form.activeVoice,
            emotion: form.emotion,
            speed: form.speed,
            friendliness: form.friendliness,
            language: form.language,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Create failed');
        saved = await res.json();
      } else if (editingAgent) {
        const res = await apiFetch(`/api/agents/${editingAgent.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: form.name,
            systemPrompt: form.systemPrompt,
            activeVoice: form.activeVoice,
            emotion: form.emotion,
            speed: form.speed,
            friendliness: form.friendliness,
            language: form.language,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Update failed');
        saved = await res.json();
      } else return;

      // Assign / unassign phone number
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

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (agentId: string) => {
    if (!confirm('Delete this agent? Any assigned phone number will be unlinked.')) return;
    setDeletingId(agentId);
    try {
      await apiFetch(`/api/agents/${agentId}`, { method: 'DELETE' });
      await loadData();
      if (editingAgent?.id === agentId) closeForm();
    } finally {
      setDeletingId(null);
    }
  };

  // ── Apply preset (sets systemPrompt in the form) ──────────────────────────
  const handleApplyPreset = async (presetName: string) => {
    if (!editingAgent && !creating) return;
    setApplyingPreset(presetName);
    try {
      const agentId = editingAgent?.id;
      // Use the existing preview endpoint to get the preset prompt text from the server
      const res = await apiFetch('/api/config/preset', {
        method: 'POST',
        body: JSON.stringify({ name: presetName }),
      });
      if (res.ok) {
        const data = await res.json();
        setForm(f => ({ ...f, systemPrompt: data.systemPrompt ?? f.systemPrompt }));
      }
    } finally {
      setApplyingPreset(null);
    }
  };

  // ── Preview ────────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  const isEditing = creating || !!editingAgent;
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
      <div className="col-span-12 lg:col-span-5 space-y-3">
        <Widget colSpan={12} showHeader={false} padding="none">
          {agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
                <Bot className="h-7 w-7 text-indigo-400" />
              </div>
              <p className="text-sm font-semibold text-slate-600">No agents yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Create an agent with its own voice and persona, then assign a phone number so it handles calls on that line.
              </p>
              <button
                onClick={openCreate}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700"
              >
                Create your first agent
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {agents.map(agent => (
                <div
                  key={agent.id}
                  className={`p-5 cursor-pointer hover:bg-[var(--bg-subtle)] transition-colors ${editingAgent?.id === agent.id ? 'bg-indigo-50/60 border-l-2 border-indigo-500' : ''}`}
                  onClick={() => openEdit(agent)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="h-7 w-7 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                          <Bot className="h-4 w-4 text-indigo-600" />
                        </span>
                        <p className="text-sm font-bold text-slate-800 truncate">{agent.name}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mt-1.5 pl-9">
                        <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                          {agent.activeVoice}
                        </span>
                        <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                          {LANGUAGES.find(l => l.value === agent.language)?.label ?? agent.language}
                        </span>
                        {agent.assignedNumber ? (
                          <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Phone className="h-2.5 w-2.5" />
                            {agent.assignedNumber.number}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <PhoneOff className="h-2.5 w-2.5" /> No number
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); openEdit(agent); }}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(agent.id); }}
                        disabled={deletingId === agent.id}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {deletingId === agent.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Widget>
      </div>

      {/* ── Editor panel ── */}
      <div className="col-span-12 lg:col-span-7 space-y-5">
        {!isEditing ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-300 select-none">
            <Bot className="h-12 w-12 mb-3" />
            <p className="text-sm font-medium">Select an agent to edit or create a new one</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">
                {creating ? 'New Agent' : `Edit: ${editingAgent?.name}`}
              </h2>
              <button onClick={closeForm} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Name */}
            <Widget colSpan={12} title="Agent Name" padding="md">
              <input
                autoFocus
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Sales Agent, Support Bot, Loan Advisor"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </Widget>

            {/* Voice + Language */}
            <Widget colSpan={12} title="Voice & Language" icon={Mic} accent="#7c3aed" padding="md">
              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[140px]">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Voice</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {VOICES.map(v => (
                      <button
                        key={v}
                        onClick={() => setForm(f => ({ ...f, activeVoice: v }))}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                          form.activeVoice === v
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 min-w-[140px]">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Language</p>
                  <div className="relative">
                    <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    <select
                      value={form.language}
                      onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                      className="w-full pl-7 pr-8 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
                    >
                      {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </Widget>

            {/* Starting point */}
            <Widget colSpan={12} title="Starting Point" subtitle="Apply a persona preset to the system prompt." icon={Sparkles} accent="#f59e0b" padding="md">
              <div className="flex gap-2 flex-wrap">
                {PRESETS.map(p => (
                  <button
                    key={p}
                    onClick={() => handleApplyPreset(p)}
                    disabled={applyingPreset !== null}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                  >
                    {applyingPreset === p ? 'Applying…' : p}
                  </button>
                ))}
              </div>
            </Widget>

            {/* Delivery sliders */}
            <Widget colSpan={12} title="Delivery" subtitle="Adjust emotion, speed, and friendliness." accent="#2563eb" padding="md">
              <div className="space-y-4 mt-1">
                <Slider label="Emotion" value={form.emotion} onChange={v => setForm(f => ({ ...f, emotion: v }))} />
                <Slider label="Speed" value={form.speed} onChange={v => setForm(f => ({ ...f, speed: v }))} />
                <Slider label="Friendliness" value={form.friendliness} onChange={v => setForm(f => ({ ...f, friendliness: v }))} />
              </div>
            </Widget>

            {/* System prompt */}
            <Widget colSpan={12} title="System Prompt" subtitle="Instructions that define how this agent thinks and responds." accent="#64748b" padding="md">
              <textarea
                value={form.systemPrompt}
                onChange={e => setForm(f => ({ ...f, systemPrompt: e.target.value }))}
                rows={8}
                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Write the agent's system prompt here, or apply a starting point above…"
              />
            </Widget>

            {/* Phone number assignment */}
            <Widget colSpan={12} title="Phone Number" subtitle="Assign one virtual number to this agent. Only numbers not already in use are shown." icon={Phone} accent="#10b981" padding="md">
              <div className="relative">
                <select
                  value={form.assignedNumber?.id ?? ''}
                  onChange={e => {
                    const id = e.target.value;
                    const num = id ? numbers.find(n => n.id === id) ?? null : null;
                    setForm(f => ({ ...f, assignedNumber: num }));
                  }}
                  className="w-full pr-8 pl-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none bg-white"
                >
                  <option value="">— No number assigned —</option>
                  {assignableNumbers.map(n => (
                    <option key={n.id} value={n.id}>
                      {n.number}{n.friendly_name ? ` · ${n.friendly_name}` : ''}{n.provider ? ` (${n.provider})` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>
              {numbers.length === 0 && (
                <p className="text-[10px] text-slate-400 mt-2">
                  No virtual numbers yet. Add one in Settings → Administration → Virtual Numbers.
                </p>
              )}
              {numbers.length > 0 && assignableNumbers.length === 0 && (
                <p className="text-[10px] text-amber-600 mt-2">
                  All virtual numbers are already assigned to other agents.
                </p>
              )}
            </Widget>

            {/* Live preview */}
            <Widget colSpan={12} title="Live Text Preview" subtitle="Test how this agent would reply to a sample message." icon={Send} accent="#6366f1" padding="md">
              <textarea
                value={previewMessage}
                onChange={e => setPreviewMessage(e.target.value)}
                rows={2}
                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm mb-2"
                placeholder="Type what a customer might say…"
              />
              <button
                onClick={handlePreview}
                disabled={previewing}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
              >
                {previewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                {previewing ? 'Generating…' : 'Preview reply'}
              </button>
              {previewReply && (
                <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-900">
                  {previewReply}
                </div>
              )}
            </Widget>

            {/* Save / Cancel */}
            <div className="flex items-center justify-end gap-3 pb-4">
              <button onClick={closeForm} className="text-sm text-slate-400 hover:text-slate-600 font-medium px-3 py-2">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!form.name.trim() || saveStatus === 'saving'}
                className={`flex items-center gap-1.5 px-5 py-2 text-sm font-semibold rounded-xl transition-colors disabled:opacity-60 ${
                  saveStatus === 'saved'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {saveStatus === 'saving' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {saveStatus === 'saved' && <Check className="h-3.5 w-3.5" />}
                {saveStatus === 'saved' ? 'Saved!' : saveStatus === 'saving' ? 'Saving…' : creating ? 'Create Agent' : 'Save Changes'}
              </button>
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}
