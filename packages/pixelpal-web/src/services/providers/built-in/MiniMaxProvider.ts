/**
 * MiniMax Provider Stub
 * V106: Provider Abstraction
 */

// Workaround for rolldown [MISSING_EXPORT] bug with interface imports
type LLMProviderId = string;

export class MiniMaxProvider {
  id: LLMProviderId;

  constructor() {
    this.id = 'minimax';
  }

  async chat(messages: any[], tools?: any[]): Promise<any> {
    console.log('[MiniMaxProvider] chat called (stub)');
    return Promise.resolve({});
  }

  async complete(prompt: string): Promise<string> {
    console.log('[MiniMaxProvider] complete called (stub)');
    return Promise.resolve('');
  }
}