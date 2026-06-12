import { create } from 'zustand';
import type { TaskStatus } from '../types';
import type { SkillCategory } from '../services/skills/types';

export type TasksFilter = 'all' | 'today' | 'overdue' | TaskStatus;

export type SettingsSection =
  | 'general'
  | 'appearance'
  | 'desktop'
  | 'analytics'
  | 'agentOptimizer'
  | 'providers'
  | 'usage';

export type CalendarFilter = 'month' | 'today' | 'upcoming';

export type WritingMode = 'generate' | 'continue' | 'polish' | 'summarize';

export type SkillStoreSort = 'popular' | 'rating' | 'newest';

export type AnalyticsTimeRange = '7d' | '30d' | '90d';
export type McpTab = 'clients' | 'tools' | 'logs';
export type ToolsView = 'registry' | 'history';
export type AgentTaskFilter = 'all' | 'running' | 'pending' | 'completed' | 'failed';

interface MacSplitState {
  knowledgeSourceId: string | null;
  knowledgeDocId: string | null;
  tasksFilter: TasksFilter;
  settingsSection: SettingsSection;
  calendarFilter: CalendarFilter;
  selectedEventId: string | null;
  emailMessageId: string | null;
  writingMode: WritingMode;
  documentId: string | null;
  skillStoreCategory: SkillCategory | 'all';
  skillStoreSort: SkillStoreSort;
  skillStoreSkillId: string | null;
  skillStoreQuery: string;
  skillDevFileId: string | null;
  memoryTab: number;
  analyticsTimeRange: AnalyticsTimeRange;
  mcpTab: McpTab;
  toolsView: ToolsView;
  agentTaskFilter: AgentTaskFilter;
  agentTaskId: string | null;
  executionLogId: string | null;
  setKnowledgeSourceId: (id: string | null) => void;
  setKnowledgeDocId: (id: string | null) => void;
  setTasksFilter: (filter: TasksFilter) => void;
  setSettingsSection: (section: SettingsSection) => void;
  setCalendarFilter: (filter: CalendarFilter) => void;
  setSelectedEventId: (id: string | null) => void;
  setEmailMessageId: (id: string | null) => void;
  setWritingMode: (mode: WritingMode) => void;
  setDocumentId: (id: string | null) => void;
  setSkillStoreCategory: (category: SkillCategory | 'all') => void;
  setSkillStoreSort: (sort: SkillStoreSort) => void;
  setSkillStoreSkillId: (id: string | null) => void;
  setSkillStoreQuery: (query: string) => void;
  setSkillDevFileId: (id: string | null) => void;
  setMemoryTab: (tab: number) => void;
  setAnalyticsTimeRange: (range: AnalyticsTimeRange) => void;
  setMcpTab: (tab: McpTab) => void;
  setToolsView: (view: ToolsView) => void;
  setAgentTaskFilter: (filter: AgentTaskFilter) => void;
  setAgentTaskId: (id: string | null) => void;
  setExecutionLogId: (id: string | null) => void;
  resetForPanel: (panel: string) => void;
  resetForRoute: (pathname: string) => void;
}

export const useMacSplitStore = create<MacSplitState>((set) => ({
  knowledgeSourceId: null,
  knowledgeDocId: null,
  tasksFilter: 'all',
  settingsSection: 'general',
  calendarFilter: 'month',
  selectedEventId: null,
  emailMessageId: null,
  writingMode: 'generate',
  documentId: null,
  skillStoreCategory: 'all',
  skillStoreSort: 'popular',
  skillStoreSkillId: null,
  skillStoreQuery: '',
  skillDevFileId: null,
  memoryTab: 0,
  analyticsTimeRange: '7d',
  mcpTab: 'clients',
  toolsView: 'registry',
  agentTaskFilter: 'all',
  agentTaskId: null,
  executionLogId: null,
  setKnowledgeSourceId: (id) => set({ knowledgeSourceId: id }),
  setKnowledgeDocId: (id) => set({ knowledgeDocId: id }),
  setTasksFilter: (filter) => set({ tasksFilter: filter }),
  setSettingsSection: (section) => set({ settingsSection: section }),
  setCalendarFilter: (filter) => set({ calendarFilter: filter, selectedEventId: null }),
  setSelectedEventId: (id) => set({ selectedEventId: id }),
  setEmailMessageId: (id) => set({ emailMessageId: id }),
  setWritingMode: (mode) => set({ writingMode: mode }),
  setDocumentId: (id) => set({ documentId: id }),
  setSkillStoreCategory: (category) => set({ skillStoreCategory: category, skillStoreSkillId: null }),
  setSkillStoreSort: (sort) => set({ skillStoreSort: sort }),
  setSkillStoreSkillId: (id) => set({ skillStoreSkillId: id }),
  setSkillStoreQuery: (query) => set({ skillStoreQuery: query }),
  setSkillDevFileId: (id) => set({ skillDevFileId: id }),
  setMemoryTab: (tab) => set({ memoryTab: tab }),
  setAnalyticsTimeRange: (range) => set({ analyticsTimeRange: range }),
  setMcpTab: (tab) => set({ mcpTab: tab }),
  setToolsView: (view) => set({ toolsView: view }),
  setAgentTaskFilter: (filter) => set({ agentTaskFilter: filter, agentTaskId: null }),
  setAgentTaskId: (id) => set({ agentTaskId: id }),
  setExecutionLogId: (id) => set({ executionLogId: id }),
  resetForPanel: (panel) => {
    if (panel === 'tasks') set({ tasksFilter: 'all' });
    if (panel === 'settings') set({ settingsSection: 'general' });
    if (panel === 'knowledge') set({ knowledgeSourceId: null, knowledgeDocId: null });
    if (panel === 'calendar') set({ calendarFilter: 'month', selectedEventId: null });
    if (panel === 'email') set({ emailMessageId: null });
    if (panel === 'writing') set({ writingMode: 'generate' });
    if (panel === 'document') set({ documentId: null });
    if (panel === 'memory') set({ memoryTab: 0 });
    if (panel === 'analytics') set({ analyticsTimeRange: '7d' });
    if (panel === 'mcp') set({ mcpTab: 'clients' });
    if (panel === 'tools') set({ toolsView: 'registry' });
    if (panel === 'agent') set({ agentTaskFilter: 'all', agentTaskId: null });
    if (panel === 'execution') set({ executionLogId: null });
  },
  resetForRoute: (pathname) => {
    if (pathname.startsWith('/skill-store')) {
      set({ skillStoreSkillId: null, skillStoreQuery: '' });
    }
    if (pathname.startsWith('/skill-dev')) {
      set({ skillDevFileId: null });
    }
  },
}));
