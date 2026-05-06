/**
 * Discussion Service V27 — Multi-Agent Real Debate
 * 
 * Sequential AI response generator for multi-persona real debates.
 * Each selected persona responds to the user's message in turn.
 */

import type { CollaborationMessage } from './companion/multiPersonaService';
import {
  type TeamDiscussion,
  getCurrentDiscussion,
  addDiscussionMessage as svcAddDiscussionMessage,
} from './companion/multiPersonaService';
import { getPersonaSystemPrompt } from './persona/personaPrompt';
import { getAllPersonas } from './persona/personaStorage';
import { getPersona } from './companion/personalityTypes';
import { chatCompletion } from './ai/model-registry-adapter';
import { detectEmotion } from '../services/voice/emotionDetector';
import type { PersonaId } from './companion/personalityTypes';

export interface DiscussionCallbacks {
  onMessage: (msg: CollaborationMessage & { emotion?: string }) => void;
  onTyping: (personaId: string | null) => void;
}

// Extended message type for debate that includes emotion
export interface DebateMessage extends CollaborationMessage {
  emotion?: string;
}

/**
 * Run a sequential discussion where each selected persona responds in turn.
 */
export async function runSequentialDiscussion(
  userMessage: string,
  selectedPersonaIds: string[],
  callbacks: DiscussionCallbacks
): Promise<void> {
  const { onMessage, onTyping } = callbacks;
  
  // Add user message to the discussion (using first persona as proxy for user)
  // Note: The service expects a real PersonaId, so we use the first selected persona
  const userMsg = svcAddDiscussionMessage(
    selectedPersonaIds[0] as PersonaId,
    `[用户]: ${userMessage}`,
    'contribution'
  );
  if (userMsg) {
    onMessage(userMsg);
  }

  // Each persona responds in sequence
  for (const personaId of selectedPersonaIds) {
    onTyping(personaId);

    try {
      const aiResponse = await generatePersonaResponse(personaId, userMessage);
      
      // Detect emotion from the response
      const estimatedDuration = Math.max(1000, aiResponse.length * 10);
      const emotionResult = detectEmotion(aiResponse, estimatedDuration);
      
      const msg = svcAddDiscussionMessage(
        personaId as PersonaId,
        aiResponse,
        'contribution'
      );
      
      if (msg) {
        // Attach emotion to message via the callback
        const msgWithEmotion: DebateMessage = { ...msg, emotion: emotionResult.emotion };
        onMessage(msgWithEmotion);
      }
    } catch (error) {
      console.error(`[discussionService] Error generating response for ${personaId}:`, error);
      const errorMsg = svcAddDiscussionMessage(
        personaId as PersonaId,
        `（抱歉，生成回复时出现了问题）`,
        'contribution'
      );
      if (errorMsg) onMessage(errorMsg);
    }

    onTyping(null);
  }

  // Add summary message
  await addDiscussionSummary(callbacks);
}

/**
 * Generate an AI response for a specific persona.
 */
async function generatePersonaResponse(personaId: string, userMessage: string): Promise<string> {
  const persona = getPersona(personaId as PersonaId);
  const systemPrompt = getPersonaSystemPrompt(persona as any);
  
  const discussion = getCurrentDiscussion();
  const historyMessages = discussion?.messages || [];

  // Build conversation history
  const historyText = historyMessages
    .filter(m => m.type !== 'summary')
    .map(m => `[${m.personaName}]: ${m.content}`)
    .join('\n');

  const systemWithContext = `${systemPrompt}

You are in a group discussion. Respond in character as ${persona.name}.
Keep responses concise (under 200 characters) and focused on contributing to the discussion.
You should provide your unique perspective while being engaging and relevant to the topic.`;

  const messages = [
    { role: 'system' as const, content: systemWithContext },
    ...(historyText ? [{ role: 'user' as const, content: `讨论历史：\n${historyText}` }] : []),
    { role: 'user' as const, content: `用户的新观点：${userMessage}\n\n请作为 ${persona.name} 贡献你的观点。` },
  ];

  try {
    const response = await chatCompletion(messages);
    return response;
  } catch (error) {
    console.error(`[discussionService] chatCompletion error for ${personaId}:`, error);
    return `（网络错误，无法生成回复）`;
  }
}

/**
 * Add a summary message at the end of the discussion.
 */
async function addDiscussionSummary(callbacks: DiscussionCallbacks): Promise<void> {
  const { onMessage, onTyping } = callbacks;
  
  onTyping('system');

  const discussion = getCurrentDiscussion();
  if (!discussion) {
    onTyping(null);
    return;
  }

  const summaryPrompt = buildSummaryPrompt(discussion);

  try {
    const summaryResponse = await chatCompletion([
      { role: 'system', content: `你是一个讨论总结助手。请根据以下讨论内容，生成一段简洁的总结（100字以内），概括主要观点和结论。` },
      { role: 'user', content: summaryPrompt },
    ]);

    const summaryMsg = svcAddDiscussionMessage(
      'default' as PersonaId, // Use a valid PersonaId
      `[总结]: ${summaryResponse}`,
      'summary'
    );

    if (summaryMsg) {
      onMessage(summaryMsg);
    }
  } catch (error) {
    console.error('[discussionService] Summary generation error:', error);
    const fallback = svcAddDiscussionMessage(
      'default' as PersonaId,
      `讨论结束，共 ${discussion.messages.length} 条发言。`,
      'summary'
    );
    if (fallback) onMessage(fallback);
  }

  onTyping(null);
}

/**
 * Build a summary prompt from the discussion messages.
 */
function buildSummaryPrompt(discussion: TeamDiscussion): string {
  const lines: string[] = [];
  lines.push(`话题：${discussion.topic}\n`);
  
  for (const msg of discussion.messages) {
    if (msg.type !== 'summary') {
      lines.push(`[${msg.personaName}]：${msg.content}`);
    }
  }
  
  return lines.join('\n');
}

/**
 * Get persona info by ID (helper for UI).
 */
export function getPersonaInfo(personaId: string): { name: string; avatar: string; color: string } | null {
  try {
    const personas = getAllPersonas();
    const persona = personas.find(p => p.id === personaId);
    if (persona) {
      return {
        name: persona.name,
        avatar: persona.avatar,
        color: persona.theme?.primaryColor || '#9C27B0',
      };
    }
  } catch {
    // Fallback to personalityTypes
  }
  
  const personalityPersona = getPersona(personaId as PersonaId);
  if (personalityPersona) {
    return {
      name: personalityPersona.name,
      avatar: personalityPersona.color,
      color: personalityPersona.color,
    };
  }
  
  return null;
}
