/**
 * Model Registry Adapter for PixelPal
 * 
 * Adapts the ModelRegistry to work with the existing chatCompletion,
 * documentChatCompletion, and writingChatCompletion interfaces.
 * 
 * This adapter uses the store's models configuration and provides
 * fallback support when the primary model fails.
 */

import type { Message } from '../../types';
import type { ModelConfig, CallOptions, CallResult } from './model-registry';
import { ModelRegistry } from './model-registry';

// Re-export types for convenience
export type { ModelConfig, CallOptions, CallResult };

// Create a singleton ModelRegistry instance
let registry: ModelRegistry | null = null;

/**
 * Initialize the model registry with models from the store
 */
export function initModelRegistry(models: ModelConfig[]): void {
  registry = ModelRegistry.fromJSON(models);
}

/**
 * Update models in the registry
 */
export function updateRegistryModels(models: ModelConfig[]): void {
  if (!registry) {
    registry = ModelRegistry.fromJSON(models);
  } else {
    // Clear and reload
    registry = ModelRegistry.fromJSON(models);
  }
}

/**
 * Get the current registry instance
 */
export function getRegistry(): ModelRegistry {
  if (!registry) {
    registry = new ModelRegistry();
  }
  return registry;
}

/**
 * Get enabled models sorted by priority
 */
export function getEnabledModels(): ModelConfig[] {
  return getRegistry().getEnabledModels();
}

/**
 * Get the default (highest priority) model
 */
export function getDefaultModel(): ModelConfig | undefined {
  return getRegistry().getDefaultModel();
}

/**
 * Test a model connection
 */
export async function testModel(modelId: string): Promise<{ success: boolean; message: string }> {
  return getRegistry().testModel(modelId);
}

// ============================================================
// Adapter Methods - matching existing interfaces
// ============================================================

/**
 * Chat completion using ModelRegistry with fallback
 * Matches the signature: chatCompletion(messages: Message[], aiConfig: AIConfig): Promise<string>
 */
export async function chatCompletion(
  messages: Message[],
  _aiConfig: unknown // Kept for backward compatibility, models come from store via initModelRegistry
): Promise<string> {
  // Convert PixelPal Message to the simpler Message format expected by ModelRegistry
  const apiMessages = messages.map((m) => ({
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content,
  }));

  const result = await getRegistry().call(apiMessages);

  if (result.success) {
    return result.content;
  }

  throw new Error(result.error || 'AI request failed');
}

/**
 * Chat completion that returns full result including tool calls.
 * Use this when you need to handle function calling.
 */
export async function chatCompletionWithTools(
  messages: Message[],
  tools: CallOptions['tools'] = [],
  sessionId?: string
): Promise<CallResult> {
  const apiMessages = messages.map((m) => ({
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content,
  }));

  const result = await getRegistry().call(apiMessages, { tools, sessionId });
  return result;
}

/**
 * Document Q&A using ModelRegistry with fallback
 * Matches the signature: documentChatCompletion(documentContent: string, userQuestion: string, aiConfig: AIConfig): Promise<string>
 */
export async function documentChatCompletion(
  documentContent: string,
  userQuestion: string,
  _aiConfig: unknown
): Promise<string> {
  const systemPrompt = `You are a document assistant. The user has uploaded a document. Answer questions about it based on the document content provided. If the answer cannot be found in the document, say so. Be precise and quote relevant parts when possible.

DOCUMENT CONTENT:
${documentContent.slice(0, 15000)}`;

  const apiMessages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: userQuestion },
  ];

  const result = await getRegistry().call(apiMessages);

  if (result.success) {
    return result.content;
  }

  throw new Error(result.error || 'AI request failed');
}

/**
 * Writing assistant using ModelRegistry with fallback
 * Matches the signature: writingChatCompletion(outline: string, instruction: string, existingContent: string, aiConfig: AIConfig): Promise<string>
 */
export async function writingChatCompletion(
  outline: string,
  instruction: 'generate' | 'continue' | 'polish' | 'summarize',
  existingContent: string,
  _aiConfig: unknown
): Promise<string> {
  const instructions: Record<string, string> = {
    generate: 'Generate a complete article based on the following outline. Output only the article in Markdown format.',
    continue: 'Continue writing from where the existing content left off. Output only the continuation in Markdown format.',
    polish: 'Improve and polish the existing content for better readability and flow. Output only the polished version in Markdown format.',
    summarize: 'Summarize the following content into a concise summary. Output only the summary in Markdown format.',
  };

  const userContent = instruction === 'generate'
    ? `OUTLINE:\n${outline}`
    : `EXISTING CONTENT:\n${existingContent}\n\n---\n${instructions[instruction].replace('Output only ', '')}`;

  const apiMessages = [
    { role: 'system' as const, content: instructions[instruction] },
    { role: 'user' as const, content: userContent },
  ];

  const result = await getRegistry().call(apiMessages);

  if (result.success) {
    return result.content;
  }

  throw new Error(result.error || 'AI request failed');
}

/**
 * Simple prompt-based call for AI summarization
 */
export async function callWithPrompt(
  prompt: string,
  options: CallOptions = {}
): Promise<CallResult> {
  return getRegistry().callWithPrompt(prompt, options);
}
