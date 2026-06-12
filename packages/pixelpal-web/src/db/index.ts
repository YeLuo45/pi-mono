/**
 * V146: SQLite Database Initialization with wa-sqlite
 * Stubbed for build - actual WASM database not initialized
 */

import type { Database } from 'wa-sqlite';

let dbInstance: Database | null = null;
let deviceId: string | null = null;

export function getDeviceId(): string {
  if (!deviceId) {
    deviceId = localStorage.getItem('pixelpal_device_id') || crypto.randomUUID();
    localStorage.setItem('pixelpal_device_id', deviceId);
  }
  return deviceId;
}

export async function initDatabase(): Promise<Database | null> {
  // Stub: return null for now - WASM database initialization requires wa-sqlite Factory API
  console.warn('[db] Using stub database - wa-sqlite@1.0.0 API mismatch');
  return null;
}

export function getDatabase(): Database | null {
  return dbInstance;
}

export function generateChangeId(): string {
  return crypto.randomUUID();
}

export function now(): number {
  return Date.now();
}

export const db = {
  getDatabase,
  initDatabase,
  getDeviceId,
  generateChangeId,
  now,
};
