/**
 * Persona Store — Zustand store for active persona state
 */
import { create } from 'zustand';

export interface Persona {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  voice: 'warm' | 'rational' | 'humorous' | 'serious';
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

interface PersonaState {
  activePersona: Persona | null;
  personas: Persona[];
  setActivePersona: (persona: Persona) => void;
  setPersonas: (personas: Persona[]) => void;
}

export const usePersonaStore = create<PersonaState>((set) => ({
  activePersona: null,
  personas: [],
  setActivePersona: (persona) => set({ activePersona: persona }),
  setPersonas: (personas) => set({ personas }),
}));
