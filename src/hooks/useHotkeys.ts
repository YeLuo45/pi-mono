import { useEffect, useCallback } from 'react';
import { useStore } from '../store';
import { getAllPersonas } from '../services/persona/personaStorage';

// V52: Hotkey definitions — used both for the hook logic and Settings display
export interface HotkeyDefinition {
  id: string;
  label: string;       // Chinese display label
  shortcut: string;   // e.g. "Ctrl/Cmd + N"
  description: string; // What this hotkey does
}

export const HOTKEY_DEFINITIONS: HotkeyDefinition[] = [
  {
    id: 'new-conversation',
    label: '新对话',
    shortcut: 'Ctrl/Cmd + N',
    description: '清除当前对话，开始新对话',
  },
  {
    id: 'open-settings',
    label: '打开设置',
    shortcut: 'Ctrl/Cmd + ,',
    description: '打开设置面板',
  },
  {
    id: 'toggle-sidebar',
    label: '切换侧边栏',
    shortcut: 'Ctrl/Cmd + B',
    description: '在聊天和设置面板之间切换',
  },
  {
    id: 'search-memory',
    label: '搜索记忆',
    shortcut: 'Ctrl/Cmd + K',
    description: '打开记忆搜索面板',
  },
  {
    id: 'next-persona',
    label: '下一个角色',
    shortcut: 'Ctrl/Cmd + ]',
    description: '切换到下一个角色',
  },
  {
    id: 'prev-persona',
    label: '上一个角色',
    shortcut: 'Ctrl/Cmd + [',
    description: '切换到上一个角色',
  },
];

export function useHotkeys() {
  const setActivePanel = useStore((s) => s.setActivePanel);
  const activePanel = useStore((s) => s.activePanel);
  const clearMessages = useStore((s) => s.clearMessages);
  const setActivePersonaId = useStore((s) => s.setActivePersonaId);
  const activePersonaId = useStore((s) => s.activePersonaId);
  const hotkeySettings = useStore((s) => s.hotkeySettings);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Skip if in input/textarea/select/contentEditable
      const tag = (document.activeElement?.tagName || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        return;
      }
      if (document.activeElement?.getAttribute('contenteditable') === 'true') {
        return;
      }

      const ctrlOrMeta = event.metaKey || event.ctrlKey;
      if (!ctrlOrMeta) return;

      const key = event.key.toLowerCase();

      // New conversation: Ctrl/Cmd + N
      if (key === 'n' && hotkeySettings['new-conversation']) {
        event.preventDefault();
        clearMessages();
      }

      // Open settings: Ctrl/Cmd + ,
      if (key === ',' && hotkeySettings['open-settings']) {
        event.preventDefault();
        setActivePanel('settings');
      }

      // Toggle sidebar: Ctrl/Cmd + B
      if (key === 'b' && hotkeySettings['toggle-sidebar']) {
        event.preventDefault();
        if (activePanel === 'settings') {
          setActivePanel('chat');
        }
      }

      // Search memory: Ctrl/Cmd + K
      if (key === 'k' && hotkeySettings['search-memory']) {
        event.preventDefault();
        setActivePanel('memory');
      }

      // Next persona: Ctrl/Cmd + ]
      if (key === ']' && hotkeySettings['next-persona']) {
        event.preventDefault();
        const personas = getAllPersonas();
        const currentIdx = personas.findIndex((p) => p.id === activePersonaId);
        const nextIdx = (currentIdx + 1) % personas.length;
        setActivePersonaId(personas[nextIdx].id);
      }

      // Previous persona: Ctrl/Cmd + [
      if (key === '[' && hotkeySettings['prev-persona']) {
        event.preventDefault();
        const personas = getAllPersonas();
        const currentIdx = personas.findIndex((p) => p.id === activePersonaId);
        const prevIdx = (currentIdx - 1 + personas.length) % personas.length;
        setActivePersonaId(personas[prevIdx].id);
      }
    },
    [activePanel, setActivePanel, clearMessages, setActivePersonaId, activePersonaId, hotkeySettings]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}
