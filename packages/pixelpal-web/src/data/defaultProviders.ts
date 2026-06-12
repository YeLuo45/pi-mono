/**
 * Default Provider Definitions for PixelPal V81
 * 
 * Defines the available providers and their default configurations.
 */

import type { ProviderDefinition } from '../services/providers/types';

export const DEFAULT_PROVIDERS: ProviderDefinition[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '🤖',
    description: 'GPT-4o, GPT-4o-mini, GPT-4-turbo',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
    defaultModel: 'gpt-4o',
    supportsEmbeddings: true,
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    icon: '🧠',
    description: 'Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
    defaultModel: 'claude-3-5-sonnet-20241022',
    supportsEmbeddings: false,
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    icon: '💎',
    description: 'Gemini 1.5 Pro, Gemini 1.5 Flash, Gemini 2.0 Flash',
    models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash'],
    defaultModel: 'gemini-1.5-flash',
    supportsEmbeddings: true,
  },
  {
    id: 'siliconflow',
    name: 'SiliconFlow',
    icon: '🌊',
    description: 'SiliconFlow (siliconflow.cn) - Multiple open source models',
    models: ['Qwen/Qwen2.5-7B-Instruct', 'deepseek-ai/DeepSeek-V2.5', 'THUDM/glm-4-9b-chat'],
    defaultModel: 'Qwen/Qwen2.5-7B-Instruct',
    supportsEmbeddings: true,
  },
  {
    id: 'ollama',
    name: 'Ollama',
    icon: '🦙',
    description: 'Local models via Ollama (Llama, Qwen, DeepSeek, etc.)',
    models: ['llama3', 'llama3.1', 'qwen2.5', 'deepseek-coder-v2'],
    defaultModel: 'llama3',
    supportsEmbeddings: true,
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    icon: '🔮',
    description: 'MiniMax - Chinese AI startup with abstr5 model',
    models: ['abstr5', 'chatany'],
    defaultModel: 'abstr5',
    supportsEmbeddings: true,
  },
  {
    id: 'custom',
    name: 'Custom',
    icon: '🔧',
    description: 'Generic OpenAI-compatible API endpoint',
    models: [],
    defaultModel: '',
    supportsEmbeddings: true,
  },
];

export const PROVIDER_BASE_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
  siliconflow: 'https://api.siliconflow.cn/v1',
  ollama: 'http://localhost:11434/v1',
  minimax: 'https://api.minimax.io/v1',
  custom: '',
};

export function getProviderDefinition(id: string): ProviderDefinition | undefined {
  return DEFAULT_PROVIDERS.find(p => p.id === id);
}
