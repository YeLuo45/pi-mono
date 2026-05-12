/**
 * Provider Abstraction Index for PixelPal V81
 * 
 * Re-exports all provider-related types and the provider manager.
 */

export * from './types';
export { providerManager } from './providerManager';
export { DEFAULT_PROVIDERS, PROVIDER_BASE_URLS, getProviderDefinition } from '../../data/defaultProviders';
export { createMiniMaxProvider, MINIMAX_MODELS, MINIMAX_BASE_URL } from './minimaxProvider';
