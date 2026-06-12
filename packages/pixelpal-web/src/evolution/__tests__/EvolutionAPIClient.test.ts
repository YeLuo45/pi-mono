/**
 * V159: EvolutionAPIClient Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EvolutionAPIClient } from '../api/EvolutionAPIClient';

describe('EvolutionAPIClient', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    vi.clearAllMocks();
  });

  it('should call /evolution with POST and correct body', async () => {
    mockFetch.mockResolvedValue({ json: async () => ({ success: true, data: {}, requestId: 'req-1', timestamp: new Date().toISOString() }) });
    const client = new EvolutionAPIClient('http://localhost:3000');
    await client.trigger('personality-1');
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/evolution', expect.objectContaining({ method: 'POST' }));
  });

  it('should parse trigger response correctly', async () => {
    const mockResponse = { success: true, data: { eventId: 'evt-1' }, requestId: 'req-1', timestamp: '2026-05-24T10:00:00Z' };
    mockFetch.mockResolvedValue({ json: async () => mockResponse });
    const client = new EvolutionAPIClient('http://localhost:3000');
    const result = await client.trigger('personality-1');
    expect(result.success).toBe(true);
  });

  it('should parse health response correctly', async () => {
    const mockResponse = { success: true, data: { overall: 'healthy' }, requestId: 'req-1', timestamp: '2026-05-24T10:00:00Z' };
    mockFetch.mockResolvedValue({ json: async () => mockResponse });
    const client = new EvolutionAPIClient('http://localhost:3000');
    const result = await client.getHealth('personality-1');
    expect(result.data.overall).toBe('healthy');
  });

  it('should handle network errors gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    const client = new EvolutionAPIClient('http://localhost:3000');
    await expect(client.trigger('personality-1')).rejects.toThrow('Network error');
  });

  it('should use baseUrl from constructor', async () => {
    mockFetch.mockResolvedValue({ json: async () => ({ success: true, data: {}, requestId: 'req-1', timestamp: new Date().toISOString() }) });
    const client = new EvolutionAPIClient('http://api.example.com/v1');
    await client.getStatus('personality-1');
    expect(mockFetch).toHaveBeenCalledWith('http://api.example.com/v1/evolution', expect.any(Object));
  });

  it('should pass personalityId in request body for trigger', async () => {
    mockFetch.mockResolvedValue({ json: async () => ({ success: true, data: {}, requestId: 'req-1', timestamp: new Date().toISOString() }) });
    const client = new EvolutionAPIClient('http://localhost:3000');
    await client.trigger('personality-42');
    const call = mockFetch.mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(body.personalityId).toBe('personality-42');
  });

  it('should handle adapt action', async () => {
    mockFetch.mockResolvedValue({ json: async () => ({ success: true, data: { newStrategy: 'conservative' }, requestId: 'req-1', timestamp: new Date().toISOString() }) });
    const client = new EvolutionAPIClient('http://localhost:3000');
    const result = await client.adapt('personality-1');
    expect(result.success).toBe(true);
  });

  it('should handle recordFallback action', async () => {
    mockFetch.mockResolvedValue({ json: async () => ({ success: true, data: { recorded: true }, requestId: 'req-1', timestamp: new Date().toISOString() }) });
    const client = new EvolutionAPIClient('http://localhost:3000');
    const result = await client.recordFallback({ personalityId: 'p1', ruleId: 'r1', reason: 'timeout', fallbackStrategy: 'skip', timestamp: new Date(), recovered: false });
    expect(result.success).toBe(true);
  });
});