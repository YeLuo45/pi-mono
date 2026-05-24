/**
 * V146: Extended Drizzle Schema for SQLite with Change Tracking
 * 
 * Extends existing schema with:
 * - change_id, last_modified, device_id columns on all tables
 * - sync_log table for delta sync
 */

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// ============================================================================
// Core tables with sync columns (change_id, last_modified, device_id)
// ============================================================================

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  role: text('role'),
  content: text('content'),
  personaId: text('persona_id'),
  timestamp: integer('timestamp'),
  attachments: text('attachments'), // JSON string
  
  // V146: Sync columns
  change_id: text('change_id'),
  last_modified: integer('last_modified'),
  device_id: text('device_id'),
});

export const memories = sqliteTable('memories', {
  id: text('id').primaryKey(),
  type: text('type'),
  content: text('content'),
  importance: integer('importance'),
  personaId: text('persona_id'),
  createdAt: integer('created_at'),
  expiresAt: integer('expires_at'),
  tags: text('tags'), // JSON string
  
  // V146: Sync columns
  change_id: text('change_id'),
  last_modified: integer('last_modified'),
  device_id: text('device_id'),
});

export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(),
  key: text('key').unique(),
  value: text('value'), // JSON string for complex values
  
  // V146: Sync columns
  change_id: text('change_id'),
  last_modified: integer('last_modified'),
  device_id: text('device_id'),
});

export const personas = sqliteTable('personas', {
  id: text('id').primaryKey(),
  name: text('name'),
  description: text('description'),
  avatar: text('avatar'),
  personality: text('personality'), // JSON string
  skills: text('skills'), // JSON string array
  
  // V146: Sync columns
  change_id: text('change_id'),
  last_modified: integer('last_modified'),
  device_id: text('device_id'),
});

export const skills = sqliteTable('skills', {
  id: text('id').primaryKey(),
  name: text('name'),
  description: text('description'),
  code: text('code'),
  enabled: integer('enabled', { mode: 'boolean' }).default(true),
  config: text('config'), // JSON string
  
  // V146: Sync columns
  change_id: text('change_id'),
  last_modified: integer('last_modified'),
  device_id: text('device_id'),
});

// ============================================================================
// Sync log table for delta sync
// ============================================================================

export const syncLog = sqliteTable('sync_log', {
  id: text('id').primaryKey(),
  table_name: text('table_name').notNull(),
  row_id: text('row_id').notNull(),
  operation: text('operation').notNull(), // 'INSERT' | 'UPDATE' | 'DELETE'
  timestamp: integer('timestamp').notNull(),
  device_id: text('device_id').notNull(),
  change_data: text('change_data'), // JSON serialized
});

// ============================================================================
// Type exports
// ============================================================================

export type Message = typeof messages.$inferSelect;
export type Memory = typeof memories.$inferSelect;
export type Setting = typeof settings.$inferSelect;
export type Persona = typeof personas.$inferSelect;
export type Skill = typeof skills.$inferSelect;
export type SyncLogEntry = typeof syncLog.$inferSelect;

// ============================================================================
// Knowledge Graph tables (V148)
// ============================================================================

export const kgEntities = sqliteTable('kg_entities', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  name: text('name').notNull(),
  properties: text('properties'), // JSON string
  persona_id: text('persona_id'), // null = shared across personas
  created_at: integer('created_at').notNull(),
  updated_at: integer('updated_at').notNull(),
  change_id: text('change_id'),
  last_modified: integer('last_modified'),
  device_id: text('device_id'),
});

export const kgRelations = sqliteTable('kg_relations', {
  id: text('id').primaryKey(),
  source_id: text('source_id').notNull(),
  target_id: text('target_id').notNull(),
  relation_type: text('relation_type').notNull(),
  properties: text('properties'), // JSON string
  persona_id: text('persona_id'), // null = shared across personas
  created_at: integer('created_at').notNull(),
  change_id: text('change_id'),
  last_modified: integer('last_modified'),
  device_id: text('device_id'),
});

// Type exports
export type KGEntityRow = typeof kgEntities.$inferSelect;
export type KGRelationRow = typeof kgRelations.$inferSelect;

// ============================================================================
// Hook system tables (V149)
// ============================================================================

export const hooks = sqliteTable('hooks', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  priority: integer('priority').notNull().default(0),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  metadata: text('metadata'), // JSON string
  source: text('source'), // Plugin ID or component name
  created_at: integer('created_at').notNull(),
  updated_at: integer('updated_at').notNull(),
});

// Type exports
export type HookRow = typeof hooks.$inferSelect;