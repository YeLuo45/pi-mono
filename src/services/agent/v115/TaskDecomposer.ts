/**
 * TaskDecomposer - LLM-driven task decomposition engine
 * 
 * Transforms complex user goals into structured task graphs (DAG)
 * with dependency analysis and parallel execution planning.
 */

import type {
  AgentContext,
  TaskNode,
  DependencyEdge,
  TaskGraph,
  DecompositionPrompt,
  DecompositionResult,
  LLMDecompositionOptions,
  LLMOutput,
  TaskPriority,
} from './types';
import { DependencyGraph } from './DependencyGraph';

// ============================================================================
// System Prompt Templates
// ============================================================================

const DEFAULT_DECOMPOSITION_PROMPT = `You are a task decomposition expert. Given a user goal, break it down into structured sub-tasks that can be executed efficiently.

For the goal provided:
1. Identify 3-7 distinct sub-tasks needed to accomplish the goal
2. For each sub-task, determine:
   - A clear, actionable description
   - The appropriate agent type (main, memory, search, tool, persona)
   - Whether it can run in parallel with others
   - What data it produces (output) and what data it needs (input)
   - Estimated duration in seconds (be reasonable)

3. Identify dependencies between sub-tasks (what must complete before what)
4. Group sub-tasks that can execute in parallel

Output format (JSON):
{
  "reasoning": "Brief explanation of decomposition strategy",
  "warnings": ["Any potential issues or concerns"],
  "nodes": [
    {
      "id": "unique-id",
      "description": "Task description",
      "agentType": "main|memory|search|tool|persona",
      "parallelizable": true|false,
      "priority": "high|normal|low",
      "input": {"describe inputs needed"},
      "output": {"describe outputs produced"},
      "estimatedDuration": 5000
    }
  ],
  "edges": [
    {
      "sourceId": "task-id",
      "targetId": "task-id",
      "type": "data|control",
      "dataFlowKey": "output-key-name"
    }
  ]
}

Constraints:
- Maximum 7 sub-tasks
- Each task should be actionable and clear
- Only create dependencies when truly necessary
- Mark tasks as parallelizable=true if they don't depend on each other's outputs`;

const REFINE_PROMPT = `The following task decomposition encountered an issue and needs refinement:

Original Goal: {originalGoal}
Issue: {issue}

Current Task Graph:
{currentGraph}

Please refine the task graph to address the issue:
- Retry failed tasks
- Skip infeasible branches  
- Reorder dependencies if possible
- Adjust task descriptions or boundaries

Output format (same as before with reasoning for changes)`;

// ============================================================================
// TaskDecomposer Class
// ============================================================================

export class TaskDecomposer {
  private options: LLMDecompositionOptions;
  private llmClient: LLMClient | null = null;

  constructor(options: LLMDecompositionOptions = {}) {
    this.options = {
      model: 'claude-sonnet-4-20250514',
      temperature: 0.3,
      maxTokens: 4000,
      systemPrompt: DEFAULT_DECOMPOSITION_PROMPT,
      ...options,
    };
  }

  /**
   * Set the LLM client for actual API calls
   */
  setLLMClient(client: LLMClient): void {
    this.llmClient = client;
  }

  /**
   * Main entry point: decompose a goal into a task graph
   */
  async decompose(prompt: DecompositionPrompt): Promise<DecompositionResult> {
    const { goal, context, constraints } = prompt;

    try {
      // Build the prompt for LLM
      const userPrompt = this.buildDecompositionPrompt(goal, context, constraints);

      // Call LLM for decomposition
      const llmOutput = await this.callLLM(userPrompt);

      if (!llmOutput.success) {
        return {
          success: false,
          graph: this.createEmptyGraph(goal),
          warnings: ['LLM call failed'],
        };
      }

      // Parse LLM output
      const parsed = this.parseLLMOutput(llmOutput.content);

      if (!parsed) {
        return {
          success: false,
          graph: this.createEmptyGraph(goal),
          warnings: ['Failed to parse LLM output'],
        };
      }

      // Build the dependency graph
      const graph = this.buildTaskGraph(goal, parsed.nodes, parsed.edges);

      return {
        success: true,
        graph,
        reasoning: parsed.reasoning,
        warnings: parsed.warnings || [],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        graph: this.createEmptyGraph(goal),
        warnings: [`Decomposition error: ${errorMessage}`],
      };
    }
  }

  /**
   * Refine an existing graph based on feedback
   */
  async refine(
    graph: TaskGraph,
    feedback: string
  ): Promise<DecompositionResult> {
    try {
      const prompt = REFINE_PROMPT
        .replace('{originalGoal}', graph.rootGoal)
        .replace('{issue}', feedback)
        .replace('{currentGraph}', JSON.stringify(graph, null, 2));

      const llmOutput = await this.callLLM(prompt);

      if (!llmOutput.success) {
        return {
          success: false,
          graph,
          warnings: ['Refinement LLM call failed'],
        };
      }

      const parsed = this.parseLLMOutput(llmOutput.content);

      if (!parsed) {
        return {
          success: false,
          graph,
          warnings: ['Failed to parse refinement output'],
        };
      }

      const newGraph = this.buildTaskGraph(graph.rootGoal, parsed.nodes, parsed.edges);

      return {
        success: true,
        graph: newGraph,
        reasoning: parsed.reasoning,
        warnings: parsed.warnings || [],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        graph,
        warnings: [`Refinement error: ${errorMessage}`],
      };
    }
  }

  // -----------------------------------------------------------------------
  // Private Methods
  // -----------------------------------------------------------------------

  private buildDecompositionPrompt(
    goal: string,
    context: AgentContext,
    constraints?: DecompositionPrompt['constraints']
  ): string {
    const constraintsText = constraints
      ? `\nConstraints: max ${constraints.maxTasks || 7} tasks, max depth ${constraints.maxDepth || 3}${
          constraints.allowParallel !== false ? ', parallel execution enabled' : ''
        }`
      : '';

    const contextText = `
Available Agents:
${context.availableAgents.map((a) => `- ${a.type} (${a.id}): ${a.capabilities.join(', ')}`).join('\n')}

Capabilities: ${context.capabilities.join(', ')}
`;

    return `Goal: ${goal}
${contextText}
${constraintsText}

Provide your decomposition in the specified JSON format.`;
  }

  private async callLLM(userPrompt: string): Promise<LLMOutput> {
    if (!this.llmClient) {
      // Return a mock decomposition for testing without LLM
      return this.mockDecomposition(userPrompt);
    }

    return this.llmClient.complete({
      prompt: userPrompt,
      system: this.options.systemPrompt,
      model: this.options.model,
      temperature: this.options.temperature,
      maxTokens: this.options.maxTokens,
    });
  }

  private mockDecomposition(prompt: string): LLMOutput {
    // Extract goal from prompt
    const goalMatch = prompt.match(/^Goal: (.+?)(?:\n|$)/m);
    const goal = goalMatch ? goalMatch[1] : 'Unknown goal';

    // Generate reasonable mock nodes based on keywords
    const nodes = this.generateMockNodes(goal);

    return {
      success: true,
      content: JSON.stringify({
        reasoning: 'Mock decomposition based on goal keywords',
        warnings: [],
        nodes,
        edges: this.generateMockEdges(nodes),
      }),
    };
  }

  private generateMockNodes(goal: string): TaskNode[] {
    const lowerGoal = goal.toLowerCase();
    const nodes: TaskNode[] = [];

    // Search task if keywords suggest it
    if (lowerGoal.includes('search') || lowerGoal.includes('find') || lowerGoal.includes('look')) {
      nodes.push({
        id: crypto.randomUUID(),
        description: 'Search for relevant information',
        agentType: 'search',
        subtasks: [],
        parallelizable: false,
        dependsOn: [],
        status: 'pending',
        priority: 'normal',
        estimatedDuration: 3000,
      });
    }

    // Memory task if keywords suggest recall
    if (lowerGoal.includes('remember') || lowerGoal.includes('previous') || lowerGoal.includes('what')) {
      nodes.push({
        id: crypto.randomUUID(),
        description: 'Query memory for context',
        agentType: 'memory',
        subtasks: [],
        parallelizable: false,
        dependsOn: [],
        status: 'pending',
        priority: 'normal',
        estimatedDuration: 1000,
      });
    }

    // Tool execution for creative/generative tasks
    if (lowerGoal.includes('create') || lowerGoal.includes('generate') || lowerGoal.includes('make')) {
      nodes.push({
        id: crypto.randomUUID(),
        description: 'Execute appropriate tools',
        agentType: 'tool',
        subtasks: [],
        parallelizable: false,
        dependsOn: nodes.length > 0 ? [nodes[nodes.length - 1].id] : [],
        status: 'pending',
        priority: 'high',
        estimatedDuration: 5000,
      });
    }

    // Final response task
    nodes.push({
      id: crypto.randomUUID(),
      description: 'Compile and present results',
      agentType: 'main',
      subtasks: [],
      parallelizable: false,
      dependsOn: nodes.length > 0 ? [nodes[nodes.length - 1].id] : [],
      status: 'pending',
      priority: 'normal',
      estimatedDuration: 2000,
    });

    // Ensure we have at least 2 nodes
    if (nodes.length < 2) {
      nodes.unshift({
        id: crypto.randomUUID(),
        description: 'Analyze and plan approach',
        agentType: 'main',
        subtasks: [],
        parallelizable: true,
        dependsOn: [],
        status: 'pending',
        priority: 'normal',
        estimatedDuration: 2000,
      });
    }

    return nodes;
  }

  private generateMockEdges(nodes: TaskNode[]): DependencyEdge[] {
    const edges: DependencyEdge[] = [];

    for (let i = 1; i < nodes.length; i++) {
      const prevNode = nodes[i - 1];
      const currentNode = nodes[i];

      // Only create edge if current node depends on previous
      if (currentNode.dependsOn.includes(prevNode.id)) {
        edges.push({
          sourceId: prevNode.id,
          targetId: currentNode.id,
          type: 'data',
          dataFlowKey: 'result',
        });
      }
    }

    return edges;
  }

  private parseLLMOutput(content: string): {
    reasoning: string;
    warnings: string[];
    nodes: TaskNode[];
    edges: DependencyEdge[];
  } | null {
    try {
      // Try to extract JSON from the content
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('[TaskDecomposer] No JSON found in LLM output');
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate required fields
      if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
        console.error('[TaskDecomposer] Missing nodes or edges arrays');
        return null;
      }

      // Ensure each node has required fields
      for (const node of parsed.nodes) {
        node.id = node.id || crypto.randomUUID();
        node.subtasks = node.subtasks || [];
        node.parallelizable = node.parallelizable ?? true;
        node.status = node.status || 'pending';
        node.priority = node.priority || 'normal';
        node.dependsOn = node.dependsOn || [];
        node.estimatedDuration = node.estimatedDuration || 2000;
      }

      return {
        reasoning: parsed.reasoning || 'No reasoning provided',
        warnings: parsed.warnings || [],
        nodes: parsed.nodes,
        edges: parsed.edges,
      };
    } catch (error) {
      console.error('[TaskDecomposer] Parse error:', error);
      return null;
    }
  }

  private buildTaskGraph(
    goal: string,
    nodes: TaskNode[],
    edges: DependencyEdge[]
  ): TaskGraph {
    const dependencyGraph = new DependencyGraph();
    return dependencyGraph.buildGraph(goal, nodes, edges);
  }

  private createEmptyGraph(goal: string): TaskGraph {
    return {
      id: crypto.randomUUID(),
      rootGoal: goal,
      nodes: [],
      edges: [],
      parallelGroups: [],
      estimatedDuration: 0,
      criticalPath: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }
}

// ============================================================================
// LLM Client Interface
// ============================================================================

export interface LLMClient {
  complete(options: {
    prompt: string;
    system?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<LLMOutput>;
}

// ============================================================================
// Default Instance
// ============================================================================

let defaultTaskDecomposer: TaskDecomposer | null = null;

export function getTaskDecomposer(options?: LLMDecompositionOptions): TaskDecomposer {
  if (!defaultTaskDecomposer) {
    defaultTaskDecomposer = new TaskDecomposer(options);
  }
  return defaultTaskDecomposer;
}

export function setGlobalLLMClient(client: LLMClient): void {
  getTaskDecomposer().setLLMClient(client);
}