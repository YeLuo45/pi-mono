/**
 * Companion Service - Coordinates Personality + Memory for PixelPal
 * 
 * This is the main integration layer that:
 * 1. Manages the active persona/mood state
 * 2. Injects memory context into AI conversations
 * 3. Handles memory auto-summarization from chat history
 * 4. Provides pet mood updates based on interaction patterns
 */

import type { Message } from '../../types';
import type { PersonaId, PersonaConfig, PersonaMood } from './personalityTypes';
import { getPersona, getMood, suggestMoodForTime, PERSONAS } from './personalityTypes';
import { addMemory, buildMemoryContext } from '../memory/memoryStorage';
import { MEMORY_IMPORTANCE } from '../memory/memoryTypes';

// ----- Companion State -----

let activePersonaId: PersonaId = 'default';
let activeMoodId: string = 'happy';
let personaCustomName: string = '';

/**
 * Initialize the companion service
 */
export async function initCompanion(savedPersonaId?: PersonaId, savedMoodId?: string, savedCustomName?: string): Promise<void> {
  activePersonaId = savedPersonaId ?? 'default';
  activeMoodId = savedMoodId ?? suggestMoodForTime();
  personaCustomName = savedCustomName ?? '';
}

/**
 * Get the active persona config
 */
export function getActivePersona(): PersonaConfig {
  return getPersona(activePersonaId);
}

/**
 * Get the active mood config
 */
export function getActiveMood(): PersonaMood {
  return getMood(activeMoodId);
}

/**
 * Set the active persona
 */
export function setPersona(personaId: PersonaId): void {
  activePersonaId = personaId;
  // When switching persona, reset mood to default for that persona
  activeMoodId = getPersona(personaId).defaultMood;
}

/**
 * Set the active mood
 */
export function setMood(moodId: string): void {
  activeMoodId = moodId;
}

/**
 * Set custom name (stored in localStorage via Zustand)
 */
export function setCustomName(name: string): void {
  personaCustomName = name.trim();
}

/**
 * Get the display name (custom name or persona default name)
 */
export function getDisplayName(): string {
  return personaCustomName || getActivePersona().name;
}

/**
 * Get current persona ID
 */
export function getPersonaId(): PersonaId {
  return activePersonaId;
}

/**
 * Get current mood ID
 */
export function getMoodId(): string {
  return activeMoodId;
}

/**
 * Build the full system prompt with personality + memory context + emotion
 */
export async function buildCompanionSystemPrompt(additionalContext = '', emotionContext?: string): Promise<string> {
  const memoryContext = await buildMemoryContext();
  const persona = getActivePersona();

  let prompt = persona.systemPrompt;

  // Add display name
  prompt += `\n\nYour name is "${getDisplayName()}" and you are a ${persona.color}-themed pixel pet companion.`;

  // Add current mood context
  const mood = getActiveMood();
  prompt += `\n\nYou are currently feeling ${mood.label} ${mood.emoji}. Adjust your responses to match this mood (energy: ${mood.energy}, warmth: ${mood.warmth}, curiosity: ${mood.curiosity}).`;

  // Add emotion context (detected from user's speech)
  if (emotionContext) {
    prompt += `\n\n[Emotional Context: user seems ${emotionContext}]`;
  }

  // Add memory context
  if (memoryContext) {
    prompt += `\n\n[MEMORY CONTEXT]\n${memoryContext}\n[/MEMORY CONTEXT]`;
  }

  // Add any additional context
  if (additionalContext) {
    prompt += `\n\n[ADDITIONAL CONTEXT]\n${additionalContext}\n[/ADDITIONAL CONTEXT]`;
  }

  return prompt;
}

/**
 * Inject companion context into a message list for AI chat
 * Returns messages with the system prompt at the front
 */
export async function injectCompanionContext(
  messages: Message[],
  options: { includeMemory?: boolean; additionalContext?: string; emotionContext?: string; personaSystemPrompt?: string } = {}
): Promise<Message[]> {
  const { includeMemory = true, additionalContext = '', emotionContext, personaSystemPrompt } = options;

  const systemPrompt = await buildCompanionSystemPrompt(additionalContext, emotionContext);

  // Prepend persona-specific prompt if provided
  let finalSystemPrompt = systemPrompt;
  if (personaSystemPrompt) {
    finalSystemPrompt = `${personaSystemPrompt}\n\n${systemPrompt}`;
  }

  // Build the system message
  const systemMessage: Message = {
    id: crypto.randomUUID(),
    role: 'system',
    content: finalSystemPrompt,
    timestamp: Date.now(),
  };

  // If memory is included, filter out any existing system messages to avoid duplicates
  const filteredMessages = includeMemory
    ? messages.filter((m) => m.role !== 'system')
    : messages;

  return [systemMessage, ...filteredMessages];
}

// ----- Memory Auto-Management -----

/**
 * Record a conversation summary to memory
 */
export async function rememberConversation(topic: string, summary: string, importance = MEMORY_IMPORTANCE.NORMAL): Promise<void> {
  await addMemory({
    type: 'conversation_summary',
    content: `Topic: ${topic}\nSummary: ${summary}`,
    importance,
    tags: ['conversation', topic],
    personaId: activePersonaId,
  });
}

/**
 * Record a user preference
 */
export async function rememberPreference(preference: string, importance = MEMORY_IMPORTANCE.IMPORTANT): Promise<void> {
  await addMemory({
    type: 'user_preference',
    content: preference,
    importance,
    tags: ['preference'],
    personaId: activePersonaId,
  });
}

/**
 * Record a fact about the user
 */
export async function rememberFact(fact: string, importance = MEMORY_IMPORTANCE.IMPORTANT): Promise<void> {
  await addMemory({
    type: 'fact',
    content: fact,
    importance,
    tags: ['fact'],
    personaId: activePersonaId,
  });
}

/**
 * Record a pet milestone
 */
export async function rememberMilestone(milestone: string, importance = MEMORY_IMPORTANCE.IMPORTANT): Promise<void> {
  await addMemory({
    type: 'pet_milestone',
    content: milestone,
    importance,
    tags: ['milestone'],
    personaId: activePersonaId,
  });
}

/**
 * Auto-summarize recent chat history and store in memory
 * Called periodically or when memory is getting full
 */
export async function autoSummarizeChat(messages: Message[], maxMessages = 50): Promise<string | null> {
  if (messages.length < 5) return null;

  // Get recent user-assistant pairs
  const recentMessages = messages.slice(-maxMessages);
  const userMessages = recentMessages.filter((m) => m.role === 'user').map((m) => m.content);

  if (userMessages.length === 0) return null;

  // Create a summary string (without AI call - just structural)
  const summary = `User discussed: ${userMessages.slice(0, 5).join(' | ')}`;
  const topic = userMessages[0].slice(0, 50).replace(/\n/g, ' ');

  await rememberConversation(topic, summary, MEMORY_IMPORTANCE.NORMAL);
  return topic;
}

// ----- Mood & Interaction Helpers -----

/**
 * Update mood based on interaction patterns
 */
export function adjustMoodForInteraction(interactionType: 'greeting' | 'task' | 'chat' | 'document' | 'email'): void {
  switch (interactionType) {
    case 'greeting':
      // Stay current mood, maybe gentle transition to happy
      if (activeMoodId === 'sleepy') {
        activeMoodId = 'calm';
      }
      break;
    case 'task':
      // Task completion can boost mood
      if (activeMoodId === 'focused') {
        activeMoodId = 'happy';
      }
      break;
    case 'chat':
      // Conversational interaction
      break;
    case 'document':
    case 'email':
      // Work mode - can go to focused
      if (['happy', 'excited'].includes(activeMoodId)) {
        activeMoodId = 'focused';
      }
      break;
  }
}

/**
 * Get pet state based on current mood
 */
export function getPetStateForMood(): 'idle' | 'speaking' | 'thinking' | 'notification' | 'sleep' {
  const mood = getActiveMood();
  if (mood.id === 'sleepy') return 'sleep';
  if (mood.id === 'focused') return 'thinking';
  return 'idle';
}

/**
 * Get suggested pet message based on mood and recent context
 */
export function getMoodMessage(): string {
  const mood = getActiveMood();
  const name = getDisplayName();
  const messages: Record<string, string[]> = {
    happy: [`${name} 在这里～`, '今天感觉不错呢！', '有什么有趣的事吗？'],
    excited: ['太棒了！', '哇！好激动！', '快来快来！'],
    calm: ['慢慢来，不着急～', '我在呢，休息一下吧 🌿'],
    curious: ['诶？这是什么～', '有意思！能告诉我更多吗？', '让我想想...'],
    sleepy: ['zzZ...', '好困...', '休息一会儿...'],
    focused: ['专注于任务中...', '让我帮你整理一下～'],
    loving: ['抱抱～ 🤗', '你辛苦了～'],
    playful_mood: ['嘿嘿～', '来玩吗？'],
  };

  const opts = messages[mood.id] ?? messages.happy;
  return opts[Math.floor(Math.random() * opts.length)];
}

/**
 * Get all available persona IDs
 */
export function getAvailablePersonas(): PersonaId[] {
  return Object.keys(PERSONAS) as PersonaId[];
}

/**
 * Get persona summary for display
 */
export function getPersonaSummary(): Array<{ id: PersonaId; name: string; color: string; description: string }> {
  return Object.values(PERSONAS).map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    description: p.description,
  }));
}

// ----- Persistence -----

/**
 * Get companion state for persistence
 */
export function getCompanionState(): { personaId: PersonaId; moodId: string; customName: string } {
  return {
    personaId: activePersonaId,
    moodId: activeMoodId,
    customName: personaCustomName,
  };
}

/**
 * Restore companion state from persistence
 */
export async function restoreCompanionState(state: { personaId?: PersonaId; moodId?: string; customName?: string }): Promise<void> {
  if (state.personaId) setPersona(state.personaId);
  if (state.moodId) setMood(state.moodId);
  if (state.customName !== undefined) setCustomName(state.customName);
}
