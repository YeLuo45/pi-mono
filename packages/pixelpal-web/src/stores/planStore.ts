/**
 * planStore - stub to unblock build
 * Full implementation pending V66+
 */
import { create } from 'zustand';

export interface PlanStep {
  id: string;
  description: string;
  toolName: string;
  arguments: Record<string, unknown>;
  riskLevel: 'low' | 'medium' | 'high';
  order: number;
  status?: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
}

export interface Plan {
  id: string;
  goal: string;
  steps: PlanStep[];
  suggestions: string[];
  createdAt: number;
  status: 'idle' | 'draft' | 'awaiting_confirmation' | 'executing' | 'completed' | 'failed';
}

interface PlanState {
  currentPlan: Plan | null;
  planStatus: 'idle' | 'draft' | 'awaiting_confirmation' | 'executing' | 'completed' | 'failed';
  isExecuting: boolean;
  currentStepIndex: number;
  setCurrentPlan: (plan: Plan | null) => void;
  setPlanStatus: (status: PlanState['planStatus']) => void;
  createPlanFromTask: (goal: string, steps: Omit<PlanStep, 'id' | 'status'>[], suggestions: string[]) => Plan;
  confirmPlan: () => void;
  updateStepStatus: (index: number, status: PlanStep['status'], result?: string) => void;
  setCurrentStepIndex: (index: number) => void;
  clearPlan: () => void;
}

export const usePlanStore = create<PlanState>((set) => ({
  currentPlan: null,
  planStatus: 'idle',
  isExecuting: false,
  currentStepIndex: 0,
  setCurrentPlan: (plan) => set({ currentPlan: plan }),
  setPlanStatus: (status) => set({ planStatus: status }),
  createPlanFromTask: (goal, steps, suggestions) => {
    const plan: Plan = {
      id: crypto.randomUUID(),
      goal,
      steps: steps.map((s, i) => ({ ...s, id: crypto.randomUUID(), status: 'pending' })),
      suggestions,
      createdAt: Date.now(),
      status: 'draft',
    };
    set({ currentPlan: plan, planStatus: 'draft' });
    return plan;
  },
  confirmPlan: () => set((s) => ({ planStatus: s.currentPlan ? 'awaiting_confirmation' : 'idle' })),
  updateStepStatus: (index, status, result) => set((s) => {
    if (!s.currentPlan) return s;
    const steps = [...s.currentPlan.steps];
    if (steps[index]) {
      steps[index] = { ...steps[index], status, result };
    }
    return { currentPlan: { ...s.currentPlan, steps }, currentStepIndex: index + 1 };
  }),
  setCurrentStepIndex: (index) => set({ currentStepIndex: index }),
  clearPlan: () => set({ currentPlan: null, planStatus: 'idle', isExecuting: false, currentStepIndex: 0 }),
}));
