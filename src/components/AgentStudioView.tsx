import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Send, Loader2, Mic, Check } from 'lucide-react';
import { apiFetch } from '../lib/api';
import PageShell from './ui/PageShell';
import Widget from './ui/Widget';
import Button from './ui/Button';

interface AgentConfig {
  activeVoice: string;
  emotion: number;
  speed: number;
  friendliness: number;
  systemPrompt: string;
}

type SaveStatus = 'idle' | 'saving' | 'saved';

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
        <span className="text-xs font-mono text-slate-400">{value}</span>
      </div>
      <input type="range" min={0} max={100} value={value} onChange={e => onChange(Number(e.target.value))} className="w-full accent-indigo-600" />
    </div>
  );
}

export default function AgentStudioView() {
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [voices, setVoices] = useState<string[]>([]);
  const [presets, setPresets] = useState<string[]>([]);
  const [industry, setIndustry] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [applyingPreset, setApplyingPreset] = useState<string | null>(null);
  const [previewMessage, setPreviewMessage] = useState('Hi, I wanted to check on my order status.');
  const [previewReply, setPreviewReply] = useState('');
  const [previewing, setPreviewing] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedIndicatorRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/config').then(r => r.json()),
      apiFetch('/api/config/presets').then(r => r.json()),
    ]).then(([cfg, meta]) => {
      setConfig(cfg);
      setVoices(meta.voices || []);
      setPresets(meta.presets || []);
      setIndustry(meta.industry || null);
    }).finally(() => setLoading(false));
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedIndicatorRef.current) clearTimeout(savedIndicatorRef.current);
    };
  }, []);

  const persist = async (next: AgentConfig) => {
    setSaveStatus('saving');
    try {
      const res = await apiFetch('/api/config', { method: 'POST', body: JSON.stringify(next) });
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
      setConfig(await res.json());
      setSaveStatus('saved');
      if (savedIndicatorRef.current) clearTimeout(savedIndicatorRef.current);
      savedIndicatorRef.current = setTimeout(() => setSaveStatus('idle'), 1500);
    } catch (err: any) { setSaveStatus('idle'); alert(err.message || 'Failed to save'); }
  };

  const updateConfigNow = (patch: Partial<AgentConfig>) => {
    if (!config) return;
    const next = { ...config, ...patch };
    setConfig(next);
    persist(next);
  };

  const updateConfigDebounced = (patch: Partial<AgentConfig>) => {
    if (!config) return;
    const next = { ...config, ...patch };
    setConfig(next);
    setSaveStatus('saving');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => persist(next), 600);
  };

  const handleApplyPreset = async (name: string) => {
    setApplyingPreset(name);
    const res = await apiFetch('/api/config/preset', { method: 'POST', body: JSON.stringify({ name }) });
    setApplyingPreset(null);
    if (res.ok) setConfig(await res.json());
    else alert((await res.json()).error || 'Failed to apply preset');
  };

  const handleApplyIndustryPreset = async () => {
    setApplyingPreset('__industry__');
    const res = await apiFetch('/api/config/preset/industry', { method: 'POST' });
    setApplyingPreset(null);
    if (res.ok) setConfig(await res.json());
    else alert((await res.json()).error || 'Failed to apply industry preset');
  };

  const handlePreview = async () => {
    if (!previewMessage.trim()) return;
    setPreviewing(true);
    setPreviewReply('');
    const res = await apiFetch('/api/config/preview', { method: 'POST', body: JSON.stringify({ message: previewMessage }) });
    setPreviewing(false);
    if (res.ok) setPreviewReply((await res.json()).reply);
    else alert((await res.json()).error || 'Preview failed');
  };

  if (loading || !config) return <div className="flex items-center justify-center h-full text-slate-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>;

  const saveIndicator = saveStatus === 'saving'
    ? <span className="flex items-center gap-1 text-xs text-slate-400"><Loader2 className="h-3 w-3 animate-spin" /> Saving…</span>
    : saveStatus === 'saved'
    ? <span className="flex items-center gap-1 text-xs text-emerald-500"><Check className="h-3 w-3" /> Saved</span>
    : null;

  return (
    <PageShell title="Agent Studio" subtitle="Tune your AI agent's voice, tone, and script — changes apply to this organization only." action={saveIndicator ?? undefined}>
      {/* Left col: config controls */}
      <div className="col-span-12 lg:col-span-6 space-y-5">
        {/* Voice selector */}
        <Widget colSpan={12} title="Voice" subtitle="Select the voice your AI agent will use on calls." icon={Mic} accent="#7c3aed" padding="md">
          <div className="flex gap-2 flex-wrap mt-1">
            {voices.map(v => (
              <button key={v} onClick={() => updateConfigNow({ activeVoice: v })}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${config.activeVoice === v ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                {v}
              </button>
            ))}
          </div>
        </Widget>

        {/* Starting presets */}
        <Widget colSpan={12} title="Starting Point" subtitle="Apply a persona preset or let the AI match your industry." icon={Sparkles} accent="#f59e0b" padding="md">
          {industry && (
            <button onClick={handleApplyIndustryPreset} disabled={applyingPreset !== null}
              className="w-full mb-3 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 cursor-pointer">
              <Sparkles className="h-3.5 w-3.5" />
              {applyingPreset === '__industry__' ? 'Generating…' : `Match My Industry & Company (${industry.replace('_', ' ')})`}
            </button>
          )}
          <div className="flex gap-2 flex-wrap">
            {presets.map(p => (
              <button key={p} onClick={() => handleApplyPreset(p)} disabled={applyingPreset !== null}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 cursor-pointer">
                {applyingPreset === p ? 'Applying…' : p}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Every change auto-saves. "Match My Industry" re-applies when you update company details.</p>
        </Widget>

        {/* Delivery sliders */}
        <Widget colSpan={12} title="Delivery" subtitle="Adjust emotion, speed, and friendliness." accent="#2563eb" padding="md">
          <div className="space-y-4 mt-1">
            <Slider label="Emotion" value={config.emotion} onChange={v => updateConfigDebounced({ emotion: v })} />
            <Slider label="Speed" value={config.speed} onChange={v => updateConfigDebounced({ speed: v })} />
            <Slider label="Friendliness" value={config.friendliness} onChange={v => updateConfigDebounced({ friendliness: v })} />
          </div>
        </Widget>

        {/* Script */}
        <Widget colSpan={12} title="Script / System Prompt" subtitle="Instructions that define how the agent thinks and responds." accent="#64748b" padding="md">
          <textarea
            value={config.systemPrompt}
            onChange={e => updateConfigDebounced({ systemPrompt: e.target.value })}
            rows={10}
            className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </Widget>
      </div>

      {/* Right col: live preview */}
      <div className="col-span-12 lg:col-span-6">
        <Widget colSpan={12} title="Live Text Preview" subtitle="Type a sample message and see how the current persona would reply — no real call sent." icon={Send} accent="#10b981" padding="md" className="sticky top-4">
          <textarea
            value={previewMessage}
            onChange={e => setPreviewMessage(e.target.value)}
            rows={2}
            className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm mb-2"
            placeholder="Type what a customer might say…"
          />
          <Button icon={Send} variant="primary" size="sm" loading={previewing} onClick={handlePreview}>Preview reply</Button>
          {previewReply && (
            <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-900">
              {previewReply}
            </div>
          )}
        </Widget>
      </div>
    </PageShell>
  );
}
