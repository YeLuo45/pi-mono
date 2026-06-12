// V100 Analyzer for Agent Self-Improving Workflow

import type { AgentPerformance, OptimizationSuggestion } from '../../types/agentOptimizer';
import { performanceTracker } from './performanceTracker';

class Analyzer {
  generateSuggestions(): OptimizationSuggestion[] {
    const performances = performanceTracker.getAllAgentPerformance();
    const suggestions: OptimizationSuggestion[] = [];

    for (const perf of performances) {
      // Low success rate - suggest improvements
      if (perf.successRate < 0.7 && perf.totalTasks >= 10) {
        suggestions.push(this.createSuggestion(perf, 'add_retry', 'high', 0.8));
      }

      // High response time - suggest model switch
      if (perf.avgResponseTime > 5000 && perf.totalTasks >= 5) {
        suggestions.push(this.createSuggestion(perf, 'switch_model', 'medium', 0.7));
      }

      // Slow but successful - improve prompt
      if (perf.avgResponseTime > 3000 && perf.successRate > 0.8) {
        suggestions.push(this.createSuggestion(perf, 'improve_prompt', 'medium', 0.65));
      }

      // Many failure patterns - add critic
      if (perf.commonFailurePatterns.length >= 3) {
        suggestions.push(this.createSuggestion(perf, 'add_critic', 'high', 0.85));
      }

      // Low optimization score - change workflow
      if (perf.selfOptimizationScore < 40 && perf.totalTasks >= 20) {
        suggestions.push(this.createSuggestion(perf, 'change_workflow', 'high', 0.75));
      }
    }

    // Sort by impact and confidence
    return suggestions.sort((a, b) => {
      const impactOrder = { high: 0, medium: 1, low: 2 };
      if (impactOrder[a.impact] !== impactOrder[b.impact]) {
        return impactOrder[a.impact] - impactOrder[b.impact];
      }
      return b.confidence - a.confidence;
    });
  }

  private createSuggestion(
    perf: AgentPerformance,
    type: OptimizationSuggestion['type'],
    impact: OptimizationSuggestion['impact'],
    confidence: number
  ): OptimizationSuggestion {
    const titles: Record<OptimizationSuggestion['type'], string> = {
      add_retry: 'Add Retry Mechanism',
      improve_prompt: 'Optimize Agent Prompt',
      add_critic: 'Add Critic Agent',
      change_workflow: 'Restructure Workflow',
      switch_model: 'Switch AI Model',
    };

    const descriptions: Record<OptimizationSuggestion['type'], string> = {
      add_retry: `Agent "${perf.agentName}" has ${((1 - perf.successRate) * 100).toFixed(0)}% failure rate. Adding automatic retry with exponential backoff can improve reliability.`,
      improve_prompt: `Agent "${perf.agentName}" responds in ${(perf.avgResponseTime / 1000).toFixed(1)}s on average. Optimizing the prompt can reduce latency while maintaining quality.`,
      add_critic: `Agent "${perf.agentName}" shows ${perf.commonFailurePatterns.length} distinct failure patterns. Adding a critic agent can catch issues before they propagate.`,
      change_workflow: `Agent "${perf.agentName}" has low self-optimization score (${perf.selfOptimizationScore.toFixed(0)}). Restructuring the workflow may improve learning.`,
      switch_model: `Agent "${perf.agentName}" average response time is ${(perf.avgResponseTime / 1000).toFixed(1)}s. A faster model may be more suitable.`,
    };

    return {
      id: `${perf.agentId}-${type}-${Date.now()}`,
      agentId: perf.agentId,
      agentName: perf.agentName,
      type,
      title: titles[type],
      description: descriptions[type],
      impact,
      confidence,
      autoApplicable: type === 'add_retry' || type === 'switch_model',
    };
  }

  analyzePerformanceData(): OptimizationSuggestion[] {
    return this.generateSuggestions();
  }
}

export const analyzer = new Analyzer();