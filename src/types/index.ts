// Core types for PixelPal

export * from './skill';
export type PersonaRole =
  | 'MemoryExpert'
  | 'EmotionAnalyst'
  | 'Advisor'
  | 'Researcher'
  | 'Coder';

export interface AIConfig {
  provider: 'openai' | 'anthropic' | 'azure-openai' | 'custom' | 'minimax' | 'xiaomi' | 'zhipu' | 'qwen' | 'feishu';
  apiKey: string;
  baseURL?: string;
  model: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  toolCallId?: string; // For tool role messages
  personaId?: string;  // For multi-persona chat isolation
}

export interface Event {
  id: string;
  title: string;
  startTime: string; // ISO date string
  endTime: string;
  location?: string;
  description?: string;
  reminders: number[];
  source: 'local' | 'google';
  syncId?: string;
}

export type TaskStatus = 'ai_suggestion' | 'todo' | 'in_progress' | 'done';

export interface Task {
  id: string;
  title: string;
  dueDate?: string; // ISO date string
  priority: 'low' | 'medium' | 'high';
  status: TaskStatus;
  createdAt: string;
  completedAt?: string;
}

export interface DocumentFile {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'xlsx' | 'txt';
  size: number;
  content: string;
  uploadedAt: string;
}

export interface EmailAccount {
  type: 'gmail';
  email: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number; // Unix timestamp in ms
}

export interface EmailMessage {
  id: string;
  from: { name?: string; address: string };
  to: { name?: string; address: string }[];
  subject: string;
  body: string;
  date: string;
  read: boolean;
  snippet: string;
}

export interface WritingDraft {
  id: string;
  title: string;
  outline: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export type PetState = 'idle' | 'speaking' | 'thinking' | 'notification' | 'sleep';
export type PetPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

export interface PetStatus {
  state: PetState;
  position: PetPosition;
  x: number;
  y: number;
  message?: string;
}

export type GreetingFrequency = 'high' | 'medium' | 'low' | 'off';

export interface InteractionSettings {
  greetingFrequency: GreetingFrequency;
  sleepTimeStart: string; // "HH:mm" format, e.g. "23:00"
  sleepTimeEnd: string;   // "HH:mm" format, e.g. "07:00"
  collabRoleIcons?: Record<PersonaRole, string>; // Custom emoji icons per role
}

export interface InteractionCooldowns {
  lastGreetingTime: number;       // timestamp
  lastInactivityNoticeTime: number; // timestamp
  lastScheduleNoticeTime: number; // timestamp
  lastEmailNoticeTime: number;    // timestamp
}

export type PersonaId = 'default' | 'playful' | 'professional' | 'gentle' | 'witty';

export interface CompanionState {
  personaId: PersonaId;
  moodId: string;
  customName: string;
  memoryEnabled: boolean;   // Whether memory persistence is active
  autoSummarize: boolean;  // Whether to auto-summarize chat history
}

export interface VoiceSettings {
  sttEnabled: boolean;
  ttsEnabled: boolean;
  ttsRate: number;
  ttsPitch: number;
  ttsVolume: number;
  ttsVoice: string;
}

// Web Speech API type declarations (not in standard TypeScript lib)
export interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

export interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

export interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

export interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export interface SpeechRecognitionErrorEvent extends Event {
  error: SpeechRecognitionError;
}

export type SpeechRecognitionError = 'no-speech' | 'aborted' | 'audio-capture' | 'network' | 'not-allowed' | 'service-not-allowed' | 'bad-grammar' | 'unknown';

export interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onaudiostart: ((this: ISpeechRecognition, ev: Event) => void) | null;
  onaudioend: ((this: ISpeechRecognition, ev: Event) => void) | null;
  onend: ((this: ISpeechRecognition, ev: Event) => void) | null;
  onerror: ((this: ISpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onnomatch: ((this: ISpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: ISpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onsoundend: ((this: ISpeechRecognition, ev: Event) => void) | null;
  onsoundstart: ((this: ISpeechRecognition, ev: Event) => void) | null;
  onspeechend: ((this: ISpeechRecognition, ev: Event) => void) | null;
  onspeechstart: ((this: ISpeechRecognition, ev: Event) => void) | null;
  onstart: ((this: ISpeechRecognition, ev: Event) => void) | null;
  abort(): void;
  start(): void;
  stop(): void;
}
