/**
 * V159: Evolution API Server
 * 
 * API server handling trigger/health/adapt/fallback/status actions
 * for external systems to interact with the Evolution Integration Hub.
 */

import type { EvolutionIntegrationHub, FallbackEvent } from '../integration/EvolutionIntegrationHub';

export interface EvolutionAPIRequest {
  action: 'trigger' | 'health' | 'adapt' | 'fallback' | 'status';
  personalityId: string;
  params?: Record<string, unknown>;
}

export interface EvolutionAPIResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  requestId: string;
  timestamp: string;
}

function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export class EvolutionAPIServer {
  constructor(private hub: EvolutionIntegrationHub) {}

  async handleRequest(req: EvolutionAPIRequest): Promise<EvolutionAPIResponse> {
    const requestId = generateRequestId();
    try {
      switch (req.action) {
        case 'trigger':
          return await this.handleTrigger(req, requestId);
        case 'health':
          return await this.handleHealth(req, requestId);
        case 'adapt':
          return await this.handleAdapt(req, requestId);
        case 'fallback':
          return await this.handleFallback(req, requestId);
        case 'status':
          return await this.handleStatus(req, requestId);
        default:
          return { success: false, error: `Unknown action: ${req.action}`, requestId, timestamp: new Date().toISOString() };
      }
    } catch (error) {
      return { success: false, error: String(error), requestId, timestamp: new Date().toISOString() };
    }
  }

  private async handleTrigger(req: EvolutionAPIRequest, requestId: string): Promise<EvolutionAPIResponse> {
    const result = await this.hub.triggerEvolutionWithFullFlow(req.personalityId);
    return { success: result.success, data: result, requestId, timestamp: new Date().toISOString() };
  }

  private async handleHealth(req: EvolutionAPIRequest, requestId: string): Promise<EvolutionAPIResponse> {
    const status = await this.hub.getIntegratedHealthStatus();
    return { success: true, data: status, requestId, timestamp: new Date().toISOString() };
  }

  private async handleAdapt(req: EvolutionAPIRequest, requestId: string): Promise<EvolutionAPIResponse> {
    const adaptation = await this.hub.adaptStrategyFromAnalytics(req.personalityId);
    return { success: true, data: adaptation, requestId, timestamp: new Date().toISOString() };
  }

  private async handleFallback(req: EvolutionAPIRequest, requestId: string): Promise<EvolutionAPIResponse> {
    await this.hub.recordAndAnalyzeFallback(req.params as unknown as FallbackEvent);
    return { success: true, data: { recorded: true }, requestId, timestamp: new Date().toISOString() };
  }

  private async handleStatus(req: EvolutionAPIRequest, requestId: string): Promise<EvolutionAPIResponse> {
    const status = await this.hub.getIntegratedHealthStatus();
    return { success: true, data: status, requestId, timestamp: new Date().toISOString() };
  }
}