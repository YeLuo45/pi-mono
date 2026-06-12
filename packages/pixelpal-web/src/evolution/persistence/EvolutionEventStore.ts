/**
 * V157: Evolution Event Persistence Store
 * 
 * Provides CRUD operations for evolution events stored in SQLite.
 * Enables historical analysis, trend detection, and reporting.
 */

import { db } from '../../db';
import { evolutionEvents } from '../../db/schema/evolution';
import { eq, desc, and, gte, lt, sql } from 'drizzle-orm';
import type { EvolutionEvent } from '../../db/schema/evolution';

class EvolutionEventStore {
  /**
   * Save a new evolution event
   */
  async save(event: Omit<typeof evolutionEvents.$inferInsert, 'id'>): Promise<string> {
    const id = crypto.randomUUID();
    await db.insert(evolutionEvents).values({ id, ...event });
    return id;
  }

  /**
   * Get events by personality ID, ordered by timestamp descending
   */
  async getByPersonality(personalityId: string, limit = 100): Promise<EvolutionEvent[]> {
    return db.select()
      .from(evolutionEvents)
      .where(eq(evolutionEvents.personalityId, personalityId))
      .orderBy(desc(evolutionEvents.timestamp))
      .limit(limit);
  }

  /**
   * Get events within a time range
   */
  async getByTimeRange(startMs: number, endMs: number, limit = 500): Promise<EvolutionEvent[]> {
    return db.select()
      .from(evolutionEvents)
      .where(and(
        gte(evolutionEvents.timestamp, startMs),
        lt(evolutionEvents.timestamp, endMs)
      ))
      .orderBy(desc(evolutionEvents.timestamp))
      .limit(limit);
  }

  /**
   * Get events by event type
   */
  async getByType(eventType: string, limit = 100): Promise<EvolutionEvent[]> {
    return db.select()
      .from(evolutionEvents)
      .where(eq(evolutionEvents.eventType, eventType))
      .orderBy(desc(evolutionEvents.timestamp))
      .limit(limit);
  }

  /**
   * Count events of a specific type for a personality since a timestamp
   */
  async countByType(personalityId: string, eventType: string, sinceMs: number): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(evolutionEvents)
      .where(and(
        eq(evolutionEvents.personalityId, personalityId),
        eq(evolutionEvents.eventType, eventType),
        gte(evolutionEvents.timestamp, sinceMs)
      ));
    return result[0]?.count ?? 0;
  }

  /**
   * Calculate average event duration for a personality since a timestamp
   */
  async avgDuration(personalityId: string, sinceMs: number): Promise<number> {
    const result = await db.select({ avg: sql<number>`avg(duration_ms)` })
      .from(evolutionEvents)
      .where(and(
        eq(evolutionEvents.personalityId, personalityId),
        gte(evolutionEvents.timestamp, sinceMs)
      ));
    return result[0]?.avg ?? 0;
  }

  /**
   * Prune old events before a given timestamp
   * @returns number of deleted events
   */
  async pruneOldEvents(beforeMs: number): Promise<number> {
    const result = await db.delete(evolutionEvents)
      .where(lt(evolutionEvents.timestamp, beforeMs));
    return result.changes;
  }

  /**
   * Get event trends for multiple personalities over a time period
   */
  async getEventTrend(personalityIds: string[], sinceDays: number): Promise<Map<string, EvolutionEvent[]>> {
    const sinceMs = Date.now() - sinceDays * 86400000;
    const trend = new Map<string, EvolutionEvent[]>();
    for (const pid of personalityIds) {
      const events = await this.getByPersonality(pid, 1000);
      trend.set(pid, events.filter(e => e.timestamp >= sinceMs));
    }
    return trend;
  }
}

export const evolutionEventStore = new EvolutionEventStore();