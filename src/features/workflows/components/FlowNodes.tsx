import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { HelpCircle, Play, Square, Zap, GitBranch } from 'lucide-react';
import { QuestionFlowNode, QuestionOption } from '../types';

type NodeData = QuestionFlowNode & { selected?: boolean };

const handleStyle = {
  width: 10,
  height: 10,
  background: '#3b82f6',
  border: '2px solid white',
};

export function StartNode({ data }: NodeProps) {
  return (
    <div className="bg-emerald-500 text-white rounded-2xl px-5 py-3 shadow-lg min-w-[140px] text-center">
      <div className="flex items-center justify-center gap-2">
        <Play className="h-4 w-4" />
        <span className="text-sm font-bold">{(data as any).label || 'Start'}</span>
      </div>
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
    </div>
  );
}

export function QuestionNode({ data }: NodeProps) {
  const d = data as NodeData;
  const options: QuestionOption[] = d.options || [];

  return (
    <div className="bg-white border-2 border-blue-300 rounded-2xl shadow-md min-w-[240px] max-w-[300px]">
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center gap-2 mb-1">
          <HelpCircle className="h-4 w-4 text-blue-500 shrink-0" />
          <span className="text-[11px] font-bold text-blue-500 uppercase tracking-wider">Question</span>
        </div>
        <p className="text-sm font-semibold text-slate-800 leading-snug">{d.questionText || d.label}</p>
      </div>
      {options.length > 0 && (
        <div className="px-4 py-2 space-y-1">
          {options.map(opt => (
            <div key={opt.id} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
              <span className="text-xs text-slate-600 truncate">{opt.text}</span>
              {opt.terminateFlow && (
                <span className="text-[9px] bg-rose-100 text-rose-600 px-1 rounded ml-auto shrink-0">end</span>
              )}
              {opt.goToNodeId && (
                <span className="text-[9px] bg-amber-100 text-amber-600 px-1 rounded ml-auto shrink-0">jump</span>
              )}
            </div>
          ))}
        </div>
      )}
      {options.map((opt, i) => (
        <Handle
          key={opt.id}
          type="source"
          position={Position.Bottom}
          id={opt.id}
          style={{
            ...handleStyle,
            left: `${((i + 1) / (options.length + 1)) * 100}%`,
            background: opt.terminateFlow ? '#f43f5e' : '#3b82f6',
          }}
        />
      ))}
      {options.length === 0 && (
        <Handle type="source" position={Position.Bottom} style={handleStyle} />
      )}
    </div>
  );
}

export function ConditionNode({ data }: NodeProps) {
  const d = data as NodeData;
  return (
    <div className="bg-white border-2 border-amber-300 rounded-2xl shadow-md min-w-[220px]">
      <Handle type="target" position={Position.Top} style={{ ...handleStyle, background: '#f59e0b' }} />
      <div className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <GitBranch className="h-4 w-4 text-amber-500 shrink-0" />
          <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">Condition</span>
        </div>
        <p className="text-sm font-semibold text-slate-800">{d.label}</p>
        {d.condition && (
          <p className="text-xs text-slate-500 mt-1 font-mono">
            {d.condition.field} {d.condition.operator} "{d.condition.value}"
          </p>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} id="true" style={{ ...handleStyle, left: '30%', background: '#10b981' }} />
      <Handle type="source" position={Position.Bottom} id="false" style={{ ...handleStyle, left: '70%', background: '#f43f5e' }} />
    </div>
  );
}

export function ActionNode({ data }: NodeProps) {
  const d = data as NodeData;
  const actionColors: Record<string, string> = {
    tag_lead: 'violet',
    assign_agent: 'blue',
    send_sms: 'teal',
    schedule_callback: 'amber',
    close_lead: 'rose',
  };
  const color = actionColors[d.actionType || ''] || 'slate';

  return (
    <div className={`bg-white border-2 border-${color}-300 rounded-2xl shadow-md min-w-[200px]`}>
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <div className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <Zap className={`h-4 w-4 text-${color}-500 shrink-0`} />
          <span className={`text-[11px] font-bold text-${color}-500 uppercase tracking-wider`}>Action</span>
        </div>
        <p className="text-sm font-semibold text-slate-800">{d.label}</p>
        {d.actionValue && <p className="text-xs text-slate-500 mt-0.5">{d.actionValue}</p>}
      </div>
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
    </div>
  );
}

export function EndNode({ data }: NodeProps) {
  return (
    <div className="bg-slate-700 text-white rounded-2xl px-5 py-3 shadow-lg min-w-[140px] text-center">
      <Handle type="target" position={Position.Top} style={{ ...handleStyle, background: '#94a3b8' }} />
      <div className="flex items-center justify-center gap-2">
        <Square className="h-4 w-4" />
        <span className="text-sm font-bold">{(data as any).label || 'End'}</span>
      </div>
    </div>
  );
}

export const nodeTypes = {
  start: StartNode,
  question: QuestionNode,
  condition: ConditionNode,
  action: ActionNode,
  end: EndNode,
};
