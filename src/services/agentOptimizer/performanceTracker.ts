// V100 Performance Tracker for Agent Self-Improving Workflow

import type { AgentPerformance, AgentTaskTrace } from '../../types/agentOptimizer';

const STORAGE_KEY = 'agent_optimizer_traces';
const PERFORMANCE_KEY = 'agent_optimizer_performance';

interface PerformanceData {
  [agentId: string]: {
    traces: AgentTaskTrace[];
    performance: AgentPerformance;
  };
}

class PerformanceTracker {
  private data: PerformanceData = {};
  private agentNames: Map<string, string> = new Map();
  private agentTypes: Map<string, string> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.data = parsed.data || {};
        this.agentNames = new Map(parsed.agentNames || []);
        this.agentTypes = new Map(parsed.agentTypes || []);
      }
    } catch (e) {
      console.error('Failed to load performance data:', e);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        data: this.data,
        agentNames: Array.from(this.agentNames.entries()),
        agentTypes: Array.from(this.agentTypes.entries()),
      }));
    } catch (e) {
      console.error('Failed to save performance data:', e);
    }
  }

  trackTaskExecution(trace: AgentTaskTrace): void {
    const { agentId } = trace;

    if (!this.data[agentId]) {
      this.data[agentId] = { traces: [], performance: this.createEmptyPerformance(agentId) };
    }

    // Add trace
    this.data[agentId].traces.push(trace);

    // Keep only last 1000 traces per agent
    if (this.data[agentId].traces.length > 1000) {
      this.data[agentId].traces = this.data[agentId].traces.slice(-1000);
    }

    // Update performance metrics
    this.updatePerformance(agentId);
    this.saveToStorage();
  }

  private createEmptyPerformance(agentId: string): AgentPerformance {
    return {
      agentId,
      agentName: this.agentNames.get(agentId) || agentId,
      agentType: this.agentTypes.get(agentId) || 'unknown',
      totalTasks: 0,
      successRate: 0,
      avgResponseTime: 0,
      selfOptimizationScore: 0,
      commonFailurePatterns: [],
      lastOptimized: new Date().toISOString(),
      rank: 0,
    };
  }

  private updatePerformance(agentId: string): void {
    const { traces, performance } = this.data[agentId];
    const recentTraces = traces.slice(-100); // Last 100 traces for analysis

    if (recentTraces.length === 0) return;

    const successful = recentTraces.filter(t => t.success).length;
    const totalResponseTime = recentTraces.reduce((sum, t) => sum + t.responseTime, 0);

    // Calculate metrics
    performance.totalTasks = traces.length;
    performance.successRate = successful / recentTraces.length;
    performance.avgResponseTime = totalResponseTime / recentTraces.length;
    performance.lastOptimized = new Date().toISOString();

    // Analyze failure patterns
    const errorMessages = recentTraces
      .filter(t => !t.success && t.errorMessage)
      .map(t => t.errorMessage!);

    // Group similar errors
    const errorGroups: Record<string, number> = {};
    errorMessages.forEach(msg => {
      const key = msg.slice(0, 50); // Group by first 50 chars
      errorGroups[key] = (errorGroups[key] || 0) + 1;
    });

    performance.commonFailurePatterns = Object.entries(errorGroups)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([msg]) => msg);

    // Calculate self-optimization score based on improvement over time
    const oldTraces = traces.slice(0, Math.min(50, traces.length / 2));
    const newTraces = traces.slice(-50);

    if (oldTraces.length > 5 && newTraces.length > 5) {
      const oldSuccessRate = oldTraces.filter(t => t.success).length / oldTraces.length;
      const newSuccessRate = newTraces.filter(t => t.success).length / newTraces.length;
      const improvement = newSuccessRate - oldSuccessRate;
      performance.selfOptimizationScore = Math.max(0, Math.min(100, 50 + improvement * 100));
    }
  }

  getAgentPerformance(agentId: string): AgentPerformance | null {
    return this.data[agentId]?.performance || null;
  }

  getAllAgentPerformance(): AgentPerformance[] {
    const performances = Object.values(this.data).map(d => d.performance);

    // Calculate ranks based on self-optimization score
    const sorted = [...performances].sort((a, b) => b.selfOptimizationScore - a.selfOptimizationScore);
    sorted.forEach((p, index) => {
      p.rank = index + 1;
    });

    return sorted;
  }

  registerAgent(agentId: string, name: string, type: string): void {
    this.agentNames.set(agentId, name);
    this.agentTypes.set(agentId, type);

    if (!this.data[agentId]) {
      this.data[agentId] = { traces: [], performance: this.createEmptyPerformance(agentId) };
    }

    this.saveToStorage();
  }

  clearData(agentId?: string): void {
    if (agentId) {
      delete this.data[agentId];
    } else {
      this.data = {};
    }
    this.saveToStorage();
  }

  getTraces(agentId: string, limit = 100): AgentTaskTrace[] {
    return this.data[agentId]?.traces.slice(-limit) || [];
  }
}

export const performanceTracker = new PerformanceTracker();