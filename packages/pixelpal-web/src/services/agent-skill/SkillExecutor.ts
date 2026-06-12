/**
 * SkillExecutor - V89 Agent×Skill Integration
 * 
 * Unified entry point for Agent to call Skill.
 * Features:
 * - Auto-match available Skills for Agent task
 * - Skill execution with retry/timeout
 * - Skill result injection into Agent context
 * - Fallback on failure
 */

import type { SkillExecution, SkillResult, SkillMatch, AgentSkillEvent, AgentSkillConfig } from './types';
import { DEFAULT_AGENT_SKILL_CONFIG } from './types';
import { skillRunner } from '../skills/skillRunner';
import { skillRegistry } from '../skills/skillRegistry';
import type { SkillDefinition } from '../skills/types';
import { eventBus } from '../agents/EventBus';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Types
// ============================================================================

interface RunningExecution {
  execution: SkillExecution;
  timeoutId?: ReturnType<typeof setTimeout>;
  resolve?: (result: SkillResult) => void;
  reject?: (error: Error) => void;
}

// ============================================================================
// SkillExecutor Implementation
// ============================================================================

class SkillExecutorImpl {
  private config: AgentSkillConfig = DEFAULT_AGENT_SKILL_CONFIG;
  private executions = new Map<string, RunningExecution>();
  private eventHistory: AgentSkillEvent[] = [];

  // --------------------------------------------------------------------------
  // Configuration
  // --------------------------------------------------------------------------

  configure(config: Partial<AgentSkillConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): AgentSkillConfig {
    return { ...this.config };
  }

  // --------------------------------------------------------------------------
  // Skill Auto-Matching (Agent finds available Skills)
  // --------------------------------------------------------------------------

  /**
   * Auto-match available Skills for an Agent based on task context
   */
  matchSkillsForTask(taskDescription: string, agentCapabilities: string[]): SkillMatch[] {
    const enabledSkills = skillRegistry.getEnabledSkills();
    const matches: SkillMatch[] = [];

    for (const skill of enabledSkills) {
      const score = this.calculateMatchScore(taskDescription, skill, agentCapabilities);
      if (score > 0.3) {
        matches.push({
          skillId: skill.id,
          skillName: skill.name,
          confidence: score,
          matchReason: this.getMatchReason(taskDescription, skill),
          capabilities: skill.requiredContext,
        });
      }
    }

    // Sort by confidence descending
    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate match score between task and skill
   */
  private calculateMatchScore(
    taskDescription: string,
    skill: SkillDefinition,
    agentCapabilities: string[]
  ): number {
    let score = 0;
    const taskLower = taskDescription.toLowerCase();
    const keywords = [...skill.tags, ...skill.chatKeywords, skill.name.toLowerCase(), skill.description.toLowerCase()];

    // Keyword matching
    for (const keyword of keywords) {
      if (taskLower.includes(keyword)) {
        score += 0.2;
      }
    }

    // Capability matching
    for (const cap of agentCapabilities) {
      if (keywords.some(k => k.includes(cap) || cap.includes(k))) {
        score += 0.15;
      }
    }

    // Chat triggerable bonus
    if (skill.chatTriggerable) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Get human-readable match reason
   */
  private getMatchReason(taskDescription: string, skill: SkillDefinition): string {
    const taskLower = taskDescription.toLowerCase();
    
    // Check keyword matches
    const matchedKeywords = skill.chatKeywords.filter(k => taskLower.includes(k));
    if (matchedKeywords.length > 0) {
      return `匹配关键词: ${matchedKeywords.join(', ')}`;
    }

    // Check tag matches
    const matchedTags = skill.tags.filter(t => taskLower.includes(t));
    if (matchedTags.length > 0) {
      return `匹配标签: ${matchedTags.join(', ')}`;
    }

    return `技能 "${skill.name}" 可能有助于完成此任务`;
  }

  // --------------------------------------------------------------------------
  // Skill Execution
  // --------------------------------------------------------------------------

  /**
   * Execute a Skill from Agent context with retry/fallback support
   */
  async executeSkill(
    skillId: string,
    agentId: string,
    taskId: string,
    input: unknown
  ): Promise<SkillResult> {
    const executionId = uuidv4();
    
    const execution: SkillExecution = {
      id: executionId,
      skillId,
      agentId,
      taskId,
      input,
      status: 'pending',
      startedAt: Date.now(),
    };

    // Emit start event
    this.emitEvent({
      type: 'skill:execution_start',
      executionId,
      skillId,
      agentId,
      taskId,
      timestamp: Date.now(),
    });

    return this.executeWithRetry(execution);
  }

  /**
   * Execute skill with retry logic
   */
  private async executeWithRetry(execution: SkillExecution): Promise<SkillResult> {
    let lastError: string = '';
    const skill = skillRegistry.getSkill(execution.skillId);

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      execution.status = 'running';
      execution.startedAt = Date.now();

      try {
        const result = await this.executeSkillOnce(execution, skill);
        
        // Success
        execution.status = 'completed';
        execution.completedAt = Date.now();
        execution.output = result.data;
        execution.confidence = result.confidence;
        execution.suggestions = result.nextActions;

        this.emitEvent({
          type: 'skill:execution_complete',
          executionId: execution.id,
          skillId: execution.skillId,
          agentId: execution.agentId,
          taskId: execution.taskId,
          payload: result,
          timestamp: Date.now(),
        });

        return result;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        execution.error = lastError;
        execution.status = attempt < this.config.maxRetries ? 'pending' : 'failed';

        if (attempt < this.config.maxRetries) {
          console.warn(`[SkillExecutor] Retry ${attempt + 1}/${this.config.maxRetries} for skill ${execution.skillId}`);
          await this.delay(this.config.retryDelayMs * (attempt + 1));
        }
      }
    }

    // All retries exhausted
    execution.status = 'failed';
    execution.completedAt = Date.now();

    this.emitEvent({
      type: 'skill:execution_failed',
      executionId: execution.id,
      skillId: execution.skillId,
      agentId: execution.agentId,
      taskId: execution.taskId,
      payload: { error: lastError },
      timestamp: Date.now(),
    });

    // Fallback: return error result instead of throwing
    if (this.config.fallbackOnError) {
      return {
        success: false,
        data: null,
        summary: `技能执行失败: ${lastError}`,
        confidence: 0,
        nextActions: ['尝试其他方法', '检查技能配置', '联系管理员'],
        metadata: { executionId: execution.id, error: lastError, retries: this.config.maxRetries },
      };
    }

    throw new Error(`Skill execution failed after ${this.config.maxRetries + 1} attempts: ${lastError}`);
  }

  /**
   * Single skill execution (no retry)
   */
  private async executeSkillOnce(
    execution: SkillExecution,
    skill: SkillDefinition | undefined
  ): Promise<SkillResult> {
    if (!skill) {
      throw new Error(`Skill not found: ${execution.skillId}`);
    }

    return new Promise((resolve, reject) => {
      // Set timeout
      const timeoutId = setTimeout(() => {
        this.executions.delete(execution.id);
        reject(new Error(`Skill execution timeout after ${this.config.timeoutMs}ms`));
      }, this.config.timeoutMs);

      this.executions.set(execution.id, {
        execution,
        timeoutId,
        resolve,
        reject,
      });

      // Execute via skillRunner
      skillRunner.runSkillFromChat(
        execution.skillId,
        String(execution.input),
        [],
        'default'
      ).then((skillResult) => {
        const running = this.executions.get(execution.id);
        if (running) {
          clearTimeout(running.timeoutId);
          this.executions.delete(execution.id);
        }

        // Convert SkillExecutionResult to SkillResult
        const result: SkillResult = {
          success: skillResult.success,
          data: skillResult.response,
          summary: this.generateSummary(skillResult),
          confidence: skillResult.success ? 0.8 : 0,
          nextActions: skillResult.success 
            ? ['继续下一步', '验证结果', '生成报告']
            : ['重试', '使用备用方案', '人工介入'],
          metadata: {
            skillId: execution.skillId,
            executionId: execution.id,
            durationMs: skillResult.durationMs,
            tokensUsed: skillResult.tokensUsed,
          },
        };

        // Emit result parsed event
        this.emitEvent({
          type: 'skill:result_parsed',
          executionId: execution.id,
          skillId: execution.skillId,
          agentId: execution.agentId,
          payload: result,
          timestamp: Date.now(),
        });

        resolve(result);
      }).catch((err) => {
        const running = this.executions.get(execution.id);
        if (running) {
          clearTimeout(running.timeoutId);
          this.executions.delete(execution.id);
        }
        reject(err);
      });
    });
  }

  /**
   * Generate human-readable summary from skill execution result
   */
  private generateSummary(skillResult: { success: boolean; response: string; error?: string }): string {
    if (skillResult.success) {
      const responsePreview = skillResult.response.length > 100
        ? skillResult.response.substring(0, 100) + '...'
        : skillResult.response;
      return responsePreview || '技能执行成功';
    }
    return `技能执行失败: ${skillResult.error || '未知错误'}`;
  }

  // --------------------------------------------------------------------------
  // Execution Management
  // --------------------------------------------------------------------------

  /**
   * Get execution by ID
   */
  getExecution(executionId: string): SkillExecution | undefined {
    return this.executions.get(executionId)?.execution;
  }

  /**
   * Get all executions for a task
   */
  getExecutionsForTask(taskId: string): SkillExecution[] {
    return Array.from(this.executions.values())
      .map(r => r.execution)
      .filter(e => e.taskId === taskId);
  }

  /**
   * Get all executions for an agent
   */
  getExecutionsForAgent(agentId: string): SkillExecution[] {
    return Array.from(this.executions.values())
      .map(r => r.execution)
      .filter(e => e.agentId === agentId);
  }

  /**
   * Cancel a running execution
   */
  cancelExecution(executionId: string): boolean {
    const running = this.executions.get(executionId);
    if (running) {
      clearTimeout(running.timeoutId);
      running.reject?.(new Error('Execution cancelled'));
      this.executions.delete(executionId);
      return true;
    }
    return false;
  }

  // --------------------------------------------------------------------------
  // Event System
  // --------------------------------------------------------------------------

  /**
   * Emit an agent-skill event
   */
  private emitEvent(event: AgentSkillEvent): void {
    this.eventHistory.push(event);
    
    // Also emit to global event bus
    eventBus.emit(`agent-skill:${event.type}`, event);
  }

  /**
   * Get recent events
   */
  getRecentEvents(limit = 50): AgentSkillEvent[] {
    return this.eventHistory.slice(-limit);
  }

  /**
   * Subscribe to events
   */
  onEvent(type: AgentSkillEvent['type'], callback: (event: AgentSkillEvent) => void): () => void {
    return eventBus.on(`agent-skill:${type}`, callback as (payload: unknown) => void);
  }

  // --------------------------------------------------------------------------
  // Utility
  // --------------------------------------------------------------------------

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton
export const skillExecutor = new SkillExecutorImpl();
export default skillExecutor;
