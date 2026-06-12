/**
 * V150: MessageBusV3 — Publish/Subscribe/Broadcast Message Bus
 *
 * A typed message bus for inter-agent communication within the council:
 * - Publish to topics
 * - Subscribe to topics with callbacks
 * - Broadcast to all subscribers
 * - Unsubscribe by subscription ID
 */

export type MessageBusTopic = string;

export interface MessageBusMessage<T = unknown> {
  topic: MessageBusTopic;
  data: T;
  timestamp: number;
  sourceId?: string;
}

export type MessageBusCallback<T = unknown> = (message: MessageBusMessage<T>) => void;

export interface MessageBusSubscription {
  id: string;
  topic: MessageBusTopic;
  callback: MessageBusCallback;
  subscriberId?: string;
}

export interface MessageBusV3 {
  subscribe<T = unknown>(
    topic: MessageBusTopic,
    callback: MessageBusCallback<T>,
    subscriberId?: string
  ): string;
  unsubscribe(subscriptionId: string): boolean;
  unsubscribeByTopic(topic: MessageBusTopic): number;
  unsubscribeBySubscriber(subscriberId: string): number;
  publish<T = unknown>(topic: MessageBusTopic, data: T, sourceId?: string): void;
  broadcast<T = unknown>(data: T, sourceId?: string): void;
  clear(): void;
  getSubscriptions(): MessageBusSubscription[];
  getTopics(): MessageBusTopic[];
  getSubscriptionCount(): { topics: number; totalSubscriptions: number };
}

function generateSubscriptionId(): string {
  return `sub_${crypto.randomUUID().slice(0, 12)}`;
}

export function createMessageBus(): MessageBusV3 {
  const subscriptions = new Map<MessageBusTopic, MessageBusSubscription[]>();
  const subscriptionIndex = new Map<string, MessageBusSubscription>();

  return {
    subscribe<T>(topic: MessageBusTopic, callback: MessageBusCallback<T>, subscriberId?: string): string {
      const id = generateSubscriptionId();

      const sub: MessageBusSubscription = {
        id,
        topic,
        callback: callback as MessageBusCallback,
        subscriberId,
      };

      // Add to topic list
      if (!subscriptions.has(topic)) {
        subscriptions.set(topic, []);
      }
      subscriptions.get(topic)!.push(sub);

      // Add to index
      subscriptionIndex.set(id, sub);

      return id;
    },

    unsubscribe(subscriptionId: string): boolean {
      const sub = subscriptionIndex.get(subscriptionId);
      if (!sub) return false;

      const topicSubs = subscriptions.get(sub.topic);
      if (topicSubs) {
        const index = topicSubs.findIndex((s) => s.id === subscriptionId);
        if (index >= 0) {
          topicSubs.splice(index, 1);
        }
        if (topicSubs.length === 0) {
          subscriptions.delete(sub.topic);
        }
      }

      subscriptionIndex.delete(subscriptionId);
      return true;
    },

    unsubscribeByTopic(topic: MessageBusTopic): number {
      const topicSubs = subscriptions.get(topic);
      if (!topicSubs) return 0;

      let count = 0;
      for (const sub of topicSubs) {
        subscriptionIndex.delete(sub.id);
        count++;
      }

      subscriptions.delete(topic);
      return count;
    },

    unsubscribeBySubscriber(subscriberId: string): number {
      let count = 0;

      for (const [topic, topicSubs] of subscriptions) {
        const before = topicSubs.length;
        const filtered = topicSubs.filter((s) => {
          if (s.subscriberId === subscriberId) {
            subscriptionIndex.delete(s.id);
            return false;
          }
          return true;
        });

        if (filtered.length !== before) {
          count += before - filtered.length;
          if (filtered.length === 0) {
            subscriptions.delete(topic);
          } else {
            subscriptions.set(topic, filtered);
          }
        }
      }

      return count;
    },

    publish<T>(topic: MessageBusTopic, data: T, sourceId?: string): void {
      const topicSubs = subscriptions.get(topic);
      if (!topicSubs) return;

      const message: MessageBusMessage<T> = {
        topic,
        data,
        timestamp: Date.now(),
        sourceId,
      };

      // Create a copy to avoid issues if callback modifies subscriptions
      const subs = [...topicSubs];
      for (const sub of subs) {
        try {
          (sub.callback as MessageBusCallback<T>)(message);
        } catch (err) {
          console.error(`[MessageBusV3] Error in subscription ${sub.id}:`, err);
        }
      }
    },

    broadcast<T>(data: T, sourceId?: string): void {
      // Broadcast sends to the special 'broadcast' topic AND all topic subscribers
      const message: MessageBusMessage<T> = {
        topic: 'broadcast',
        data,
        timestamp: Date.now(),
        sourceId,
      };

      // Notify all subscriptions
      const allSubs = Array.from(subscriptionIndex.values());
      for (const sub of allSubs) {
        try {
          (sub.callback as MessageBusCallback<T>)(message);
        } catch (err) {
          console.error(`[MessageBusV3] Error in broadcast subscription ${sub.id}:`, err);
        }
      }
    },

    clear(): void {
      subscriptions.clear();
      subscriptionIndex.clear();
    },

    getSubscriptions(): MessageBusSubscription[] {
      return Array.from(subscriptionIndex.values());
    },

    getTopics(): MessageBusTopic[] {
      return Array.from(subscriptions.keys());
    },

    getSubscriptionCount(): { topics: number; totalSubscriptions: number } {
      let total = 0;
      for (const subs of subscriptions.values()) {
        total += subs.length;
      }
      return {
        topics: subscriptions.size,
        totalSubscriptions: total,
      };
    },
  };
}

// ============================================================================
// Utility: Create a namespaced message bus (e.g., for multiple councils)
// ============================================================================

export interface NamespacedMessageBus {
  bus: MessageBusV3;
  namespace: string;
  publish<T>(topic: string, data: T, sourceId?: string): void;
  subscribe<T>(topic: string, callback: MessageBusCallback<T>, subscriberId?: string): string;
  broadcast<T>(data: T, sourceId?: string): void;
}

export function createNamespacedMessageBus(namespace: string): NamespacedMessageBus {
  const bus = createMessageBus();

  const prefixedTopic = (topic: string) => `${namespace}:${topic}`;

  return {
    bus,
    namespace,
    publish<T>(topic: string, data: T, sourceId?: string): void {
      bus.publish(prefixedTopic(topic), data, sourceId);
    },
    subscribe<T>(topic: string, callback: MessageBusCallback<T>, subscriberId?: string): string {
      return bus.subscribe(prefixedTopic(topic), callback, subscriberId);
    },
    broadcast<T>(data: T, sourceId?: string): void {
      bus.broadcast({ namespace, data, timestamp: Date.now(), sourceId }, sourceId);
    },
  };
}