/**
 * V146: Sync Log for Delta Sync
 * 
 * Change log interface and functions for tracking row changes.
 * Used by delta sync to determine what changed since last sync.
 */

import type { Database } from 'wa-sqlite';
import { getDatabase, getDeviceId, generateChangeId, now } from './index';

export interface ChangeLogEntry {
  id: string;
  tableName: string;
  rowId: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  timestamp: number;
  deviceId: string;
  changeData: string; // JSON serialized
}

/**
 * Add a change log entry for a row operation
 */
export function addChangeLogEntry(
  table: string,
  rowId: string,
  operation: 'INSERT' | 'UPDATE' | 'DELETE',
  data: unknown
): void {
  const db = getDatabase();
  if (!db) return;

  const entry: ChangeLogEntry = {
    id: generateChangeId(),
    tableName: table,
    rowId: rowId,
    operation: operation,
    timestamp: now(),
    deviceId: getDeviceId(),
    changeData: JSON.stringify(data),
  };

  const SQL = db.getSQL();
  SQL`
    INSERT INTO sync_log (id, table_name, row_id, operation, timestamp, device_id, change_data)
    VALUES ${entry.id, entry.tableName, entry.rowId, entry.operation, entry.timestamp, entry.deviceId, entry.changeData}
  `;
}

/**
 * Get all change log entries since the given timestamp
 */
export function getChangesSince(since: number, table?: string): ChangeLogEntry[] {
  const db = getDatabase();
  if (!db) return [];

  let results: ChangeLogEntry[] = [];

  if (table) {
    const SQL = db.getSQL();
    const stmt = SQL`SELECT * FROM sync_log WHERE timestamp > ${since} AND table_name = ${table} ORDER BY timestamp ASC`;
    const rows = stmt.toArray() as ChangeLogEntry[];
    results = rows;
  } else {
    const SQL = db.getSQL();
    const stmt = SQL`SELECT * FROM sync_log WHERE timestamp > ${since} ORDER BY timestamp ASC`;
    const rows = stmt.toArray() as ChangeLogEntry[];
    results = rows;
  }

  return results;
}

/**
 * Prune old sync log entries before the given timestamp
 * @returns number of entries deleted
 */
export function pruneOldEntries(before: number): number {
  const db = getDatabase();
  if (!db) return 0;

  const SQL = db.getSQL();
  
  // First get count
  const countStmt = SQL`SELECT COUNT(*) as count FROM sync_log WHERE timestamp < ${before}`;
  const countResult = countStmt.toArray() as { count: number }[];
  const count = countResult[0]?.count || 0;

  // Delete old entries
  SQL`DELETE FROM sync_log WHERE timestamp < ${before}`;

  return count;
}