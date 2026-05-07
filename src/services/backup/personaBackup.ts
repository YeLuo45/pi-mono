/**
 * personaBackup.ts — V30 Data Export & Backup
 * 
 * Provides export/import functionality for persona data including:
 * - Persona objects
 * - Chat messages (per-persona filtered)
 * - Memory entries (per-persona filtered)
 * - Intimacy levels
 * - Global settings
 */

import { useStore } from '../../store';
import { getAllPersonas, type Persona } from '../persona/personaStorage';
import { queryMemories } from '../memory/memoryStorage';
import type { MemoryEntry } from '../memory/memoryTypes';
import type { Message } from '../../types';
import type { CollabHistoryEntry, GameSession } from '../../store';

export const BACKUP_VERSION = '1.0.1';

export interface ExportData {
  version: string;
  exportedAt: number;
  persona?: Persona;
  personas?: Persona[];
  messages: Message[];
  memories: MemoryEntry[];
  intimacy: Record<string, number>;
  settings?: {
    language: 'zh' | 'en';
    interactionSettings: Record<string, unknown>;
    voiceSettings: Record<string, unknown>;
  };
  collabHistory?: CollabHistoryEntry[];  // V42 collaboration history
  gameSessions?: GameSession[];            // V39 game sessions
}

export interface ImportResult {
  success: boolean;
  message: string;
  stats?: {
    messages: number;
    memories: number;
    persona?: Persona;
  };
}

// ============================================================================
// Export
// ============================================================================

/**
 * Export a single persona's data (persona + messages + memories + intimacy)
 */
export async function exportPersonaData(personaId: string): Promise<ExportData> {
  const store = useStore.getState();
  const personas = getAllPersonas();
  const persona = personas.find(p => p.id === personaId);
  
  if (!persona) {
    throw new Error(`Persona with id ${personaId} not found`);
  }

  // Filter messages for this persona
  const personaMessages = store.messages.filter(m => m.personaId === personaId);
  
  // Filter memories for this persona
  const personaMemories = await queryMemories({ personaId, limit: 10000 });
  
  // Get intimacy for this persona
  const intimacy = store.personaIntimacy[personaId] ?? 0;
  
  // Get global settings
  const settings = {
    language: store.language,
    interactionSettings: store.interactionSettings,
    voiceSettings: store.voiceSettings,
  };

  return {
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    persona,
    messages: personaMessages,
    memories: personaMemories,
    intimacy,
    settings,
  };
}

/**
 * Export all data (all personas + all messages + all memories + global settings)
 */
export async function exportAllData(): Promise<ExportData> {
  const store = useStore.getState();
  const personas = getAllPersonas();

  // All messages (no filter)
  const messages = store.messages;

  // All memories
  const memories = await queryMemories({ limit: 10000 });

  // All intimacy data
  const intimacy = store.personaIntimacy;

  // Global settings
  const settings = {
    language: store.language,
    interactionSettings: store.interactionSettings,
    voiceSettings: store.voiceSettings,
  };

  return {
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    personas,
    messages,
    memories,
    intimacy,
    settings,
    collabHistory: store.collabHistory,
    gameSessions: store.gameSession ? [store.gameSession] : [],
  };
}

/**
 * Download JSON data as a file
 */
export function downloadJSON(data: ExportData, filename: string): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  
  // Cleanup
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

// ============================================================================
// Import
// ============================================================================

/**
 * Import persona data from JSON string
 * Handles version mismatch gracefully
 * Auto-renames persona if same ID exists (adds timestamp suffix)
 */
export async function importPersonaData(jsonStr: string): Promise<ImportResult> {
  try {
    const data = JSON.parse(jsonStr) as ExportData;
    
    // Validate structure
    if (!data.version || !data.exportedAt) {
      return {
        success: false,
        message: 'Invalid backup file: missing version or exportedAt',
      };
    }
    
    // Handle version mismatch (still try to import, just warn)
    let versionWarning = '';
    if (data.version !== BACKUP_VERSION) {
      versionWarning = ` (file version: ${data.version}, expected: ${BACKUP_VERSION})`;
    }
    
    // Must have either persona or personas
    if (!data.persona && !data.personas) {
      return {
        success: false,
        message: 'Invalid backup file: no persona data found',
      };
    }
    
    const store = useStore.getState();
    let importedPersona: Persona | undefined;
    let messagesCount = 0;
    let memoriesCount = 0;
    
    if (data.persona) {
      // Single persona import
      const existingPersonas = getAllPersonas();
      let targetPersona = data.persona;
      
      // Check if persona with same ID exists
      const existingIdx = existingPersonas.findIndex(p => p.id === targetPersona.id);
      if (existingIdx !== -1) {
        // Auto-rename: add timestamp suffix to the imported persona
        const timestamp = Date.now();
        const newId = `imported-${timestamp}-${Math.random().toString(36).slice(2, 8)}`;
        targetPersona = {
          ...targetPersona,
          id: newId,
          name: `${targetPersona.name} (导入 ${new Date().toLocaleDateString()})`,
          isDefault: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
      } else {
        // New persona - generate new ID to avoid conflicts
        const timestamp = Date.now();
        targetPersona = {
          ...targetPersona,
          id: `imported-${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
          name: targetPersona.name,
          isDefault: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
      }
      
      // Save persona
      const allPersonas = getAllPersonas();
      allPersonas.push(targetPersona);
      localStorage.setItem('pixelpal_personas', JSON.stringify(allPersonas));
      importedPersona = targetPersona;
      
      // Import messages
      if (data.messages && data.messages.length > 0) {
        const importedMessages = data.messages.map(m => ({
          ...m,
          id: crypto.randomUUID(), // Generate new ID
          personaId: targetPersona!.id, // Point to new persona ID
          timestamp: m.timestamp || Date.now(),
        }));
        
        // Add to store
        for (const msg of importedMessages) {
          store.addMessage({
            role: msg.role,
            content: msg.content,
            personaId: msg.personaId,
          });
        }
        messagesCount = importedMessages.length;
      }
      
      // Import memories
      if (data.memories && data.memories.length > 0) {
        const { addMemory } = await import('../memory/memoryStorage');
        for (const memory of data.memories) {
          await addMemory({
            ...memory,
            id: crypto.randomUUID(), // Generate new ID
            personaId: targetPersona!.id, // Point to new persona ID
          });
        }
        memoriesCount = data.memories.length;
      }
      
      // Import intimacy if provided
      if (data.intimacy !== undefined) {
        const currentIntimacy = store.personaIntimacy;
        currentIntimacy[targetPersona!.id] = data.intimacy;
        // Note: setting entire object won't trigger store update, so we use setPersonaIntimacy
        store.setPersonaIntimacy(targetPersona!.id, data.intimacy);
      }
      
      return {
        success: true,
        message: `成功导入 "${targetPersona.name}"${versionWarning}`,
        stats: {
          messages: messagesCount,
          memories: memoriesCount,
          persona: targetPersona,
        },
      };
    }
    
    if (data.personas && data.personas.length > 0) {
      // Full export import (multiple personas)
      const existingPersonas = getAllPersonas();
      const idMapping: Record<string, string> = {}; // old ID -> new ID
      
      // Import each persona with new IDs
      for (const persona of data.personas) {
        const timestamp = Date.now();
        const newId = `imported-${timestamp}-${Math.random().toString(36).slice(2, 8)}`;
        idMapping[persona.id] = newId;
        
        const importedPersona: Persona = {
          ...persona,
          id: newId,
          name: `${persona.name} (导入)`,
          isDefault: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        existingPersonas.push(importedPersona);
      }
      
      // Save all personas
      localStorage.setItem('pixelpal_personas', JSON.stringify(existingPersonas));
      
      // Import messages with remapped persona IDs
      if (data.messages && data.messages.length > 0) {
        for (const msg of data.messages) {
          const newPersonaId = idMapping[msg.personaId];
          if (newPersonaId) {
            store.addMessage({
              role: msg.role,
              content: msg.content,
              personaId: newPersonaId,
            });
            messagesCount++;
          }
        }
      }
      
      // Import memories with remapped persona IDs
      if (data.memories && data.memories.length > 0) {
        const { addMemory } = await import('../memory/memoryStorage');
        for (const memory of data.memories) {
          const newPersonaId = idMapping[memory.personaId];
          if (newPersonaId) {
            await addMemory({
              ...memory,
              id: crypto.randomUUID(),
              personaId: newPersonaId,
            });
            memoriesCount++;
          }
        }
      }
      
      // Import intimacy for all personas
      if (data.intimacy) {
        for (const [oldId, value] of Object.entries(data.intimacy)) {
          const newId = idMapping[oldId];
          if (newId) {
            store.setPersonaIntimacy(newId, value as number);
          }
        }
      }
      
      return {
        success: true,
        message: `成功导入 ${data.personas.length} 个人格${versionWarning}`,
        stats: {
          messages: messagesCount,
          memories: memoriesCount,
        },
      };
    }
    
    return {
      success: false,
      message: 'No persona data to import',
    };
    
  } catch (err) {
    return {
      success: false,
      message: `导入失败: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}
