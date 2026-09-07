export type QuestionNodeType = 'start' | 'question' | 'condition' | 'action' | 'end';

export interface QuestionOption {
  id: string;
  text: string;
  /** If set, jump directly to this node (skip normal next) */
  goToNodeId?: string;
  /** If true, stop the flow when this answer is given */
  terminateFlow?: boolean;
}

export interface QuestionFlowNode {
  id: string;
  type: QuestionNodeType;
  label: string;
  /** Only for 'question' nodes */
  questionText?: string;
  /** Possible answers and their routing */
  options?: QuestionOption[];
  /** For 'action' nodes: what to do */
  actionType?: 'tag_lead' | 'assign_agent' | 'send_sms' | 'schedule_callback' | 'close_lead';
  actionValue?: string;
  /** For 'condition' nodes: field + operator + value */
  condition?: { field: string; operator: 'eq' | 'contains' | 'gte' | 'lte'; value: string };
  /** React Flow position */
  position: { x: number; y: number };
}

export interface QuestionFlowEdge {
  id: string;
  source: string;
  target: string;
  /** Which option id triggered this edge (undefined = default / unconditional) */
  optionId?: string;
  label?: string;
}

export interface QuestionFlow {
  id: string;
  name: string;
  description?: string;
  nodes: QuestionFlowNode[];
  edges: QuestionFlowEdge[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
