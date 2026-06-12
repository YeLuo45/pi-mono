/**
 * Collaboration Orchestrator - V33 Multi-Agent Collaboration System
 * 
 * Central orchestrator that coordinates the entire collaboration workflow:
 * 1. Creates collaboration sessions
 * 2. Decomposes user requests into subtasks
 * 3. Assigns tasks to appropriate persona roles
 * 4. Executes subtasks with dependency awareness
 * 5. Aggregates results into final response
 * 6. Handles conflicts and error recovery
 */

import type {
  CollaborationSession,
  CollaborationMessage,
  Subtask,
  SubtaskResult,
  PersonaRole,
  TaskType,
  SessionStatus,
  ProgressUpdate,
  CollaborationEvent,
  OrchestratorConfig,
} from './types';

import { SharedContext, createSharedContext } from './sharedContext';
import { TaskDecomposer, createTaskDecomposer } from './taskDecomposer';
import {
  PersonaRoleRegistry,
  getRoleRegistry,
  getRoleDisplayName,
  getRoleEmoji,
} from './personaRoleRegistry';
import {
  DEFAULT_ORCHESTRATOR_CONFIG,
} from './types';

// ============================================================================
// Event Handlers
// ============================================================================

type EventHandler = (event: CollaborationEvent) => void;

/**
 * Collaboration Orchestrator - Main orchestration engine
 */
export class CollaborationOrchestrator {
  private config: OrchestratorConfig;
  private decomposer: TaskDecomposer;
  private roleRegistry: PersonaRoleRegistry;
  private eventHandlers: EventHandler[];
  private activeSessions: Map<string, CollaborationSession>;
  private sessionContexts: Map<string, SharedContext>;

  constructor(config: Partial<OrchestratorConfig> = {}) {
    this.config = { ...DEFAULT_ORCHESTRATOR_CONFIG, ...config };
    this.decomposer = createTaskDecomposer('orchestrator');
    this.roleRegistry = getRoleRegistry();
    this.eventHandlers = [];
    this.activeSessions = new Map();
    this.sessionContexts = new Map();
  }

  // ============================================================================
  // Session Management
  // ============================================================================

  /**
   * Create a new collaboration session
   */
  async createSession(userRequest: string): Promise<CollaborationSession> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    
    const session: CollaborationSession = {
      id: sessionId,
      userRequest,
      subtasks: [],
      results: new Map(),
      status: 'decomposing',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.activeSessions.set(sessionId, session);
    this.sessionContexts.set(sessionId, createSharedContext(sessionId, userRequest));

    this.emit({
      type: 'session_started',
      sessionId,
      data: { userRequest },
      timestamp: Date.now(),
    });

    return session;
  }

  /**
   * Get an existing session
   */
  getSession(sessionId: string): CollaborationSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Get session context
   */
  getSessionContext(sessionId: string): SharedContext | undefined {
    return this.sessionContexts.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  getAllSessions(): CollaborationSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Close and cleanup a session
   */
  closeSession(sessionId: string): void {
    this.activeSessions.delete(sessionId);
    this.sessionContexts.delete(sessionId);
  }

  // ============================================================================
  // Main Orchestration Flow
  // ============================================================================

  /**
   * Start a complete collaboration session
   * This is the main entry point for the orchestration
   */
  async startSession(userRequest: string): Promise<CollaborationSession> {
    // 1. Create session
    const session = await this.createSession(userRequest);
    const context = this.sessionContexts.get(session.id)!;

    try {
      // 2. Decompose tasks
      const decomposition = await this.decomposer.decompose(userRequest);
      session.subtasks = decomposition.subtasks;
      context.subtasks = decomposition.subtasks;
      session.status = 'decomposing';
      session.updatedAt = Date.now();

      this.emit({
        type: 'task_decomposed',
        sessionId: session.id,
        data: { subtasks: decomposition.subtasks, reasoning: decomposition.reasoning },
        timestamp: Date.now(),
      });

      // 3. Execute tasks
      session.status = 'executing';
      session.updatedAt = Date.now();
      await this.executeTasks(session, context);

      // 4. Aggregate results
      session.status = 'aggregating';
      session.updatedAt = Date.now();
      const finalResponse = await this.aggregateResults(session, context);

      // 5. Mark as done
      session.status = 'done';
      session.completedAt = Date.now();
      session.updatedAt = Date.now();

      this.emit({
        type: 'session_completed',
        sessionId: session.id,
        data: { finalResponse, resultCount: session.results.size },
        timestamp: Date.now(),
      });

      return session;

    } catch (error) {
      session.status = 'failed';
      session.error = error instanceof Error ? error.message : String(error);
      session.updatedAt = Date.now();

      this.emit({
        type: 'session_failed',
        sessionId: session.id,
        data: { error: session.error },
        timestamp: Date.now(),
      });

      throw error;
    }
  }

  /**
   * Execute all subtasks with dependency awareness
   */
  private async executeTasks(
    session: CollaborationSession,
    context: SharedContext
  ): Promise<void> {
    const executionOrder = this.decomposer.getExecutionOrder(session.subtasks);

    for (const level of executionOrder) {
      // Execute all tasks in this level in parallel
      const promises = level.map(subtask => this.executeSubtask(subtask, session, context));
      await Promise.allSettled(promises);

      // Check if we should continue
      const hasFailures = session.subtasks.some(t => t.status === 'failed');
      if (hasFailures && !this.config.enableConflictResolution) {
        break;
      }
    }
  }

  /**
   * Execute a single subtask
   */
  private async executeSubtask(
    subtask: Subtask,
    session: CollaborationSession,
    context: SharedContext
  ): Promise<void> {
    subtask.status = 'running';
    subtask.startedAt = Date.now();
    session.updatedAt = Date.now();

    this.emit({
      type: 'subtask_started',
      sessionId: session.id,
      data: { subtaskId: subtask.id, role: subtask.responsible },
      timestamp: Date.now(),
    });

    try {
      // Get role configuration
      const roleConfig = this.roleRegistry.getRole(subtask.responsible);
      if (!roleConfig) {
        throw new Error(`Unknown role: ${subtask.responsible}`);
      }

      // Execute the task (simulated for now - real implementation would call LLM)
      const result = await this.executeByRole(subtask, roleConfig, context);

      // Store result
      subtask.result = result.output;
      subtask.status = 'completed';
      subtask.completedAt = Date.now();
      session.results.set(subtask.id, result);
      context.setResult(result);

      this.emit({
        type: 'subtask_completed',
        sessionId: session.id,
        data: {
          subtaskId: subtask.id,
          role: subtask.responsible,
          confidence: result.confidence,
        },
        timestamp: Date.now(),
      });

    } catch (error) {
      subtask.status = 'failed';
      subtask.error = error instanceof Error ? error.message : String(error);
      subtask.completedAt = Date.now();
      session.updatedAt = Date.now();

      this.emit({
        type: 'subtask_failed',
        sessionId: session.id,
        data: { subtaskId: subtask.id, error: subtask.error },
        timestamp: Date.now(),
      });

      // Retry logic
      if (subtask.dependencies.length === 0) {
        await this.retrySubtask(subtask, session, context);
      }
    }
  }

  /**
   * Retry a failed subtask
   */
  private async retrySubtask(
    subtask: Subtask,
    session: CollaborationSession,
    context: SharedContext
  ): Promise<void> {
    // Simple retry: just re-execute once
    // Real implementation would have exponential backoff
    subtask.status = 'pending';
    await this.executeSubtask(subtask, session, context);
  }

  /**
   * Execute a subtask based on role
   * This is a placeholder - real implementation would call actual LLM services
   */
  private async executeByRole(
    subtask: Subtask,
    roleConfig: { systemPrompt: string; capabilities: string[] },
    context: SharedContext
  ): Promise<SubtaskResult> {
    // Simulate execution delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));

    // Generate simulated result based on task type
    const role = subtask.responsible;
    const roleDisplay = getRoleDisplayName(role);
    const roleEmoji = getRoleEmoji(role);

    let output: string;
    switch (subtask.type) {
      case 'memory_retrieval':
        output = `${roleEmoji} ${roleDisplay}已完成记忆检索。在过去7天中找到了3条相关记忆，主要涉及工作压力和生活琐事。`;
        break;
      case 'emotion_analysis':
        output = `${roleEmoji} ${roleDisplay}已完成情绪分析。你的情绪在这周呈现"波动-回升"的趋势，周三出现情绪低谷，周五明显回升。`;
        break;
      case 'advice_generation':
        output = `${roleEmoji} ${roleDisplay}建议：1）周三晚上尝试10分钟冥想；2）周五下午安排户外活动；3）保持规律作息。`;
        break;
      case 'web_search':
        output = `${roleEmoji} ${roleDisplay}已完成信息搜集。找到5条相关信息，涵盖健康、心理和生活方面。`;
        break;
      case 'code_execution':
        output = `${roleEmoji} ${roleDisplay}已完成代码执行。代码运行成功，无错误。`;
        break;
      default:
        output = `${roleEmoji} ${roleDisplay}已完成任务。`;
    }

    return {
      subtaskId: subtask.id,
      role: subtask.responsible,
      output,
      confidence: 0.8 + Math.random() * 0.2, // 0.8-1.0 confidence
      metadata: {
        executedAt: Date.now(),
        role: subtask.responsible,
        taskType: subtask.type,
      },
    };
  }

  // ============================================================================
  // Result Aggregation
  // ============================================================================

  /**
   * Aggregate all subtask results into final response
   */
  private async aggregateResults(
    session: CollaborationSession,
    context: SharedContext
  ): Promise<string> {
    this.emit({
      type: 'aggregation_started',
      sessionId: session.id,
      data: { resultCount: session.results.size },
      timestamp: Date.now(),
    });

    // Collect all results in order
    const orderedResults: SubtaskResult[] = [];
    for (const subtask of session.subtasks) {
      const result = session.results.get(subtask.id);
      if (result) {
        orderedResults.push(result);
      }
    }

    // Build aggregation prompt
    const prompt = this.buildAggregationPrompt(orderedResults, session.userRequest);

    // Simulate aggregation (real implementation would call LLM)
    await new Promise(resolve => setTimeout(resolve, 300));

    // Generate final response
    const finalResponse = this.generateFinalResponse(orderedResults, session.userRequest);

    // Add to conversation history
    context.addMessage({
      role: 'Advisor', // Final response comes from Advisor role
      personaId: 'orchestrator',
      content: finalResponse,
      type: 'synthesis',
    });

    return finalResponse;
  }

  /**
   * Build aggregation prompt for final synthesis
   */
  private buildAggregationPrompt(results: SubtaskResult[], userRequest: string): string {
    let prompt = `用户请求: ${userRequest}\n\n`;
    prompt += `子任务结果:\n`;

    for (const result of results) {
      prompt += `\n[${getRoleDisplayName(result.role)}]\n${result.output}\n`;
    }

    prompt += `\n请综合以上结果，生成一段300字以内的回复，语言要亲切自然。`;
    return prompt;
  }

  /**
   * Generate final response from results
   */
  private generateFinalResponse(results: SubtaskResult[], userRequest: string): string {
    if (results.length === 0) {
      return '抱歉，我无法完成这个请求。';
    }

    // Simple synthesis: combine all results
    const synthesis: string[] = [];
    
    for (const result of results) {
      const roleDisplay = getRoleDisplayName(result.role);
      const emoji = getRoleEmoji(result.role);
      synthesis.push(`${emoji} ${roleDisplay}：${result.output.split('\n').slice(1).join(' ')}`);
    }

    return synthesis.join('\n\n');
  }

  // ============================================================================
  // Progress Tracking
  // ============================================================================

  /**
   * Get progress update for a session
   */
  getProgress(sessionId: string): ProgressUpdate | null {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;

    const activeSubtasks = session.subtasks
      .filter(t => t.status === 'running')
      .map(t => t.id);

    const completedSubtasks = session.subtasks
      .filter(t => t.status === 'completed')
      .map(t => t.id);

    const failedSubtasks = session.subtasks
      .filter(t => t.status === 'failed')
      .map(t => t.id);

    const total = session.subtasks.length;
    const done = completedSubtasks.length + failedSubtasks.length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;

    let message: string;
    switch (session.status) {
      case 'decomposing':
        message = '正在分解任务...';
        break;
      case 'executing':
        message = activeSubtasks.length > 0
          ? `${getRoleDisplayName(session.subtasks.find(t => t.id === activeSubtasks[0])?.responsible ?? 'MemoryExpert')}工作中...`
          : '处理中...';
        break;
      case 'aggregating':
        message = '正在汇总结果...';
        break;
      case 'done':
        message = '协作完成';
        break;
      case 'failed':
        message = '协作失败';
        break;
      default:
        message = '处理中...';
    }

    return {
      sessionId,
      status: session.status,
      progress,
      activeSubtasks,
      completedSubtasks,
      failedSubtasks,
      message,
      timestamp: Date.now(),
    };
  }

  // ============================================================================
  // Event System
  // ============================================================================

  /**
   * Subscribe to collaboration events
   */
  onEvent(handler: EventHandler): () => void {
    this.eventHandlers.push(handler);
    return () => {
      const index = this.eventHandlers.indexOf(handler);
      if (index > -1) {
        this.eventHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Emit an event to all handlers
   */
  private emit(event: CollaborationEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (e) {
        console.error('Event handler error:', e);
      }
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Validate session integrity
   */
  validateSession(sessionId: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const session = this.activeSessions.get(sessionId);

    if (!session) {
      errors.push('Session not found');
      return { valid: false, errors };
    }

    if (session.subtasks.length === 0) {
      errors.push('No subtasks defined');
    }

    // Check dependency validity
    const validation = this.decomposer.validateDependencies(session.subtasks);
    if (!validation.valid) {
      errors.push(...validation.errors);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    totalSessions: number;
    activeSessions: number;
    completedSessions: number;
    failedSessions: number;
  } {
    let active = 0, completed = 0, failed = 0;

    for (const session of this.activeSessions.values()) {
      switch (session.status) {
        case 'done':
          completed++;
          break;
        case 'failed':
          failed++;
          break;
        default:
          active++;
      }
    }

    return {
      totalSessions: this.activeSessions.size,
      activeSessions: active,
      completedSessions: completed,
      failedSessions: failed,
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createOrchestrator(config?: Partial<OrchestratorConfig>): CollaborationOrchestrator {
  return new CollaborationOrchestrator(config);
}
