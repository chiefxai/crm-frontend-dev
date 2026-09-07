import React, { useState } from 'react';
import { X, Plus, Trash2, ArrowRight } from 'lucide-react';
import { QuestionFlowNode, QuestionOption } from '../types';

interface NodeEditorProps {
  node: QuestionFlowNode;
  allNodes: QuestionFlowNode[];
  onChange: (updated: QuestionFlowNode) => void;
  onClose: () => void;
}

function uid() {
  return `opt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export default function NodeEditor({ node, allNodes, onChange, onClose }: NodeEditorProps) {
  const [local, setLocal] = useState<QuestionFlowNode>(node);

  const save = () => onChange(local);

  const setField = <K extends keyof QuestionFlowNode>(k: K, v: QuestionFlowNode[K]) =>
    setLocal(prev => ({ ...prev, [k]: v }));

  const addOption = () => {
    setLocal(prev => ({
      ...prev,
      options: [...(prev.options || []), { id: uid(), text: '' }],
    }));
  };

  const updateOption = (id: string, patch: Partial<QuestionOption>) => {
    setLocal(prev => ({
      ...prev,
      options: (prev.options || []).map(o => (o.id === id ? { ...o, ...patch } : o)),
    }));
  };

  const removeOption = (id: string) => {
    setLocal(prev => ({
      ...prev,
      options: (prev.options || []).filter(o => o.id !== id),
    }));
  };

  const otherNodes = allNodes.filter(n => n.id !== node.id);

  return (
    <div className="absolute right-4 top-4 bottom-4 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-800">Edit Node</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Label */}
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">Node Label</label>
          <input
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={local.label}
            onChange={e => setField('label', e.target.value)}
          />
        </div>

        {/* Question text */}
        {local.type === 'question' && (
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Question Text</label>
            <textarea
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              value={local.questionText || ''}
              onChange={e => setField('questionText', e.target.value)}
              placeholder="What should the AI ask the customer?"
            />
          </div>
        )}

        {/* Options (answers) */}
        {local.type === 'question' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-600">Answer Options</label>
              <button onClick={addOption} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>
            <div className="space-y-3">
              {(local.options || []).map(opt => (
                <div key={opt.id} className="border border-slate-100 rounded-xl p-3 space-y-2 bg-slate-50">
                  <div className="flex gap-2">
                    <input
                      className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={opt.text}
                      onChange={e => updateOption(opt.id, { text: e.target.value })}
                      placeholder="Answer text"
                    />
                    <button onClick={() => removeOption(opt.id)} className="text-rose-400 hover:text-rose-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mb-1">
                      <ArrowRight className="h-3 w-3" /> Jump to node (optional)
                    </label>
                    <select
                      className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                      value={opt.goToNodeId || ''}
                      onChange={e => updateOption(opt.id, { goToNodeId: e.target.value || undefined })}
                    >
                      <option value="">— Next node (default) —</option>
                      {otherNodes.map(n => (
                        <option key={n.id} value={n.id}>{n.label}</option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!opt.terminateFlow}
                      onChange={e => updateOption(opt.id, { terminateFlow: e.target.checked })}
                      className="rounded"
                    />
                    End flow when this answer is given
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action config */}
        {local.type === 'action' && (
          <>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Action Type</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                value={local.actionType || ''}
                onChange={e => setField('actionType', e.target.value as any)}
              >
                <option value="">Select…</option>
                <option value="tag_lead">Tag Lead</option>
                <option value="assign_agent">Assign Agent</option>
                <option value="send_sms">Send SMS</option>
                <option value="schedule_callback">Schedule Callback</option>
                <option value="close_lead">Close Lead</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Value / Note</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={local.actionValue || ''}
                onChange={e => setField('actionValue', e.target.value)}
                placeholder="e.g. tag name, agent name…"
              />
            </div>
          </>
        )}

        {/* Condition config */}
        {local.type === 'condition' && (
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-2">Condition</label>
            <div className="space-y-2">
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                placeholder="Field (e.g. score)"
                value={local.condition?.field || ''}
                onChange={e => setField('condition', { ...local.condition, field: e.target.value } as any)}
              />
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                value={local.condition?.operator || 'eq'}
                onChange={e => setField('condition', { ...local.condition, operator: e.target.value as any } as any)}
              >
                <option value="eq">equals</option>
                <option value="contains">contains</option>
                <option value="gte">≥</option>
                <option value="lte">≤</option>
              </select>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                placeholder="Value"
                value={local.condition?.value || ''}
                onChange={e => setField('condition', { ...local.condition, value: e.target.value } as any)}
              />
            </div>
          </div>
        )}
      </div>

      <div className="px-5 py-4 border-t border-slate-100">
        <button
          onClick={save}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl py-2.5 transition-colors"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
