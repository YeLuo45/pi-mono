/**
 * P18: Election System Tests
 * 
 * Tests for the election subsystem:
 * 1. ElectionManager - Election lifecycle management
 * 2. Vote counting for different voting methods (simple, ranked, weighted, delegated)
 * 3. Ballot validation
 * 4. Tie-breaking mechanisms
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ElectionManager, createElection, createElectionWithCandidates } from '../electionManager';
import { countVotes, determineWinner, checkForTie, resolveTie, calculateQuorum, isMajorityReached, getTopCandidates } from '../voteCounter';
import { createBallotValidator, validateVoteEntry, validateElectionConfig, sanitizeBallot } from '../ballotValidator';
import type {
  ElectionConfig,
  ElectionStatus,
  VoteType,
  Candidate,
  Voter,
  Ballot,
  VoteEntry,
  ElectionEventType,
} from '../electionTypes';
import { DEFAULT_ELECTION_CONFIG } from '../electionTypes';

// ============================================================================
// Test Helpers
// ============================================================================

function createTestCandidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    id: `candidate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    personaId: `persona-${Math.random().toString(36).substr(2, 6)}`,
    role: 'Advisor',
    nominationScore: 1,
    status: 'nominated',
    voteCount: 0,
    rankedVotes: new Map(),
    ...overrides,
  };
}

function createTestVoter(overrides: Partial<Voter> = {}): Voter {
  return {
    id: `voter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    personaId: `persona-${Math.random().toString(36).substr(2, 6)}`,
    role: 'Voter',
    weight: 1.0,
    hasVoted: false,
    votedFor: [],
    ...overrides,
  };
}

function createTestBallot(electionId: string, voterId: string, votes: VoteEntry[], overrides: Partial<Ballot> = {}): Ballot {
  return {
    id: `ballot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    electionId,
    voterId,
    votes,
    timestamp: Date.now(),
    isValid: true,
    ...overrides,
  };
}

function createTestVoteEntry(candidateId: string, weight = 1, rank?: number): VoteEntry {
  return {
    candidateId,
    weight,
    rank,
  };
}

// ============================================================================
// ElectionManager Tests
// ============================================================================

describe('ElectionManager', () => {
  let manager: ElectionManager;
  let electionConfig: Partial<ElectionConfig>;

  beforeEach(() => {
    electionConfig = {
      name: 'Test Election',
      description: 'A test election',
      voteType: 'simple',
      nominationDuration: 0,
      campaignDuration: 0,
      votingDuration: 1000,
      minCandidates: 2,
      maxCandidates: 10,
    };
  });

  afterEach(() => {
    manager?.destroy();
  });

  describe('constructor', () => {
    it('should create an election with default config', () => {
      manager = new ElectionManager();
      const election = manager.getElection();

      expect(election.name).toBe(DEFAULT_ELECTION_CONFIG.name);
      expect(election.status).toBe('initialized');
      expect(election.config.voteType).toBe('simple');
    });

    it('should create an election with custom config', () => {
      manager = new ElectionManager(electionConfig);
      const election = manager.getElection();

      expect(election.name).toBe('Test Election');
      expect(election.description).toBe('A test election');
    });

    it('should create election with custom ID', () => {
      manager = new ElectionManager({}, 'custom-election-id');
      const election = manager.getElection();

      expect(election.id).toBe('custom-election-id');
    });
  });

  describe('Election Lifecycle', () => {
    it('should start in initialized status', () => {
      manager = new ElectionManager(electionConfig);
      expect(manager.getStatus()).toBe('initialized');
    });

    it('should transition to nominating status', () => {
      manager = new ElectionManager(electionConfig);
      const result = manager.startNomination();

      expect(result).toBe(true);
      expect(manager.getStatus()).toBe('nominating');
    });

    it('should not start nomination twice', () => {
      manager = new ElectionManager(electionConfig);
      manager.startNomination();
      const result = manager.startNomination();

      expect(result).toBe(false);
    });

    it('should transition to campaigning after nomination', () => {
      manager = new ElectionManager(electionConfig);
      manager.addCandidate('persona-1', 'Advisor');
      manager.addCandidate('persona-2', 'Curator');
      manager.startNomination();
      const result = manager.startCampaign();

      expect(result).toBe(true);
      expect(manager.getStatus()).toBe('campaigning');
    });

    it('should cancel election if not enough candidates', () => {
      manager = new ElectionManager(electionConfig);
      manager.startNomination();
      manager.addCandidate('persona-1', 'Advisor');
      // Only 1 candidate, min is 2
      const result = manager.startCampaign();

      expect(result).toBe(false);
      expect(manager.getStatus()).toBe('cancelled');
    });

    it('should transition to voting', () => {
      manager = new ElectionManager(electionConfig);
      manager.addCandidate('persona-1', 'Advisor');
      manager.addCandidate('persona-2', 'Curator');
      manager.startNomination();
      manager.startCampaign();
      const result = manager.startVoting();

      expect(result).toBe(true);
      expect(manager.getStatus()).toBe('voting');
    });

    it('should end voting and count ballots', () => {
      manager = new ElectionManager(electionConfig);
      manager.addCandidate('persona-1', 'Advisor');
      manager.addCandidate('persona-2', 'Curator');
      manager.startNomination();
      manager.startCampaign();
      manager.startVoting();
      
      // Register voters and cast votes
      const voter1 = manager.registerVoter('persona-1', 'Voter');
      const voter2 = manager.registerVoter('persona-2', 'Voter');
      
      const candidates = manager.getCandidates();
      manager.castVote(voter1.id, [createTestVoteEntry(candidates[0].id)]);
      manager.castVote(voter2.id, [createTestVoteEntry(candidates[0].id)]);
      
      const result = manager.endVoting();

      expect(result).toBe(true);
      expect(manager.getStatus()).toBe('completed');
      expect(manager.getResult()).toBeDefined();
    });

    it('should cancel election', () => {
      manager = new ElectionManager(electionConfig);
      manager.startNomination();
      const result = manager.cancelElection();

      expect(result).toBe(true);
      expect(manager.getStatus()).toBe('cancelled');
    });

    it('should not cancel completed election', () => {
      manager = new ElectionManager(electionConfig);
      manager.addCandidate('persona-1', 'Advisor');
      manager.addCandidate('persona-2', 'Curator');
      manager.startNomination();
      manager.startCampaign();
      manager.startVoting();
      manager.endVoting();
      
      const result = manager.cancelElection();
      expect(result).toBe(false);
    });
  });

  describe('Candidate Management', () => {
    beforeEach(() => {
      manager = new ElectionManager(electionConfig);
    });

    it('should add a candidate', () => {
      const candidate = manager.addCandidate('persona-1', 'Advisor');

      expect(candidate.personaId).toBe('persona-1');
      expect(candidate.role).toBe('Advisor');
      expect(candidate.status).toBe('nominated');
    });

    it('should add multiple candidates', () => {
      manager.addCandidate('persona-1', 'Advisor');
      const candidate2 = manager.addCandidate('persona-2', 'Curator');

      const candidates = manager.getCandidates();
      expect(candidates).toHaveLength(2);
    });

    it('should throw error when max candidates reached', () => {
      const limitedConfig = { ...electionConfig, maxCandidates: 2 };
      manager = new ElectionManager(limitedConfig);
      manager.addCandidate('persona-1', 'Advisor');
      manager.addCandidate('persona-2', 'Curator');

      expect(() => manager.addCandidate('persona-3', 'Reviewer')).toThrow('Maximum candidates reached');
    });

    it('should remove a candidate', () => {
      const candidate = manager.addCandidate('persona-1', 'Advisor');
      const result = manager.removeCandidate(candidate.id);

      expect(result).toBe(true);
      expect(manager.getCandidates()).toHaveLength(0);
    });

    it('should set campaign statement', () => {
      const candidate = manager.addCandidate('persona-1', 'Advisor');
      const result = manager.setCampaignStatement(candidate.id, 'My statement');

      expect(result).toBe(true);
    });

    it('should not set statement for non-existent candidate', () => {
      const result = manager.setCampaignStatement('non-existent', 'Statement');
      expect(result).toBe(false);
    });
  });

  describe('Voter Management', () => {
    beforeEach(() => {
      manager = new ElectionManager(electionConfig);
    });

    it('should register a voter', () => {
      const voter = manager.registerVoter('persona-1', 'Voter');

      expect(voter.personaId).toBe('persona-1');
      expect(voter.role).toBe('Voter');
      expect(voter.weight).toBe(1.0);
      expect(voter.hasVoted).toBe(false);
    });

    it('should register voter with custom weight', () => {
      const voter = manager.registerVoter('persona-1', 'Voter', 2.5);

      expect(voter.weight).toBe(2.5);
    });

    it('should get voter by ID', () => {
      const voter = manager.registerVoter('persona-1', 'Voter');
      const retrieved = manager.getVoter(voter.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.personaId).toBe('persona-1');
    });

    it('should get all voters', () => {
      manager.registerVoter('persona-1', 'Voter');
      manager.registerVoter('persona-2', 'Voter');
      const voters = manager.getVoters();

      expect(voters).toHaveLength(2);
    });

    it('should update voter weight', () => {
      const voter = manager.registerVoter('persona-1', 'Voter');
      const result = manager.updateVoterWeight(voter.id, 3.0);

      expect(result).toBe(true);
      expect(manager.getVoter(voter.id)?.weight).toBe(3.0);
    });
  });

  describe('Voting', () => {
    beforeEach(() => {
      manager = new ElectionManager(electionConfig);
      manager.addCandidate('persona-1', 'Advisor');
      manager.addCandidate('persona-2', 'Curator');
      manager.startNomination();
      manager.startCampaign();
      manager.startVoting();
    });

    it('should cast a vote', () => {
      const voter = manager.registerVoter('persona-1', 'Voter');
      const candidates = manager.getCandidates();
      const ballot = manager.castVote(voter.id, [createTestVoteEntry(candidates[0].id)]);

      expect(ballot).toBeDefined();
      expect(ballot?.voterId).toBe(voter.id);
      expect(manager.getVoter(voter.id)?.hasVoted).toBe(true);
    });

    it('should not allow vote from unregistered voter', () => {
      const candidates = manager.getCandidates();
      const ballot = manager.castVote('non-existent', [createTestVoteEntry(candidates[0].id)]);

      expect(ballot).toBeNull();
    });

    it('should not allow vote when not voting', () => {
      manager.endVoting();
      const voter = manager.registerVoter('persona-1', 'Voter');
      const candidates = manager.getCandidates();
      const ballot = manager.castVote(voter.id, [createTestVoteEntry(candidates[0].id)]);

      expect(ballot).toBeNull();
    });

    it('should not allow double voting', () => {
      const voter = manager.registerVoter('persona-1', 'Voter');
      const candidates = manager.getCandidates();
      manager.castVote(voter.id, [createTestVoteEntry(candidates[0].id)]);
      const ballot2 = manager.castVote(voter.id, [createTestVoteEntry(candidates[1].id)]);

      expect(ballot2).toBeNull();
    });

    it('should change vote', () => {
      const voter = manager.registerVoter('persona-1', 'Voter');
      const candidates = manager.getCandidates();
      manager.castVote(voter.id, [createTestVoteEntry(candidates[0].id)]);
      const newBallot = manager.changeVote(voter.id, [createTestVoteEntry(candidates[1].id)]);

      expect(newBallot).toBeDefined();
      expect(manager.getVoter(voter.id)?.votedFor).toContain(candidates[1].id);
    });

    it('should get ballot by voter', () => {
      const voter = manager.registerVoter('persona-1', 'Voter');
      const candidates = manager.getCandidates();
      manager.castVote(voter.id, [createTestVoteEntry(candidates[0].id)]);
      const ballot = manager.getBallot(voter.id);

      expect(ballot).toBeDefined();
      expect(ballot?.voterId).toBe(voter.id);
    });

    it('should calculate turnout', () => {
      const voter1 = manager.registerVoter('persona-1', 'Voter');
      const voter2 = manager.registerVoter('persona-2', 'Voter');
      const candidates = manager.getCandidates();
      
      manager.castVote(voter1.id, [createTestVoteEntry(candidates[0].id)]);
      // voter2 has not voted

      expect(manager.getTurnout()).toBe(50);
    });
  });

  describe('Event Handling', () => {
    it('should emit events', () => {
      manager = new ElectionManager(electionConfig);
      const events: string[] = [];
      
      manager.onEvent((event) => {
        events.push(event.type);
      });

      manager.startNomination();

      expect(events).toContain('nomination_started');
    });

    it('should allow unsubscribe from events', () => {
      manager = new ElectionManager(electionConfig);
      let callCount = 0;
      
      const unsubscribe = manager.onEvent(() => {
        callCount++;
      });

      manager.startNomination();
      unsubscribe();
      manager.startCampaign();

      expect(callCount).toBe(1);
    });
  });

  describe('factory functions', () => {
    it('should create election with createElection', () => {
      const manager = createElection({ name: 'Factory Election' });
      expect(manager.getElection().name).toBe('Factory Election');
      manager.destroy();
    });

    it('should create election with candidates using createElectionWithCandidates', () => {
      const candidates = [
        { personaId: 'p1', role: 'Advisor' },
        { personaId: 'p2', role: 'Curator' },
      ];
      const manager = createElectionWithCandidates(candidates);
      expect(manager.getCandidates()).toHaveLength(2);
      manager.destroy();
    });
  });
});

// ============================================================================
// VoteCounter Tests
// ============================================================================

describe('VoteCounter', () => {
  describe('countVotes - simple voting', () => {
    it('should count simple votes correctly', () => {
      const candidates = [
        createTestCandidate({ id: 'c1', personaId: 'Alice' }),
        createTestCandidate({ id: 'c2', personaId: 'Bob' }),
      ];

      const ballots = [
        createTestBallot('e1', 'v1', [createTestVoteEntry('c1')]),
        createTestBallot('e1', 'v2', [createTestVoteEntry('c1')]),
        createTestBallot('e1', 'v3', [createTestVoteEntry('c2')]),
      ];

      const results = countVotes(ballots, candidates, 'simple');

      expect(results[0].candidateName).toBe('Alice');
      expect(results[0].voteCount).toBe(2);
      expect(results[1].candidateName).toBe('Bob');
      expect(results[1].voteCount).toBe(1);
    });

    it('should handle no votes', () => {
      const candidates = [
        createTestCandidate({ id: 'c1', personaId: 'Alice' }),
      ];

      const ballots: Ballot[] = [];

      const results = countVotes(ballots, candidates, 'simple');

      expect(results[0].voteCount).toBe(0);
      expect(results[0].percentage).toBe(0);
    });

    it('should ignore invalid ballots', () => {
      const candidates = [
        createTestCandidate({ id: 'c1', personaId: 'Alice' }),
      ];

      const ballots = [
        createTestBallot('e1', 'v1', [createTestVoteEntry('c1')], { isValid: false }),
      ];

      const results = countVotes(ballots, candidates, 'simple');

      expect(results[0].voteCount).toBe(0);
    });
  });

  describe('countVotes - ranked voting', () => {
    it('should handle ranked votes', () => {
      const candidates = [
        createTestCandidate({ id: 'c1', personaId: 'Alice' }),
        createTestCandidate({ id: 'c2', personaId: 'Bob' }),
        createTestCandidate({ id: 'c3', personaId: 'Charlie' }),
      ];

      const ballots = [
        createTestBallot('e1', 'v1', [
          createTestVoteEntry('c1', 1, 1),
          createTestVoteEntry('c2', 1, 2),
        ]),
        createTestBallot('e1', 'v2', [
          createTestVoteEntry('c2', 1, 1),
          createTestVoteEntry('c1', 1, 2),
        ]),
      ];

      const results = countVotes(ballots, candidates, 'ranked');

      expect(results).toHaveLength(3);
    });
  });

  describe('countVotes - weighted voting', () => {
    it('should count weighted votes', () => {
      const candidates = [
        createTestCandidate({ id: 'c1', personaId: 'Alice' }),
        createTestCandidate({ id: 'c2', personaId: 'Bob' }),
      ];

      const ballots = [
        createTestBallot('e1', 'v1', [createTestVoteEntry('c1', 2.0)]),
        createTestBallot('e1', 'v2', [createTestVoteEntry('c1', 1.0)]),
        createTestBallot('e1', 'v3', [createTestVoteEntry('c2', 1.0)]),
      ];

      const results = countVotes(ballots, candidates, 'weighted');

      // Alice: 2.0 + 1.0 = 3.0, Bob: 1.0
      expect(results[0].candidateName).toBe('Alice');
      expect(results[0].voteCount).toBe(3.0);
    });
  });

  describe('determineWinner', () => {
    it('should return highest vote count candidate', () => {
      const results = [
        { candidateId: 'c1', candidateName: 'Alice', voteCount: 5, percentage: 50, rank: 1, isWinner: false },
        { candidateId: 'c2', candidateName: 'Bob', voteCount: 3, percentage: 30, rank: 2, isWinner: false },
      ];

      const winner = determineWinner(results);

      expect(winner?.candidateName).toBe('Alice');
    });

    it('should return null for empty results', () => {
      const winner = determineWinner([]);
      expect(winner).toBeNull();
    });
  });

  describe('checkForTie', () => {
    it('should detect tie', () => {
      const results = [
        { candidateId: 'c1', candidateName: 'Alice', voteCount: 5, percentage: 50, rank: 1, isWinner: false },
        { candidateId: 'c2', candidateName: 'Bob', voteCount: 5, percentage: 50, rank: 1, isWinner: false },
      ];

      const tie = checkForTie(results);

      expect(tie.isTied).toBe(true);
      expect(tie.tiedCandidates).toContain('Alice');
      expect(tie.tiedCandidates).toContain('Bob');
    });

    it('should detect no tie', () => {
      const results = [
        { candidateId: 'c1', candidateName: 'Alice', voteCount: 6, percentage: 60, rank: 1, isWinner: false },
        { candidateId: 'c2', candidateName: 'Bob', voteCount: 4, percentage: 40, rank: 2, isWinner: false },
      ];

      const tie = checkForTie(results);

      expect(tie.isTied).toBe(false);
      expect(tie.tiedCandidates).toHaveLength(0);
    });

    it('should return false for single candidate', () => {
      const results = [
        { candidateId: 'c1', candidateName: 'Alice', voteCount: 10, percentage: 100, rank: 1, isWinner: false },
      ];

      const tie = checkForTie(results);
      expect(tie.isTied).toBe(false);
    });
  });

  describe('resolveTie', () => {
    it('should resolve tie with random method', () => {
      const tiedCandidates = ['Alice', 'Bob'];
      const tiedIds = ['c1', 'c2'];

      const result = resolveTie(tiedCandidates, tiedIds, 'random');

      expect(result.method).toBe('random');
      expect(tiedIds).toContain(result.winner);
    });

    it('should resolve tie with first_nominated', () => {
      const tiedCandidates = ['Alice', 'Bob'];
      const tiedIds = ['c1', 'c2'];

      const result = resolveTie(tiedCandidates, tiedIds, 'first_nominated');

      expect(result.method).toBe('first_nominated');
      expect(result.winner).toBe('c1');
    });
  });

  describe('calculateQuorum', () => {
    it('should pass when quorum reached', () => {
      expect(calculateQuorum(50, 100, 60)).toBe(true);
    });

    it('should fail when quorum not reached', () => {
      expect(calculateQuorum(50, 100, 40)).toBe(false);
    });

    it('should pass with no voters', () => {
      expect(calculateQuorum(50, 0, 0)).toBe(true);
    });
  });

  describe('isMajorityReached', () => {
    it('should return true for majority', () => {
      expect(isMajorityReached(51, 100)).toBe(true);
    });

    it('should return false for minority', () => {
      expect(isMajorityReached(49, 100)).toBe(false);
    });

    it('should return false for tie', () => {
      expect(isMajorityReached(50, 100)).toBe(false);
    });
  });

  describe('getTopCandidates', () => {
    it('should return top N candidates', () => {
      const results = [
        { candidateId: 'c1', candidateName: 'Alice', voteCount: 10, percentage: 40, rank: 1, isWinner: false },
        { candidateId: 'c2', candidateName: 'Bob', voteCount: 8, percentage: 32, rank: 2, isWinner: false },
        { candidateId: 'c3', candidateName: 'Charlie', voteCount: 5, percentage: 20, rank: 3, isWinner: false },
        { candidateId: 'c4', candidateName: 'David', voteCount: 2, percentage: 8, rank: 4, isWinner: false },
      ];

      const top = getTopCandidates(results, 2);

      expect(top).toHaveLength(2);
      expect(top[0].candidateName).toBe('Alice');
      expect(top[1].candidateName).toBe('Bob');
    });
  });
});

// ============================================================================
// BallotValidator Tests
// ============================================================================

describe('BallotValidator', () => {
  const candidates = [
    createTestCandidate({ id: 'c1', personaId: 'Alice' }),
    createTestCandidate({ id: 'c2', personaId: 'Bob' }),
  ];

  describe('validateVoteEntry', () => {
    it('should validate correct vote entry', () => {
      const vote = createTestVoteEntry('c1');
      const result = validateVoteEntry(vote, ['c1', 'c2'], false);

      expect(result.valid).toBe(true);
    });

    it('should reject invalid candidate', () => {
      const vote = createTestVoteEntry('invalid');
      const result = validateVoteEntry(vote, ['c1', 'c2'], false);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid candidate');
    });

    it('should allow write-in when enabled', () => {
      const vote = createTestVoteEntry('write-in-candidate');
      const result = validateVoteEntry(vote, ['c1', 'c2'], true);

      expect(result.valid).toBe(true);
    });

    it('should reject negative weight', () => {
      const vote = createTestVoteEntry('c1', -1);
      const result = validateVoteEntry(vote, ['c1', 'c2'], false);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('positive');
    });

    it('should reject weight over 100', () => {
      const vote = createTestVoteEntry('c1', 150);
      const result = validateVoteEntry(vote, ['c1', 'c2'], false);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('exceeds maximum');
    });
  });

  describe('SimpleBallotValidator', () => {
    it('should validate single vote ballot', () => {
      const validator = createBallotValidator('simple');
      const ballot = createTestBallot('e1', 'v1', [createTestVoteEntry('c1')]);

      const result = validator.validate(ballot, candidates);

      expect(result.valid).toBe(true);
    });

    it('should reject ballot with multiple votes', () => {
      const validator = createBallotValidator('simple');
      const ballot = createTestBallot('e1', 'v1', [
        createTestVoteEntry('c1'),
        createTestVoteEntry('c2'),
      ]);

      const result = validator.validate(ballot, candidates);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('only one vote');
    });

    it('should reject empty ballot', () => {
      const validator = createBallotValidator('simple');
      const ballot = createTestBallot('e1', 'v1', []);

      const result = validator.validate(ballot, candidates);

      expect(result.valid).toBe(false);
    });
  });

  describe('RankedBallotValidator', () => {
    it('should validate ranked ballot', () => {
      const validator = createBallotValidator('ranked');
      const ballot = createTestBallot('e1', 'v1', [
        createTestVoteEntry('c1', 1, 1),
        createTestVoteEntry('c2', 1, 2),
      ]);

      const result = validator.validate(ballot, candidates);

      expect(result.valid).toBe(true);
    });

    it('should reject duplicate candidates', () => {
      const validator = createBallotValidator('ranked');
      const ballot = createTestBallot('e1', 'v1', [
        createTestVoteEntry('c1', 1, 1),
        createTestVoteEntry('c1', 1, 2),
      ]);

      const result = validator.validate(ballot, candidates);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Duplicate candidate');
    });
  });

  describe('validateElectionConfig', () => {
    it('should validate correct config', () => {
      const config: ElectionConfig = {
        name: 'Test Election',
        description: 'Test',
        scope: 'session',
        voteType: 'simple',
        minCandidates: 2,
        maxCandidates: 10,
        votingDuration: 60000,
        nominationDuration: 30000,
        campaignDuration: 30000,
        requiredQuorum: 50,
        enableAbstention: true,
        anonymousVoting: false,
        allowWriteIns: false,
        tieBreakMethod: 'random',
      };

      const result = validateElectionConfig(config);

      expect(result.valid).toBe(true);
    });

    it('should reject empty name', () => {
      const config = { ...DEFAULT_ELECTION_CONFIG, name: '' };

      const result = validateElectionConfig(config);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('name');
    });

    it('should reject minCandidates < 2', () => {
      const config = { ...DEFAULT_ELECTION_CONFIG, minCandidates: 1 };

      const result = validateElectionConfig(config);

      expect(result.valid).toBe(false);
    });

    it('should reject maxCandidates < minCandidates', () => {
      const config = { ...DEFAULT_ELECTION_CONFIG, minCandidates: 5, maxCandidates: 3 };

      const result = validateElectionConfig(config);

      expect(result.valid).toBe(false);
    });
  });

  describe('sanitizeBallot', () => {
    it('should sanitize ballot IDs', () => {
      const ballot = createTestBallot('e1<script>', 'v1<script>', [createTestVoteEntry('c1<script>')]);

      const sanitized = sanitizeBallot(ballot);

      expect(sanitized.electionId).not.toContain('<script>');
      expect(sanitized.voterId).not.toContain('<script>');
      expect(sanitized.votes[0].candidateId).not.toContain('<script>');
    });

    it('should clamp vote weight', () => {
      const ballot = createTestBallot('e1', 'v1', [createTestVoteEntry('c1', 200)]);

      const sanitized = sanitizeBallot(ballot);

      expect(sanitized.votes[0].weight).toBe(100);
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Election Integration Tests', () => {
  let manager: ElectionManager;

  afterEach(() => {
    manager?.destroy();
  });

  it('should complete full election cycle', () => {
    // Create election
    manager = new ElectionManager({
      name: 'Integration Test Election',
      voteType: 'simple',
      nominationDuration: 0,
      campaignDuration: 0,
      votingDuration: 1000,
    });

    expect(manager.getStatus()).toBe('initialized');

    // Add candidates
    const alice = manager.addCandidate('alice', 'Advisor');
    const bob = manager.addCandidate('bob', 'Curator');

    // Start election
    manager.startNomination();
    expect(manager.getStatus()).toBe('nominating');

    // Campaign
    manager.startCampaign();
    expect(manager.getStatus()).toBe('campaigning');

    // Start voting
    manager.startVoting();
    expect(manager.getStatus()).toBe('voting');

    // Register voters
    const voter1 = manager.registerVoter('voter1', 'Voter');
    const voter2 = manager.registerVoter('voter2', 'Voter');
    const voter3 = manager.registerVoter('voter3', 'Voter');

    // Cast votes (Alice wins 2-1)
    manager.castVote(voter1.id, [createTestVoteEntry(alice.id)]);
    manager.castVote(voter2.id, [createTestVoteEntry(alice.id)]);
    manager.castVote(voter3.id, [createTestVoteEntry(bob.id)]);

    // End voting
    manager.endVoting();
    expect(manager.getStatus()).toBe('completed');

    // Check results
    const result = manager.getResult();
    expect(result).toBeDefined();
    expect(result?.winner).toBe(alice.id);
    expect(result?.totalVotes).toBe(3);
  });

  it('should handle tie with runoff', () => {
    manager = new ElectionManager({
      name: 'Tie Election',
      voteType: 'simple',
      nominationDuration: 0,
      campaignDuration: 0,
      votingDuration: 1000,
      tieBreakMethod: 'runoff',
    });

    const alice = manager.addCandidate('alice', 'Advisor');
    const bob = manager.addCandidate('bob', 'Curator');

    manager.startNomination();
    manager.startCampaign();
    manager.startVoting();

    const voter1 = manager.registerVoter('voter1', 'Voter');
    const voter2 = manager.registerVoter('voter2', 'Voter');

    // Tie vote
    manager.castVote(voter1.id, [createTestVoteEntry(alice.id)]);
    manager.castVote(voter2.id, [createTestVoteEntry(bob.id)]);

    manager.endVoting();

    const result = manager.getResult();
    expect(result?.winner).toBeDefined(); // Tie-break resolved
    expect(result?.runoff).toBeDefined();
  });

  it('should track turnout correctly', () => {
    manager = new ElectionManager({
      name: 'Turnout Test',
      voteType: 'simple',
      nominationDuration: 0,
      campaignDuration: 0,
      votingDuration: 1000,
    });

    manager.addCandidate('alice', 'Advisor');
    manager.addCandidate('bob', 'Curator');
    manager.startNomination();
    manager.startCampaign();
    manager.startVoting();

    const voters = ['v1', 'v2', 'v3', 'v4'].map(id => manager.registerVoter(id, 'Voter'));
    const candidates = manager.getCandidates();

    // 50% turnout
    manager.castVote(voters[0].id, [createTestVoteEntry(candidates[0].id)]);
    manager.castVote(voters[1].id, [createTestVoteEntry(candidates[0].id)]);

    expect(manager.getTurnout()).toBe(50);
  });
});
