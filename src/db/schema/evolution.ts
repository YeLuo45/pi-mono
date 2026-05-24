/**
 * V157: Evolution Events Schema
 * 
 * Stores evolution events for persistence and analytics.
 * Tracks pattern detection, strategy optimization, skill crystallization,
 * and rule triggering for historical analysis and trend detection.
 */

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const evolutionEvents = sqliteTable('evolution_events', {
  id: text('id').primaryKey(),
  personalityId: text('personality_id'),
  
  // Event type
  eventType: text('event_type').notNull(), // pattern_detected | strategy_optimized | skill_crystallized | rule_triggered | manual_override
  
  // Trigger source
  triggerType: text('trigger_type'),       // rule | manual | scheduled | event
  ruleId: text('rule_id'),                 // if triggered by rule
  ruleName: text('rule_name'),
  
  // Event data (JSON)
  payload: text('payload').notNull(),      // JSON stringified event data
  
  // Performance data
  durationMs: integer('duration_ms'),     // execution duration in ms
  success: integer('success', { mode: 'boolean' }).default(true),
  error: text('error'),                    // error message
  
  // Timestamp
  timestamp: integer('timestamp').notNull(), // ms since epoch
  
  // Version tracking
  version: text('version'),               // V157
});

// Type exports
export type EvolutionEvent = typeof evolutionEvents.$inferSelect;
export type NewEvolutionEvent = typeof evolutionEvents.$inferInsert;