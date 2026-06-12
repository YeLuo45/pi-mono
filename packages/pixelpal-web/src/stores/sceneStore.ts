import { create } from 'zustand';
import type { Scene } from '../types/scene';
import { getAllScenes, saveScene, deleteScene as dbDeleteScene } from '../db/scenes';

export interface SceneLog {
  id: string;
  sceneId: string;
  sceneName: string;
  trigger: string;
  timestamp: number;
  status: 'success' | 'error';
  message?: string;
}

interface SceneStore {
  scenes: Scene[];
  loaded: boolean;
  sceneLogs: SceneLog[];
  loadScenes: () => Promise<void>;
  addScene: (scene: Scene) => Promise<void>;
  updateScene: (scene: Scene) => Promise<void>;
  removeScene: (id: string) => Promise<void>;
  toggleScene: (id: string) => Promise<void>;
  addLog: (log: Omit<SceneLog, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
}

const MAX_LOGS = 100;

export const useSceneStore = create<SceneStore>((set, get) => ({
  scenes: [],
  loaded: false,
  sceneLogs: [],

  loadScenes: async () => {
    const scenes = await getAllScenes();
    set({ scenes, loaded: true });
  },

  addScene: async (scene) => {
    await saveScene(scene);
    set((s) => ({ scenes: [...s.scenes, scene] }));
  },

  updateScene: async (scene) => {
    await saveScene(scene);
    set((s) => ({
      scenes: s.scenes.map((sc) => (sc.id === scene.id ? scene : sc)),
    }));
  },

  removeScene: async (id) => {
    await dbDeleteScene(id);
    set((s) => ({
      scenes: s.scenes.filter((sc) => sc.id !== id),
    }));
  },

  toggleScene: async (id) => {
    const scene = get().scenes.find((s) => s.id === id);
    if (scene) {
      const updated = { ...scene, enabled: !scene.enabled };
      await saveScene(updated);
      set((s) => ({
        scenes: s.scenes.map((sc) => (sc.id === id ? updated : sc)),
      }));
    }
  },

  addLog: (log) => {
    const entry: SceneLog = {
      ...log,
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
    };
    set((s) => ({
      sceneLogs: [entry, ...s.sceneLogs].slice(0, MAX_LOGS),
    }));
  },

  clearLogs: () => {
    set({ sceneLogs: [] });
  },
}));
