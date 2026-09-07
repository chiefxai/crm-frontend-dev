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
} from 'lucide-react';
import { QuestionFlow, QuestionFlowNode, QuestionFlowEdge } from './types';
import QuestionFlowBuilder from './QuestionFlowBuilder';

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function createDefaultFlow(name: string): QuestionFlow {
  const startId = uid('n');
  const q1Id = uid('n');
  const yesId = uid('n');
  const noId = uid('n');
  const endId = uid('n');
  const opt1Id = uid('opt');
  const opt2Id = uid('opt');

  const nodes: QuestionFlowNode[] = [
    { id: startId, type: 'start', label: 'Start', position: { x: 200, y: 30 } },
    {
      id: q1Id,
      type: 'question',
      label: 'Opening Question',
      questionText: 'Hi, am I speaking with [Name]? Are you interested in our offer?',
      options: [
        { id: opt1Id, text: 'Yes, interested', goToNodeId: yesId },
        { id: opt2Id, text: 'No, not interested', goToNodeId: noId, terminateFlow: true },
      ],
      position: { x: 140, y: 140 },
    },
    {
      id: yesId,
      type: 'action',
      label: 'Assign Agent',
      actionType: 'assign_agent',
      actionValue: 'Senior Sales Agent',
      position: { x: 60, y: 300 },
    },
    {
      id: noId,
      type: 'action',
      label: 'Close Lead',
      actionType: 'close_lead',
      position: { x: 280, y: 300 },
    },
    { id: endId, type: 'end', label: 'End', position: { x: 200, y: 430 } },
  ];

  const edges: QuestionFlowEdge[] = [
    { id: uid('e'), source: startId, target: q1Id },
    { id: uid('e'), source: q1Id, target: yesId, optionId: opt1Id, label: 'Yes' },
    { id: uid('e'), source: q1Id, target: noId, optionId: opt2Id, label: 'No' },
    { id: uid('e'), source: yesId, target: endId },
    { id: uid('e'), source: noId, target: endId },
  ];

  return {
    id: uid('flow'),
    name,
    description: '',
    nodes,
    edges,
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
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-6 py-4 bg-white border-b border-slate-100 shrink-0">
          <button
            onClick={() => setEditingId(null)}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Workflows
          </button>
          <ChevronRight className="h-4 w-4 text-slate-300" />
          <span className="text-sm font-semibold text-slate-800">{editingFlow.name}</span>
          {editingFlow.active && (
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">ACTIVE</span>
          )}
        </div>
        <div className="flex-1 overflow-hidden">
          <QuestionFlowBuilder
            flow={editingFlow}
            allFlows={flows}
            onChange={handleFlowChange}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-auto bg-slate-50/50">
      {/* Header */}
      <div className="px-8 py-6 bg-white border-b border-slate-100 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <GitBranch className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Workflow Builder</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Design question flows with conditional branching — skip, jump, or end based on answers.
              </p>
            </div>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> New Workflow
          </button>
        </div>
      </div>

      {/* Create dialog */}
      {creating && (
        <div className="mx-8 mt-6 p-5 bg-white border border-blue-200 rounded-2xl shadow-sm">
          <p className="text-sm font-semibold text-slate-800 mb-3">New Workflow</p>
          <div className="flex gap-3">
            <input
              autoFocus
              className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Personal Loan Qualification Flow"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false); }}
            />
            <button onClick={handleCreate} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700">
              Create
            </button>
            <button onClick={() => setCreating(false)} className="px-4 py-2.5 text-sm text-slate-500 hover:text-slate-800">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Flow list */}
      <div className="p-8 space-y-4">
        {flows.length === 0 && !creating && (
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
        )}

        {flows.map(flow => (
          <div
            key={flow.id}
            className="bg-white border border-slate-100 rounded-2xl p-5 hover:border-slate-200 transition-colors shadow-sm"
          >
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
                <button
                  onClick={() => handleToggleActive(flow.id)}
                  title={flow.active ? 'Deactivate' : 'Activate'}
                  className="text-slate-400 hover:text-blue-600 transition-colors"
                >
                  {flow.active
                    ? <ToggleRight className="h-6 w-6 text-blue-600" />
                    : <ToggleLeft className="h-6 w-6" />
                  }
                </button>
                <button
                  onClick={() => handleDuplicate(flow)}
                  title="Duplicate"
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setEditingId(flow.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
                >
                  <Edit2 className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  onClick={() => handleDelete(flow.id)}
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
