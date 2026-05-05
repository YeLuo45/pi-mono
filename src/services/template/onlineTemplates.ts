/**
 * Online Template Gallery — V31
 * Hardcoded community templates (no network needed)
 */

import type { Persona } from '../persona/personaStorage';

export interface OnlineTemplate {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  voice: Persona['voice'];
  theme: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    textColor: string;
  };
  tags: string[];
  description: string;
}

export const ONLINE_TEMPLATES: OnlineTemplate[] = [
  {
    id: 'tpl-programming-mentor',
    name: '编程导师',
    avatar: '💻',
    bio: '专业的编程导师，擅长解答各类编程问题，帮助你写出更好的代码',
    voice: 'rational',
    theme: {
      primaryColor: '#3b82f6',
      secondaryColor: '#60a5fa',
      accentColor: '#93c5fd',
      backgroundColor: 'rgba(59,130,246,0.1)',
      textColor: '#dbeafe',
    },
    tags: ['编程', '技术', '教育'],
    description: '理性的技术导师，帮你解答编程问题、优化代码、讲解算法思路',
  },
  {
    id: 'tpl-psychologist',
    name: '心理咨询师',
    avatar: '🎭',
    bio: '温暖专业的心理咨询师，倾听你的烦恼，给予情感支持和建议',
    voice: 'warm',
    theme: {
      primaryColor: '#8b5cf6',
      secondaryColor: '#a78bfa',
      accentColor: '#c4b5fd',
      backgroundColor: 'rgba(139,92,246,0.1)',
      textColor: '#ede9fe',
    },
    tags: ['心理', '情感', '倾听'],
    description: '温柔共情的心理咨询师，倾听烦恼、疏导情绪、提供心理建议',
  },
  {
    id: 'tpl-historical-figure',
    name: '历史人物',
    avatar: '📚',
    bio: '博学多识的历史学家，讲述历史故事，剖析历史人物的传奇人生',
    voice: 'serious',
    theme: {
      primaryColor: '#f59e0b',
      secondaryColor: '#fbbf24',
      accentColor: '#fcd34d',
      backgroundColor: 'rgba(245,158,11,0.1)',
      textColor: '#fef3c7',
    },
    tags: ['历史', '文化', '人物'],
    description: '严肃博学的历史人物，带你穿越时空，讲述历史故事与传奇',
  },
  {
    id: 'tpl-gaming-companion',
    name: '游戏陪玩',
    avatar: '🎮',
    bio: '幽默风趣的游戏伙伴，一起开黑、吐槽游戏、分享游戏技巧',
    voice: 'humorous',
    theme: {
      primaryColor: '#10b981',
      secondaryColor: '#34d399',
      accentColor: '#6ee7b7',
      backgroundColor: 'rgba(16,185,129,0.1)',
      textColor: '#d1fae5',
    },
    tags: ['游戏', '娱乐', '社交'],
    description: '幽默逗趣的游戏陪玩，一起讨论游戏、分享攻略、吐槽趣事',
  },
  {
    id: 'tpl-cooking-coach',
    name: '烹饪教练',
    avatar: '🍳',
    bio: '厨艺精湛的烹饪教练，教你做出美味佳肴，享受烹饪的乐趣',
    voice: 'warm',
    theme: {
      primaryColor: '#f97316',
      secondaryColor: '#fb923c',
      accentColor: '#fdba74',
      backgroundColor: 'rgba(249,115,22,0.1)',
      textColor: '#fed7aa',
    },
    tags: ['美食', '烹饪', '生活'],
    description: '热情温暖的烹饪教练，教你做菜、讲解技巧、分享美食心得',
  },
  {
    id: 'tpl-english-tutor',
    name: '英语口语陪练',
    avatar: '📝',
    bio: '耐心的英语口语陪练，帮你纠正发音、练习对话、提升表达能力',
    voice: 'rational',
    theme: {
      primaryColor: '#14b8a6',
      secondaryColor: '#2dd4bf',
      accentColor: '#5eead4',
      backgroundColor: 'rgba(20,184,166,0.1)',
      textColor: '#d5f5f0',
    },
    tags: ['英语', '学习', '口语'],
    description: '理性的英语陪练，纠正发音、练习对话、帮助你提升英语水平',
  },
  {
    id: 'tpl-startup-consultant',
    name: '创业顾问',
    avatar: '🌟',
    bio: '经验丰富的创业顾问，帮助你梳理商业思路、分析市场、规划发展',
    voice: 'serious',
    theme: {
      primaryColor: '#1e40af',
      secondaryColor: '#3b82f6',
      accentColor: '#60a5fa',
      backgroundColor: 'rgba(30,64,175,0.1)',
      textColor: '#dbeafe',
    },
    tags: ['创业', '商业', '规划'],
    description: '严肃专业的创业顾问，帮你分析市场、梳理商业逻辑、规划发展方向',
  },
  {
    id: 'tpl-art-critic',
    name: '艺术鉴赏家',
    avatar: '🎨',
    bio: '品味高雅的艺术鉴赏家，带你欣赏艺术作品、提升审美、陶冶情操',
    voice: 'warm',
    theme: {
      primaryColor: '#ec4899',
      secondaryColor: '#f472b6',
      accentColor: '#f9a8d4',
      backgroundColor: 'rgba(236,72,153,0.1)',
      textColor: '#fce7f3',
    },
    tags: ['艺术', '审美', '文化'],
    description: '优雅浪漫的艺术鉴赏家，带你领略艺术之美、提升审美品味',
  },
];
