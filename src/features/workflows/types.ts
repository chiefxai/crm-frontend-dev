export type QuestionNodeType = 'start' | 'question' | 'condition' | 'action' | 'end';

export interface QuestionOption {
  id: string;
  text: string;
  goToNodeId?: string;
  terminateFlow?: boolean;
}

export interface QuestionFlowNode {
  id: string;
  type: QuestionNodeType;
  label: string;
  questionText?: string;
  options?: QuestionOption[];
  actionType?: 'tag_lead' | 'assign_agent' | 'send_sms' | 'schedule_callback' | 'close_lead';
  actionValue?: string;
  condition?: { field: string; operator: 'eq' | 'contains' | 'gte' | 'lte'; value: string };
  position: { x: number; y: number };
}

export interface QuestionFlowEdge {
  id: string;
  source: string;
  target: string;
  optionId?: string;
  label?: string;
}

export type VariableDataType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'array'
  | 'object';

/** A conditional branch on a question variable */
export interface WorkflowBranch {
  id: string;
  /** Answer value that triggers this branch, e.g. "yes", "no", "interested" */
  condition: string;
  /** Display label for the branch edge */
  label?: string;
  /** Follow-up questions asked when this branch is taken */
  variables: WorkflowVariable[];
}

export interface WorkflowVariable {
  id: string;
  /** Short variable / field name, e.g. "customer_name" */
  name: string;
  /** The actual question text the AI speaks, e.g. "What is your name?" */
  questionText?: string;
  dataType: VariableDataType;
  defaultValue?: string;
  description?: string;
  /**
   * Conditional follow-up branches.
   * Each branch fires when the caller's answer matches branch.condition.
   * If no branch matches, the flow continues to the next top-level variable.
   */
  branches?: WorkflowBranch[];
}

export interface QuestionFlow {
  id: string;
  name: string;
  description?: string;
  nodes: QuestionFlowNode[];
  edges: QuestionFlowEdge[];
  variables?: WorkflowVariable[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
