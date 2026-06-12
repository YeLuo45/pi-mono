/**
 * V159: EvolutionAPIServer Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EvolutionAPIServer } from '../api/EvolutionAPIServer';

const mockHub = {
  triggerEvolutionWithFullFlow: vi.fn(),
  getIntegratedHealthStatus: vi.fn(),
  adaptStrategyFromAnalytics: vi.fn(),
  recordAndAnalyzeFallback: vi.fn()
};

describe('EvolutionAPIServer', () => {
  let server: EvolutionAPIServer;

  beforeEach(() => {
    server = new EvolutionAPIServer(mockHub as any);
    vi.clearAllMocks();
  });

  describe('handleRequest', () => {
    it('should handle trigger action successfully', async () => {
      mockHub.triggerEvolutionWithFullFlow.mockResolvedValue({ success: true, eventId: 'evt-1' });
      const result = await server.handleRequest({ action: 'trigger', personalityId: 'p1' });
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle health action', async () => {
      mockHub.getIntegratedHealthStatus.mockResolvedValue({ overall: 'healthy' });
      const result = await server.handleRequest({ action: 'health', personalityId: 'p1' });
      expect(result.success).toBe(true);
    });

    it('should handle adapt action', async () => {
      mockHub.adaptStrategyFromAnalytics.mockResolvedValue({ newStrategy: 'conservative' });
      const result = await server.handleRequest({ action: 'adapt', personalityId: 'p1' });
      expect(result.success).toBe(true);
    });

    it('should handle fallback action', async () => {
      mockHub.recordAndAnalyzeFallback.mockResolvedValue(undefined);
      const result = await server.handleRequest({ action: 'fallback', personalityId: 'p1', params: { reason: 'test' } as any });
      expect(result.success).toBe(true);
    });

    it('should handle status action', async () => {
      mockHub.getIntegratedHealthStatus.mockResolvedValue({ overall: 'healthy' });
      const result = await server.handleRequest({ action: 'status', personalityId: 'p1' });
      expect(result.success).toBe(true);
    });

    it('should return error for unknown action', async () => {
      const result = await server.handleRequest({ action: 'unknown' as any, personalityId: 'p1' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });

    it('should catch and format exceptions', async () => {
      mockHub.triggerEvolutionWithFullFlow.mockRejectedValue(new Error('Hub error'));
      const result = await server.handleRequest({ action: 'trigger', personalityId: 'p1' });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Error: Hub error');
    });

    it('should include requestId in all responses', async () => {
      mockHub.getIntegratedHealthStatus.mockResolvedValue({ overall: 'healthy' });
      const result = await server.handleRequest({ action: 'health', personalityId: 'p1' });
      expect(result.requestId).toMatch(/^req-/);
    });
  });
});