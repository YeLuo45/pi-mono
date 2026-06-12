/**
 * V150: Consensus Engine — Voting/Priority-based Decision Making
 *
 * Implements consensus decision-making for the Agent Council:
 * - Vote counting with threshold
 * - Priority weighting for different agent roles
 * - Support for approve/reject/abstain votes
 */

export type VoteValue = 'approve' | 'reject' | 'abstain';

export interface Vote {
  agentId: string;
  vote: VoteValue;
}

export interface PriorityScore {
  agentId: string;
  priority: number; // Higher = more weight
  isActive: boolean;
}

export interface ConsensusConfig {
  threshold?: number; // 0-1, percentage needed for consensus (default: 0.6)
  abstentionImpact?: 'ignore' | 'count' | 'block'; // How to handle abstains
  priorityEnabled?: boolean; // Use priority weighting
}

export interface ConsensusOutcome {
  decision: string;
  votes: Record<string, VoteValue>;
  winner?: string;
  timestamp: number;
  details: {
    approveCount: number;
    rejectCount: number;
    abstainCount: number;
    totalWeight: number;
    approveWeight: number;
    threshold: number;
    reached: boolean;
    method: 'majority' | 'weighted' | 'unanimous';
  };
}

const DEFAULT_CONFIG: Required<ConsensusConfig> = {
  threshold: 0.6,
  abstentionImpact: 'ignore',
  priorityEnabled: true,
};

export interface ConsensusEngine {
  config: ConsensusConfig;
  votes: Vote[];
  reset(): void;
  addVote(vote: Vote): void;
  removeVote(agentId: string): boolean;
  getVotes(): Vote[];
  decide(votes: Vote[], priorities: PriorityScore[], topic?: string): ConsensusOutcome;
  getWinningOption(votes: Vote[], priorities: PriorityScore[]): { option: VoteValue; weight: number } | null;
  calculateConsensus(votes: Vote[], priorities: PriorityScore[]): {
    reached: boolean;
    approveWeight: number;
    rejectWeight: number;
    totalWeight: number;
    approvePercent: number;
    rejectPercent: number;
  };
}

function createConsensusEngine(config: ConsensusConfig = {}): ConsensusEngine {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const votes: Vote[] = [];

  return {
    config: mergedConfig,

    reset() {
      votes.length = 0;
    },

    addVote(vote) {
      // Remove existing vote from same agent
      const existingIndex = votes.findIndex((v) => v.agentId === vote.agentId);
      if (existingIndex >= 0) {
        votes.splice(existingIndex, 1);
      }
      votes.push(vote);
    },

    removeVote(agentId) {
      const index = votes.findIndex((v) => v.agentId === agentId);
      if (index >= 0) {
        votes.splice(index, 1);
        return true;
      }
      return false;
    },

    getVotes() {
      return [...votes];
    },

    decide(votes: Vote[], priorities: PriorityScore[], topic = 'general'): ConsensusOutcome {
      const { threshold, priorityEnabled, abstentionImpact } = mergedConfig;

      // Calculate weights
      const priorityMap = new Map(priorities.map((p) => [p.agentId, p]));

      let totalWeight = 0;
      let approveWeight = 0;
      let rejectWeight = 0;
      let abstainWeight = 0;
      const votesRecord: Record<string, VoteValue> = {};

      for (const vote of votes) {
        const priority = priorityMap.get(vote.agentId);
        const weight = priorityEnabled && priority ? priority.priority : 1;
        const activeWeight = priority?.isActive !== false ? weight : 0;

        votesRecord[vote.agentId] = vote.vote;

        if (vote.vote === 'approve') {
          approveWeight += activeWeight;
          totalWeight += activeWeight;
        } else if (vote.vote === 'reject') {
          rejectWeight += activeWeight;
          totalWeight += activeWeight;
        } else {
          abstainWeight += activeWeight;
          if (abstentionImpact === 'count') {
            totalWeight += activeWeight;
          }
        }
      }

      // Determine winner
      let winner: VoteValue | undefined;
      let reached = false;
      let method: 'majority' | 'weighted' | 'unanimous' = 'majority';

      const totalVoters = votes.filter((v) => priorityMap.get(v.agentId)?.isActive !== false).length;
      const approveCount = votes.filter((v) => v.vote === 'approve').length;
      const rejectCount = votes.filter((v) => v.vote === 'reject').length;
      const abstainCount = votes.filter((v) => v.vote === 'abstain').length;

      // Check for unanimous reject (any rejection can block in some configs)
      if (rejectWeight > 0 && totalWeight > 0 && rejectWeight / totalWeight >= threshold) {
        winner = 'reject';
        reached = true;
        method = priorityEnabled ? 'weighted' : 'majority';
      }
      // Check for approval
      else if (totalWeight > 0 && approveWeight / totalWeight >= threshold) {
        winner = 'approve';
        reached = true;
        method = priorityEnabled ? 'weighted' : 'majority';
      }
      // Check for unanimous (all voted same way)
      else if (totalVoters > 0 && approveCount + rejectCount === totalVoters) {
        if (approveCount === totalVoters) {
          winner = 'approve';
          reached = true;
          method = 'unanimous';
        } else if (rejectCount === totalVoters) {
          winner = 'reject';
          reached = true;
          method = 'unanimous';
        }
      }

      // Simple majority as fallback
      if (!winner && totalVoters > 0) {
        if (approveCount > rejectCount && approveCount > totalVoters / 2) {
          winner = 'approve';
          reached = true;
        } else if (rejectCount > approveCount && rejectCount > totalVoters / 2) {
          winner = 'reject';
          reached = true;
        }
      }

      const decision = winner
        ? winner === 'approve'
          ? `Approved: ${topic}`
          : winner === 'reject'
            ? `Rejected: ${topic}`
            : `Abstained: ${topic}`
        : `No Consensus: ${topic}`;

      return {
        decision,
        votes: votesRecord,
        winner,
        timestamp: Date.now(),
        details: {
          approveCount,
          rejectCount,
          abstainCount,
          totalWeight,
          approveWeight,
          threshold,
          reached,
          method,
        },
      };
    },

    getWinningOption(votes: Vote[], priorities: PriorityScore[]) {
      if (votes.length === 0) return null;

      const counts = { approve: 0, reject: 0, abstain: 0 };
      const priorityMap = new Map(priorities.map((p) => [p.agentId, p]));

      for (const vote of votes) {
        const priority = priorityMap.get(vote.agentId);
        const weight = this.config.priorityEnabled && priority ? priority.priority : 1;
        counts[vote.vote] += weight;
      }

      if (counts.approve === 0 && counts.reject === 0) return null;

      if (counts.approve >= counts.reject) {
        return { option: 'approve', weight: counts.approve };
      }
      return { option: 'reject', weight: counts.reject };
    },

    calculateConsensus(votes: Vote[], priorities: PriorityScore[]) {
      const { threshold, priorityEnabled } = mergedConfig;
      const priorityMap = new Map(priorities.map((p) => [p.agentId, p]));

      let totalWeight = 0;
      let approveWeight = 0;
      let rejectWeight = 0;

      for (const vote of votes) {
        const priority = priorityMap.get(vote.agentId);
        const weight = priorityEnabled && priority ? priority.priority : 1;
        const activeWeight = priority?.isActive !== false ? weight : 0;

        if (vote.vote === 'approve') {
          approveWeight += activeWeight;
          totalWeight += activeWeight;
        } else if (vote.vote === 'reject') {
          rejectWeight += activeWeight;
          totalWeight += activeWeight;
        }
      }

      return {
        reached: totalWeight > 0 && (approveWeight / totalWeight >= threshold || rejectWeight / totalWeight >= threshold),
        approveWeight,
        rejectWeight,
        totalWeight,
        approvePercent: totalWeight > 0 ? approveWeight / totalWeight : 0,
        rejectPercent: totalWeight > 0 ? rejectWeight / totalWeight : 0,
      };
    },
  };
}

// Export singleton factory (optional use)
let defaultEngine: ConsensusEngine | null = null;

export function getDefaultConsensusEngine(): ConsensusEngine {
  if (!defaultEngine) {
    defaultEngine = createConsensusEngine();
  }
  return defaultEngine;
}

// Utility: Check if consensus was reached
export function isConsensusReached(outcome: ConsensusOutcome): boolean {
  return outcome.details.reached;
}

// Utility: Get summary string
export function getConsensusSummary(outcome: ConsensusOutcome): string {
  const { approveCount, rejectCount, abstainCount, method } = outcome.details;
  return `${outcome.decision} (${approveCount} approve, ${rejectCount} reject, ${abstainCount} abstain, ${method})`;
}