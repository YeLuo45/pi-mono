/**
 * ActionTrigger.ts — PixelPal V3 Trigger Condition Evaluators
 * 
 * Evaluates conditions for each action type and triggers them via ActionEngine.
 * These functions are called at appropriate lifecycle points:
 * - App startup: checkGreeting, checkReminders
 * - Task changes: checkTaskCompletion
 * - Calendar changes: checkEventCompletion  
 * - Periodic: checkInactivity, checkMemoryRecall
 */

import { useStore } from '../../store';
import { enqueueAction, createCelebrateAction, createRemindAction, createGreetAction } from './ActionEngine';
import type { Task } from '../../types';
import { getMoodMessage, getDisplayName } from '../companion';
import { queryMemories } from '../memory';
import { differenceInHours, parseISO, isPast, isToday } from 'date-fns';

// ----- Cooldown Helpers -----

const REMIND_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes between reminders
const CELEBRATE_COOLDOWN_MS = 60 * 1000;    // 1 minute between celebrations
const SUGGEST_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes between suggestions

// ----- Last Activity Helpers -----

function isUserIdle(thresholdMs = 30 * 60 * 1000): boolean {
  const state = useStore.getState();
  return Date.now() - state.lastActivityTime > thresholdMs;
}

function isUserTyping(): boolean {
  const state = useStore.getState();
  // If AI is thinking, user might be typing
  return state.isAIThinking;
}

// ----- 1. Greeting Action -----

/**
 * Trigger a greeting on app open. Only once per day.
 */
export function checkGreeting(): void {
  const state = useStore.getState();
  const cooldowns = state.cooldowns;
  const lastGreeting = cooldowns.lastGreetingTime;
  const now = Date.now();

  // Only greet once per day (skip if greeted within 8 hours)
  if (now - lastGreeting < 8 * 60 * 60 * 1000) return;

  // Check sleep time
  const hour = new Date().getHours();
  const { sleepTimeStart, sleepTimeEnd } = state.interactionSettings;
  if (isInSleepTime(hour, sleepTimeStart, sleepTimeEnd)) return;

  const name = getDisplayName();
  const moodMessage = getMoodMessage();
  
  // Generate time-appropriate greeting
  let greeting: string;
  if (hour >= 5 && hour < 12) {
    greeting = `早上好, ${name}! ${moodMessage}`;
  } else if (hour >= 12 && hour < 18) {
    greeting = `下午好, ${name}! ${moodMessage}`;
  } else {
    greeting = `晚上好, ${name}! ${moodMessage}`;
  }

  enqueueAction(createGreetAction(greeting));
  state.setCooldown('lastGreetingTime', now);
}

// ----- 2. Task Reminder Actions -----

/**
 * Check all pending tasks and enqueue reminders for urgent ones.
 * Called on app start and periodically.
 */
export function checkReminders(): void {
  const state = useStore.getState();
  const { cooldowns } = state;
  const now = Date.now();

  // Skip if user is typing or recently got a reminder
  if (isUserTyping()) return;
  if (now - cooldowns.lastInactivityNoticeTime < REMIND_COOLDOWN_MS) return;

  const pendingTasks = state.tasks.filter((t) => t.status === 'todo' && t.dueDate);

  for (const task of pendingTasks) {
    if (!task.dueDate) continue;

    const dueDate = parseISO(task.dueDate);
    const hoursUntil = differenceInHours(dueDate, new Date());
    const overdue = isPast(dueDate) && !isToday(dueDate);
    const dueToday = isToday(dueDate);

    // High priority task due within 1 hour
    if (task.priority === 'high' && hoursUntil <= 1 && hoursUntil > 0) {
      enqueueAction(createRemindAction(task.id, task.title, 'soon'));
      state.setCooldown('lastInactivityNoticeTime', now);
      return; // Only one reminder at a time
    }

    // Overdue task
    if (overdue) {
      enqueueAction(createRemindAction(task.id, task.title, 'overdue'));
      state.setCooldown('lastInactivityNoticeTime', now);
      return;
    }

    // Task due today with less than 2 hours
    if (dueToday && hoursUntil <= 2 && hoursUntil > 0) {
      enqueueAction(createRemindAction(task.id, task.title, 'soon'));
      state.setCooldown('lastInactivityNoticeTime', now);
      return;
    }
  }
}

/**
 * Trigger celebration when a task is completed.
 * Call this after toggleTaskComplete or when user marks something done.
 */
export function triggerTaskCelebrate(task: Task): void {
  const state = useStore.getState();
  const now = Date.now();

  if (now - state.cooldowns.lastInactivityNoticeTime < CELEBRATE_COOLDOWN_MS) return;

  const isMilestone = task.priority === 'high' || task.title.includes('完成') || task.title.includes('PR');
  const achievement = isMilestone
    ? `太棒了！你完成了重要任务"${task.title}"！🎉 继续保持！`
    : `完成啦！"${task.title}" ✅ 干得漂亮！`;

  enqueueAction(createCelebrateAction(achievement));
  state.setCooldown('lastInactivityNoticeTime', now);
}

/**
 * Trigger celebration for any achievement.
 */
export function triggerCelebrate(achievement: string): void {
  enqueueAction(createCelebrateAction(achievement));
}

// ----- 3. Suggestion (contextual) -----

/**
 * Check for contextual suggestions based on recent conversation patterns.
 * Called every N messages or on idle.
 */
export function checkSuggestions(): void {
  const state = useStore.getState();
  const now = Date.now();

  if (isUserTyping()) return;
  if (now - state.cooldowns.lastScheduleNoticeTime < SUGGEST_COOLDOWN_MS) return;

  // Check if user has been idle for a while
  if (isUserIdle(45 * 60 * 1000)) {
    const pendingTasks = state.tasks.filter((t) => t.status === 'todo');
    if (pendingTasks.length > 0) {
      const taskList = pendingTasks.slice(0, 2).map((t) => `"${t.title}"`).join(', ');
      enqueueAction({
        type: 'suggest',
        suggestion: `还有 ${pendingTasks.length} 个任务待完成：${taskList}`,
        reason: '你有一会儿没碰这些任务了',
      });
      state.setCooldown('lastScheduleNoticeTime', now);
    }
  }
}

// ----- 4. Memory Recall -----

/**
 * Check if current conversation topic matches any memory.
 * Called when AI response is about to be shown.
 */
export async function checkMemoryRecall(currentTopic: string): Promise<void> {
  if (!currentTopic.trim()) return;

  try {
    const memories = await queryMemories({ limit: 20 });
    const topicLower = currentTopic.toLowerCase();

    for (const memory of memories) {
      if (
        memory.type === 'conversation_summary' ||
        memory.type === 'fact'
      ) {
        // Simple keyword overlap check
        const keywords = memory.content.toLowerCase().split(/[\s\n,，。]+/).filter(Boolean);
        const overlap = keywords.filter((kw) => kw.length > 3 && topicLower.includes(kw));
        if (overlap.length >= 2) {
          enqueueAction({
            type: 'memory_recall',
            topic: memory.content.slice(0, 60),
            content: memory.content,
          });
          return;
        }
      }
    }
  } catch {
    // Memory recall is best-effort; fail silently
  }
}

// ----- 5. Inactivity Notice -----

/**
 * If user has been idle for extended period, gentle nudge.
 */
export function checkInactivity(): void {
  const state = useStore.getState();
  if (isUserTyping()) return;
  if (isUserIdle(2 * 60 * 60 * 1000)) {
    // After 2 hours of inactivity
    const msg = getMoodMessage();
    enqueueAction({
      type: 'text',
      content: `${msg} 有事叫我，我一直都在～`,
    });
    state.setCooldown('lastInactivityNoticeTime', Date.now());
  }
}

// ----- Helpers -----

function isInSleepTime(currentHour: number, sleepStart: string, sleepEnd: string): boolean {
  const [startHour] = sleepStart.split(':').map(Number);
  const [endHour] = sleepEnd.split(':').map(Number);

  if (startHour > endHour) {
    // Sleep spans midnight (e.g., 23:00 - 07:00)
    return currentHour >= startHour || currentHour < endHour;
  } else {
    // Sleep within same day (rare)
    return currentHour >= startHour && currentHour < endHour;
  }
}
