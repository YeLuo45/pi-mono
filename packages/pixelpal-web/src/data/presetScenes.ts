import type { Scene } from '../types/scene';

export interface PresetScene {
  id: string;
  name: string;
  description: string;
  emoji: string;
  scene: Omit<Scene, 'id' | 'createdAt'>;
}

export const PRESET_SCENES: PresetScene[] = [
  {
    id: 'preset-morning',
    name: '起床模式',
    description: '每天早上 7:00 提醒你起床',
    emoji: '🌅',
    scene: {
      name: '起床模式',
      enabled: true,
      isQuick: true,
      triggers: [{ type: 'time', time: '07:00', repeat: 'daily' }],
      actions: [
        { type: 'speak', params: { text: '早上好！新的一天开始了。' } },
        { type: 'notify', params: { title: '🌅 起床啦', body: '新的一天，记得给自己一个微笑' } },
      ],
      tags: ['早晨', '日常'],
    },
  },
  {
    id: 'preset-bedtime',
    name: '睡前模式',
    description: '每天晚上 22:00 祝你晚安',
    emoji: '🌙',
    scene: {
      name: '睡前模式',
      enabled: true,
      isQuick: true,
      triggers: [{ type: 'time', time: '22:00', repeat: 'daily' }],
      actions: [
        { type: 'speak', params: { text: '晚安！祝你有个好梦。' } },
        { type: 'notify', params: { title: '🌙 晚安', body: '早点休息，明天见' } },
      ],
      tags: ['夜间', '日常'],
    },
  },
  {
    id: 'preset-focus',
    name: '专注模式',
    description: '说"开启专注"即可切换到专注状态',
    emoji: '🎯',
    scene: {
      name: '专注模式',
      enabled: true,
      isQuick: true,
      triggers: [{ type: 'keyword', pattern: '*专注*' }],
      actions: [
        { type: 'notify', params: { title: '🎯 专注模式已开启', body: '保持专注，中途不要分心哦' } },
        { type: 'speak', params: { text: '专注模式已开启，加油！' } },
      ],
      tags: ['工作', '效率'],
    },
  },
  {
    id: 'preset-break',
    name: '休息提醒',
    description: '工作每2小时提醒你休息一下',
    emoji: '☕',
    scene: {
      name: '休息提醒',
      enabled: true,
      isQuick: false,
      triggers: [{ type: 'time', time: '10:00', repeat: 'daily' }],
      actions: [
        { type: 'notify', params: { title: '☕ 休息一下', body: '工作了一小时，站起来动一动吧' } },
        { type: 'speak', params: { text: '该休息一下了，站起来活动活动。' } },
      ],
      tags: ['工作', '健康'],
    },
  },
  {
    id: 'preset-motivation',
    name: '每日激励',
    description: '每天早上 8:30 给你打气',
    emoji: '💪',
    scene: {
      name: '每日激励',
      enabled: true,
      isQuick: false,
      triggers: [{ type: 'time', time: '08:30', repeat: 'weekdays' }],
      actions: [
        { type: 'speak', params: { text: '加油！今天也要元气满满！' } },
        { type: 'notify', params: { title: '💪 每日激励', body: '你比你想象的更强大' } },
      ],
      tags: ['早晨', '激励'],
    },
  },
];

export function createSceneFromPreset(preset: PresetScene): Scene {
  return {
    ...preset.scene,
    id: `scene-${Date.now()}-${preset.id}`,
    createdAt: Date.now(),
  };
}
