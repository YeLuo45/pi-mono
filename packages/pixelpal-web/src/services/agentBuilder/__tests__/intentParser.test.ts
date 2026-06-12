import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock global fetch BEFORE importing the module
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import the module after setting up mock
import { parseIntent } from '../intentParser';

describe('intentParser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseIntent - success branches', () => {
    it('should parse intent successfully and return valid config', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                name: 'TestAgent',
                description: 'A test agent',
                role: 'creative',
                capabilities: ['coding', 'writing'],
                requiredTools: ['web-search'],
                workflowTemplate: 'parallel',
                personality: {
                  tone: 'friendly',
                  expertise: 'expert',
                  creativity: 0.8,
                },
                constraints: ['no-harm'],
              }),
            },
          }],
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const progressCallback = vi.fn();
      const result = await parseIntent('Create a creative agent that can code', progressCallback);

      expect(result).toMatchObject({
        name: 'TestAgent',
        description: 'A test agent',
        role: 'creative',
        capabilities: ['coding', 'writing'],
        requiredTools: ['web-search'],
        workflowTemplate: 'parallel',
        personality: {
          tone: 'friendly',
          expertise: 'expert',
          creativity: 0.8,
        },
        constraints: ['no-harm'],
      });

      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({ stage: 'understanding', progress: 10 })
      );
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({ stage: 'analyzing', progress: 30 })
      );
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({ stage: 'structuring', progress: 70 })
      );
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({ stage: 'finalizing', progress: 100 })
      );
    });

    it('should handle JSON response with extra text around it', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'Here is your agent:\n{"name":"JsonAgent","description":"test","role":"general","capabilities":[],"requiredTools":[],"workflowTemplate":"sequential","personality":{"tone":"casual","expertise":"beginner","creativity":0.3},"constraints":[]}',
            },
          }],
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await parseIntent('test input');

      expect(result.name).toBe('JsonAgent');
      expect(result.role).toBe('general');
      expect(result.personality.tone).toBe('casual');
      expect(result.personality.expertise).toBe('beginner');
      expect(result.personality.creativity).toBe(0.3);
    });

    it('should handle partial response with missing fields using defaults', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: '{"name":"PartialAgent"}',
            },
          }],
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await parseIntent('partial response test');

      expect(result.name).toBe('PartialAgent');
      expect(result.description).toBe('partial response test'.slice(0, 100));
      expect(result.role).toBe('general');
      expect(result.capabilities).toEqual([]);
      expect(result.workflowTemplate).toBe('sequential');
      expect(result.personality.tone).toBe('friendly');
      expect(result.personality.expertise).toBe('intermediate');
      expect(result.personality.creativity).toBe(0.5);
    });
  });

  describe('parseIntent - failure branches', () => {
    it('should return default config when API returns non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
      });

      const result = await parseIntent('test input');

      // generateName: 'test'(4) + 'input'(5) = 'TestInput'
      expect(result.name).toBe('TestInput');
      expect(result.role).toBe('general');
      expect(result.personality.tone).toBe('friendly');
      expect(result.personality.expertise).toBe('intermediate');
      expect(result.personality.creativity).toBe(0.5);
    });

    it('should return default config when JSON parsing fails', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'This is not JSON at all!!!',
            },
          }],
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await parseIntent('invalid json test');

      // generateName: 'invalid'(7) + 'json'(4) + 'test'(4) = 'InvalidJsonTest'
      expect(result.name).toBe('InvalidJsonTest');
      expect(result.description).toBe('invalid json test'.slice(0, 100));
      expect(result.role).toBe('general');
    });

    it('should return default config when fetch throws', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await parseIntent('network failure test');

      // generateName: 'network'(7) + 'failure'(7) + 'test'(4) = 'NetworkFailureTest'
      expect(result.name).toBe('NetworkFailureTest');
      expect(result.role).toBe('general');
      expect(result.personality.tone).toBe('friendly');
    });
  });

  describe('generateName (via parseIntent)', () => {
    it('should generate name from input words longer than 3 chars', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: '{}', // Empty, will use generateName
            },
          }],
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await parseIntent('I want a coding assistant that helps');

      // generateName: filter words > 3 chars, take first 3
      // "want"(4), "coding"(6), "assistant"(9), "that"(4), "helps"(5)
      // slice(0, 3) = "want", "coding", "assistant" -> "WantCodingAssistant"
      expect(result.name).toBe('WantCodingAssistant');
    });

    it('should return NewAgent for very short input', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: '{}',
            },
          }],
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await parseIntent('hi');

      expect(result.name).toBe('NewAgent');
    });
  });

  describe('getDefaultConfig (via parseIntent error path)', () => {
    it('should return correct default config structure', async () => {
      mockFetch.mockRejectedValue(new Error('API Error'));

      const result = await parseIntent('default config test');

      expect(result).toEqual({
        name: expect.any(String),
        description: 'default config test'.slice(0, 100),
        role: 'general',
        capabilities: [],
        requiredTools: [],
        workflowTemplate: 'sequential',
        personality: {
          tone: 'friendly',
          expertise: 'intermediate',
          creativity: 0.5,
        },
        constraints: [],
      });
    });
  });

  describe('creativity clamping', () => {
    it('should clamp creativity to 0-1 range', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                name: 'CreativeAgent',
                role: 'creative',
                personality: {
                  tone: 'friendly',
                  expertise: 'expert',
                  creativity: 1.5, // Over 1, should be clamped to 1
                },
              }),
            },
          }],
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await parseIntent('clamp test');

      expect(result.personality.creativity).toBe(1);
    });

    it('should clamp negative creativity to 0', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                name: 'NegativeCreativeAgent',
                role: 'creative',
                personality: {
                  tone: 'friendly',
                  expertise: 'expert',
                  creativity: -0.5, // Negative, should be clamped to 0
                },
              }),
            },
          }],
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await parseIntent('negative clamp test');

      expect(result.personality.creativity).toBe(0);
    });
  });
});
