/**
 * UserIdentityResolver
 * V101: Cross-channel identity mapping with IndexedDB persistence
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { Channel } from './types';

const DB_NAME = 'pixel-pal-db';
const DB_VERSION = 2;
const STORE_NAME = 'user-identities';

export interface UserIdentity {
  userId: string;
  channelIdentities: {
    [key in Channel]?: string;
  };
  createdAt: number;
  lastSeen: number;
}

interface UserIdentityDB {
  'user-identities': {
    key: string;
    value: UserIdentity;
    indexes: {
      'by-lastSeen': number;
    };
  };
}

class UserIdentityResolver {
  private db: IDBPDatabase<UserIdentityDB> | null = null;
  private initPromise: Promise<IDBPDatabase<UserIdentityDB>> | null = null;

  private async ensureDB(): Promise<IDBPDatabase<UserIdentityDB>> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = openDB<UserIdentityDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'userId' });
          store.createIndex('by-lastSeen', 'lastSeen');
        }
      },
    });
    this.db = await this.initPromise;
    return this.db;
  }

  /**
   * Link a channel identity to an existing userId (after login/registration)
   */
  async link(userId: string, channel: Channel, channelUserId: string): Promise<void> {
    const db = await this.ensureDB();
    const identity = await db.get(STORE_NAME, userId);
    if (identity) {
      identity.channelIdentities[channel] = channelUserId;
      identity.lastSeen = Date.now();
      await db.put(STORE_NAME, identity);
    } else {
      await db.put(STORE_NAME, {
        userId,
        channelIdentities: { [channel]: channelUserId },
        createdAt: Date.now(),
        lastSeen: Date.now(),
      });
    }
  }

  /**
   * Look up userId by channel identity
   */
  async resolve(channel: Channel, channelUserId: string): Promise<string | null> {
    const db = await this.ensureDB();
    const allIdentities = await db.getAll(STORE_NAME);
    for (const identity of allIdentities) {
      if (identity.channelIdentities[channel] === channelUserId) {
        // Update lastSeen
        identity.lastSeen = Date.now();
        await db.put(STORE_NAME, identity);
        return identity.userId;
      }
    }
    return null;
  }

  /**
   * Auto-create userId for anonymous/unknown users
   */
  async autoCreate(channel: Channel, channelUserId: string): Promise<string> {
    const db = await this.ensureDB();
    // Check if this channelUserId is already linked
    const existing = await this.resolve(channel, channelUserId);
    if (existing) return existing;

    // Create new userId
    const userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    await db.put(STORE_NAME, {
      userId,
      channelIdentities: { [channel]: channelUserId },
      createdAt: Date.now(),
      lastSeen: Date.now(),
    });
    return userId;
  }

  /**
   * Get all channel identities for a userId
   */
  async getIdentities(userId: string): Promise<UserIdentity | undefined> {
    const db = await this.ensureDB();
    return db.get(STORE_NAME, userId);
  }
}

export const userIdentityResolver = new UserIdentityResolver();