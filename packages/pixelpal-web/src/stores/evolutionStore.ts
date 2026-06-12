/**
 * V154: Evolution UI Store - Zustand store for Evolution Dashboard state
 * 
 * Manages the state for the Evolution Dashboard panel including:
 * - Panel open/close state
 * - Active tab within the dashboard
 * - Selected event for detail view
 * - Auto-refresh toggle with 30s interval
 */

import { create } from 'zustand';

export type EvolutionTab = 'dashboard' | 'patterns' | 'strategies' | 'skills' | 'timeline';

export interface EvolutionEvent {
  id: string;
  timestamp: number;
  type: 'pattern_detected' | 'strategy_optimized' | 'skill_crystallized' | 'manual_override';
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface EvolutionStoreState {
  // Panel state
  isPanelOpen: boolean;
  
  // Tab navigation
  activeTab: EvolutionTab;
  
  // Selected event for detail view
  selectedEventId: string | null;
  
  // Auto-refresh settings
  autoRefresh: boolean;
  lastRefreshAt: number | null;
  
  // Evolution events timeline (last 7 days)
  events: EvolutionEvent[];
  
  // Loading state
  isLoading: boolean;
}

export interface EvolutionStoreActions {
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  
  setActiveTab: (tab: EvolutionTab) => void;
  
  selectEvent: (id: string | null) => void;
  
  toggleAutoRefresh: () => void;
  setAutoRefresh: (enabled: boolean) => void;
  
  addEvent: (event: EvolutionEvent) => void;
  clearEvents: () => void;
  
  setLoading: (loading: boolean) => void;
  updateLastRefresh: () => void;
}

export type EvolutionStore = EvolutionStoreState & EvolutionStoreActions;

// Auto-refresh interval ID (managed outside store)
let autoRefreshIntervalId: ReturnType<typeof setInterval> | null = null;

const EVENTS_REFRESH_INTERVAL = 30000; // 30 seconds

export const useEvolutionStore = create<EvolutionStore>((set, get) => ({
  // Initial state
  isPanelOpen: false,
  activeTab: 'dashboard',
  selectedEventId: null,
  autoRefresh: true,
  lastRefreshAt: null,
  events: [],
  isLoading: false,

  // Panel actions
  openPanel: () => {
    set({ isPanelOpen: true });
    // Sync main shell navigation (lazy import avoids circular deps at module load)
    void import('../store').then(({ useStore }) => {
      useStore.getState().setActivePanel('evolution');
    });
    const { autoRefresh: autoRefreshEnabled } = get();
    if (autoRefreshEnabled) {
      startAutoRefresh(get, set);
    }
  },
  
  closePanel: () => {
    set({ isPanelOpen: false, selectedEventId: null });
    stopAutoRefresh();
  },
  
  togglePanel: () => {
    const { isPanelOpen } = get();
    if (isPanelOpen) {
      get().closePanel();
    } else {
      get().openPanel();
    }
  },

  // Tab navigation
  setActiveTab: (tab: EvolutionTab) => {
    set({ activeTab: tab });
  },

  // Event selection
  selectEvent: (id: string | null) => {
    set({ selectedEventId: id });
  },

  // Auto-refresh
  toggleAutoRefresh: () => {
    const { autoRefresh: current } = get();
    const newValue = !current;
    set({ autoRefresh: newValue });
    
    if (newValue) {
      startAutoRefresh(get, set);
    } else {
      stopAutoRefresh();
    }
  },
  
  setAutoRefresh: (enabled: boolean) => {
    set({ autoRefresh: enabled });
    if (enabled) {
      startAutoRefresh(get, set);
    } else {
      stopAutoRefresh();
    }
  },

  // Event management
  addEvent: (event: EvolutionEvent) => {
    set((state) => {
      // Keep only last 7 days of events
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const filteredEvents = state.events.filter((e) => e.timestamp > sevenDaysAgo);
      return {
        events: [event, ...filteredEvents],
      };
    });
  },
  
  clearEvents: () => {
    set({ events: [] });
  },

  // Loading state
  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },
  
  updateLastRefresh: () => {
    set({ lastRefreshAt: Date.now() });
  },
}));

// Helper functions for auto-refresh management
function startAutoRefresh(
  get: () => EvolutionStore,
  set: (state: Partial<EvolutionStoreState> | ((state: EvolutionStoreState) => Partial<EvolutionStoreState>)) => void
) {
  // Clear any existing interval
  stopAutoRefresh();
  
  // Set up new interval
  autoRefreshIntervalId = setInterval(() => {
    const { autoRefresh: enabled } = get();
    if (enabled) {
      set({ lastRefreshAt: Date.now() });
      // Trigger data refresh - components listening to lastRefreshAt will re-fetch
    }
  }, EVENTS_REFRESH_INTERVAL);
}

function stopAutoRefresh() {
  if (autoRefreshIntervalId !== null) {
    clearInterval(autoRefreshIntervalId);
    autoRefreshIntervalId = null;
  }
}

// Selector hooks for performance
export const useEvolutionPanelOpen = () => useEvolutionStore((state) => state.isPanelOpen);
export const useEvolutionActiveTab = () => useEvolutionStore((state) => state.activeTab);
export const useEvolutionAutoRefresh = () => useEvolutionStore((state) => state.autoRefresh);
export const useEvolutionEvents = () => useEvolutionStore((state) => state.events);