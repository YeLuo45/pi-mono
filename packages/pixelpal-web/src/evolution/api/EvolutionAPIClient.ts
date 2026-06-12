/**
 * V159: Evolution API Client
 * 
 * Client for external systems to call the Evolution API.
 */

import type { EvolutionAPIRequest, EvolutionAPIResponse } from './EvolutionAPIServer';
import type { FallbackEvent } from '../integration/EvolutionIntegrationHub';

export class EvolutionAPIClient {
  constructor(private baseUrl: string) {}

  async trigger(personalityId: string): Promise<EvolutionAPIResponse> {
    return this.request({ action: 'trigger', personalityId });
  }

  async getHealth(personalityId: string): Promise<EvolutionAPIResponse> {
    return this.request({ action: 'health', personalityId });
  }

  async adapt(personalityId: string): Promise<EvolutionAPIResponse> {
    return this.request({ action: 'adapt', personalityId });
  }

  async recordFallback(fallback: FallbackEvent): Promise<EvolutionAPIResponse> {
    return this.request({ action: 'fallback', personalityId: fallback.personalityId, params: fallback as unknown as Record<string, unknown> });
  }

  async getStatus(personalityId: string): Promise<EvolutionAPIResponse> {
    return this.request({ action: 'status', personalityId });
  }

  private async request(req: EvolutionAPIRequest): Promise<EvolutionAPIResponse> {
    const response = await fetch(`${this.baseUrl}/evolution`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });
    return response.json();
  }
}