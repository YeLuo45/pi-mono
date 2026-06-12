// V61: TriggerRule and Condition — defined BEFORE Scene to avoid forward-ref issues
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

export interface Scene {
  id: string;
  name: string;
  enabled: boolean;
  isQuick: boolean;
  triggers: Trigger[];
  actions: Action[];
  tags: string[];
  createdAt: number;
  rules: TriggerRule[];
}

export type TriggerType = 'time' | 'click' | 'keyword';

export interface TimeTrigger {
  type: 'time';
  time: string; // "HH:mm"
  repeat: 'daily' | 'weekdays' | 'weekends' | number[]; // number[] = [0,1,2...] 星期天=0
}

export interface ClickTrigger {
  type: 'click';
}

export interface KeywordTrigger {
  type: 'keyword';
  pattern: string; // glob pattern like "*你好*"
}

export type Trigger = TimeTrigger | ClickTrigger | KeywordTrigger;

export type ActionType = 'sendMessage' | 'switchRole' | 'speak' | 'notify' | 'delay' | 'condition' | 'random';

export interface SendMessageAction {
  type: 'sendMessage';
  params: {
    message: string;
  };
}

export interface SwitchRoleAction {
  type: 'switchRole';
  params: {
    roleId: string;
  };
}

export interface SpeakAction {
  type: 'speak';
  params: {
    text: string;
  };
}

export interface NotifyAction {
  type: 'notify';
  params: {
    title: string;
    body: string;
  };
}

export interface DelayAction {
  type: 'delay';
  params: {
    seconds: number;
  };
}

export interface ConditionAction {
  type: 'condition';
  params: {
    field: 'hour' | 'dayOfWeek' | 'keyword';
    operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains';
    value: string;
    thenActions: Action[];
    elseActions?: Action[];
  };
}

export interface RandomAction {
  type: 'random';
  params: {
    options: Action[][];
  };
}

export type Action =
  | SendMessageAction
  | SwitchRoleAction
  | SpeakAction
  | NotifyAction
  | DelayAction
  | ConditionAction
  | RandomAction;

export function createDefaultScene(): Omit<Scene, 'id' | 'createdAt'> {
  return {
    name: '',
    enabled: true,
    isQuick: false,
    triggers: [],
    actions: [],
    tags: [],
  };
}

export function createTrigger(type: TriggerType): Trigger {
  switch (type) {
    case 'time':
      return { type: 'time', time: '08:00', repeat: 'daily' } as TimeTrigger;
    case 'click':
      return { type: 'click' } as ClickTrigger;
    case 'keyword':
      return { type: 'keyword', pattern: '' } as KeywordTrigger;
  }
}

export function createAction(type: ActionType): Action {
  switch (type) {
    case 'sendMessage':
      return { type: 'sendMessage', params: { message: '' } };
    case 'switchRole':
      return { type: 'switchRole', params: { roleId: '' } };
    case 'speak':
      return { type: 'speak', params: { text: '' } };
    case 'notify':
      return { type: 'notify', params: { title: 'PixelPal', body: '' } };
    case 'delay':
      return { type: 'delay', params: { seconds: 5 } };
    case 'condition':
      return {
        type: 'condition',
        params: {
          field: 'hour',
          operator: 'eq',
          value: '8',
          thenActions: [],
          elseActions: [],
        },
      };
    case 'random':
      return { type: 'random', params: { options: [[]] } };
  }
}

export function matchKeyword(message: string, pattern: string): boolean {
  if (!pattern) return false;
  const regexStr = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  try {
    const regex = new RegExp(regexStr, 'i');
    return regex.test(message);
  } catch {
    return message.toLowerCase().includes(pattern.toLowerCase());
  }
}
