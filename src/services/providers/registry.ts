/**
 * Provider Registry
 * V106: Provider Abstraction
 * Singleton class for managing LLM provider registrations
 */

// Inline types to avoid rolldown [MISSING_EXPORT] with interface imports
interface ProviderConfig {
  id: string;
  name: string;
  apiKey?: string;
  apiBase?: string;
  model: string;
  enabled: boolean;
}

class ProviderRegistry {
  private static instance: ProviderRegistry;
  private providers: Map<string, ProviderConfig> = new Map();

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  register(config: ProviderConfig): void {
    console.log('[ProviderRegistry] register:', config.id, config.name);
    this.providers.set(config.id, config);
  }

  get(id: string): ProviderConfig | undefined {
    console.log('[ProviderRegistry] get:', id);
    return this.providers.get(id);
  }

  list(): ProviderConfig[] {
    console.log('[ProviderRegistry] list:', this.providers.size, 'providers');
    return Array.from(this.providers.values());
  }

  unregister(id: string): void {
    console.log('[ProviderRegistry] unregister:', id);
    this.providers.delete(id);
  }
}

export const providerRegistry = ProviderRegistry.getInstance();
export { ProviderRegistry };