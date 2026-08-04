import React, { useEffect, useState } from 'react';
import { MessageCircle, Camera as IgIcon, Send, Settings, X, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { Channel, Conversation, ChatMessage } from '../lib/inbox';
import PageHeader from './PageHeader';

function ChannelIcon({ type, className }: { type: string; className?: string }) {
  return type === 'whatsapp'
    ? <MessageCircle className={className} />
    : <IgIcon className={className} />;
}

function ChannelSettingsModal({ channels, onClose, onSaved }: {
  channels: Channel[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const waChannel = channels.find((c) => c.type === 'whatsapp');
  const igChannel = channels.find((c) => c.type === 'instagram');

  const [waPhoneId, setWaPhoneId] = useState('');
  const [waToken, setWaToken] = useState('');
  const [waAutoReply, setWaAutoReply] = useState(waChannel?.config.aiAutoReply || false);
  const [igAccountId, setIgAccountId] = useState('');
  const [igToken, setIgToken] = useState('');
  const [igAutoReply, setIgAutoReply] = useState(igChannel?.config.aiAutoReply || false);
  const [saving, setSaving] = useState<'whatsapp' | 'instagram' | null>(null);
  const [error, setError] = useState('');

  const saveWhatsapp = async () => {
    if (!waPhoneId || !waToken) return;
    setSaving('whatsapp');
    setError('');
    const res = await apiFetch('/api/channels/whatsapp', {
      method: 'POST',
      body: JSON.stringify({ phoneNumberId: waPhoneId, accessToken: waToken, aiAutoReply: waAutoReply })
    });
    setSaving(null);
    if (res.ok) onSaved();
    else setError((await res.json()).error || 'Failed to save WhatsApp channel');
  };

  const saveInstagram = async () => {
    if (!igAccountId || !igToken) return;
    setSaving('instagram');
    setError('');
    const res = await apiFetch('/api/channels/instagram', {
      method: 'POST',
      body: JSON.stringify({ igBusinessAccountId: igAccountId, accessToken: igToken, aiAutoReply: igAutoReply })
    });
    setSaving(null);
    if (res.ok) onSaved();
    else setError((await res.json()).error || 'Failed to save Instagram channel');
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Connect Channels</h3>
          <button onClick={onClose}><X className="h-4 w-4 text-slate-400" /></button>
        </div>
        <div className="p-5 space-y-6">
          {error && <div className="text-xs text-rose-600 bg-rose-50 rounded-lg p-2">{error}</div>}

          <div className="border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-semibold text-slate-800">WhatsApp Cloud API</span>
              {waChannel && <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full ml-auto">Connected</span>}
            </div>
            <p className="text-[11px] text-slate-400 mb-3">From your Meta App Dashboard &gt; WhatsApp &gt; API Setup.</p>
            <input placeholder={waChannel ? `Current: ${waChannel.externalId}` : 'Phone Number ID'} value={waPhoneId} onChange={(e) => setWaPhoneId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm mb-2" />
            <input placeholder="Access Token" type="password" value={waToken} onChange={(e) => setWaToken(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm mb-2" />
            <label className="flex items-center gap-2 text-xs text-slate-500 mb-3">
              <input type="checkbox" checked={waAutoReply} onChange={(e) => setWaAutoReply(e.target.checked)} /> Let AI auto-reply to incoming messages
            </label>
            <button onClick={saveWhatsapp} disabled={saving === 'whatsapp'} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-medium py-2 rounded-lg">
              {saving === 'whatsapp' ? 'Saving…' : 'Save'}
            </button>
          </div>

          <div className="border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <IgIcon className="h-4 w-4 text-pink-600" />
              <span className="text-sm font-semibold text-slate-800">Instagram Messaging</span>
              {igChannel && <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full ml-auto">Connected</span>}
            </div>
            <p className="text-[11px] text-slate-400 mb-3">From your Meta App Dashboard &gt; Instagram &gt; connected professional account.</p>
            <input placeholder={igChannel ? `Current: ${igChannel.externalId}` : 'IG Business Account ID'} value={igAccountId} onChange={(e) => setIgAccountId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm mb-2" />
            <input placeholder="Access Token" type="password" value={igToken} onChange={(e) => setIgToken(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm mb-2" />
            <label className="flex items-center gap-2 text-xs text-slate-500 mb-3">
              <input type="checkbox" checked={igAutoReply} onChange={(e) => setIgAutoReply(e.target.checked)} /> Let AI auto-reply to incoming DMs
            </label>
            <button onClick={saveInstagram} disabled={saving === 'instagram'} className="w-full bg-pink-600 hover:bg-pink-500 disabled:opacity-60 text-white text-sm font-medium py-2 rounded-lg">
              {saving === 'instagram' ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UnifiedInboxView() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const loadAll = () => {
    Promise.all([
      apiFetch('/api/channels').then((r) => r.json()).catch(() => []),
      apiFetch('/api/conversations').then((r) => r.json()).catch(() => [])
    ]).then(([ch, conv]) => {
      setChannels(Array.isArray(ch) ? ch : []);
      setConversations(Array.isArray(conv) ? conv : []);
    }).finally(() => setLoading(false));
  };

  useEffect(loadAll, []);

  useEffect(() => {
    if (!selectedId) return;
    setMessagesLoading(true);
    apiFetch(`/api/conversations/${selectedId}/messages`)
      .then((r) => r.json())
      .then((list: ChatMessage[]) => setMessages(list))
      .catch(() => setMessages([]))
      .finally(() => setMessagesLoading(false));
  }, [selectedId]);

  const selectedConversation = conversations.find((c) => c.id === selectedId) || null;

  const handleSend = async () => {
    if (!replyText.trim() || !selectedId) return;
    setSending(true);
    const res = await apiFetch(`/api/conversations/${selectedId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text: replyText })
    });
    setSending(false);
    if (res.ok) {
      const sent = await res.json();
      setMessages((prev) => [...prev, sent]);
      setReplyText('');
    } else {
      const err = await res.json();
      alert(err.error || 'Failed to send message');
    }
  };

  const handleAnalyze = async () => {
    if (!selectedId) return;
    setAnalyzing(true);
    const res = await apiFetch(`/api/conversations/${selectedId}/analyze`, { method: 'POST' });
    setAnalyzing(false);
    if (res.ok) {
      const result = await res.json();
      setConversations((prev) => prev.map((c) => (c.id === selectedId ? { ...c, ...result } : c)));
    } else {
      const err = await res.json();
      alert(err.error || 'Failed to analyze conversation');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full text-slate-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>;
  }

  return (
    <div className="font-sans h-full flex flex-col">
      <PageHeader
        title="Unified Inbox"
        subtitle="WhatsApp and Instagram conversations in one place."
        action={
          <button onClick={() => setShowSettings(true)} className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-xl transition-colors">
            <Settings className="h-4 w-4" /> Channels
          </button>
        }
      />

      {channels.length === 0 && (
        <div className="mx-8 mb-4 bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
          No channels connected yet. Click <strong>Channels</strong> above to connect WhatsApp or Instagram.
        </div>
      )}

      <div className="flex-1 flex overflow-hidden px-8 pb-8 gap-4">
        <div className="w-72 shrink-0 bg-white border border-slate-200 rounded-2xl overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">No conversations yet.</div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors flex items-center gap-3 ${selectedId === c.id ? 'bg-blue-50' : ''}`}
              >
                <ChannelIcon type={c.channelType} className={`h-4 w-4 shrink-0 ${c.channelType === 'whatsapp' ? 'text-emerald-600' : 'text-pink-600'}`} />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{c.contactName || c.contactExternalId}</div>
                  <div className="text-[10px] text-slate-400">{new Date(c.lastMessageAt).toLocaleString()}</div>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="flex-1 bg-white border border-slate-200 rounded-2xl flex flex-col overflow-hidden">
          {!selectedConversation ? (
            <div className="flex-1 flex items-center justify-center text-sm text-slate-400">Select a conversation</div>
          ) : (
            <>
              <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                <ChannelIcon type={selectedConversation.channelType} className={`h-4 w-4 ${selectedConversation.channelType === 'whatsapp' ? 'text-emerald-600' : 'text-pink-600'}`} />
                <span className="text-sm font-semibold text-slate-800">{selectedConversation.contactName || selectedConversation.contactExternalId}</span>
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="ml-auto flex items-center gap-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-60 px-3 py-1.5 rounded-lg transition-colors"
                >
                  {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  AI Summary
                </button>
              </div>

              {selectedConversation.summary && (
                <div className="px-5 py-3 bg-indigo-50/50 border-b border-indigo-100 text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-indigo-900">Summary:</span>
                    <span className="text-indigo-800">{selectedConversation.summary}</span>
                    {selectedConversation.sentiment && (
                      <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        selectedConversation.sentiment === 'Positive' ? 'bg-emerald-100 text-emerald-700'
                        : selectedConversation.sentiment === 'Negative' ? 'bg-rose-100 text-rose-700'
                        : 'bg-slate-100 text-slate-600'
                      }`}>{selectedConversation.sentiment}</span>
                    )}
                  </div>
                  {selectedConversation.nextAction && (
                    <div className="text-indigo-700"><span className="font-semibold">Next step:</span> {selectedConversation.nextAction}</div>
                  )}
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {messagesLoading ? (
                  <div className="flex items-center text-slate-400 text-sm"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…</div>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${m.direction === 'outbound' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                        {m.body}
                        <div className={`text-[9px] mt-1 flex items-center gap-1 ${m.direction === 'outbound' ? 'text-blue-100' : 'text-slate-400'}`}>
                          {m.sender === 'ai' && <Bot className="h-2.5 w-2.5" />}
                          {m.sender === 'human' && <User className="h-2.5 w-2.5" />}
                          {new Date(m.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-4 border-t border-slate-100 flex gap-2">
                <input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Type a reply…"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button onClick={handleSend} disabled={sending} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white p-2.5 rounded-xl">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {showSettings && (
        <ChannelSettingsModal
          channels={channels}
          onClose={() => setShowSettings(false)}
          onSaved={() => { setShowSettings(false); loadAll(); }}
        />
      )}
    </div>
  );
}
