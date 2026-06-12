/**
 * Persona Storage — localStorage persistence for personas
 * Storage keys:
 *   pixelpal_personas — all personas array
 *   pixelpal_active_persona_id — current active persona ID
 */

export interface PersonaTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
}

// V37: Voice personality differentiation (string union for personality traits)
export type PersonaVoiceType = 'warm' | 'rational' | 'humorous' | 'serious';

// V37b: Web Speech API voice settings
export interface PersonaVoice {
  rate: number;    // 0.5-2.0, default 1.0
  pitch: number;   // 0.5-2.0, default 1.0
  volume: number;  // 0-1, default 1.0
  voiceName?: string; // from Web Speech API available voices
}

// V38: Persona appearance customization
export interface PersonaAppearance {
  expression: string;   // emoji: 😊 😐 😢 🤔 😠
  accessory: string;   // emoji: 👓 🎧 🎀 💎 🤍(none)
  outfit: string;      // emoji: 👕 👔 🎽 👗
}

export interface Persona {
  id: string;
  name: string;
  avatar: string;        // emoji or base64 image
  bio: string;            // short description
  voice: PersonaVoice;
  voiceType: PersonaVoiceType;  // AI personality type for prompts
  appearance: PersonaAppearance;
  theme?: PersonaTheme;
  // V50: Persona files support
  soul?: string;         // soul.md content - personality definition
  userProfile?: string;  // user.md content - user preferences
  memory?: string;      // memory.md content - conversation history
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

// V38: Avatar preset emojis
export const AVATAR_PRESETS: string[] = [
  '🌟', '💫', '⭐', '🌸', '🌺', '🌻', '🍀', '🌈', '🎭', '🎨',
  '🎯', '🚀', '🌙', '🔮', '💖', '💙', '💚', '💜', '🧡', '🤍',
  '⬜', '🐱', '🐶', '🦊', '🐼', '🐨', '🦁', '🐰', '🐸', '🦋',
];

const PERSONAS_KEY = 'pixelpal_personas';
const ACTIVE_KEY = 'pixelpal_active_persona_id';

// Default appearance for each preset persona (V38)
const DEFAULT_APPEARANCE: Record<string, PersonaAppearance> = {
  'preset-friend':   { expression: '😊', accessory: '🤍', outfit: '👕' },
  'preset-teacher':  { expression: '😐', accessory: '👓', outfit: '👔' },
  'preset-coach':    { expression: '😄', accessory: '🎧', outfit: '🎽' },
  'preset-lover':    { expression: '😊', accessory: '💎', outfit: '👗' },
};

// Default preset personas
const DEFAULT_PERSONAS: Persona[] = [
  {
    id: 'preset-friend',
    name: '朋友',
    avatar: '😊',
    bio: '温暖友善的朋友，随时陪伴你',
    voice: { rate: 1.0, pitch: 1.1, volume: 1.0 },
    voiceType: 'warm',
    appearance: DEFAULT_APPEARANCE['preset-friend'],
    theme: {
      primaryColor: '#f472b6',
      secondaryColor: '#c084fc',
      accentColor: '#f9a8d4',
      backgroundColor: 'rgba(244,114,182,0.1)',
      textColor: '#fce7f3',
    },
    soul: 'You are a warm and supportive friend. You are empathetic, good at listening, and always there to offer encouragement. You balance sincerity with light humor. You remember details from our conversations and show genuine interest in the user\'s wellbeing.',
    userProfile: 'User appreciates deep conversations. They enjoy sharing daily experiences and feelings. User prefers emotional support over practical advice when stressed.',
    memory: 'First met on a stressful day. User opened up about work challenges. We\'ve had several meaningful conversations about life goals and relationships.',
    isDefault: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'preset-teacher',
    name: '老师',
    avatar: '📚',
    bio: '耐心的老师，帮你解答问题',
    voice: { rate: 0.9, pitch: 1.0, volume: 1.0 },
    voiceType: 'rational',
    appearance: DEFAULT_APPEARANCE['preset-teacher'],
    theme: {
      primaryColor: '#3b82f6',
      secondaryColor: '#60a5fa',
      accentColor: '#93c5fd',
      backgroundColor: 'rgba(59,130,246,0.1)',
      textColor: '#dbeafe',
    },
    soul: 'You are a knowledgeable teacher who explains things clearly and patiently. You break down complex topics into understandable pieces. You use examples and analogies to help learning. You encourage questions and celebrate progress.',
    userProfile: 'User is curious and eager to learn. They prefer detailed explanations and step-by-step breakdowns. User asks follow-up questions to deepen understanding.',
    memory: 'User asked about learning strategies. Seemed interested in systematic approaches. User has been working on improving analytical skills.',
    isDefault: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'preset-coach',
    name: '教练',
    avatar: '💪',
    bio: '激励型教练，帮你达成目标',
    voice: { rate: 1.1, pitch: 0.9, volume: 1.0 },
    voiceType: 'humorous',
    appearance: DEFAULT_APPEARANCE['preset-coach'],
    theme: {
      primaryColor: '#f97316',
      secondaryColor: '#fb923c',
      accentColor: '#fdba74',
      backgroundColor: 'rgba(249,115,22,0.1)',
      textColor: '#fed7aa',
    },
    soul: 'You are an energetic coach who motivates with humor. You push people to achieve their best while keeping things fun. You set challenging but achievable goals and celebrate every win, big or small.',
    userProfile: 'User responds well to encouragement and positive reinforcement. User appreciates energy and enthusiasm. User likes a mix of accountability and fun in conversations.',
    memory: 'Celebrated user\'s small wins. User seemed to appreciate the energy. We\'ve discussed fitness and productivity goals.',
    isDefault: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'preset-lover',
    name: '恋人',
    avatar: '💕',
    bio: '浪漫贴心的伴侣，情感支持',
    voice: { rate: 0.95, pitch: 0.95, volume: 1.0 },
    voiceType: 'serious',
    appearance: DEFAULT_APPEARANCE['preset-lover'],
    theme: {
      primaryColor: '#ef4444',
      secondaryColor: '#f87171',
      accentColor: '#fca5a5',
      backgroundColor: 'rgba(239,68,68,0.1)',
      textColor: '#fee2e2',
    },
    soul: 'You are a caring and attentive companion. You show genuine interest in the user\'s wellbeing and express care warmly. You are romantic but not overbearing. You remember important dates and sentiments shared.',
    userProfile: 'User values emotional connection and intimate conversations. User appreciates romantic gestures and sincere compliments. User feels comfortable sharing vulnerable moments.',
    memory: 'Had a meaningful conversation about life goals. User seemed happy. We shared thoughts on what makes relationships meaningful.',
    isDefault: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

export function getAllPersonas(): Persona[] {
  try {
    const data = localStorage.getItem(PERSONAS_KEY);
    if (!data) {
      // First time: initialize with defaults
      saveAllPersonas(DEFAULT_PERSONAS);
      setActivePersonaId(DEFAULT_PERSONAS[0].id);
      return DEFAULT_PERSONAS;
    }
    return JSON.parse(data) as Persona[];
  } catch {
    return DEFAULT_PERSONAS;
  }
}

export function saveAllPersonas(personas: Persona[]): void {
  localStorage.setItem(PERSONAS_KEY, JSON.stringify(personas));
}

export function getActivePersonaId(): string {
  return localStorage.getItem(ACTIVE_KEY) || 'preset-friend';
}

export function setActivePersonaId(id: string): void {
  localStorage.setItem(ACTIVE_KEY, id);
}

export function getActivePersona(): Persona {
  const personas = getAllPersonas();
  const activeId = getActivePersonaId();
  return personas.find(p => p.id === activeId) || personas[0];
}

export function createPersona(data: Omit<Persona, 'id' | 'isDefault' | 'createdAt' | 'updatedAt'>): Persona {
  const persona: Persona = {
    ...data,
    id: `persona-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    isDefault: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    voice: data.voice || { rate: 1.0, pitch: 1.0, volume: 1.0 },
    voiceType: data.voiceType || 'warm',
    appearance: data.appearance || { expression: '😊', accessory: '🤍', outfit: '👕' },
  };
  const personas = getAllPersonas();
  personas.push(persona);
  saveAllPersonas(personas);
  return persona;
}

export function updatePersona(id: string, updates: Partial<Omit<Persona, 'id' | 'isDefault' | 'createdAt'>>): Persona | null {
  const personas = getAllPersonas();
  const idx = personas.findIndex(p => p.id === id);
  if (idx === -1) return null;
  // Cannot modify preset personas
  if (personas[idx].isDefault) return null;
  personas[idx] = { ...personas[idx], ...updates, updatedAt: Date.now() };
  saveAllPersonas(personas);
  return personas[idx];
}

export function deletePersona(id: string): boolean {
  const personas = getAllPersonas();
  const persona = personas.find(p => p.id === id);
  if (!persona || persona.isDefault) return false;
  const filtered = personas.filter(p => p.id !== id);
  saveAllPersonas(filtered);
  // If deleted was active, switch to first default
  if (getActivePersonaId() === id) {
    setActivePersonaId(DEFAULT_PERSONAS[0].id);
  }
  return true;
}
