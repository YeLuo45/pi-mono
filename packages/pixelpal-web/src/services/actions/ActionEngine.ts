/**
 * ActionEngine.ts — PixelPal V3 Proactive Action System
 * 
 * Core action queue management:
 * - Enqueue actions with priority and deduplication
 * - Display queue with single-action presentation
 * - Auto-dismiss after duration
 */

import type { CompanionAction, ActionQueueItem } from './ActionTypes';
export type { ActionQueueItem };

// ----- Constants -----

export const MAX_QUEUE_SIZE = 5;
export const DISPLAY_DURATION_MS = 5000;
export const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

// ----- Action Priority -----

const ACTION_PRIORITY: Record<CompanionAction['type'], number> = {
  celebrate: 100,
  greet: 90,
  remind: 80,
  suggest: 60,
  memory_recall: 50,
  text: 40,
};

// ----- Action Queue State -----

let _queue: ActionQueueItem[] = [];
let _isDisplaying = false;
let _currentAction: ActionQueueItem | null = null;
let _displayTimer: ReturnType<typeof setTimeout> | null = null;
let _listeners: Array<(queue: ActionQueueItem[]) => void> = [];

// ----- Queue Operations -----

function sortQueue(): void {
  _queue.sort((a, b) => {
    // First by priority descending
    if (a.priority !== b.priority) return b.priority - a.priority;
    // Then by creation time ascending (older first)
    return a.createdAt - b.createdAt;
  });
}

function notifyListeners(): void {
  for (const listener of _listeners) {
    listener([..._queue]);
  }
}

/**
 * Enqueue a new action. Returns false if duplicate within dedup window.
 */
export function enqueueAction(
  action: CompanionAction,
  options: { skipDedup?: boolean } = {}
): boolean {
  const now = Date.now();

  // Deduplication check
  if (!options.skipDedup) {
    const isDuplicate = _queue.some(
      (item) =>
        item.action.type === action.type &&
        now - item.createdAt < DEDUP_WINDOW_MS
    );
    if (isDuplicate) return false;
  }

  const priority = ACTION_PRIORITY[action.type] ?? 0;
  const queueItem: ActionQueueItem = {
    id: crypto.randomUUID(),
    action,
    priority,
    createdAt: now,
    displayedAt: null,
  };

  _queue.push(queueItem);
  sortQueue();

  // Trim to max queue size
  if (_queue.length > MAX_QUEUE_SIZE) {
    _queue = _queue.slice(-MAX_QUEUE_SIZE);
    sortQueue();
  }

  notifyListeners();

  // If nothing is currently displaying, start the display loop
  if (!_isDisplaying) {
    processNext();
  }

  return true;
}

/**
 * Start displaying the next action in the queue
 */
function processNext(): void {
  if (_queue.length === 0) {
    _isDisplaying = false;
    _currentAction = null;
    notifyListeners();
    return;
  }

  _isDisplaying = true;
  const item = _queue.shift()!;
  _currentAction = item;
  item.displayedAt = Date.now();
  notifyListeners();

  // Auto-dismiss after duration
  if (_displayTimer) clearTimeout(_displayTimer);
  _displayTimer = setTimeout(() => {
    dismissCurrent();
  }, DISPLAY_DURATION_MS);
}

/**
 * Dismiss the currently displayed action and move to next
 */
export function dismissCurrent(): void {
  if (_displayTimer) clearTimeout(_displayTimer);
  _displayTimer = null;
  _currentAction = null;
  _isDisplaying = false;
  processNext();
}

/**
 * Dismiss current action with a specific reason
 */
export function dismissCurrentWithReason(_reason: 'user_dismissed' | 'action_taken' | 'timeout'): void {
  dismissCurrent();
}

// ----- Queue Inspection -----

export function getQueue(): ActionQueueItem[] {
  return [..._queue];
}

export function getCurrentAction(): ActionQueueItem | null {
  return _currentAction;
}

export function isDisplaying(): boolean {
  return _isDisplaying;
}

export function getQueueSize(): number {
  return _queue.length;
}

// ----- Listeners -----

export function subscribeToQueue(listener: (queue: ActionQueueItem[]) => void): () => void {
  _listeners.push(listener);
  return () => {
    _listeners = _listeners.filter((l) => l !== listener);
  };
}

// ----- Clear -----

export function clearQueue(): void {
  if (_displayTimer) clearTimeout(_displayTimer);
  _displayTimer = null;
  _queue = [];
  _currentAction = null;
  _isDisplaying = false;
  notifyListeners();
}

// ----- Action Factory Helpers -----

export function createTextAction(content: string): CompanionAction {
  return { type: 'text', content };
}

export function createRemindAction(taskId: string, taskTitle: string, urgency: 'overdue' | 'soon' | 'normal'): CompanionAction {
  let content: string;
  switch (urgency) {
    case 'overdue':
      content = `任务"${taskTitle}"已过期，记得处理一下哦～`;
      break;
    case 'soon':
      content = `任务"${taskTitle}"快到期了，准备好了吗？`;
      break;
    default:
      content = `别忘了任务"${taskTitle}"～`;
  }
  return { type: 'remind', taskId, content, taskTitle, urgency };
}

export function createCelebrateAction(achievement: string): CompanionAction {
  return { type: 'celebrate', achievement };
}

export function createGreetAction(greeting: string): CompanionAction {
  return { type: 'greet', greeting };
}

export function createSuggestAction(suggestion: string, reason: string): CompanionAction {
  return { type: 'suggest', suggestion, reason };
}

export function createMemoryRecallAction(topic: string, content: string): CompanionAction {
  return { type: 'memory_recall', topic, content };
}
