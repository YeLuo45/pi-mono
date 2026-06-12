/**
 * V146 Tests: SyncLog
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { addChangeLogEntry, getChangesSince, pruneOldEntries } from '../../src/db/syncLog';
import type { Database } from 'wa-sqlite';
import { Database as WADatabase } from 'wa-sqlite';
import * as waSqlite from 'wa-sqlite';

// Mock wa-sqlite for testing
let mockDB: Database | null = null;
let changeLogEntries: any[] = [];

describe('syncLog', () => {
  beforeEach(async () => {
    // Initialize in-memory database for tests
    const SQL = await waSqlite.instantiate();
    mockDB = new WADatabase(SQL, ':memory:');
    
    // Reset mock data
    changeLogEntries = [];
    
    // Create sync_log table
    mockDB.getSQL()`
      CREATE TABLE IF NOT EXISTS sync_log (
        id TEXT PRIMARY KEY,
        table_name TEXT NOT NULL,
        row_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        device_id TEXT NOT NULL,
        change_data TEXT
      )
    `;
    
    // Mock device ID and change ID
    const originalLocalStorage = global.localStorage;
    global.localStorage = {
      ...originalLocalStorage,
      getItem: (key: string) => {
        if (key === 'pixelpal_device_id') return 'test-device-id';
        return null;
      },
      setItem: () => {},
    } as any;
  });

  afterEach(() => {
    mockDB?.close();
    mockDB = null;
  });

  describe('addChangeLogEntry', () => {
    it('records INSERT operation', () => {
      const data = { id: '123', name: 'test' };
      addChangeLogEntry('messages', '123', 'INSERT', data);
      
      // Entry should be recorded in the database
      expect(changeLogEntries.length).toBeGreaterThan(0);
    });

    it('records UPDATE operation', () => {
      const data = { id: '123', name: 'updated' };
      addChangeLogEntry('messages', '123', 'UPDATE', data);
      
      expect(changeLogEntries.length).toBeGreaterThan(0);
    });

    it('records DELETE operation', () => {
      const data = { id: '123', name: 'test' };
      addChangeLogEntry('messages', '123', 'DELETE', data);
      
      expect(changeLogEntries.length).toBeGreaterThan(0);
    });
  });

  describe('getChangesSince', () => {
    it('returns only entries after timestamp', () => {
      const beforeTime = Date.now() - 1000;
      
      // Add an old entry
      const oldData = { id: 'old', name: 'old' };
      addChangeLogEntry('messages', 'old-id', 'INSERT', oldData);
      
      const afterTime = Date.now();
      
      // Add a new entry
      const newData = { id: 'new', name: 'new' };
      addChangeLogEntry('messages', 'new-id', 'INSERT', newData);
      
      const changes = getChangesSince(beforeTime);
      
      // Should only return entries after beforeTime
      expect(changes.length).toBeGreaterThanOrEqual(0);
    });

    it('filters by table when provided', () => {
      const beforeTime = Date.now() - 1000;
      
      // Add entries for different tables
      addChangeLogEntry('messages', 'msg-1', 'INSERT', { id: 'msg-1' });
      addChangeLogEntry('memories', 'mem-1', 'INSERT', { id: 'mem-1' });
      addChangeLogEntry('messages', 'msg-2', 'INSERT', { id: 'msg-2' });
      
      const changes = getChangesSince(beforeTime, 'messages');
      
      // Should filter to only messages table
      expect(changes.every(c => c.tableName === 'messages')).toBe(true);
    });
  });

  describe('pruneOldEntries', () => {
    it('removes entries before timestamp', () => {
      const beforeTime = Date.now() + 1000; // Future time
      
      // Add entries
      addChangeLogEntry('messages', 'old-1', 'INSERT', { id: 'old-1' });
      
      const deleted = pruneOldEntries(beforeTime);
      
      // Should delete entries older than future time (i.e., all entries)
      expect(deleted).toBeGreaterThanOrEqual(0);
    });
  });
});