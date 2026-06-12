/**
 * V150: Council Services — Barrel Export
 */

export {
  createAgentCouncil,
  proposeToCouncil,
  critiqueProposal,
  synthesizeCouncil,
  voteInCouncil,
  broadcastToCouncil,
  BUILT_IN_AGENTS,
  type AgentCouncil,
  type CouncilConfig,
  type CouncilAgent,
  type CouncilMessage,
  type CouncilAgentData,
  type AgentRole,
  type MessageType,
} from './AgentCouncil';

export {
  createConsensusEngine,
  getDefaultConsensusEngine,
  isConsensusReached,
  getConsensusSummary,
  type ConsensusOutcome,
  type Vote,
  type PriorityScore,
  type ConsensusConfig,
  type VoteValue,
} from './ConsensusEngine';

export {
  createMessageBus,
  createNamespacedMessageBus,
  type MessageBusTopic,
  type MessageBusMessage,
  type MessageBusCallback,
  type MessageBusSubscription,
  type NamespacedMessageBus,
} from './MessageBusV3';