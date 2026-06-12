/**
 * V150: Agent Council — Multi-Agent Collaboration System
 *
 * Council with built-in agents:
 * - Proposer: suggests ideas/proposals
 * - Critic: challenges and refines proposals
 * - Synthesizer: combines perspectives into solutions
 * - Voter: makes final decisions based on consensus
 */

import type { ConsensusOutcome } from './ConsensusEngine';
import { createConsensusEngine } from './ConsensusEngine';
import { createMessageBus } from './MessageBusV3';
import type { MessageBusV3 } from './MessageBusV3';

// ============================================================================
// Type definitions
// ============================================================================

export type AgentRole = 'proposer' | 'critic' | 'synthesizer' | 'voter';
export type MessageType = 'proposal' | 'critique' | 'synthesis' | 'vote' | 'broadcast';

export interface CouncilAgent {
  id: string;
  name: string;
  role: AgentRole;
  personality: string;
  isActive: boolean;
  timestamp: number;
  change_id: string;
  last_modified: number;
  device_id: string;
}

export interface CouncilMessage {
  id: string;
  agentId: string;
  type: MessageType;
  content: string;
  timestamp: number;
  references?: string[];
  change_id?: string;
  last_modified?: number;
  device_id?: string;
}

export interface CouncilAgentData {
  name: string;
  role: AgentRole;
  personality: string;
  isActive: boolean;
}

// Agent personality prompts
const AGENT_PERSONALITIES: Record<AgentRole, string> = {
  proposer: `You are a creative proposer. You suggest innovative ideas and approaches.
Focus on possibilities, opportunities, and fresh perspectives. Be enthusiastic but realistic.
When presenting ideas, explain the "why" and potential benefits clearly.`,

  critic: `You are a critical thinker. You identify weaknesses, risks, and potential problems.
Challenge assumptions and push for rigorous thinking. Be direct but constructive.
Focus on feasibility, risks, and what could go wrong.`,

  synthesizer: `You are a synthesis specialist. You combine different perspectives into coherent solutions.
Find common ground and integrate opposing views. Be diplomatic and integrative.
Focus on creating solutions that address core concerns from all sides.`,

  voter: `You are a decision maker. You evaluate options and make final calls.
Consider all input but can commit to a direction when needed. Be decisive and clear.
Weigh pros and cons, consider priorities, and choose the best path forward.`,
};

/**
 * Built-in council agents
 */
export const BUILT_IN_AGENTS: CouncilAgentData[] = [
  {
    name: 'Proposer',
    role: 'proposer',
    personality: AGENT_PERSONALITIES.proposer,
    isActive: true,
  },
  {
    name: 'Critic',
    role: 'critic',
    personality: AGENT_PERSONALITIES.critic,
    isActive: true,
  },
  {
    name: 'Synthesizer',
    role: 'synthesizer',
    personality: AGENT_PERSONALITIES.synthesizer,
    isActive: true,
  },
  {
    name: 'Voter',
    role: 'voter',
    personality: AGENT_PERSONALITIES.voter,
    isActive: true,
  },
];

export interface CouncilConfig {
  name?: string;
  agents?: CouncilAgentData[];
  consensusThreshold?: number;
}

export interface AgentCouncil {
  id: string;
  name: string;
  agents: Map<string, CouncilAgent>;
  messageBus: MessageBusV3;
  consensusEngine: ReturnType<typeof createConsensusEngine>;
  messages: CouncilMessage[];
  addAgent(agent: CouncilAgentData): CouncilAgent;
  removeAgent(agentId: string): boolean;
  getAgent(agentId: string): CouncilAgent | undefined;
  getAgentsByRole(role: AgentRole): CouncilAgent[];
  sendMessage(message: { agentId: string; type: MessageType; content: string; references?: string[] }): CouncilMessage;
  getMessages(): CouncilMessage[];
  getMessagesByAgent(agentId: string): CouncilMessage[];
  getMessagesByType(type: MessageType): CouncilMessage[];
  reachConsensus(topic?: string): ConsensusOutcome;
  reset(): void;
}

function generateId(): string {
  return crypto.randomUUID();
}

function createCouncilAgent(agentData: CouncilAgentData): CouncilAgent {
  return {
    ...agentData,
    id: generateId(),
    timestamp: Date.now(),
    change_id: generateId(),
    last_modified: Date.now(),
    device_id: 'local',
  };
}

function createCouncilMessage(
  messageData: { agentId: string; type: MessageType; content: string; references?: string[] },
  agentId: string
): CouncilMessage {
  return {
    id: generateId(),
    agentId: messageData.agentId,
    type: messageData.type,
    content: messageData.content,
    timestamp: Date.now(),
    references: messageData.references || [],
  };
}

/**
 * Create a new Agent Council instance
 */
export function createAgentCouncil(config: CouncilConfig = {}): AgentCouncil {
  const id = generateId();
  const name = config.name || `Council-${id.slice(0, 8)}`;
  const agents = new Map<string, CouncilAgent>();
  const messages: CouncilMessage[] = [];

  // Create message bus
  const messageBus = createMessageBus();

  // Create consensus engine
  const consensusEngine = createConsensusEngine({
    threshold: config.consensusThreshold,
  });

  // Initialize built-in agents
  const agentList = config.agents || BUILT_IN_AGENTS;
  for (const agentData of agentList) {
    const agent = createCouncilAgent(agentData);
    agents.set(agent.id, agent);
  }

  const council: AgentCouncil = {
    id,
    name,
    agents,
    messageBus,
    consensusEngine,
    messages,

    addAgent(agentData) {
      const agent = createCouncilAgent(agentData);
      this.agents.set(agent.id, agent);
      this.messageBus.publish('agent:added', { agent });
      return agent;
    },

    removeAgent(agentId) {
      const agent = this.agents.get(agentId);
      if (!agent) return false;
      this.agents.delete(agentId);
      this.messageBus.publish('agent:removed', { agentId });
      return true;
    },

    getAgent(agentId) {
      return this.agents.get(agentId);
    },

    getAgentsByRole(role) {
      return Array.from(this.agents.values()).filter((a) => a.role === role);
    },

    sendMessage(messageData) {
      const agent = this.agents.get(messageData.agentId);
      if (!agent) {
        throw new Error(`Agent not found: ${messageData.agentId}`);
      }

      const message = createCouncilMessage(messageData, messageData.agentId);
      this.messages.push(message);

      // Publish to message bus
      this.messageBus.publish(`message:${message.type}`, { message, agent });
      this.messageBus.publish('message:new', { message, agent });

      return message;
    },

    getMessages() {
      return [...this.messages];
    },

    getMessagesByAgent(agentId) {
      return this.messages.filter((m) => m.agentId === agentId);
    },

    getMessagesByType(type) {
      return this.messages.filter((m) => m.type === type);
    },

    reachConsensus(topic) {
      // Gather all votes
      const voteMessages = this.getMessagesByType('vote');

      const outcome = this.consensusEngine.decide(
        voteMessages.map((m) => ({
          agentId: m.agentId,
          vote: m.content as 'approve' | 'reject' | 'abstain',
        })),
        Array.from(this.agents.values()).map((a) => ({
          agentId: a.id,
          priority: a.role === 'voter' ? 10 : a.role === 'synthesizer' ? 7 : a.role === 'critic' ? 5 : 3,
          isActive: a.isActive,
        })),
        topic
      );

      // Publish consensus result
      this.messageBus.publish('consensus:reached', { outcome, topic });

      return outcome;
    },

    reset() {
      this.messages.length = 0;
      this.consensusEngine.reset();
      this.messageBus.publish('council:reset', { councilId: this.id });
    },
  };

  return council;
}

// ============================================================================
// Convenience functions for council operations
// ============================================================================

/**
 * Propose a new idea to the council
 */
export function proposeToCouncil(council: AgentCouncil, content: string, proposerId: string): CouncilMessage {
  return council.sendMessage({
    agentId: proposerId,
    type: 'proposal',
    content,
    references: [],
  });
}

/**
 * Add critique to a proposal
 */
export function critiqueProposal(
  council: AgentCouncil,
  content: string,
  criticId: string,
  references: string[]
): CouncilMessage {
  return council.sendMessage({
    agentId: criticId,
    type: 'critique',
    content,
    references,
  });
}

/**
 * Synthesize perspectives into a solution
 */
export function synthesizeCouncil(
  council: AgentCouncil,
  content: string,
  synthesizerId: string,
  references: string[]
): CouncilMessage {
  return council.sendMessage({
    agentId: synthesizerId,
    type: 'synthesis',
    content,
    references,
  });
}

/**
 * Cast a vote in the council
 */
export function voteInCouncil(
  council: AgentCouncil,
  agentId: string,
  decision: 'approve' | 'reject' | 'abstain'
): CouncilMessage {
  return council.sendMessage({
    agentId,
    type: 'vote',
    content: decision,
    references: [],
  });
}

/**
 * Broadcast a message to all agents
 */
export function broadcastToCouncil(
  council: AgentCouncil,
  content: string,
  senderId: string
): CouncilMessage {
  const message = council.sendMessage({
    agentId: senderId,
    type: 'broadcast',
    content,
    references: [],
  });

  council.messageBus.publish('broadcast', { message, senderId });
  return message;
}

// ============================================================================
// Re-export types and sub-modules
// ============================================================================

export type { ConsensusOutcome, Vote, PriorityScore } from './ConsensusEngine';
export type { MessageBusSubscription, MessageBusTopic } from './MessageBusV3';