/**
 * Persona Prompt Generator — V28
 *
 * Generates persona-specific system prompts based on the persona's voice/tone.
 * This is prepended to AI chat calls to ensure the AI responds in the
 * intended persona voice (warm, rational, humorous, serious).
 */

import type { Persona, PersonaVoiceType } from './personaStorage';

const VOICE_INSTRUCTIONS: Record<PersonaVoiceType, string> = {
  warm: '多用鼓励性语言，适当使用 emoji，保持温暖友好的氛围',
  rational: '结构化输出，逻辑清晰，避免无关情绪化表达',
  humorous: '轻松幽默的语气，可以适当调侃，但不失专业',
  serious: '严谨正式，简洁直接，避免废话和 emoji',
};

const INTIMACY_DESCRIPTIONS: Record<string, string> = {
  '陌生人': '初次见面，保持礼貌距离',
  '熟人': '有些了解，但还不够熟悉',
  '朋友': '已经认识，可以畅所欲言',
  '挚友': '非常亲密，无话不谈',
  '灵魂伴侣': '心意相通，最深层的理解',
};

/**
 * Generate a persona-specific system prompt string.
 * Template: 你是一个${persona.bio}。\n语气要求：${voiceInstructions[persona.voice]}
 * Optionally appends intimacy level context if intimacyLevel is provided.
 */
export function getPersonaSystemPrompt(persona: Persona, intimacyLevel?: string): string {
  const base = `你是一个${persona.bio}。\n语气要求：${VOICE_INSTRUCTIONS[persona.voiceType]}`;
  if (intimacyLevel) {
    const desc = INTIMACY_DESCRIPTIONS[intimacyLevel] || '';
    return `${base}\n[当前关系：${intimacyLevel} — ${desc}]`;
  }
  return base;
}
