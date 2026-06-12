import type { Scene, Action, Trigger } from '../types/scene';
import { matchKeyword } from '../types/scene';
import { useSceneStore } from '../stores/sceneStore';

function describeTrigger(trigger?: Trigger): string {
  if (!trigger) return '手动';
  switch (trigger.type) {
    case 'time':
      return `⏰ ${(trigger as { time: string }).time}`;
    case 'click':
      return '🖱️ 点击';
    case 'keyword':
      return `🔑 "${(trigger as { pattern: string }).pattern}"`;
    default:
      return '未知';
  }
}

// Timer map: sceneId → timeoutId
const timerMap = new Map<string, ReturnType<typeof setTimeout>>();

function getNextTriggerTime(
  timeStr: string,
  repeat: 'daily' | 'weekdays' | 'weekends' | number[]
): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const now = new Date();
  const next = new Date(now);
  next.setHours(hours, minutes, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  if (repeat === 'weekdays') {
    while (next.getDay() === 0 || next.getDay() === 6) {
      next.setDate(next.getDate() + 1);
    }
  } else if (repeat === 'weekends') {
    while (next.getDay() !== 0 && next.getDay() !== 6) {
      next.setDate(next.getDate() + 1);
    }
  } else if (Array.isArray(repeat)) {
    while (!repeat.includes(next.getDay())) {
      next.setDate(next.getDate() + 1);
    }
  }

  return next;
}

function scheduleTimeTrigger(scene: Scene) {
  const existing = timerMap.get(scene.id);
  if (existing) clearTimeout(existing);

  const timeTrigger = scene.triggers.find((t) => t.type === 'time');
  if (!timeTrigger || timeTrigger.type !== 'time') return;

  const { time, repeat } = timeTrigger;
  const next = getNextTriggerTime(time, repeat);
  const delay = Math.max(0, next.getTime() - Date.now());

  const timeoutId = setTimeout(() => {
    executeScene(scene);
    if (scene.enabled) {
      scheduleTimeTrigger(scene);
    }
  }, delay);

  timerMap.set(scene.id, timeoutId);
}

let onSceneExecutedCallback: ((sceneName: string) => void) | null = null;
export function setOnSceneExecutedCallback(fn: (sceneName: string) => void) {
  onSceneExecutedCallback = fn;
}

export async function executeScene(scene: Scene, trigger?: string) {
  if (!scene.enabled) return;

  const triggerDesc = trigger || describeTrigger(scene.triggers[0]);
  const { addLog } = useSceneStore.getState();

  try {
    for (let i = 0; i < scene.actions.length; i++) {
      await executeAction(scene.actions[i]);
    }
    addLog({ sceneId: scene.id, sceneName: scene.name, trigger: triggerDesc, status: 'success' });
    if (onSceneExecutedCallback) {
      onSceneExecutedCallback(scene.name);
    } else {
      window.alert(`场景 "${scene.name}" 已执行`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    addLog({ sceneId: scene.id, sceneName: scene.name, trigger: triggerDesc, status: 'error', message: msg });
    window.alert(`场景 "${scene.name}" 执行失败: ${msg}`);
  }
}

async function executeAction(action: Action) {
  switch (action.type) {
    case 'sendMessage': {
      const m = await import('../store');
      const sendMessage = (m.useStore.getState() as unknown as { sendMessage?: (msg: string) => void }).sendMessage;
      if (sendMessage && (action.params as { message?: string }).message) {
        sendMessage((action.params as { message: string }).message);
      }
      break;
    }
    case 'switchRole': {
      const m = await import('../store');
      const setPersona = (m.useStore.getState() as unknown as { setPersona?: (id: string) => void }).setPersona;
      if (setPersona && (action.params as { roleId?: string }).roleId) {
        setPersona((action.params as { roleId: string }).roleId);
      }
      break;
    }
    case 'speak': {
      if ((action.params as { text?: string }).text && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance((action.params as { text: string }).text);
        window.speechSynthesis.speak(utterance);
      }
      break;
    }
    case 'notify': {
      const { title, body } = action.params as { title?: string; body?: string };
      if (Notification.permission === 'granted') {
        new Notification(title || 'PixelPal', { body: body || '' });
      } else if (Notification.permission !== 'denied') {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          new Notification(title || 'PixelPal', { body: body || '' });
        }
      }
      break;
    }
    case 'delay': {
      const seconds = (action.params as { seconds?: number }).seconds ?? 5;
      await new Promise((r) => setTimeout(r, seconds * 1000));
      break;
    }
    case 'condition': {
      const { field, operator, value, thenActions, elseActions } = action.params as {
        field: 'hour' | 'dayOfWeek' | 'keyword';
        operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains';
        value: string;
        thenActions: Action[];
        elseActions?: Action[];
      };
      const now = new Date();
      let evalResult = false;

      if (field === 'hour') {
        const hour = now.getHours();
        const target = parseInt(value, 10);
        evalResult = compare(hour, operator, target);
      } else if (field === 'dayOfWeek') {
        const day = now.getDay();
        const dayMap: Record<string, number> = { '日': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6 };
        const target = dayMap[value] ?? parseInt(value, 10);
        evalResult = compare(day, operator, target);
      }

      const branch = evalResult ? thenActions : (elseActions || []);
      for (const a of branch) {
        await executeAction(a);
      }
      break;
    }
    case 'random': {
      const { options } = action.params as { options: Action[][] };
      if (options.length > 0) {
        const chosen = options[Math.floor(Math.random() * options.length)];
        for (const a of chosen) {
          await executeAction(a);
        }
      }
      break;
    }
  }
}

function compare(a: number, op: string, b: number): boolean {
  switch (op) {
    case 'eq': return a === b;
    case 'neq': return a !== b;
    case 'gt': return a > b;
    case 'lt': return a < b;
    case 'contains': return String(a).includes(String(b));
    default: return false;
  }
}

export function checkKeywordTrigger(message: string): Scene[] {
  const { scenes } = useSceneStore.getState();
  return scenes.filter(
    (s) =>
      s.enabled &&
      s.triggers.some(
        (t) => t.type === 'keyword' && matchKeyword(message, (t as { pattern: string }).pattern)
      )
  );
}

export function initSceneScheduler() {
  const { scenes } = useSceneStore.getState();
  for (const scene of scenes) {
    if (scene.enabled && scene.triggers.some((t) => t.type === 'time')) {
      scheduleTimeTrigger(scene);
    }
  }
}

export function scheduleScene(scene: Scene) {
  if (scene.enabled && scene.triggers.some((t) => t.type === 'time')) {
    scheduleTimeTrigger(scene);
  }
}

export function unscheduleScene(sceneId: string) {
  const existing = timerMap.get(sceneId);
  if (existing) {
    clearTimeout(existing);
    timerMap.delete(sceneId);
  }
}
