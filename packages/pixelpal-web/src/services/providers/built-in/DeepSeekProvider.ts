/**
 * DeepSeek Provider Stub
 * V106: Provider Abstraction
 */

// Workaround for rolldown [MISSING_EXPORT] bug with interface imports
type LLMProviderId = string;

export class DeepSeekProvider {
  id: LLMProviderId;

  constructor() {
    this.id = 'deepseek';
  }

  async chat(messages: any[], tools?: any[]): Promise<any> {
    console.log('[DeepSeekProvider] chat called (stub)');
    return Promise.resolve({});
  }

  async complete(prompt: string): Promise<string> {
    console.log('[DeepSeekProvider] complete called (stub)');
    return Promise.resolve('');
  }
}