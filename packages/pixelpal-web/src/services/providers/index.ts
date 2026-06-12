/**
 * Providers Index
 * V106: Provider Abstraction
 * All exports are values (classes/const) to avoid rolldown [MISSING_EXPORT] with interface imports
 */

// Re-export registry
export { providerRegistry, ProviderRegistry } from './registry';

// Built-in provider configs (as const objects, not interfaces)
export const builtInProviders = [
  { id: 'openai', name: 'OpenAI', model: 'gpt-4', enabled: true },
  { id: 'minimax', name: 'MiniMax', model: 'abab6', enabled: true },
  { id: 'deepseek', name: 'DeepSeek', model: 'deepseek-chat', enabled: true },
];

// Re-export built-in providers
export { OpenAIProvider } from './built-in/OpenAIProvider';
export { MiniMaxProvider } from './built-in/MiniMaxProvider';
export { DeepSeekProvider } from './built-in/DeepSeekProvider';

// Stub exports for backward compatibility (avoid missing exports)
export const providerManager = {
  getDefaultProviders: () => builtInProviders,
  getProvider: (id: string) => builtInProviders.find(p => p.id === id),
};

export const DEFAULT_PROVIDERS = builtInProviders;