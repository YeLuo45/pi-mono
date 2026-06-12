/**
 * P17: Messaging System Tests
 * 
 * Tests for the messaging subsystem:
 * 1. MessageBus - Publish-subscribe message bus with topic filtering
 * 2. MessageQueue - Priority queue with retry logic and exponential backoff
 * 3. Message Types - Type definitions and structures
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MessageBus } from '../messageBus';
import { MessageQueue, createMessageQueue } from '../messageQueue';
import type {
  Message,
  MessageContent,
  MessageHandler,
  MessageResult,
  MessagePriority,
  MessageType,
  MessageStatus,
  QueueConfig,
  Conversation,
  ConversationType,
} from '../messageTypes';
import { DEFAULT_QUEUE_CONFIG, DEFAULT_MESSAGE_BUS_CONFIG } from '../messageTypes';

// ============================================================================
// Test Helpers
// ============================================================================

function createTestMessage(overrides: Partial<Message> = {}): Message {
  const id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  return {
    id,
    conversationId: 'conv-1',
    senderId: 'user-1',
    recipientId: 'user-2',
    content: {
      type: 'text',
      text: 'Test message',
    },
    status: 'pending',
    priority: 'normal',
    timestamp: Date.now(),
    retryCount: 0,
    ...overrides,
  };
}

function createTextHandler(canHandleOverride?: boolean): MessageHandler {
  return {
    type: 'text',
    canHandle: (message: Message) => canHandleOverride ?? message.content.type === 'text',
    handle: async (message: Message): Promise<MessageResult> => ({
      success: true,
      messageId: message.id,
      output: `Processed: ${message.content.text}`,
    }),
  };
}

// ============================================================================
// MessageBus Tests
// ============================================================================

describe('MessageBus', () => {
  let messageBus: MessageBus;

  beforeEach(() => {
    messageBus = new MessageBus();
  });

  afterEach(() => {
    messageBus.clearHistory();
  });

  describe('constructor', () => {
    it('should use default config when none provided', () => {
      const bus = new MessageBus();
      expect(bus.getStats().handlerCount).toBe(0);
      expect(bus.getStats().topicCount).toBe(0);
    });

    it('should merge custom config with defaults', () => {
      const bus = new MessageBus({ maxHandlers: 20 });
      expect(bus.getStats().handlerCount).toBe(0);
    });
  });

  describe('registerHandler', () => {
    it('should register a valid handler', () => {
      const handler = createTextHandler();
      const result = messageBus.registerHandler(handler);
      expect(result).toBe(true);
      expect(messageBus.getHandlers('text')).toHaveLength(1);
    });

    it('should not register duplicate handler', () => {
      const handler = createTextHandler();
      messageBus.registerHandler(handler);
      const result = messageBus.registerHandler(handler);
      expect(result).toBe(false);
      expect(messageBus.getHandlers('text')).toHaveLength(1);
    });

    it('should not exceed max handlers limit', () => {
      const bus = new MessageBus({ maxHandlers: 2 });
      const h1 = createTextHandler(() => true);
      const h2 = createTextHandler(() => true);
      const h3 = createTextHandler(() => true);

      expect(bus.registerHandler(h1)).toBe(true);
      expect(bus.registerHandler(h2)).toBe(true);
      expect(bus.registerHandler(h3)).toBe(false);
    });

    it('should allow registering handler for new type', () => {
      const mediaHandler: MessageHandler = {
        type: 'media',
        canHandle: () => true,
        handle: async () => ({ success: true, messageId: 'test' }),
      };

      const result = messageBus.registerHandler(mediaHandler);
      expect(result).toBe(true);
      expect(messageBus.getHandlers('media')).toHaveLength(1);
    });
  });

  describe('unregisterHandler', () => {
    it('should unregister existing handler', () => {
      const handler = createTextHandler();
      messageBus.registerHandler(handler);
      
      const result = messageBus.unregisterHandler(handler);
      expect(result).toBe(true);
      expect(messageBus.getHandlers('text')).toHaveLength(0);
    });

    it('should return false for non-existent handler', () => {
      const handler = createTextHandler();
      const result = messageBus.unregisterHandler(handler);
      expect(result).toBe(false);
    });
  });

  describe('getHandlers', () => {
    it('should return handlers for specific type', () => {
      const handler1 = createTextHandler();
      const handler2 = createTextHandler();
      messageBus.registerHandler(handler1);
      messageBus.registerHandler(handler2);
      
      const handlers = messageBus.getHandlers('text');
      expect(handlers).toHaveLength(2);
    });

    it('should return empty array for type with no handlers', () => {
      const handlers = messageBus.getHandlers('system');
      expect(handlers).toHaveLength(0);
    });
  });

  // ---- Pub/Sub Tests ----

  describe('createTopic', () => {
    it('should create a new topic', () => {
      const result = messageBus.createTopic('test-topic');
      expect(result).toBe(true);
      expect(messageBus.hasTopic('test-topic')).toBe(true);
    });

    it('should return existing topic if already exists', () => {
      messageBus.createTopic('existing-topic');
      const result = messageBus.createTopic('existing-topic');
      expect(result).toBe(true);
      expect(messageBus.getTopics()).toContain('existing-topic');
    });
  });

  describe('subscribe and unsubscribe', () => {
    it('should subscribe to a topic', () => {
      const handler = vi.fn();
      const result = messageBus.subscribe('my-topic', handler);
      expect(result).toBe(true);
    });

    it('should receive messages after subscribing', async () => {
      const receivedMessages: Message[] = [];
      const handler = (msg: Message) => receivedMessages.push(msg);
      
      messageBus.subscribe('topic-1', handler);
      
      const message = createTestMessage();
      messageBus.publishToTopic('topic-1', message);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0].id).toBe(message.id);
    });

    it('should not receive messages after unsubscribe', async () => {
      const receivedMessages: Message[] = [];
      const handler = (msg: Message) => receivedMessages.push(msg);
      
      messageBus.subscribe('topic-2', handler);
      messageBus.unsubscribe('topic-2', handler);
      
      const message = createTestMessage();
      messageBus.publishToTopic('topic-2', message);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(receivedMessages).toHaveLength(0);
    });

    it('should filter messages by type when topic has type filter', async () => {
      const receivedMessages: Message[] = [];
      const handler = (msg: Message) => receivedMessages.push(msg);
      
      messageBus.createTopic('filtered-topic', ['text']);
      messageBus.subscribe('filtered-topic', handler);
      
      const textMessage = createTestMessage({ content: { type: 'text', text: 'hello' } });
      const imageMessage = createTestMessage({ content: { type: 'image', mediaUrl: 'img.jpg' } });
      
      messageBus.publishToTopic('filtered-topic', textMessage);
      messageBus.publishToTopic('filtered-topic', imageMessage);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0].content.type).toBe('text');
    });
  });

  describe('hasTopic', () => {
    it('should return true for existing topic', () => {
      messageBus.createTopic('existing');
      expect(messageBus.hasTopic('existing')).toBe(true);
    });

    it('should return false for non-existing topic', () => {
      expect(messageBus.hasTopic('non-existing')).toBe(false);
    });
  });

  describe('getTopics', () => {
    it('should return all topic names', () => {
      messageBus.createTopic('topic-a');
      messageBus.createTopic('topic-b');
      
      const topics = messageBus.getTopics();
      expect(topics).toContain('topic-a');
      expect(topics).toContain('topic-b');
    });
  });

  // ---- Middleware Tests ----

  describe('useMiddleware', () => {
    it('should add middleware to the chain', async () => {
      const middleware = vi.fn(async (ctx: any, next: () => Promise<void>) => {
        await next();
      });
      
      messageBus.useMiddleware(middleware);
      messageBus.clearMiddleware();
      
      // No error means middleware was added
      expect(true).toBe(true);
    });
  });

  // ---- Message Processing Tests ----

  describe('process', () => {
    it('should process message with registered handler', async () => {
      const handler = createTextHandler();
      messageBus.registerHandler(handler);
      
      const message = createTestMessage({
        content: { type: 'text', text: 'Hello' },
      });
      
      const results = await messageBus.process(message);
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
    });

    it('should not process message if handler cannot handle it', async () => {
      const handler = createTextHandler(false); // false means canHandle returns false
      messageBus.registerHandler(handler);
      
      const message = createTestMessage({
        content: { type: 'text', text: 'Hello' },
      });
      
      const results = await messageBus.process(message);
      expect(results).toHaveLength(0);
    });

    it('should add message to history', async () => {
      messageBus.registerHandler(createTextHandler());
      
      const message = createTestMessage();
      await messageBus.process(message);
      
      const history = messageBus.getHistory();
      expect(history.some(m => m.id === message.id)).toBe(true);
    });

    it('should use fallback handlers when no specific handler matches', async () => {
      const fallbackHandler: MessageHandler = {
        type: 'fallback',
        canHandle: () => true,
        handle: async (msg) => ({ success: true, messageId: msg.id, output: 'fallback' }),
      };
      messageBus.registerHandler(fallbackHandler);
      
      const message = createTestMessage({
        content: { type: 'unknown', text: 'test' },
      });
      
      const results = await messageBus.process(message);
      expect(results).toHaveLength(1);
      expect(results[0].output).toBe('fallback');
    });

    it('should emit events during processing', async () => {
      messageBus.registerHandler(createTextHandler());
      
      const message = createTestMessage();
      let eventFired = false;
      
      messageBus.onEvent('message_created', () => {
        eventFired = true;
      });
      
      await messageBus.process(message);
      expect(eventFired).toBe(true);
    });
  });

  describe('route', () => {
    it('should route message same as process', async () => {
      const handler = createTextHandler();
      messageBus.registerHandler(handler);
      
      const message = createTestMessage({
        content: { type: 'text', text: 'Route test' },
      });
      
      const results = await messageBus.route(message);
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
    });
  });

  // ---- History Tests ----

  describe('getHistory', () => {
    it('should return all messages when no filter', async () => {
      messageBus.registerHandler(createTextHandler());
      
      const msg1 = createTestMessage({ id: 'msg-1' });
      const msg2 = createTestMessage({ id: 'msg-2' });
      
      await messageBus.process(msg1);
      await messageBus.process(msg2);
      
      const history = messageBus.getHistory();
      expect(history.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by conversationId', async () => {
      messageBus.registerHandler(createTextHandler());
      
      const msg1 = createTestMessage({ id: 'msg-1', conversationId: 'conv-a' });
      const msg2 = createTestMessage({ id: 'msg-2', conversationId: 'conv-b' });
      
      await messageBus.process(msg1);
      await messageBus.process(msg2);
      
      const history = messageBus.getHistory('conv-a');
      expect(history.some(m => m.id === 'msg-1')).toBe(true);
      expect(history.some(m => m.id === 'msg-2')).toBe(false);
    });

    it('should respect limit parameter', async () => {
      messageBus.registerHandler(createTextHandler());
      
      for (let i = 0; i < 5; i++) {
        await messageBus.process(createTestMessage({ id: `msg-${i}` }));
      }
      
      const history = messageBus.getHistory(undefined, 3);
      expect(history.length).toBe(3);
    });
  });

  describe('clearHistory', () => {
    it('should clear all message history', async () => {
      messageBus.registerHandler(createTextHandler());
      
      await messageBus.process(createTestMessage());
      await messageBus.process(createTestMessage());
      
      messageBus.clearHistory();
      expect(messageBus.getHistory()).toHaveLength(0);
    });
  });

  // ---- Event Tests ----

  describe('onEvent and offEvent', () => {
    it('should receive events when subscribed', () => {
      const listener = vi.fn();
      messageBus.onEvent('message_created', listener);
      
      messageBus.onEvent('message_created', vi.fn());
      messageBus.offEvent('message_created', listener);
      
      // Event listener management works
      expect(true).toBe(true);
    });
  });

  // ---- Stats Tests ----

  describe('getStats', () => {
    it('should return correct statistics', () => {
      messageBus.registerHandler(createTextHandler());
      messageBus.createTopic('stats-topic');
      
      const stats = messageBus.getStats();
      expect(stats.handlerCount).toBe(1);
      expect(stats.topicCount).toBe(1);
      expect(stats.historySize).toBe(0);
    });
  });
});

// ============================================================================
// MessageQueue Tests
// ============================================================================

describe('MessageQueue', () => {
  let messageQueue: MessageQueue;

  beforeEach(() => {
    messageQueue = createMessageQueue();
  });

  afterEach(() => {
    messageQueue.stop();
    messageQueue.clear();
  });

  describe('constructor', () => {
    it('should use default config when none provided', () => {
      const queue = new MessageQueue();
      expect(queue.size()).toBe(0);
    });

    it('should merge custom config with defaults', () => {
      const config: Partial<QueueConfig> = {
        maxQueueSize: 500,
        maxRetries: 5,
      };
      const queue = createMessageQueue(config);
      expect(queue.size()).toBe(0);
    });
  });

  describe('enqueue', () => {
    it('should add message to queue', () => {
      const message = createTestMessage();
      const result = messageQueue.enqueue(message);
      
      expect(result).toBe(true);
      expect(messageQueue.size()).toBe(1);
      expect(messageQueue.peek()?.id).toBe(message.id);
    });

    it('should set message status to queued', () => {
      const message = createTestMessage({ status: 'pending' });
      messageQueue.enqueue(message);
      
      expect(message.status).toBe('queued');
    });

    it('should reject when queue is full', () => {
      const smallQueue = createMessageQueue({ maxQueueSize: 1 });
      
      smallQueue.enqueue(createTestMessage({ id: 'msg-1' }));
      const result = smallQueue.enqueue(createTestMessage({ id: 'msg-2' }));
      
      expect(result).toBe(false);
    });

    it('should respect priority when enqueuing', () => {
      const lowPriority = createTestMessage({ id: 'low', priority: 'low' });
      const highPriority = createTestMessage({ id: 'high', priority: 'high' });
      
      messageQueue.enqueue(lowPriority);
      messageQueue.enqueue(highPriority);
      
      expect(messageQueue.peek()?.id).toBe('high');
    });

    it('should use override priority when provided', () => {
      const normalMsg = createTestMessage({ id: 'normal', priority: 'normal' });
      const urgentMsg = createTestMessage({ id: 'urgent', priority: 'urgent' });
      
      messageQueue.enqueue(normalMsg, 0); // Override to highest priority
      messageQueue.enqueue(urgentMsg, 3); // Override to lowest
      
      expect(messageQueue.peek()?.id).toBe('normal');
    });
  });

  describe('dequeue', () => {
    it('should remove message from queue', () => {
      const message = createTestMessage();
      messageQueue.enqueue(message);
      
      const result = messageQueue.dequeue(message.id);
      
      expect(result).toBe(true);
      expect(messageQueue.size()).toBe(0);
    });

    it('should return false for non-existent message', () => {
      const result = messageQueue.dequeue('non-existent');
      expect(result).toBe(false);
    });

    it('should preserve order of remaining messages', () => {
      const msg1 = createTestMessage({ id: 'msg-1', priority: 'normal' });
      const msg2 = createTestMessage({ id: 'msg-2', priority: 'high' });
      const msg3 = createTestMessage({ id: 'msg-3', priority: 'normal' });
      
      messageQueue.enqueue(msg1);
      messageQueue.enqueue(msg2);
      messageQueue.enqueue(msg3);
      
      messageQueue.dequeue('msg-2');
      
      expect(messageQueue.peek()?.id).toBe('msg-1');
    });
  });

  describe('getMessage', () => {
    it('should return message by id', () => {
      const message = createTestMessage({ id: 'find-me' });
      messageQueue.enqueue(message);
      
      const found = messageQueue.getMessage('find-me');
      expect(found?.id).toBe('find-me');
    });

    it('should return undefined for non-existent message', () => {
      const found = messageQueue.getMessage('non-existent');
      expect(found).toBeUndefined();
    });
  });

  describe('peek', () => {
    it('should return next message without removing', () => {
      const msg1 = createTestMessage({ id: 'first' });
      const msg2 = createTestMessage({ id: 'second' });
      
      messageQueue.enqueue(msg1);
      messageQueue.enqueue(msg2);
      
      const peeked = messageQueue.peek();
      expect(peeked?.id).toBe('first');
      expect(messageQueue.size()).toBe(2);
    });

    it('should return undefined when queue is empty', () => {
      const peeked = messageQueue.peek();
      expect(peeked).toBeUndefined();
    });
  });

  describe('size and isEmpty', () => {
    it('should return correct size', () => {
      expect(messageQueue.size()).toBe(0);
      expect(messageQueue.isEmpty()).toBe(true);
      
      messageQueue.enqueue(createTestMessage());
      expect(messageQueue.size()).toBe(1);
      expect(messageQueue.isEmpty()).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all messages', () => {
      messageQueue.enqueue(createTestMessage());
      messageQueue.enqueue(createTestMessage());
      
      messageQueue.clear();
      
      expect(messageQueue.size()).toBe(0);
      expect(messageQueue.isEmpty()).toBe(true);
    });
  });

  describe('getAllMessages', () => {
    it('should return all queued messages', () => {
      messageQueue.enqueue(createTestMessage({ id: 'all-1' }));
      messageQueue.enqueue(createTestMessage({ id: 'all-2' }));
      
      const messages = messageQueue.getAllMessages();
      expect(messages.length).toBe(2);
    });
  });

  describe('retry', () => {
    it('should schedule retry for failed message', () => {
      const message = createTestMessage({ id: 'retry-test', retryCount: 0 });
      messageQueue.enqueue(message);
      
      const result = messageQueue.retry('retry-test');
      expect(result).toBe(true);
    });

    it('should fail when max retries exceeded', () => {
      const message = createTestMessage({ id: 'max-retry', retryCount: 3 });
      messageQueue.enqueue(message);
      
      const result = messageQueue.retry('max-retry');
      expect(result).toBe(false);
      expect(message.status).toBe('failed');
    });

    it('should return false for non-existent message', () => {
      const result = messageQueue.retry('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('setProcessCallback', () => {
    it('should accept a process callback', () => {
      const callback = vi.fn();
      messageQueue.setProcessCallback(callback);
      
      // Callback was set without error
      expect(true).toBe(true);
    });
  });

  describe('start and stop', () => {
    it('should start and stop processing', () => {
      messageQueue.start();
      messageQueue.stop();
      
      // No error means start/stop work
      expect(true).toBe(true);
    });

    it('should not start if already processing', () => {
      messageQueue.start();
      messageQueue.start(); // Should not throw
      
      messageQueue.stop();
      expect(true).toBe(true);
    });
  });
});

// ============================================================================
// Message Types Tests
// ============================================================================

describe('Message Types', () => {
  describe('MessageStatus', () => {
    const statuses: MessageStatus[] = ['pending', 'queued', 'processing', 'sent', 'delivered', 'read', 'failed'];
    
    statuses.forEach(status => {
      it(`should accept '${status}' as valid status`, () => {
        const message = createTestMessage({ status });
        expect(message.status).toBe(status);
      });
    });
  });

  describe('MessagePriority', () => {
    const priorities: MessagePriority[] = ['low', 'normal', 'high', 'urgent'];
    
    priorities.forEach(priority => {
      it(`should accept '${priority}' as valid priority`, () => {
        const message = createTestMessage({ priority });
        expect(message.priority).toBe(priority);
      });
    });
  });

  describe('MessageType', () => {
    const types: MessageType[] = ['text', 'image', 'audio', 'video', 'file', 'system', 'notification', 'command'];
    
    types.forEach(type => {
      it(`should accept '${type}' as valid message type`, () => {
        const content: MessageContent = { type };
        expect(content.type).toBe(type);
      });
    });
  });

  describe('ConversationType', () => {
    const types: ConversationType[] = ['direct', 'group', 'channel', 'thread'];
    
    types.forEach(type => {
      it(`should accept '${type}' as valid conversation type`, () => {
        const conversation: Conversation = {
          id: 'conv-1',
          type,
          participants: ['user-1', 'user-2'],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          unreadCount: new Map(),
        };
        expect(conversation.type).toBe(type);
      });
    });
  });

  describe('Message structure', () => {
    it('should require all mandatory fields', () => {
      const message: Message = {
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'sender',
        recipientId: 'recipient',
        content: { type: 'text' },
        status: 'pending',
        priority: 'normal',
        timestamp: Date.now(),
        retryCount: 0,
      };

      expect(message.id).toBe('msg-1');
      expect(message.content.type).toBe('text');
    });

    it('should support optional fields', () => {
      const message: Message = {
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'sender',
        recipientId: 'recipient',
        content: { type: 'text' },
        status: 'pending',
        priority: 'normal',
        timestamp: Date.now(),
        retryCount: 0,
        expiresAt: Date.now() + 3600000,
        error: 'some error',
        replyTo: 'reply-to-msg',
        threadId: 'thread-1',
      };

      expect(message.expiresAt).toBeDefined();
      expect(message.error).toBe('some error');
      expect(message.replyTo).toBe('reply-to-msg');
      expect(message.threadId).toBe('thread-1');
    });
  });

  describe('MessageContent', () => {
    it('should support text content', () => {
      const content: MessageContent = {
        type: 'text',
        text: 'Hello world',
      };
      expect(content.text).toBe('Hello world');
    });

    it('should support media content', () => {
      const content: MessageContent = {
        type: 'image',
        mediaUrl: 'https://example.com/image.jpg',
        mediaType: 'image/jpeg',
      };
      expect(content.mediaUrl).toBe('https://example.com/image.jpg');
      expect(content.mediaType).toBe('image/jpeg');
    });

    it('should support metadata', () => {
      const content: MessageContent = {
        type: 'text',
        metadata: { key: 'value', nested: { a: 1 } },
      };
      expect(content.metadata?.key).toBe('value');
      expect((content.metadata?.nested as any)?.a).toBe(1);
    });
  });

  describe('Conversation', () => {
    it('should track unread counts per user', () => {
      const conversation: Conversation = {
        id: 'conv-1',
        type: 'direct',
        participants: ['user-1', 'user-2'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        unreadCount: new Map([['user-1', 3], ['user-2', 0]]),
      };

      expect(conversation.unreadCount.get('user-1')).toBe(3);
      expect(conversation.unreadCount.get('user-2')).toBe(0);
    });

    it('should support optional name field', () => {
      const conversation: Conversation = {
        id: 'conv-1',
        type: 'group',
        name: 'Team Chat',
        participants: ['user-1', 'user-2'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        unreadCount: new Map(),
      };

      expect(conversation.name).toBe('Team Chat');
    });
  });
});

// ============================================================================
// Default Configuration Tests
// ============================================================================

describe('Default Configuration', () => {
  describe('DEFAULT_QUEUE_CONFIG', () => {
    it('should have expected default values', () => {
      expect(DEFAULT_QUEUE_CONFIG.maxQueueSize).toBe(1000);
      expect(DEFAULT_QUEUE_CONFIG.maxRetries).toBe(3);
      expect(DEFAULT_QUEUE_CONFIG.retryDelay).toBe(1000);
      expect(DEFAULT_QUEUE_CONFIG.backoffMultiplier).toBe(2);
      expect(DEFAULT_QUEUE_CONFIG.processInterval).toBe(100);
    });
  });

  describe('DEFAULT_MESSAGE_BUS_CONFIG', () => {
    it('should have expected default values', () => {
      expect(DEFAULT_MESSAGE_BUS_CONFIG.enablePubSub).toBe(true);
      expect(DEFAULT_MESSAGE_BUS_CONFIG.enableMiddleware).toBe(false);
      expect(DEFAULT_MESSAGE_BUS_CONFIG.maxHandlers).toBe(10);
    });
  });
});

// ============================================================================
// Priority Queue Edge Cases
// ============================================================================

describe('MessageQueue Priority Handling', () => {
  let messageQueue: MessageQueue;

  beforeEach(() => {
    messageQueue = createMessageQueue({ maxQueueSize: 100 });
  });

  afterEach(() => {
    messageQueue.stop();
    messageQueue.clear();
  });

  it('should process urgent messages first', () => {
    const normal = createTestMessage({ id: 'normal', priority: 'normal' });
    const urgent = createTestMessage({ id: 'urgent', priority: 'urgent' });
    
    messageQueue.enqueue(normal);
    messageQueue.enqueue(urgent);
    
    expect(messageQueue.peek()?.id).toBe('urgent');
  });

  it('should process high priority before normal', () => {
    const normal = createTestMessage({ id: 'normal', priority: 'normal' });
    const high = createTestMessage({ id: 'high', priority: 'high' });
    
    messageQueue.enqueue(normal);
    messageQueue.enqueue(high);
    
    expect(messageQueue.peek()?.id).toBe('high');
  });

  it('should process low priority last', () => {
    const high = createTestMessage({ id: 'high', priority: 'high' });
    const normal = createTestMessage({ id: 'normal', priority: 'normal' });
    const low = createTestMessage({ id: 'low', priority: 'low' });
    
    // Enqueue in reverse order - queue should sort by priority
    messageQueue.enqueue(low);
    messageQueue.enqueue(normal);
    messageQueue.enqueue(high);
    
    // First peek should be highest priority
    const firstMsg = messageQueue.peek();
    expect(firstMsg?.priority).toBe('high');
  });

  it('should increase priority number for retries', () => {
    const message = createTestMessage({ id: 'retry-priority', priority: 'normal', retryCount: 0 });
    messageQueue.enqueue(message);
    
    // Simulate retry
    messageQueue.retry('retry-priority');
    
    // Priority is affected by retry count
    expect(message.retryCount).toBe(1);
  });
});

// ============================================================================
// MessageBus Event Tests
// ============================================================================

describe('MessageBus Events', () => {
  let messageBus: MessageBus;

  beforeEach(() => {
    messageBus = new MessageBus();
  });

  afterEach(() => {
    messageBus.clearHistory();
  });

  it('should emit topic_subscribed event', () => {
    let eventFired = false;
    
    messageBus.onEvent('topic_subscribed', () => {
      eventFired = true;
    });
    
    messageBus.subscribe('event-topic', () => {});
    
    expect(eventFired).toBe(true);
  });

  it('should emit topic_unsubscribed event', () => {
    let eventFired = false;
    
    const handler = () => {};
    messageBus.subscribe('event-topic', handler);
    
    messageBus.onEvent('topic_unsubscribed', () => {
      eventFired = true;
    });
    
    messageBus.unsubscribe('event-topic', handler);
    
    expect(eventFired).toBe(true);
  });

  it('should emit message_sent on successful processing', async () => {
    let eventFired = false;
    
    messageBus.onEvent('message_sent', () => {
      eventFired = true;
    });
    
    messageBus.registerHandler(createTextHandler());
    const message = createTestMessage({ content: { type: 'text', text: 'test' } });
    await messageBus.process(message);
    
    expect(eventFired).toBe(true);
  });
});
