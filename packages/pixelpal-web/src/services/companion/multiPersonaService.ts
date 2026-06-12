/**
 * Multi-Persona Collaboration Service V21
 * 
 * Advanced multi-persona system with:
 * - Dynamic persona roles (primary, specialist, analyst, mediator, observer)
 * - Collaborative response generation
 * - Persona-specific expertise matching
 * - Team response synthesis
 * - Cross-persona memory sharing
 * - Emotion-aware persona interactions
 */

import type { PersonaId, PersonaConfig } from './personalityTypes';
import { getPersona, PERSONAS } from './personalityTypes';
import { buildCompanionSystemPrompt } from './companionService';

export type PersonaRole = 'primary' | 'specialist' | 'analyst' | 'mediator' | 'observer';

export interface PersonaMember {
  personaId: PersonaId;
  name: string;
  color: string;
  role: PersonaRole;
  expertise: string[];        // Topics this persona specializes in
  isActive: boolean;          // Currently participating
  lastMessage?: string;       // Last thing this persona said
  avatar?: string;            // Emoji or icon
  contributions: number;      // Number of contributions in current discussion
  agreeCount: number;         // Times this persona agreed with others
  disagreeCount: number;      // Times this persona disagreed
}

export interface CollaborationMessage {
  id: string;
  personaId: PersonaId;
  personaName: string;
  content: string;
  timestamp: number;
  type: 'contribution' | 'question' | 'agreement' | 'disagreement' | 'summary' | 'synthesis';
  replyTo?: string;          // ID of message being responded to
  confidence?: number;       // Confidence level 0-1
}

export interface TeamDiscussion {
  id: string;
  topic: string;
  messages: CollaborationMessage[];
  startedAt: number;
  activePersonas: PersonaId[];
  status: 'active' | 'concluded' | 'summarized';
  summary?: string;
  synthesizedResponse?: string;  // Final synthesized team response
}

export interface PersonaContribution {
  personaId: PersonaId;
  perspective: string;        // The perspective this persona adds
  keyPoints: string[];        // Key points made
  emotion: string;            // Detected emotion in contribution
  confidence: number;          // Confidence in contribution
}

// ----- Team Configuration -----

export interface TeamConfig {
  teamName: string;
  members: PersonaMember[];
  maxActiveMembers: number;
  allowDebate: boolean;
  allowCrossTalk: boolean;     // Allow personas to respond to each other
  synthesizeResponses: boolean; // Generate synthesized team responses
  summarizeOnConclude: boolean;
}

const DEFAULT_TEAM_CONFIG: TeamConfig = {
  teamName: 'PixelPal Team',
  members: [],
  maxActiveMembers: 4,
  allowDebate: true,
  allowCrossTalk: true,
  synthesizeResponses: true,
  summarizeOnConclude: true,
};

// ----- Active Team State -----

let currentTeam: TeamConfig = { ...DEFAULT_TEAM_CONFIG };
let activeDiscussion: TeamDiscussion | null = null;

/**
 * Get all available personas that can join the team
 */
export function getAvailablePersonasForTeam(): PersonaConfig[] {
  return Object.values(PERSONAS);
}

/**
 * Get current team configuration
 */
export function getTeamConfig(): TeamConfig {
  return { ...currentTeam };
}

/**
 * Set the team configuration
 */
export function setTeamConfig(config: Partial<TeamConfig>): void {
  currentTeam = { ...currentTeam, ...config };
}

/**
 * Get role description for UI
 */
export function getRoleDescription(role: PersonaRole): string {
  switch (role) {
    case 'primary': return 'Team Lead - Synthesizes team perspectives';
    case 'specialist': return 'Specialist - Provides expert insights';
    case 'analyst': return 'Analyst - Evaluates and questions';
    case 'mediator': return 'Mediator - Bridges different viewpoints';
    case 'observer': return 'Observer - Watches and provides feedback';
    default: return '';
  }
}

/**
 * Get persona role based on personality type
 */
function inferPersonaRole(personaId: PersonaId): PersonaRole {
  switch (personaId) {
    case 'professional': return 'analyst';
    case 'playful': return 'specialist';
    case 'gentle': return 'mediator';
    case 'witty': return 'specialist';
    default: return 'contributor' as any;
  }
}

/**
 * Add a persona to the team
 */
export function addPersonaToTeam(personaId: PersonaId, role?: PersonaRole): boolean {
  const persona = getPersona(personaId);
  const alreadyMember = currentTeam.members.some(m => m.personaId === personaId);
  
  if (alreadyMember) return false;
  
  const assignedRole = role || inferPersonaRole(personaId);
  
  const member: PersonaMember = {
    personaId,
    name: persona.name,
    color: persona.color,
    role: assignedRole,
    expertise: persona.traits.map(t => t.id),
    isActive: currentTeam.members.filter(m => m.isActive).length < currentTeam.maxActiveMembers,
    avatar: persona.color,
    contributions: 0,
    agreeCount: 0,
    disagreeCount: 0,
  };
  
  currentTeam.members = [...currentTeam.members, member];
  return true;
}

/**
 * Remove a persona from the team
 */
export function removePersonaFromTeam(personaId: PersonaId): void {
  currentTeam.members = currentTeam.members.filter(m => m.personaId !== personaId);
}

/**
 * Set a persona's active status
 */
export function setPersonaActive(personaId: PersonaId, isActive: boolean): void {
  const currentlyActive = currentTeam.members.filter(m => m.isActive).length;
  
  if (isActive && currentlyActive >= currentTeam.maxActiveMembers) {
    const firstActive = currentTeam.members.find(m => m.isActive && m.personaId !== personaId);
    if (firstActive) {
      firstActive.isActive = false;
    }
  }
  
  currentTeam.members = currentTeam.members.map(m =>
    m.personaId === personaId ? { ...m, isActive } : m
  );
}

/**
 * Set persona role in team
 */
export function setPersonaRole(personaId: PersonaId, role: PersonaRole): void {
  currentTeam.members = currentTeam.members.map(m =>
    m.personaId === personaId ? { ...m, role } : m
  );
}

/**
 * Get team members
 */
export function getTeamMembers(): PersonaMember[] {
  return [...currentTeam.members];
}

/**
 * Get active team members (those who can contribute)
 */
export function getActiveMembers(): PersonaMember[] {
  return currentTeam.members.filter(m => m.isActive);
}

/**
 * Get primary persona (the main AI companion)
 */
export function getPrimaryPersona(): PersonaMember | undefined {
  return currentTeam.members.find(m => m.role === 'primary') || currentTeam.members[0];
}

/**
 * Set primary persona
 */
export function setPrimaryPersona(personaId: PersonaId): void {
  currentTeam.members = currentTeam.members.map(m => ({
    ...m,
    role: m.personaId === personaId ? 'primary' : (m.role === 'primary' ? 'specialist' : m.role),
  }));
}

/**
 * Get persona members who have expertise in a given topic
 */
export function getPersonasByExpertise(topic: string): PersonaMember[] {
  const topicLower = topic.toLowerCase();
  return currentTeam.members.filter(m => 
    m.isActive && (
      m.expertise.some(e => topicLower.includes(e.toLowerCase())) ||
      m.personaId === 'professional' // Professional is always relevant for work topics
    )
  );
}

/**
 * Build system prompt for a specific persona within a team context
 */
export async function buildTeamSystemPrompt(personaId: PersonaId): Promise<string> {
  const teamContext = buildTeamContext();
  const basePrompt = await buildCompanionSystemPrompt(teamContext);
  
  const member = currentTeam.members.find(m => m.personaId === personaId);
  const roleContext = member ? getRoleContext(member) : '';
  
  return `${basePrompt}\n\n${roleContext}`;
}

/**
 * Build team context description for system prompts
 */
function buildTeamContext(): string {
  if (currentTeam.members.length <= 1) {
    return 'You are working alone as the sole AI companion.';
  }
  
  const activeMembers = currentTeam.members.filter(m => m.isActive);
  const observerMembers = currentTeam.members.filter(m => !m.isActive);
  
  let context = `You are part of a collaborative team called "${currentTeam.teamName}".\n\n`;
  context += `Team members:\n`;
  
  for (const member of currentTeam.members) {
    const status = member.isActive ? '🟢 Active' : '⚪ Observing';
    const roleLabel = `(${member.role})`;
    context += `  - ${member.name} ${roleLabel} ${status}: ${member.expertise.join(', ')}\n`;
  }
  
  context += `\n`;
  
  if (activeMembers.length > 1) {
    context += `Active collaborators: ${activeMembers.map(m => m.name).join(', ')}.\n`;
    context += `When another team member contributes, acknowledge their input and build upon it when appropriate.\n`;
    
    if (currentTeam.allowDebate) {
      context += `Healthy debate is encouraged - if you disagree with another member's view, respectfully state your perspective.\n`;
    }
    
    if (currentTeam.allowCrossTalk) {
      context += `You may respond directly to other team members' points, not just the user's input.\n`;
    }
  }
  
  if (observerMembers.length > 0) {
    context += `Observers (may join later): ${observerMembers.map(m => m.name).join(', ')}.\n`;
  }
  
  return context;
}

/**
 * Get role-specific context for a team member
 */
function getRoleContext(member: PersonaMember): string {
  switch (member.role) {
    case 'primary':
      return `As the Team Lead, you should:
- Synthesize inputs from all active members
- Ensure the discussion remains productive and on-topic
- Provide the final balanced response to the user
- Coordinate team contributions
- Consider emotions and team dynamics`;
    case 'specialist':
      return `As a Specialist, you should:
- Share your unique perspective and expertise on the topic
- Provide deep insights in your area of knowledge
- Make creative and innovative suggestions
- Keep responses focused and substantive`;
    case 'analyst':
      return `As an Analyst, you should:
- Evaluate claims critically and ask clarifying questions
- Point out potential issues or counterarguments
- Provide logical analysis of topics
- Challenge assumptions when needed, respectfully`;
    case 'mediator':
      return `As a Mediator, you should:
- Bridge different viewpoints when conflict arises
- Find common ground between team members
- Acknowledge valid points from all sides
- Help team reach consensus
- Consider emotional undertones in discussions`;
    case 'observer':
      return `As an Observer, you are silently watching the discussion.
You may contribute if:
- You have a unique insight others missed
- The Team Lead explicitly asks for your input
- There's a significant gap in the discussion
Keep your contributions brief and impactful.`;
    default:
      return '';
  }
}

// ----- Discussion Management -----

/**
 * Start a new team discussion
 */
export function startDiscussion(topic: string): TeamDiscussion {
  const activeIds = getActiveMembers().map(m => m.personaId);
  
  // Reset contribution counters
  currentTeam.members = currentTeam.members.map(m => ({
    ...m,
    contributions: 0,
    agreeCount: 0,
    disagreeCount: 0,
  }));
  
  activeDiscussion = {
    id: crypto.randomUUID(),
    topic,
    messages: [],
    startedAt: Date.now(),
    activePersonas: activeIds,
    status: 'active',
  };
  
  return activeDiscussion;
}

/**
 * Add a message to the current discussion
 */
export function addDiscussionMessage(
  personaId: PersonaId,
  content: string,
  type: CollaborationMessage['type'] = 'contribution',
  replyTo?: string,
  confidence?: number
): CollaborationMessage | null {
  if (!activeDiscussion || activeDiscussion.status !== 'active') return null;
  
  const persona = getPersona(personaId);
  
  const message: CollaborationMessage = {
    id: crypto.randomUUID(),
    personaId,
    personaName: persona.name,
    content,
    timestamp: Date.now(),
    type,
    replyTo,
    confidence,
  };
  
  activeDiscussion.messages.push(message);
  
  // Update member's stats
  currentTeam.members = currentTeam.members.map(m => {
    if (m.personaId === personaId) {
      const updates: Partial<PersonaMember> = { lastMessage: content.slice(0, 100) };
      if (type === 'contribution') {
        updates.contributions = m.contributions + 1;
      }
      if (type === 'agreement') {
        updates.agreeCount = m.agreeCount + 1;
      }
      if (type === 'disagreement') {
        updates.disagreeCount = m.disagreeCount + 1;
      }
      return { ...m, ...updates };
    }
    return m;
  });
  
  return message;
}

/**
 * Get messages from a specific persona
 */
export function getPersonaMessages(personaId: PersonaId): CollaborationMessage[] {
  if (!activeDiscussion) return [];
  return activeDiscussion.messages.filter(m => m.personaId === personaId);
}

/**
 * Get current discussion
 */
export function getCurrentDiscussion(): TeamDiscussion | null {
  return activeDiscussion;
}

/**
 * Analyze discussion and extract key perspectives
 */
export function analyzeDiscussion(): PersonaContribution[] {
  if (!activeDiscussion) return [];
  
  const contributions: PersonaContribution[] = [];
  
  for (const member of currentTeam.members.filter(m => m.isActive)) {
    const personaMessages = getPersonaMessages(member.personaId);
    if (personaMessages.length === 0) continue;
    
    const combinedContent = personaMessages.map(m => m.content).join(' ');
    
    contributions.push({
      personaId: member.personaId,
      perspective: `${member.name}'s perspective`,
      keyPoints: extractKeyPoints(combinedContent),
      emotion: detectContributionEmotion(combinedContent),
      confidence: calculateContributionConfidence(member),
    });
  }
  
  return contributions;
}

/**
 * Extract key points from text (simple implementation)
 */
function extractKeyPoints(text: string): string[] {
  const sentences = text.split(/[.!?。！？]+/).filter(s => s.trim().length > 20);
  return sentences.slice(0, 3).map(s => s.trim());
}

/**
 * Detect emotion in a contribution
 */
function detectContributionEmotion(text: string): string {
  const textLower = text.toLowerCase();
  if (textLower.includes('happy') || textLower.includes('great') || textLower.includes('excited')) return 'excited';
  if (textLower.includes('concern') || textLower.includes('worry') || textLower.includes('fear')) return 'concerned';
  if (textLower.includes('agree') || textLower.includes('good') || textLower.includes('yes')) return 'agreeing';
  if (textLower.includes('disagree') || textLower.includes('however') || textLower.includes('but')) return 'disagreeing';
  return 'neutral';
}

/**
 * Calculate confidence based on contribution patterns
 */
function calculateContributionConfidence(member: PersonaMember): number {
  const baseConfidence = 0.7;
  const activityBonus = Math.min(member.contributions * 0.05, 0.2);
  return Math.min(baseConfidence + activityBonus, 0.95);
}

/**
 * Generate synthesized response from team discussion
 */
export function synthesizeTeamResponse(): string | null {
  if (!activeDiscussion || !currentTeam.synthesizeResponses) return null;
  
  const contributions = analyzeDiscussion();
  if (contributions.length === 0) return null;
  
  // Build synthesis prompt
  let synthesis = `## Team Discussion Synthesis\n\n`;
  synthesis += `**Topic:** ${activeDiscussion.topic}\n\n`;
  synthesis += `### Perspectives:\n\n`;
  
  for (const c of contributions) {
    synthesis += `**${c.perspective}:**\n`;
    for (const point of c.keyPoints) {
      synthesis += `- ${point}\n`;
    }
    synthesis += `(Emotion: ${c.emotion}, Confidence: ${Math.round(c.confidence * 100)}%)\n\n`;
  }
  
  // Count agreements/disagreements
  const totalAgreements = currentTeam.members.reduce((sum, m) => sum + m.agreeCount, 0);
  const totalDisagreements = currentTeam.members.reduce((sum, m) => sum + m.disagreeCount, 0);
  
  synthesis += `### Team Dynamics:\n`;
  synthesis += `- Agreements: ${totalAgreements}\n`;
  synthesis += `- Disagreements: ${totalDisagreements}\n`;
  
  return synthesis;
}

/**
 * Conclude the current discussion
 */
export function concludeDiscussion(summary?: string): TeamDiscussion | null {
  if (!activeDiscussion) return null;
  
  // Generate summary if not provided
  if (!summary && currentTeam.summarizeOnConclude) {
    activeDiscussion.synthesizedResponse = synthesizeTeamResponse() || undefined;
    summary = `Discussion involved ${activeDiscussion.messages.length} messages from ${activeDiscussion.activePersonas.length} personas.`;
  }
  
  activeDiscussion.status = summary ? 'summarized' : 'concluded';
  if (summary) {
    activeDiscussion.summary = summary;
  }
  
  const concluded = activeDiscussion;
  return concluded;
}

/**
 * Clear the current discussion
 */
export function clearDiscussion(): void {
  activeDiscussion = null;
}

/**
 * Get discussion history
 */
export function getDiscussionHistory(): TeamDiscussion[] {
  return activeDiscussion ? [activeDiscussion] : [];
}

// ----- Quick Team Setup Helpers -----

/**
 * Set up a balanced team with multiple personas
 */
export function setupBalancedTeam(primaryId: PersonaId = 'default'): void {
  currentTeam = { ...DEFAULT_TEAM_CONFIG };
  
  addPersonaToTeam(primaryId, 'primary');
  
  // Add complementary personas based on primary
  const companions: Record<PersonaId, PersonaId[]> = {
    default: ['professional', 'playful'],
    professional: ['default', 'gentle'],
    playful: ['witty', 'gentle'],
    gentle: ['professional', 'default'],
    witty: ['playful', 'professional'],
  };
  
  const toAdd = companions[primaryId] || ['default', 'witty'];
  for (const pid of toAdd) {
    if (currentTeam.members.length < currentTeam.maxActiveMembers) {
      addPersonaToTeam(pid);
    }
  }
}

/**
 * Get a description of the current team setup
 */
export function getTeamDescription(): string {
  if (currentTeam.members.length === 0) {
    return 'No team configured yet.';
  }
  
  const primary = getPrimaryPersona();
  const actives = getActiveMembers();
  
  let desc = `**${currentTeam.teamName}**\n`;
  desc += `Lead: ${primary?.name || 'None'} (${primary?.role || 'none'})\n`;
  desc += `Active: ${actives.map(m => m.name).join(', ') || 'None'}\n`;
  desc += `Total members: ${currentTeam.members.length}`;
  
  return desc;
}

// ----- State Persistence -----

export function exportTeamState(): { team: TeamConfig; discussion: TeamDiscussion | null } {
  return {
    team: { ...currentTeam },
    discussion: activeDiscussion,
  };
}

export function importTeamState(state: { team?: TeamConfig; discussion?: TeamDiscussion | null }): void {
  if (state.team) {
    currentTeam = { ...state.team };
  }
  if (state.discussion !== undefined) {
    activeDiscussion = state.discussion;
  }
}

// ----- Cross-Persona Memory -----

export interface PersonaMemory {
  personaId: PersonaId;
  sharedMemories: string[];     // Memories this persona shares with others
  privateMemories: string[];    // Private to this persona
  lastSyncTime: number;
}

/**
 * Share a memory across team members
 */
export function shareMemoryAcrossTeam(personaId: PersonaId, memory: string): void {
  // In a real implementation, this would update a shared memory store
  console.log(`[MultiPersona] ${personaId} shared memory: ${memory.slice(0, 50)}...`);
}

/**
 * Get team-aware context for a persona
 */
export function getTeamContextForPersona(personaId: PersonaId): string {
  const member = currentTeam.members.find(m => m.personaId === personaId);
  if (!member) return '';
  
  const otherMembers = currentTeam.members.filter(m => m.personaId !== personaId);
  
  let context = `Team context for ${member.name}:\n`;
  context += `Your role: ${member.role}\n`;
  context += `Your expertise: ${member.expertise.join(', ')}\n\n`;
  
  context += `Other active team members:\n`;
  for (const m of otherMembers.filter(m => m.isActive)) {
    context += `- ${m.name} (${m.role}): ${m.expertise.join(', ')}\n`;
  }
  
  return context;
}
