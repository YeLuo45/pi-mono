import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AIConfig, Message, Event, Task, DocumentFile, PetStatus, EmailAccount, InteractionSettings, InteractionCooldowns, CompanionState, PersonaId, VoiceSettings } from '../types';
import type { EmotionState } from '../services/voice/emotionDetector';
import { getActivePersona } from '../services/persona/personaStorage';
import { getPersonaSystemPrompt } from '../services/persona/personaPrompt';

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
  toggleTaskComplete: (id: string) => void;

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
  setActivePersonaId: (id: string) => void;
  clearMessagesForPersona: (personaId: string) => void;
  setMessages: (messages: Message[]) => void;
  loadMessagesForPersona: (personaId: string) => void;
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
      toggleTaskComplete: (id) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  status: t.status === 'completed' ? 'pending' : 'completed',
                  completedAt: t.status === 'completed' ? undefined : new Date().toISOString(),
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
      setActivePersonaId: (id) => {
        // Update active persona in localStorage (for personaStorage)
        const { setActivePersonaId: setStorageId } = require('../services/persona/personaStorage');
        setStorageId(id);
        // Update store state and load persona-specific messages
        set((state) => ({
          activePersonaId: id,
          personaSystemPrompt: getPersonaSystemPrompt(require('../services/persona/personaStorage').getActivePersona()),
          messages: state.messages.filter(
            (m) => !m.personaId || m.personaId === id
          ),
        }));
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
    }),
    {
      name: 'pixelpal-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        // After rehydration, filter messages by activePersonaId
        // This ensures only the current persona's messages are loaded
        if (state && state.activePersonaId) {
          state.messages = state.messages.filter(
            (m) => !m.personaId || m.personaId === state.activePersonaId
          );
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
      }),
    }
  )
);
