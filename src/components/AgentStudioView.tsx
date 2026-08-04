import React, { useEffect, useState } from 'react';
import { Sparkles, Save, Send, Loader2, Mic } from 'lucide-react';
import { apiFetch } from '../lib/api';
import PageHeader from './PageHeader';

interface AgentConfig {
  activeVoice: string;
  emotion: number;
  speed: number;
  friendliness: number;
  systemPrompt: string;
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
        <span className="text-xs font-mono text-slate-400">{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-indigo-600"
      />
    </div>
  );
}

export default function AgentStudioView() {
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [voices, setVoices] = useState<string[]>([]);
  const [presets, setPresets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applyingPreset, setApplyingPreset] = useState<string | null>(null);

  const [previewMessage, setPreviewMessage] = useState('Hi, I wanted to check on my order status.');
  const [previewReply, setPreviewReply] = useState('');
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/config').then((r) => r.json()),
      apiFetch('/api/config/presets').then((r) => r.json())
    ]).then(([cfg, meta]) => {
      setConfig(cfg);
      setVoices(meta.voices || []);
      setPresets(meta.presets || []);
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    const res = await apiFetch('/api/config', { method: 'POST', body: JSON.stringify(config) });
    setSaving(false);
    if (res.ok) setConfig(await res.json());
    else alert((await res.json()).error || 'Failed to save');
  };

  const handleApplyPreset = async (name: string) => {
    setApplyingPreset(name);
    const res = await apiFetch('/api/config/preset', { method: 'POST', body: JSON.stringify({ name }) });
    setApplyingPreset(null);
    if (res.ok) setConfig(await res.json());
    else alert((await res.json()).error || 'Failed to apply preset');
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

  if (loading || !config) {
    return <div className="flex items-center justify-center h-full text-slate-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>;
  }

  return (
    <div className="font-sans h-full overflow-y-auto">
      <PageHeader
        title="Agent Studio"
        subtitle="Tune your AI agent's voice, tone, and script — changes apply to this organization only."
        action={
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
            <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save'}
          </button>
        }
      />

      <div className="px-8 pb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Mic className="h-3.5 w-3.5" /> Voice
            </h4>
            <div className="flex gap-2 flex-wrap">
              {voices.map((v) => (
                <button
                  key={v}
                  onClick={() => setConfig({ ...config, activeVoice: v })}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    config.activeVoice === v ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Starting Point
            </h4>
            <div className="flex gap-2 flex-wrap">
              {presets.map((p) => (
                <button
                  key={p}
                  onClick={() => handleApplyPreset(p)}
                  disabled={applyingPreset !== null}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  {applyingPreset === p ? 'Applying…' : p}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Applying a preset overwrites the script below — save afterward, or tweak it first.</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Delivery</h4>
            <Slider label="Emotion" value={config.emotion} onChange={(v) => setConfig({ ...config, emotion: v })} />
            <Slider label="Speed" value={config.speed} onChange={(v) => setConfig({ ...config, speed: v })} />
            <Slider label="Friendliness" value={config.friendliness} onChange={(v) => setConfig({ ...config, friendliness: v })} />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Script / System Prompt</h4>
            <textarea
              value={config.systemPrompt}
              onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
              rows={10}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 h-fit sticky top-0">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Live Text Preview</h4>
          <p className="text-[11px] text-slate-400 mb-3">Type a sample customer message and see how the current persona (as saved) would reply — no real call or message sent.</p>
          <textarea
            value={previewMessage}
            onChange={(e) => setPreviewMessage(e.target.value)}
            rows={2}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm mb-2"
            placeholder="Type what a customer might say…"
          />
          <button
            onClick={handlePreview}
            disabled={previewing}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-white text-xs font-semibold px-4 py-2 rounded-lg"
          >
            {previewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Preview reply
          </button>
          {previewReply && (
            <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-900">
              {previewReply}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
