/**
 * Sample Knowledge Sources for Demo
 */

import type { KnowledgeSource } from '../services/rag/types';

export const sampleKnowledgeSources: KnowledgeSource[] = [
  {
    id: 'sample-1',
    type: 'text',
    title: 'PixelPal User Guide',
    content: `Welcome to PixelPal! This guide will help you get started with your AI companion.

PixelPal supports multi-agent collaboration, allowing multiple AI personas to work together on tasks. You can create different personas for different purposes - work, personal, creative projects, and more.

Key Features:
- Multi-agent collaboration: Multiple AI agents can work together
- Persona customization: Create unique AI companions with different personalities
- Memory persistence: Your AI remembers conversations and preferences over time
- Plugin system: Extend functionality with custom plugins
- Knowledge base: Upload documents and let AI analyze them

Getting Started:
1. Create your first persona in Settings
2. Configure your AI provider (OpenAI, Anthropic, Gemini, or local Ollama)
3. Start chatting with your AI companion
4. Upload documents to build your knowledge base

Advanced Features:
- Chain skills together for complex workflows
- Use the skill marketplace to discover community plugins
- Export and import data for backup
- Customize themes and appearance`,
    metadata: {
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      tags: ['guide', 'getting-started', 'features'],
      size: 892,
    },
  },
  {
    id: 'sample-2',
    type: 'text',
    title: 'API Documentation',
    content: `PixelPal API Reference

The platform.adapter provides a unified interface for interacting with AI providers.

Provider Configuration:
Each provider requires specific configuration:
- OpenAI: apiKey, model (gpt-4, gpt-3.5-turbo)
- Anthropic: apiKey, model (claude-3-opus, claude-3-sonnet)
- Google Gemini: apiKey, model (gemini-pro, gemini-pro-vision)
- Ollama: baseUrl (http://localhost:11434), model (llama2, mistral)

Core Methods:
chatCompletion(messages, options) - Send a chat completion request
embed(text) - Get embeddings for text
imageGeneration(prompt) - Generate images (when supported)

Message Format:
{
  role: 'user' | 'assistant' | 'system',
  content: string
}

Error Handling:
All methods throw an error with message on failure. Wrap calls in try-catch for graceful handling.

Rate Limits:
Different providers have different rate limits. The adapter implements automatic retry with exponential backoff.`,
    metadata: {
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      tags: ['api', 'reference', 'documentation'],
      size: 756,
    },
  },
  {
    id: 'sample-3',
    type: 'note',
    title: 'Project Ideas',
    content: `Ideas for using PixelPal:

1. Personal Knowledge Assistant
- Upload your notes and documents
- Ask questions about your own content
- Get summaries and insights

2. Writing Partner
- Use the writing assistant for drafts
- Get feedback on your content
- Generate variations and alternatives

3. Code Helper
- Explain code snippets
- Debug issues
- Generate documentation

4. Learning Companion
- Upload study materials
- Quiz yourself on content
- Get explanations of complex topics

5. Meeting Prep
- Upload meeting notes
- Generate action items
- Create summaries

Tips:
- Use specific questions for better results
- Provide context from documents
- Iterate on responses
- Combine with plugins for advanced workflows`,
    metadata: {
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      tags: ['ideas', 'brainstorm', 'productivity'],
      size: 634,
    },
  },
];

/**
 * Initialize sample knowledge sources in storage.
 */
export async function initializeSampleKnowledge(): Promise<void> {
  const { addSource, getAllSources } = await import('../services/rag/sourceStorage');
  
  const existing = await getAllSources();
  
  // Only add samples if storage is empty
  if (existing.length === 0) {
    for (const source of sampleKnowledgeSources) {
      await addSource(source);
    }
    console.log('[SampleKnowledge] Initialized sample sources');
  }
}
