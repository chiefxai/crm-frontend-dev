import React, { useEffect, useState } from 'react';
import { BookOpen, Plus, Trash2, Search, Loader2, X } from 'lucide-react';
import { apiFetch } from '../lib/api';
import PageHeader from './PageHeader';

interface KnowledgeDocument {
  id: string;
  title: string;
  chunkCount: number;
  createdAt: string;
}

interface SearchResult {
  content: string;
  documentTitle: string;
}

export default function KnowledgeBaseView() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const [testQuery, setTestQuery] = useState('');
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);

  const loadDocuments = () => {
    apiFetch('/api/knowledge/documents')
      .then((r) => r.json())
      .then((list: KnowledgeDocument[]) => setDocuments(Array.isArray(list) ? list : []))
      .finally(() => setLoading(false));
  };

  useEffect(loadDocuments, []);

  const handleAdd = async () => {
    if (!title.trim() || !text.trim()) return;
    setSaving(true);
    const res = await apiFetch('/api/knowledge/documents', { method: 'POST', body: JSON.stringify({ title, text }) });
    setSaving(false);
    if (res.ok) {
      setShowAdd(false);
      setTitle('');
      setText('');
      loadDocuments();
    } else {
      alert((await res.json()).error || 'Failed to add document');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document?')) return;
    const res = await apiFetch(`/api/knowledge/documents/${id}`, { method: 'DELETE' });
    if (res.ok) setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const handleTestSearch = async () => {
    if (!testQuery.trim()) return;
    setSearching(true);
    setResults(null);
    const res = await apiFetch('/api/knowledge/search', { method: 'POST', body: JSON.stringify({ query: testQuery }) });
    setSearching(false);
    if (res.ok) setResults(await res.json());
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full text-slate-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>;
  }

  return (
    <div className="font-sans h-full overflow-y-auto">
      <PageHeader
        title="Knowledge Base"
        subtitle="Documents your AI agent can search when answering calls, WhatsApp, and Instagram messages."
        action={
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-xl">
            <Plus className="h-4 w-4" /> Add Document
          </button>
        }
      />

      <div className="px-8 pb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" /> Documents
          </h4>
          {documents.length === 0 && <p className="text-xs text-slate-400">No documents yet. Add one to give your agent real facts to answer from.</p>}
          <div className="space-y-2">
            {documents.map((d) => (
              <div key={d.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2.5">
                <div>
                  <div className="text-sm font-medium text-slate-700">{d.title}</div>
                  <div className="text-[10px] text-slate-400">{d.chunkCount} chunk{d.chunkCount === 1 ? '' : 's'}</div>
                </div>
                <button onClick={() => handleDelete(d.id)} className="text-slate-300 hover:text-rose-500">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Search className="h-3.5 w-3.5" /> Test Search
          </h4>
          <p className="text-[11px] text-slate-400 mb-3">See exactly what your agent would retrieve for a question — no real call or message needed.</p>
          <div className="flex gap-2 mb-3">
            <input
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTestSearch()}
              placeholder="Ask a question…"
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
            <button onClick={handleTestSearch} disabled={searching} className="bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-white px-3 py-2 rounded-lg">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </button>
          </div>
          {results && (
            results.length === 0 ? (
              <p className="text-xs text-slate-400">No matches found.</p>
            ) : (
              <div className="space-y-2">
                {results.map((r, i) => (
                  <div key={i} className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-xs">
                    <div className="font-semibold text-indigo-700 mb-1">{r.documentTitle}</div>
                    <div className="text-indigo-900">{r.content}</div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Add Document</h3>
              <button onClick={() => setShowAdd(false)}><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Refund Policy" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Content</label>
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono" placeholder="Paste the document text here. Separate paragraphs with a blank line." />
              </div>
              <button onClick={handleAdd} disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-xl">
                {saving ? 'Saving…' : 'Add to Knowledge Base'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
