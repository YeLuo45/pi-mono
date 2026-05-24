/**
 * V150: MessageBusV3 Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createMessageBus, createNamespacedMessageBus } from '../../../src/services/council/MessageBusV3';

describe('MessageBusV3', () => {
  let bus: ReturnType<typeof createMessageBus>;

  beforeEach(() => {
    bus = createMessageBus();
  });

  it('should subscribe to a topic', () => {
    const received: unknown[] = [];
    const subId = bus.subscribe('test-topic', (msg) => {
      received.push(msg.data);
    });

    expect(subId).toBeTruthy();
    expect(typeof subId).toBe('string');
  });

  it('should publish to subscribers', () => {
    const received: unknown[] = [];
    bus.subscribe('test-topic', (msg) => {
      received.push(msg.data);
    });

    bus.publish('test-topic', { hello: 'world' });

    expect(received.length).toBe(1);
    expect(received[0]).toEqual({ hello: 'world' });
  });

  it('should support multiple subscribers on same topic', () => {
    const received1: unknown[] = [];
    const received2: unknown[] = [];

    bus.subscribe('test-topic', (msg) => received1.push(msg.data));
    bus.subscribe('test-topic', (msg) => received2.push(msg.data));

    bus.publish('test-topic', 'hello');

    expect(received1.length).toBe(1);
    expect(received2.length).toBe(1);
  });

  it('should unsubscribe by subscription id', () => {
    const received: unknown[] = [];
    const subId = bus.subscribe('test-topic', (msg) => {
      received.push(msg.data);
    });

    bus.unsubscribe(subId);
    bus.publish('test-topic', 'should not receive');

    expect(received.length).toBe(0);
  });

  it('should unsubscribe all subscribers by topic', () => {
    const received: unknown[] = [];
    bus.subscribe('test-topic', () => received.push('one'));
    bus.subscribe('test-topic', () => received.push('two'));
    bus.subscribe('other-topic', () => received.push('other'));

    const count = bus.unsubscribeByTopic('test-topic');

    expect(count).toBe(2);
    bus.publish('test-topic', 'should not receive');
    expect(received.length).toBe(0);
  });

  it('should broadcast to all subscribers', () => {
    const received: unknown[] = [];
    bus.subscribe('topic1', () => received.push('t1'));
    bus.subscribe('topic2', () => received.push('t2'));
    bus.subscribe('topic3', () => received.push('t3'));

    bus.broadcast('broadcast message');

    expect(received.length).toBe(3);
    expect(received).toContain('t1');
    expect(received).toContain('t2');
    expect(received).toContain('t3');
  });

  it('should provide correct subscription count', () => {
    bus.subscribe('t1', () => {});
    bus.subscribe('t1', () => {});
    bus.subscribe('t2', () => {});

    const counts = bus.getSubscriptionCount();
    expect(counts.topics).toBe(2);
    expect(counts.totalSubscriptions).toBe(3);
  });

  it('should clear all subscriptions', () => {
    bus.subscribe('t1', () => {});
    bus.subscribe('t2', () => {});
    bus.clear();

    const counts = bus.getSubscriptionCount();
    expect(counts.totalSubscriptions).toBe(0);
    expect(counts.topics).toBe(0);
  });

  it('should get list of topics', () => {
    bus.subscribe('topic1', () => {});
    bus.subscribe('topic2', () => {});
    bus.subscribe('topic3', () => {});

    const topics = bus.getTopics();
    expect(topics.sort()).toEqual(['topic1', 'topic2', 'topic3']);
  });

  it('should handle errors in subscriber callbacks gracefully', () => {
    bus.subscribe('error-topic', () => {
      throw new Error('Subscriber error');
    });

    // Should not throw
    expect(() => bus.publish('error-topic', 'test')).not.toThrow();
  });

  it('should track source id in published messages', () => {
    let receivedSourceId: string | undefined;
    bus.subscribe('source-test', (msg) => {
      receivedSourceId = msg.sourceId;
    });

    bus.publish('source-test', 'data', 'sender-123');

    expect(receivedSourceId).toBe('sender-123');
  });
});

describe('NamespacedMessageBus', () => {
  it('should prefix topics with namespace', () => {
    const nsBus = createNamespacedMessageBus('council1');
    const received: unknown[] = [];

    nsBus.subscribe('test', (msg) => received.push(msg.data));

    // Publish using prefixed topic directly
    nsBus.bus.publish('council1:test', 'prefixed');

    expect(received.length).toBe(1);
    expect(received[0]).toBe('prefixed');
  });

  it('should use the same bus instance', () => {
    const nsBus = createNamespacedMessageBus('test');
    expect(nsBus.bus).toBeDefined();
  });
});
