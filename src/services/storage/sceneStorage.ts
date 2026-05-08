// V61: local types to avoid Rolldown cross-module export issues
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

// sceneStorage: localStorage-based TriggerRule persistence
const RULES_KEY = 'scene_rules';

export async function getRules(): Promise<TriggerRule[]> {
  try {
    const raw = localStorage.getItem(RULES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TriggerRule[];
  } catch {
    return [];
  }
}

export async function saveRules(rules: TriggerRule[]): Promise<void> {
  localStorage.setItem(RULES_KEY, JSON.stringify(rules));
}

export async function updateRule(id: string, updates: Partial<TriggerRule>): Promise<void> {
  const rules = await getRules();
  const idx = rules.findIndex(r => r.id === id);
  if (idx === -1) return;
  rules[idx] = { ...rules[idx], ...updates };
  await saveRules(rules);
}

export async function addRule(rule: TriggerRule): Promise<void> {
  const rules = await getRules();
  rules.push(rule);
  await saveRules(rules);
}

export async function deleteRule(id: string): Promise<void> {
  const rules = await getRules();
  const filtered = rules.filter(r => r.id !== id);
  await saveRules(filtered);
}