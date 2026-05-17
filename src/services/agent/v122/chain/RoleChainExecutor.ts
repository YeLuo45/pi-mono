/**
 * RoleChainExecutor - Executes role chains
 */

import type { RoleChain, ChainNode, ChainNodeResult, ChainExecutionContext, ChainExecutionEvent } from '../types';
import { ChainState } from './ChainState';
import { getNextNode } from './RoleChain';
import { RoleRegistry } from '../../v120/roles/RoleRegistry';
import { RoleAssigner } from '../../v120/roles/RoleAssigner';
import type { TaskRoleRequirement } from '../../v120/types';

type EventCallback = (event: ChainExecutionEvent) => void;

export class RoleChainExecutor {
  private chainState: ChainState;
  private registry: RoleRegistry;
  private assigner: RoleAssigner;
  private eventListeners: EventCallback[] = [];

  constructor() {
    this.chainState = new ChainState();
    this.registry = new RoleRegistry();
    this.assigner = new RoleAssigner(this.registry);
  }

  // ===========================================================================
  // Event Handling
  // ===========================================================================

  onEvent(callback: EventCallback): () => void {
    this.eventListeners.push(callback);
    return () => {
      this.eventListeners = this.eventListeners.filter(cb => cb !== callback);
    };
  }

  private emit(executionId: string, nodeId: string, type: ChainExecutionEvent['type'], data?: unknown): void {
    for (const cb of this.eventListeners) {
      cb({ executionId, nodeId, type, data, timestamp: Date.now() });
    }
  }

  // ===========================================================================
  // Execution
  // ===========================================================================

  async execute(chain: RoleChain, initialInput?: Record<string, unknown>): Promise<ChainExecutionContext> {
    const executionId = this.chainState.createExecution(chain.id);
    const entryNode = chain.nodes.find(n => n.id === chain.entryNodeId);

    if (!entryNode) {
      this.chainState.failNode(executionId, '', 'No entry node found');
      return this.chainState.getContext(executionId)!;
    }

    // Initialize variables
    const ctx = this.chainState.getContext(executionId)!;
    if (initialInput) {
      ctx.variables = { ...initialInput };
    }

    this.chainState.startExecution(executionId, entryNode.id);
    this.emit(executionId, entryNode.id, 'start');

    try {
      await this.executeNode(chain, executionId, entryNode, ctx.variables);

      if (ctx.status === 'running') {
        this.chainState.completeChain(executionId);
      }
    } catch (error) {
      const currentNodeId = ctx.currentNodeId || '';
      this.chainState.failNode(executionId, currentNodeId, String(error));
    }

    return this.chainState.getContext(executionId)!;
  }

  private async executeNode(
    chain: RoleChain,
    executionId: string,
    node: ChainNode,
    variables: Record<string, unknown>
  ): Promise<unknown> {
    const ctx = this.chainState.getContext(executionId)!;
    if (ctx.status !== 'running') return undefined;

    this.chainState.startNode(executionId, node.id);
    this.emit(executionId, node.id, 'start');

    const startTime = Date.now();
    let result: unknown;
    let status: 'completed' | 'failed' | 'skipped' = 'completed';

    try {
      switch (node.type) {
        case 'role':
          result = await this.executeRoleNode(chain, executionId, node, variables);
          break;

        case 'condition':
          result = this.evaluateCondition(node, variables);
          this.emit(executionId, node.id, 'condition_result', result);
          break;

        case 'parallel':
          result = await this.executeParallelNodes(chain, executionId, node, variables);
          break;

        case 'aggregator':
          result = this.aggregateResults(executionId, node, variables);
          break;

        default:
          result = variables;
      }

      const duration = Date.now() - startTime;
      this.chainState.completeNode(executionId, node.id, {
        nodeId: node.id,
        output: result,
        duration,
        status,
      });
      this.emit(executionId, node.id, 'complete', result);

      // Move to next node
      const nextNodeId = getNextNode(chain, node.id, result);
      if (nextNodeId) {
        const nextNode = chain.nodes.find(n => n.id === nextNodeId);
        if (nextNode) {
          return this.executeNode(chain, executionId, nextNode, ctx.variables);
        }
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.chainState.failNode(executionId, node.id, String(error));
      this.emit(executionId, node.id, 'fail', String(error));
      throw error;
    }
  }

  private async executeRoleNode(
    chain: RoleChain,
    executionId: string,
    node: ChainNode,
    variables: Record<string, unknown>
  ): Promise<unknown> {
    if (!node.roleId) throw new Error('Node has no roleId');

    // Assign agent based on role
    const requirement: TaskRoleRequirement = {
      taskId: executionId,
      taskType: 'complex',
      requiredCapabilities: [],
      preferredRoles: [node.roleId],
    };
    const assignments = this.assigner.assign(requirement);

    if (assignments.length === 0) {
      throw new Error(`No agent available for role ${node.roleId}`);
    }

    const assignment = assignments[0];

    // Map input
    const input: Record<string, unknown> = {};
    if (node.inputMapping) {
      for (const [target, source] of Object.entries(node.inputMapping)) {
        input[target] = this.resolveValue(source, variables);
      }
    }

    // Simulate agent execution (in real impl, this would call the agent)
    await this.simulateAgentExecution(assignment.agentId, node.roleId, input);

    // Return output (in real impl, this would be the agent's actual output)
    return { agentId: assignment.agentId, roleId: node.roleId, input, timestamp: Date.now() };
  }

  private evaluateCondition(node: ChainNode, variables: Record<string, unknown>): boolean {
    if (!node.condition) return true;
    try {
      const fn = new Function('vars', `with(vars) { return ${node.condition}; }`);
      return Boolean(fn(variables));
    } catch {
      return false;
    }
  }

  private async executeParallelNodes(
    chain: RoleChain,
    executionId: string,
    node: ChainNode,
    variables: Record<string, unknown>
  ): Promise<unknown[]> {
    if (!node.parallelNodes || node.parallelNodes.length === 0) return [];

    const promises = node.parallelNodes.map(nodeId => {
      const childNode = chain.nodes.find(n => n.id === nodeId);
      if (!childNode) return Promise.resolve(undefined);
      return this.executeNode(chain, executionId, childNode, { ...variables });
    });

    return Promise.all(promises);
  }

  private aggregateResults(executionId: string, node: ChainNode, variables: Record<string, unknown>): unknown {
    const results = this.chainState.getAllResults(executionId);
    // In a real implementation, this would aggregate based on node.outputMapping
    return results.map(r => r.output);
  }

  private resolveValue(path: string, variables: Record<string, unknown>): unknown {
    const parts = path.split('.');
    let value: unknown = variables;
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
    return value;
  }

  private async simulateAgentExecution(agentId: string, roleId: string, input: Record<string, unknown>): Promise<void> {
    // Simulate work - in real impl, this would invoke the actual agent
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // ===========================================================================
  // State Queries
  // ===========================================================================

  getExecution(executionId: string): ChainExecutionContext | undefined {
    return this.chainState.getContext(executionId);
  }

  getNodeResult(executionId: string, nodeId: string): ChainNodeResult | undefined {
    return this.chainState.getNodeResult(executionId, nodeId);
  }
}
