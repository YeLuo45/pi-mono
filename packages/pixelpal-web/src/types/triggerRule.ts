// V61: TriggerRule and Condition types inlined to avoid import chain issues
export type ConditionType = 'daysInactive' | 'messagesCount' | 'timeOfDay' | 'emotionThreshold';

export interface Condition {
  id: string;
  type: ConditionType;
  params: Record<string, unknown>;
  threshold: number;
}

export type ConditionLogic = 'AND' | 'OR';

export interface TriggerRule {
  id: string;
  name: string;
  conditions: Condition[];
  logic: ConditionLogic;
  action: 'evolve' | 'remind' | 'changeMood' | 'custom';
  actionParams: Record<string, unknown>;
  enabled: boolean;
  cooldownMinutes: number;
  lastTriggered?: number;
}