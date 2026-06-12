/**
 * ActionTypes.ts — PixelPal V3 Action Type Definitions
 */

// ----- Core Action Types -----

export type CompanionActionType =
  | 'text'
  | 'remind'
  | 'celebrate'
  | 'greet'
  | 'suggest'
  | 'memory_recall';

export type CompanionAction =
  | { type: 'text'; content: string }
  | {
      type: 'remind';
      taskId: string;
      content: string;
      taskTitle: string;
      urgency: 'overdue' | 'soon' | 'normal';
    }
  | { type: 'celebrate'; achievement: string }
  | { type: 'greet'; greeting: string }
  | { type: 'suggest'; suggestion: string; reason: string }
  | { type: 'memory_recall'; topic: string; content: string };

// ----- Queue Item -----

export interface ActionQueueItem {
  id: string;
  action: CompanionAction;
  /** Higher = more important */
  priority: number;
  createdAt: number;
  displayedAt: number | null;
}

// ----- Action Badge for inline embedding -----

export interface ActionBadge {
  type: CompanionActionType;
  label: string;
  color: string;      // CSS color string
  bgColor: string;    // CSS background color
  icon: string;       // emoji or short text
}

// ----- Action Toast (standalone toast notification) -----

export interface ActionToastProps {
  action: CompanionAction;
  onDismiss: () => void;
  onActionTake?: (action: CompanionAction) => void;
}

// ----- Action Colors -----

export const ACTION_COLORS: Record<CompanionActionType, { color: string; bgColor: string }> = {
  text: { color: '#FFFFFF', bgColor: 'rgba(155, 127, 212, 0.2)' },
  remind: { color: '#FFE082', bgColor: 'rgba(255, 224, 130, 0.15)' },
  celebrate: { color: '#81C784', bgColor: 'rgba(129, 199, 132, 0.15)' },
  greet: { color: '#64B5F6', bgColor: 'rgba(100, 181, 246, 0.15)' },
  suggest: { color: '#BA68C8', bgColor: 'rgba(186, 104, 200, 0.15)' },
  memory_recall: { color: '#4DD0E1', bgColor: 'rgba(77, 208, 225, 0.15)' },
};

export const ACTION_ICONS: Record<CompanionActionType, string> = {
  text: '💬',
  remind: '⏰',
  celebrate: '🎉',
  greet: '👋',
  suggest: '💡',
  memory_recall: '🧠',
};

export const ACTION_LABELS: Record<CompanionActionType, string> = {
  text: '消息',
  remind: '提醒',
  celebrate: '庆祝',
  greet: '问候',
  suggest: '建议',
  memory_recall: '记忆',
};
