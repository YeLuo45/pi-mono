/**
 * OpenAI Provider Stub
 * V106: Provider Abstraction
 */

// Workaround for rolldown [MISSING_EXPORT] bug with interface imports
type LLMProviderId = string;
type LLMProviderChat = (messages: any[], tools?: any[]) => Promise<any>;
type LLMProviderComplete = (prompt: string) => Promise<string>;

export class OpenAIProvider {
  id: LLMProviderId;

  constructor() {
    this.id = 'openai';
  }

  async chat(messages: any[], tools?: any[]): Promise<any> {
    console.log('[OpenAIProvider] chat called (stub)');
    return Promise.resolve({});
  }

  async complete(prompt: string): Promise<string> {
    console.log('[OpenAIProvider] complete called (stub)');
    return Promise.resolve('');
  }
}