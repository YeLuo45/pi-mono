import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AIConfig, Message, Event, Task, DocumentFile, PetStatus, EmailAccount, InteractionSettings, InteractionCooldowns, CompanionState, PersonaId, VoiceSettings, TaskStatus } from '../types';
import type { EmotionState } from '../services/voice/emotionDetector';
import { getActivePersona, getAllPersonas } from '../services/persona/personaStorage';
import { applyPersonaTheme, resetPersonaTheme } from '../utils/personaTheme';
import { getPersonaSystemPrompt } from '../services/persona/personaPrompt';
import type { Persona, PersonaVoice } from '../services/persona/personaStorage';
import { setVoiceConfig as setVoiceServiceConfig } from '../services/voice/voiceService';
import type { AppThemePreset } from '../utils/appTheme';

const LOCAL_TEMPLATES_KEY = 'pixelpal_local_templates';

// CollabSession — multi-persona collaboration (not persisted)
export interface CollabSession {
  active: boolean;
  participants: string[]; // personaIds
}

// CollabMessage — message from a specific persona in collab mode
export interface CollabMessage {
  id: string;
  personaId: string;
  content: string;
  timestamp: number;
}

// Memo — inter-persona memo/note (V36)
export interface Memo {
  id: string;
  fromPersonaId: string;
  toPersonaId: string;
  content: string;
  read: boolean;
  createdAt: number;
}

// GameSession — interactive mini-game session (V39)
export interface GameSession {
  id: string;
  personaId: string;
  gameType: 'guess-number' | 'trivia' | 'idiom';
  state: 'idle' | 'playing' | 'won' | 'lost';
  score: number;
  rounds: number;
  data: Record<string, unknown>;
}

// V42: Collaboration History Entry
export interface CollabHistoryEntry {
  id: string;
  task: string;           // 任务描述
  timestamp: number;      // 开始时间
  duration: number;       // 持续时长（秒）
  status: 'completed' | 'failed' | 'stopped';
  participants: string[];  // personaIds
  conclusion?: string;    // 聚合结论摘要
  messages: CollabMessage[]; // 完整对话记录
}

interface AppState {
  // AI Config
  aiConfig: AIConfig;
  setAIConfig: (config: AIConfig) => void;

  // Models (for ModelRegistry - multi-model support)
  models: import('../services/ai/model-registry').ModelConfig[];
  setModels: (models: import('../services/ai/model-registry').ModelConfig[]) => void;
  addModel: (model: import('../services/ai/model-registry').ModelConfig) => void;
  updateModel: (id: string, updates: Partial<import('../services/ai/model-registry').ModelConfig>) => void;
  removeModel: (id: string) => void;

  // Chat
  messages: Message[];
  addMessage: (msg: Omit<Message, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  isAIThinking: boolean;
  aiThinkingContent: string | null;
  setAIThinking: (thinking: boolean) => void;
  setAIThinkingContent: (content: string | null) => void;

  // Events / Calendar
  events: Event[];
  addEvent: (event: Event) => void;
  updateEvent: (id: string, event: Partial<Event>) => void;
  deleteEvent: (id: string) => void;

  // Tasks
  tasks: Task[];
  addTask: (task: Task) => void;
  updateTask: (id: string, task: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  moveTask: (id: string, newStatus: TaskStatus) => void;

  // Documents
  documents: DocumentFile[];
  addDocument: (doc: DocumentFile) => void;
  removeDocument: (id: string) => void;

  // Email
  emailAccount: EmailAccount | null;
  setEmailAccount: (account: EmailAccount | null) => void;
  emailRefreshToken: (token: string) => void;

  // Pet
  petStatus: PetStatus;
  setPetStatus: (status: Partial<PetStatus>) => void;
  setPetMessage: (message?: string) => void;

  // Interaction Settings
  interactionSettings: InteractionSettings;
  setInteractionSettings: (settings: Partial<InteractionSettings>) => void;

  // Interaction Cooldowns
  cooldowns: InteractionCooldowns;
  setCooldown: (key: keyof InteractionCooldowns, value: number) => void;

  // Last activity (for inactivity detection)
  lastActivityTime: number;
  updateLastActivity: () => void;

  // UI
  activePanel: 'chat' | 'calendar' | 'tasks' | 'document' | 'knowledge' | 'email' | 'writing' | 'settings' | 'team' | 'plugin' | 'memory' | 'analytics' | 'scenes' | 'mall';
  setActivePanel: (panel: AppState['activePanel']) => void;

  // Active plugin (used when activePanel === 'plugin')
  activePluginId: string | null;
  setActivePluginId: (id: string | null) => void;

  // Companion Personality & Memory
  companion: CompanionState;
  setPersona: (personaId: PersonaId) => void;
  setMood: (moodId: string) => void;
  setCustomName: (name: string) => void;
  setMemoryEnabled: (enabled: boolean) => void;
  setAutoSummarize: (enabled: boolean) => void;

  // Voice Settings
  voiceSettings: VoiceSettings;
  setVoiceSettings: (settings: Partial<VoiceSettings>) => void;

  // Emotion State
  currentEmotion: EmotionState;
  setCurrentEmotion: (emotion: EmotionState) => void;
  emotionHistory: Array<{ emotion: EmotionState; timestamp: number; confidence: number }>;
  addEmotionEntry: (emotion: EmotionState, confidence: number) => void;
  clearEmotionHistory: () => void;

  // Language
  language: 'zh' | 'en';
  setLanguage: (lang: 'zh' | 'en') => void;

  // Active Persona (multi-persona system)
  activePersonaId: string;
  personaSystemPrompt: string;
  personaUsageCount: Record<string, number>;
  personaFollowTheme: boolean;
  personaIntimacy: Record<string, number>;
  setActivePersonaId: (id: string) => void;
  setPersonaFollowTheme: (v: boolean) => void;
  clearMessagesForPersona: (personaId: string) => void;
  setMessages: (messages: Message[]) => void;
  loadMessagesForPersona: (personaId: string) => void;
  setPersonaIntimacy: (personaId: string, value: number) => void;

  // Collab Session (multi-persona collaboration, NOT persisted)
  collabSession: CollabSession;
  collabMessages: CollabMessage[];
  collabPresets: Record<string, string[]>;
  startCollab: (participants: string[]) => void;
  endCollab: () => void;
  addCollabMessage: (msg: Omit<CollabMessage, 'id' | 'timestamp'>) => void;
  saveCollabPreset: (name: string, participants: string[]) => void;
  loadCollabPreset: (name: string) => string[] | null;
  deleteCollabPreset: (name: string) => void;

  // Local Template Storage (V31)
  localTemplates: Persona[];
  saveAsTemplate: (persona: Persona) => void;
  removeLocalTemplate: (templateId: string) => void;

  // V33: App-Level Theme System
  appThemeMode: 'light' | 'dark' | 'system';
  appThemePresetId: string; // 'light' | 'dark' | 'sunset' | 'forest' | 'custom'
  customTheme: AppThemePreset | null;
  setAppThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  setAppThemePreset: (id: string) => void;
  setCustomTheme: (theme: AppThemePreset | null) => void;

  // V36: Inter-Persona Memo System
  memos: Memo[];
  memoNotification: string | null;
  chatInputMention: string | null; // set to @personaName to insert into ChatPanel input
  sendMemo: (toPersonaId: string, content: string) => void;
  markMemoRead: (memoId: string) => void;
  markAllMemosReadForPersona: (personaId: string) => void;
  getUnreadMemosCount: (personaId: string) => number;
  setMemoNotification: (msg: string | null) => void;
  setChatInputMention: (mention: string | null) => void;

  // V39: Game Session
  gameSession: GameSession | null;
  setGameSession: (session: GameSession | null) => void;
  clearGameSession: () => void;
  addIntimacy: (personaId: string, delta: number) => void;

  // V37: Voice personality differentiation
  getActivePersonaVoice: () => PersonaVoice | null;
  testVoice: (voice: PersonaVoice, personaName?: string) => void;

  // V40: Collaboration Mode UI
  collaborationMode: boolean;
  setCollaborationMode: (v: boolean) => void;
  collaborationProgress: CollaborationProgress[];
  setCollaborationProgress: (progress: CollaborationProgress[]) => void;
  updateCollaborationProgress: (role: string, status: 'pending' | 'running' | 'done', output?: string) => void;

  // V42: Collaboration History (persisted in localStorage)
  collabHistory: CollabHistoryEntry[];
  addCollabHistoryEntry: (entry: Omit<CollabHistoryEntry, 'id'>) => void;
  deleteCollabHistoryEntry: (id: string) => void;
  clearCollabHistory: () => void;
}

// V40: Collaboration progress tracking
export interface CollaborationProgress {
  role: string;
  roleLabel: string;
  emoji: string;
  status: 'pending' | 'running' | 'done';
  output?: string;
}

// Default model templates
const createDefaultModels = () => {
  const templates = [
    {
      name: 'MiniMax M2.7',
      provider: 'minimax',
      modelName: 'MiniMax-Text-01',
      apiBaseUrl: 'https://api.minimax.chat/v1',
      temperature: 0.7,
      maxTokens: 4096,
      priority: 0,
    },
    {
      name: 'OpenAI GPT-4o Mini',
      provider: 'openai',
      modelName: 'gpt-4o-mini',
      apiBaseUrl: 'https://api.openai.com/v1',
      temperature: 0.7,
      maxTokens: 4096,
      priority: 1,
    },
    {
      name: 'Anthropic Claude 3.5 Sonnet',
      provider: 'anthropic',
      modelName: 'claude-3-5-sonnet-20241022',
      apiBaseUrl: 'https://api.anthropic.com/v1',
      temperature: 0.7,
      maxTokens: 4096,
      priority: 2,
    },
    {
      name: 'Zhipu GLM-4',
      provider: 'zhipu',
      modelName: 'glm-4',
      apiBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
      temperature: 0.7,
      maxTokens: 4096,
      priority: 3,
    },
    {
      name: 'Google Gemini 2.0 Flash',
      provider: 'gemini',
      modelName: 'gemini-2.0-flash',
      apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      temperature: 0.7,
      maxTokens: 4096,
      priority: 4,
    },
    {
      name: 'Xiaomi MiLM',
      provider: 'xiaomi',
      modelName: 'MiLM',
      apiBaseUrl: 'https://account.platform.minimax.io',
      temperature: 0.7,
      maxTokens: 4096,
      priority: 5,
    },
  ];

  return templates.map((template, index) => ({
    ...template,
    id: `model-${index + 1}`,
    apiKey: '',
    isEnabled: index === 0, // Only first one enabled by default
  }));
};

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // AI Config defaults (kept for backward compatibility with Settings UI)
      aiConfig: {
        provider: 'openai',
        apiKey: '',
        baseURL: '',
        model: 'gpt-4o-mini',
      },
      setAIConfig: (config) => set({ aiConfig: config }),

      // Models (ModelRegistry support)
      models: createDefaultModels(),
      setModels: (models) => set({ models }),
      addModel: (model) => set((state) => ({ models: [...state.models, model] })),
      updateModel: (id, updates) =>
        set((state) => ({
          models: state.models.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        })),
      removeModel: (id) => set((state) => ({ models: state.models.filter((m) => m.id !== id) })),

      // Chat
      messages: [],
      addMessage: (msg) =>
        set((state) => ({
          messages: [
            ...state.messages,
            {
              ...msg,
              id: crypto.randomUUID(),
              timestamp: Date.now(),
            },
          ],
        })),
      clearMessages: () => set({ messages: [] }),
      isAIThinking: false,
      aiThinkingContent: null,
      setAIThinking: (thinking) => set({ isAIThinking: thinking }),
      setAIThinkingContent: (content) => set({ aiThinkingContent: content }),

      // Events
      events: [],
      addEvent: (event) => set((state) => ({ events: [...state.events, event] })),
      updateEvent: (id, updates) =>
        set((state) => ({
          events: state.events.map((e) => (e.id === id ? { ...e, ...updates } : e)),
        })),
      deleteEvent: (id) => set((state) => ({ events: state.events.filter((e) => e.id !== id) })),

      // Tasks
      tasks: [],
      addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
      updateTask: (id, updates) =>
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),
      deleteTask: (id) => set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),
      moveTask: (id: string, newStatus: TaskStatus) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  status: newStatus,
                  completedAt: newStatus === 'done' ? new Date().toISOString() : undefined,
                }
              : t
          ),
        })),

      // Documents
      documents: [],
      addDocument: (doc) => set((state) => ({ documents: [...state.documents, doc] })),
      removeDocument: (id) => set((state) => ({ documents: state.documents.filter((d) => d.id !== id) })),

      // Email
      emailAccount: null,
      setEmailAccount: (account) => set({ emailAccount: account }),
      emailRefreshToken: (token) =>
        set((state) => ({
          emailAccount: state.emailAccount
            ? { ...state.emailAccount, refreshToken: token }
            : null,
        })),

      // Pet
      petStatus: {
        state: 'idle',
        position: 'bottom-right',
        x: 0,
        y: 0,
      },
      setPetStatus: (status) =>
        set((state) => ({ petStatus: { ...state.petStatus, ...status } })),
      setPetMessage: (message) =>
        set((state) => ({ petStatus: { ...state.petStatus, message } })),

      // Interaction Settings
      interactionSettings: {
        greetingFrequency: 'medium',
        sleepTimeStart: '23:00',
        sleepTimeEnd: '07:00',
      },
      setInteractionSettings: (settings) =>
        set((state) => ({
          interactionSettings: { ...state.interactionSettings, ...settings },
        })),

      // Interaction Cooldowns
      cooldowns: {
        lastGreetingTime: 0,
        lastInactivityNoticeTime: 0,
        lastScheduleNoticeTime: 0,
        lastEmailNoticeTime: 0,
      },
      setCooldown: (key, value) =>
        set((state) => ({
          cooldowns: { ...state.cooldowns, [key]: value },
        })),

      // Last Activity
      lastActivityTime: Date.now(),
      updateLastActivity: () => set({ lastActivityTime: Date.now() }),

      // UI
      activePanel: 'chat',
      setActivePanel: (panel) => set({ activePanel: panel }),

      // Active plugin
      activePluginId: null,
      setActivePluginId: (id) => set({ activePluginId: id }),

      // Companion Personality & Memory
      companion: {
        personaId: 'default',
        moodId: 'happy',
        customName: '',
        memoryEnabled: true,
        autoSummarize: true,
      },
      setPersona: (personaId) =>
        set((state) => ({
          companion: { ...state.companion, personaId },
        })),
      setMood: (moodId) =>
        set((state) => ({
          companion: { ...state.companion, moodId },
        })),
      setCustomName: (customName) =>
        set((state) => ({
          companion: { ...state.companion, customName },
        })),
      setMemoryEnabled: (memoryEnabled) =>
        set((state) => ({
          companion: { ...state.companion, memoryEnabled },
        })),
      setAutoSummarize: (autoSummarize) =>
        set((state) => ({
          companion: { ...state.companion, autoSummarize },
        })),

      // Voice Settings
      voiceSettings: {
        sttEnabled: true,
        ttsEnabled: false,
        ttsRate: 1,
        ttsPitch: 1,
        ttsVolume: 1,
        ttsVoice: '',
      },
      setVoiceSettings: (settings) =>
        set((state) => ({
          voiceSettings: { ...state.voiceSettings, ...settings },
        })),

      // Emotion State
      currentEmotion: 'unknown' as EmotionState,
      setCurrentEmotion: (emotion) => set({ currentEmotion: emotion }),
      emotionHistory: [],
      addEmotionEntry: (emotion, confidence) =>
        set((state) => ({
          emotionHistory: [
            ...state.emotionHistory.slice(-99),
            { emotion, timestamp: Date.now(), confidence },
          ],
        })),
      clearEmotionHistory: () => set({ emotionHistory: [] }),

      // Language
      language: 'zh',
      setLanguage: (language) => set({ language }),

      // Active Persona (multi-persona system)
      activePersonaId: 'preset-friend',
      personaSystemPrompt: getPersonaSystemPrompt(getActivePersona()),
      personaUsageCount: {},
      personaFollowTheme: true,
      personaIntimacy: {},
      setPersonaIntimacy: (personaId, value) =>
        set((state) => ({
          personaIntimacy: { ...state.personaIntimacy, [personaId]: Math.min(100, Math.max(0, value)) },
        })),
      setActivePersonaId: (id) => {
        // V33: First apply the current app theme (so persona theme overlays on top)
        const { appThemeMode, appThemePresetId, customTheme } = useStore.getState();
        const { getPresetById, getSystemTheme, applyAppTheme, resetToDefault, applyCustomTheme } = require('../utils/appTheme');
        let effectivePresetId = appThemePresetId;
        if (appThemeMode === 'system') {
          effectivePresetId = getSystemTheme();
        }
        if (effectivePresetId === 'custom' && customTheme) {
          applyCustomTheme(customTheme);
        } else {
          const preset = getPresetById(effectivePresetId);
          if (preset) applyAppTheme(preset);
          else resetToDefault();
        }

        // Update active persona in localStorage (for personaStorage)
        const { setActivePersonaId: setStorageId } = require('../services/persona/personaStorage');
        setStorageId(id);
        // V37: Apply persona voice config immediately on switch
        const persona = getAllPersonas().find((p) => p.id === id);
        if (persona?.voice) {
          setVoiceServiceConfig(persona.voice);
        }
        // Apply persona theme if personaFollowTheme is enabled
        const { personaFollowTheme } = useStore.getState();
        if (personaFollowTheme) {
          const persona = getAllPersonas().find((p) => p.id === id);
          if (persona?.theme) {
            applyPersonaTheme(persona.theme);
          } else {
            resetPersonaTheme();
          }
        }
        // Update store state and load persona-specific messages
        // Increment usage count for this persona
        set((state) => {
          const newUsageCount = { ...state.personaUsageCount };
          newUsageCount[id] = (newUsageCount[id] || 0) + 1;

          // V36: Check for unread memos and set notification
          let memoNotification: string | null = null;
          if (id) {
            const allPersonas = getAllPersonas();
            const unreadMemos = state.memos.filter((m: Memo) => m.toPersonaId === id && !m.read);
            if (unreadMemos.length > 0) {
              const senderPersona = allPersonas.find((p) => p.id === unreadMemos[0].fromPersonaId);
              const senderName = senderPersona?.name || '有人';
              memoNotification = `📬 ${senderName} 给你留了便条`;
            }
          }

          return {
            activePersonaId: id,
            personaSystemPrompt: getPersonaSystemPrompt(require('../services/persona/personaStorage').getActivePersona()),
            messages: state.messages.filter(
              (m) => !m.personaId || m.personaId === id
            ),
            personaUsageCount: newUsageCount,
            memoNotification,
          };
        });
      },
      setPersonaFollowTheme: (v) => {
        set({ personaFollowTheme: v });
        // V33: Re-apply app theme first before persona theme
        const { appThemeMode, appThemePresetId, customTheme } = useStore.getState();
        const { getPresetById, getSystemTheme, applyAppTheme, resetToDefault, applyCustomTheme } = require('../utils/appTheme');
        let effectivePresetId = appThemePresetId;
        if (appThemeMode === 'system') {
          effectivePresetId = getSystemTheme();
        }
        if (effectivePresetId === 'custom' && customTheme) {
          applyCustomTheme(customTheme);
        } else {
          const preset = getPresetById(effectivePresetId);
          if (preset) applyAppTheme(preset);
          else resetToDefault();
        }
        // If enabling, immediately apply current persona's theme
        if (v) {
          const { activePersonaId } = useStore.getState();
          const persona = getAllPersonas().find((p) => p.id === activePersonaId);
          if (persona?.theme) {
            applyPersonaTheme(persona.theme);
          }
        } else {
          resetPersonaTheme();
        }
      },
      clearMessagesForPersona: (personaId) =>
        set((state) => ({
          messages: state.messages.filter((m) => m.personaId !== personaId),
        })),
      setMessages: (messages) => set({ messages }),
      loadMessagesForPersona: (personaId) =>
        set((state) => ({
          messages: state.messages.filter(
            (m) => !m.personaId || m.personaId === personaId
          ),
        })),

      // Collab Session (NOT persisted)
      collabSession: { active: false, participants: [] },
      collabMessages: [],
      collabPresets: JSON.parse(localStorage.getItem('pixelpal_collab_presets') || '{}'),
      startCollab: (participants) =>
        set({
          collabSession: { active: true, participants },
          collabMessages: [],
        }),
      endCollab: () =>
        set({
          collabSession: { active: false, participants: [] },
          collabMessages: [],
        }),
      addCollabMessage: (msg) =>
        set((state) => ({
          collabMessages: [
            ...state.collabMessages,
            { ...msg, id: crypto.randomUUID(), timestamp: Date.now() },
          ],
        })),
      saveCollabPreset: (name, participants) => {
        const presets = JSON.parse(localStorage.getItem('pixelpal_collab_presets') || '{}');
        presets[name] = participants;
        localStorage.setItem('pixelpal_collab_presets', JSON.stringify(presets));
        set({ collabPresets: presets });
      },
      loadCollabPreset: (name) => {
        const presets = JSON.parse(localStorage.getItem('pixelpal_collab_presets') || '{}');
        return presets[name] || null;
      },
      deleteCollabPreset: (name) => {
        const presets = JSON.parse(localStorage.getItem('pixelpal_collab_presets') || '{}');
        delete presets[name];
        localStorage.setItem('pixelpal_collab_presets', JSON.stringify(presets));
        set({ collabPresets: presets });
      },

      // Local Template Storage (V31)
      localTemplates: JSON.parse(localStorage.getItem(LOCAL_TEMPLATES_KEY) || '[]'),
      saveAsTemplate: (persona) => {
        // Strip id, createdAt, updatedAt, isDefault — add as a local template
        const { id, createdAt, updatedAt, isDefault, ...templateData } = persona;
        const templates = JSON.parse(localStorage.getItem(LOCAL_TEMPLATES_KEY) || '[]') as Persona[];
        // Avoid duplicates by id
        if (!templates.find((t) => t.id === persona.id)) {
          templates.push({ ...templateData, id: persona.id } as Persona);
          localStorage.setItem(LOCAL_TEMPLATES_KEY, JSON.stringify(templates));
          set({ localTemplates: templates });
        }
      },
      removeLocalTemplate: (templateId) => {
        const templates = JSON.parse(localStorage.getItem(LOCAL_TEMPLATES_KEY) || '[]') as Persona[];
        const filtered = templates.filter((t) => t.id !== templateId);
        localStorage.setItem(LOCAL_TEMPLATES_KEY, JSON.stringify(filtered));
        set({ localTemplates: filtered });
      },

      // V33: App-Level Theme System
      appThemeMode: 'system',
      appThemePresetId: 'dark', // default to dark
      customTheme: null,
      setAppThemeMode: (mode) => set({ appThemeMode: mode }),
      setAppThemePreset: (id) => set({ appThemePresetId: id }),
      setCustomTheme: (theme) => set({ customTheme: theme }),

      // V36: Inter-Persona Memo System
      memos: JSON.parse(localStorage.getItem('pixelpal_memos') || '[]'),
      memoNotification: null,
      chatInputMention: null,
      sendMemo: (toPersonaId, content) => {
        const { activePersonaId, memos } = useStore.getState();
        const memo: Memo = {
          id: `memo_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          fromPersonaId: activePersonaId,
          toPersonaId,
          content,
          read: false,
          createdAt: Date.now(),
        };
        const newMemos = [...memos, memo];
        localStorage.setItem('pixelpal_memos', JSON.stringify(newMemos));
        set({ memos: newMemos });
      },
      markMemoRead: (memoId) => {
        const { memos } = useStore.getState();
        const newMemos = memos.map((m) => (m.id === memoId ? { ...m, read: true } : m));
        localStorage.setItem('pixelpal_memos', JSON.stringify(newMemos));
        set({ memos: newMemos });
      },
      markAllMemosReadForPersona: (personaId) => {
        const { memos } = useStore.getState();
        const newMemos = memos.map((m) =>
          m.toPersonaId === personaId ? { ...m, read: true } : m
        );
        localStorage.setItem('pixelpal_memos', JSON.stringify(newMemos));
        set({ memos: newMemos });
      },
      getUnreadMemosCount: (personaId) => {
        const { memos } = useStore.getState();
        return memos.filter((m) => m.toPersonaId === personaId && !m.read).length;
      },
      setMemoNotification: (msg) => set({ memoNotification: msg }),
      setChatInputMention: (mention) => set({ chatInputMention: mention }),

      // V39: Game Session
      gameSession: null,
      setGameSession: (session) => set({ gameSession: session }),
      clearGameSession: () => set({ gameSession: null }),
      addIntimacy: (personaId, delta) =>
        set((state) => {
          const current = state.personaIntimacy[personaId] || 0;
          const next = Math.min(100, Math.max(0, current + delta));
          return {
            personaIntimacy: { ...state.personaIntimacy, [personaId]: next },
          };
        }),

      // V37: Voice personality differentiation
      getActivePersonaVoice: () => {
        const activePersona = getActivePersona();
        return activePersona?.voice || null;
      },
      testVoice: (voice: PersonaVoice, personaName?: string) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;
        const name = personaName || getActivePersona().name || '我';
        const text = `你好，我是${name}，很高兴和你聊天`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = voice.rate;
        utterance.pitch = voice.pitch;
        utterance.volume = voice.volume;
        if (voice.voiceName) {
          const v = window.speechSynthesis.getVoices().find(vi => vi.name === voice.voiceName);
          if (v) utterance.voice = v;
        }
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      },
      // V40: Collaboration Mode UI
      collaborationMode: false,
      setCollaborationMode: (v) => set({ collaborationMode: v }),
      collaborationProgress: [],
      setCollaborationProgress: (progress) => set({ collaborationProgress: progress }),
      updateCollaborationProgress: (role, status, output) =>
        set((state) => {
          const existing = state.collaborationProgress.find(p => p.role === role);
          if (existing) {
            return {
              collaborationProgress: state.collaborationProgress.map(p =>
                p.role === role ? { ...p, status, ...(output !== undefined ? { output } : {}) } : p
              ),
            };
          }
          return {
            collaborationProgress: [
              ...state.collaborationProgress,
              { role, roleLabel: role, emoji: '🤖', status, ...(output !== undefined ? { output } : {}) },
            ],
          };
        }),

      // V42: Collaboration History (persisted in localStorage, key: pixel_pal_collab_history)
      collabHistory: JSON.parse(localStorage.getItem('pixel_pal_collab_history') || '[]'),
      addCollabHistoryEntry: (entry) =>
        set((state) => {
          const newEntry: CollabHistoryEntry = {
            ...entry,
            id: crypto.randomUUID(),
          };
          // Keep only the last 10 entries
          const updated = [newEntry, ...state.collabHistory].slice(0, 10);
          localStorage.setItem('pixel_pal_collab_history', JSON.stringify(updated));
          return { collabHistory: updated };
        }),
      clearCollabHistory: () => {
        localStorage.setItem('pixel_pal_collab_history', JSON.stringify([]));
        set({ collabHistory: [] });
      },
      deleteCollabHistoryEntry: (id) =>
        set((state) => {
          const updated = state.collabHistory.filter((e) => e.id !== id);
          localStorage.setItem('pixel_pal_collab_history', JSON.stringify(updated));
          return { collabHistory: updated };
        }),
    }),
    {
      name: 'pixelpal-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        // V33: Apply app theme after rehydration
        if (state) {
          const { getPresetById, getSystemTheme, applyAppTheme, resetToDefault, applyCustomTheme } = require('../utils/appTheme');
          let effectivePresetId = state.appThemePresetId;
          if (state.appThemeMode === 'system') {
            effectivePresetId = getSystemTheme();
          }
          if (effectivePresetId === 'custom' && state.customTheme) {
            applyCustomTheme(state.customTheme);
          } else {
            const preset = getPresetById(effectivePresetId);
            if (preset) applyAppTheme(preset);
            else resetToDefault();
          }
        }
        // After rehydration, filter messages by activePersonaId
        // This ensures only the current persona's messages are loaded
        if (state && state.activePersonaId) {
          state.messages = state.messages.filter(
            (m) => !m.personaId || m.personaId === state.activePersonaId
          );
          // Apply initial persona theme after rehydration
          if (state.personaFollowTheme) {
            const currentPersona = getAllPersonas().find((p) => p.id === state.activePersonaId);
            if (currentPersona?.theme) {
              applyPersonaTheme(currentPersona.theme);
            }
          } else {
            resetPersonaTheme();
          }
          // V37: Apply initial persona voice after rehydration
          const activePersona = getAllPersonas().find((p) => p.id === state.activePersonaId);
          if (activePersona?.voice) {
            setVoiceServiceConfig(activePersona.voice);
          }
        }
      },
      partialize: (state) => ({
        aiConfig: state.aiConfig,
        events: state.events,
        tasks: state.tasks,
        documents: state.documents,
        emailAccount: state.emailAccount,
        messages: state.messages,
        petStatus: state.petStatus,
        interactionSettings: state.interactionSettings,
        cooldowns: state.cooldowns,
        models: state.models,
        companion: state.companion,
        voiceSettings: state.voiceSettings,
        language: state.language,
        activePersonaId: state.activePersonaId,
        personaUsageCount: state.personaUsageCount,
        personaFollowTheme: state.personaFollowTheme,
        personaIntimacy: state.personaIntimacy,
        // V33: theme
        appThemeMode: state.appThemeMode,
        appThemePresetId: state.appThemePresetId,
        customTheme: state.customTheme,
        // V36: memos
        memos: state.memos,
        // V42: collab history
        collabHistory: state.collabHistory,
      }),
    }
  )
);

/**
 * Get intimacy level label from intimacy value.
 */
export function getIntimacyLevel(intimacy: number): string {
  if (intimacy <= 20) return '陌生人';
  if (intimacy <= 40) return '熟人';
  if (intimacy <= 60) return '朋友';
  if (intimacy <= 80) return '挚友';
  return '灵魂伴侣';
}

/**
 * Get intimacy level description.
 */
export function getIntimacyDescription(level: string): string {
  const descriptions: Record<string, string> = {
    '陌生人': '初次见面，保持礼貌距离',
    '熟人': '有些了解，但还不够熟悉',
    '朋友': '已经认识，可以畅所欲言',
    '挚友': '非常亲密，无话不谈',
    '灵魂伴侣': '心意相通，最深层的理解',
  };
  return descriptions[level] || '';
}

/**
 * Get color for intimacy level.
 */
export function getIntimacyColor(intimacy: number): string {
  if (intimacy <= 20) return '#f44336';    // red - 陌生人
  if (intimacy <= 40) return '#ff9800';     // orange - 熟人
  if (intimacy <= 60) return '#ffeb3b';     // yellow - 朋友
  if (intimacy <= 80) return '#4caf50';     // green - 挚友
  return '#9c27b0';                         // purple - 灵魂伴侣
}
