import React, { useState } from 'react';
import {
  GitBranch,
  Plus,
  Trash2,
  Edit2,
  ToggleRight,
  ToggleLeft,
  ChevronRight,
  ArrowLeft,
  Copy,
  X,
  Network,
  Variable,
  Braces,
  ClipboardCopy,
  Check,
} from 'lucide-react';
import { QuestionFlow, WorkflowVariable } from './types';
import QuestionFlowBuilder from './QuestionFlowBuilder';
import WorkflowVariables from './components/WorkflowVariables';
import PageShell from '../../components/ui/PageShell';
import Widget from '../../components/ui/Widget';
import Modal from '../../components/ui/Modal';

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function createDefaultFlow(name: string): QuestionFlow {
  return {
    id: uid('flow'),
    name,
    description: '',
    nodes: [],
    edges: [],
    active: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

interface WorkflowsViewProps {
  flows: QuestionFlow[];
  setFlows: React.Dispatch<React.SetStateAction<QuestionFlow[]>>;
}

export default function WorkflowsView({ flows, setFlows }: WorkflowsViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorView, setEditorView] = useState<'diagram' | 'variables' | 'json'>('diagram');
  const [jsonCopied, setJsonCopied] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const editingFlow = flows.find(f => f.id === editingId);

  const handleCreate = () => {
    if (!newName.trim()) return;
    const flow = createDefaultFlow(newName.trim());
    setFlows(prev => [...prev, flow]);
    setNewName('');
    setCreating(false);
    setEditingId(flow.id);
    setEditorView('variables'); // start on variables so user defines them first
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this workflow?')) return;
    setFlows(prev => prev.filter(f => f.id !== id));
  };

  const handleToggleActive = (id: string) => {
    setFlows(prev => prev.map(f => (f.id === id ? { ...f, active: !f.active } : f)));
  };

  const handleDuplicate = (flow: QuestionFlow) => {
    const copy: QuestionFlow = {
      ...flow,
      id: uid('flow'),
      name: `${flow.name} (copy)`,
      active: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setFlows(prev => [...prev, copy]);
  };

  const handleFlowChange = (updated: QuestionFlow) => {
    setFlows(prev => prev.map(f => (f.id === updated.id ? updated : f)));
  };

  if (editingFlow) {
    const VIEWS = [
      { id: 'diagram'   as const, label: 'Diagram',   icon: Network   },
      { id: 'variables' as const, label: 'Variables',  icon: Variable  },
      { id: 'json'      as const, label: 'JSON',       icon: Braces    },
    ];

    return (
      <PageShell
        title={editingFlow.name}
        subtitle="Design question nodes, conditional branches, and call routing logic."
        layout="fill"
        action={
          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex items-center rounded-xl p-0.5 gap-0.5" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
              {VIEWS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setEditorView(id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={editorView === id
                    ? id === 'json'
                      ? { background: '#d97706', color: '#ffffff' }
                      : { background: '#2563eb', color: '#ffffff' }
                    : { background: 'transparent', color: 'var(--text-secondary)' }
                  }
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                  {id === 'variables' && (editingFlow.variables ?? []).length > 0 && (
                    <span
                      className="ml-0.5 text-[10px] font-bold px-1.5 py-0 rounded-full"
                      style={editorView === 'variables'
                        ? { background: 'rgba(255,255,255,0.25)', color: '#fff' }
                        : { background: 'var(--border)', color: 'var(--text-muted)' }
                      }
                    >
                      {(editingFlow.variables ?? []).length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {editingFlow.active && (
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">ACTIVE</span>
            )}
            <button
              onClick={() => setEditingId(null)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--border)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-subtle)'; }}
            >
              <ArrowLeft className="h-3.5 w-3.5" /> All Workflows
            </button>
          </div>
        }
      >
        <div className="flex-1 overflow-hidden">
          {editorView === 'diagram' && (
            <QuestionFlowBuilder
              flow={editingFlow}
              allFlows={flows}
              onChange={handleFlowChange}
            />
          )}
          {editorView === 'variables' && (
            <WorkflowVariables
              variables={editingFlow.variables ?? []}
              onChange={(vars: WorkflowVariable[]) => {
                handleFlowChange({ ...editingFlow, variables: vars, nodes: [], edges: [] });
              }}
            />
          )}
          {editorView === 'json' && (() => {
            // Clean shape passed to AI agent — no diagram ids/positions
            const cleanVar = (v: WorkflowVariable): object => ({
              name: v.name,
              questionText: v.questionText,
              dataType: v.dataType,
              ...((v.branches ?? []).length > 0 ? {
                branches: (v.branches ?? []).map(b => ({
                  condition: b.condition,
                  followUp: (b.variables ?? []).map(cleanVar)
                }))
              } : {})
            });
            const cleanJson = {
              name: editingFlow.name,
              ...(editingFlow.description ? { description: editingFlow.description } : {}),
              questions: (editingFlow.variables ?? []).map(cleanVar)
            };
            const jsonStr = JSON.stringify(cleanJson, null, 2);
            return (
              <div className="h-full flex flex-col" style={{ background: '#0f172a' }}>
                <div className="flex items-center justify-between px-5 py-3 border-b shrink-0" style={{ borderColor: '#1e293b' }}>
                  <div className="flex items-center gap-2">
                    <Braces className="h-4 w-4" style={{ color: '#f59e0b' }} />
                    <span className="text-xs font-bold" style={{ color: '#f1f5f9' }}>AI Agent JSON</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: '#1e293b', color: '#64748b' }}>dev · synced to backend</span>
                  </div>
                  <button
                    onClick={() => { navigator.clipboard.writeText(jsonStr); setJsonCopied(true); setTimeout(() => setJsonCopied(false), 2000); }}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    style={{ background: jsonCopied ? '#064e3b' : '#1e293b', color: jsonCopied ? '#34d399' : '#94a3b8' }}
                  >
                    {jsonCopied ? <Check className="h-3.5 w-3.5" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
                    {jsonCopied ? 'Copied!' : 'Copy JSON'}
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-5">
                  <pre className="text-xs leading-relaxed font-mono whitespace-pre-wrap break-words" style={{ color: '#e2e8f0' }}>
                    {jsonStr}
                  </pre>
                </div>
              </div>
            );
          })()}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Workflow Builder"
      subtitle="Design question flows with conditional branching — skip, jump, or end based on answers."
      action={
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> New Workflow
        </button>
      }
    >
      <Widget colSpan={12} showHeader={false} padding="none">
        {flows.length === 0 ? (
          <div className="text-center py-20">
            <GitBranch className="h-12 w-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 text-sm font-medium">No workflows yet.</p>
            <p className="text-slate-400 text-xs mt-1">Create one to design your call question flow.</p>
            <button
              onClick={() => setCreating(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700"
            >
              Create your first workflow
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {flows.map(flow => (
              <div key={flow.id} className="p-5 hover:bg-[var(--bg-subtle)] transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold text-slate-800 truncate">{flow.name}</h3>
                      {flow.active && (
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full shrink-0">ACTIVE</span>
                      )}
                    </div>
                    {flow.description && <p className="text-xs text-slate-500 mb-2">{flow.description}</p>}
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span>{flow.nodes.length} nodes</span>
                      <span>{flow.edges.length} connections</span>
                      <span>Updated {new Date(flow.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => handleToggleActive(flow.id)} title={flow.active ? 'Deactivate' : 'Activate'} className="text-slate-400 hover:text-blue-600 transition-colors">
                      {flow.active ? <ToggleRight className="h-6 w-6 text-blue-600" /> : <ToggleLeft className="h-6 w-6" />}
                    </button>
                    <button onClick={() => handleDuplicate(flow)} title="Duplicate" className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                      <Copy className="h-4 w-4" />
                    </button>
                    <button onClick={() => setEditingId(flow.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100">
                      <Edit2 className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button onClick={() => handleDelete(flow.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Widget>

      {/* New Workflow modal */}
      {creating && (
        <Modal open onClose={() => setCreating(false)} title="New Workflow" maxWidth="max-w-md">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Workflow Name</label>
            <input
              autoFocus
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              placeholder="e.g. Personal Loan Qualification Flow"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false); }}
            />
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setCreating(false)} className="text-sm text-slate-400 hover:text-slate-600 font-medium px-3 py-2 cursor-pointer">Cancel</button>
              <button onClick={handleCreate} className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 cursor-pointer">Create</button>
            </div>
          </div>
        </Modal>
      )}
    </PageShell>
  );
}
