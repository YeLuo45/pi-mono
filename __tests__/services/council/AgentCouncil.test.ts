/**
 * V150: AgentCouncil Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createAgentCouncil,
  proposeToCouncil,
  critiqueProposal,
  synthesizeCouncil,
  voteInCouncil,
  broadcastToCouncil,
  BUILT_IN_AGENTS,
  type CouncilAgent,
} from '../../../src/services/council/AgentCouncil';

describe('AgentCouncil', () => {
  let council: ReturnType<typeof createAgentCouncil>;

  beforeEach(() => {
    council = createAgentCouncil({ name: 'Test Council' });
  });

  it('should create a council with 4 built-in agents', () => {
    expect(council.agents.size).toBe(4);
    
    const agents = Array.from(council.agents.values());
    expect(agents.some(a => a.role === 'proposer')).toBe(true);
    expect(agents.some(a => a.role === 'critic')).toBe(true);
    expect(agents.some(a => a.role === 'synthesizer')).toBe(true);
    expect(agents.some(a => a.role === 'voter')).toBe(true);
  });

  it('should create a council with custom name', () => {
    const customCouncil = createAgentCouncil({ name: 'Custom Council' });
    expect(customCouncil.name).toBe('Custom Council');
  });

  it('should add a custom agent to the council', () => {
    const customAgent = {
      name: 'Custom Agent',
      role: 'proposer' as const,
      personality: 'Custom personality',
      isActive: true,
    };
    
    const added = council.addAgent(customAgent);
    expect(added.name).toBe('Custom Agent');
    expect(council.agents.size).toBe(5);
  });

  it('should remove an agent from the council', () => {
    const agents = Array.from(council.agents.values());
    const agentToRemove = agents[0];
    
    const result = council.removeAgent(agentToRemove.id);
    expect(result).toBe(true);
    expect(council.agents.size).toBe(3);
  });

  it('should send and retrieve messages', () => {
    const agents = Array.from(council.agents.values());
    const proposer = agents.find(a => a.role === 'proposer')!;
    
    const message = proposeToCouncil(council, 'Test proposal', proposer.id);
    
    expect(message.type).toBe('proposal');
    expect(message.content).toBe('Test proposal');
    expect(message.agentId).toBe(proposer.id);
    
    const messages = council.getMessages();
    expect(messages.length).toBe(1);
  });

  it('should filter messages by agent', () => {
    const agents = Array.from(council.agents.values());
    const proposer = agents.find(a => a.role === 'proposer')!;
    const critic = agents.find(a => a.role === 'critic')!;
    
    proposeToCouncil(council, 'Proposal 1', proposer.id);
    proposeToCouncil(council, 'Proposal 2', proposer.id);
    critiqueProposal(council, 'Critique 1', critic.id, []);
    
    const proposerMessages = council.getMessagesByAgent(proposer.id);
    expect(proposerMessages.length).toBe(2);
    
    const criticMessages = council.getMessagesByAgent(critic.id);
    expect(criticMessages.length).toBe(1);
  });

  it('should filter messages by type', () => {
    const agents = Array.from(council.agents.values());
    const proposer = agents.find(a => a.role === 'proposer')!;
    
    proposeToCouncil(council, 'Test proposal', proposer.id);
    
    const proposals = council.getMessagesByType('proposal');
    expect(proposals.length).toBe(1);
    
    const votes = council.getMessagesByType('vote');
    expect(votes.length).toBe(0);
  });

  it('should reach consensus with votes', () => {
    const agents = Array.from(council.agents.values());
    const voter = agents.find(a => a.role === 'voter')!;
    const proposer = agents.find(a => a.role === 'proposer')!;
    
    proposeToCouncil(council, 'Approve this', proposer.id);
    
    voteInCouncil(council, voter.id, 'approve');
    
    const outcome = council.reachConsensus('Test decision');
    expect(outcome).toBeDefined();
    expect(outcome.votes[voter.id]).toBe('approve');
  });

  it('should handle message bus subscriptions', () => {
    let receivedCount = 0;
    
    council.messageBus.subscribe('message:new', (msg) => {
      receivedCount++;
    });
    
    const agents = Array.from(council.agents.values());
    proposeToCouncil(council, 'Test', agents[0].id);
    proposeToCouncil(council, 'Test 2', agents[0].id);
    
    expect(receivedCount).toBe(2);
  });

  it('should broadcast messages to all subscribers', () => {
    let broadcastCount = 0;
    
    council.messageBus.subscribe('broadcast', () => {
      broadcastCount++;
    });
    
    const agents = Array.from(council.agents.values());
    broadcastToCouncil(council, 'Hello everyone', agents[0].id);
    
    expect(broadcastCount).toBe(1);
  });

  it('should reset the council', () => {
    const agents = Array.from(council.agents.values());
    proposeToCouncil(council, 'Test', agents[0].id);
    voteInCouncil(council, agents[0].id, 'approve');
    
    council.reset();
    
    expect(council.getMessages().length).toBe(0);
  });

  it('should get agents by role', () => {
    const proposers = council.getAgentsByRole('proposer');
    expect(proposers.length).toBe(1);
    expect(proposers[0].role).toBe('proposer');
    
    const voters = council.getAgentsByRole('voter');
    expect(voters.length).toBe(1);
    expect(voters[0].role).toBe('voter');
  });

  it('should throw when sending message from non-existent agent', () => {
    expect(() => {
      council.sendMessage({
        agentId: 'non-existent-id',
        type: 'proposal',
        content: 'Test',
        references: [],
      });
    }).toThrow('Agent not found');
  });
});
