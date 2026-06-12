/**
 * V146 Tests: localStorage Migrator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { hasUnmigratedData, isMigrationComplete, markMigrationComplete } from '../../../src/db/migration';

describe('localStorageMigrator', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.removeItem('pixelpal_messages');
    localStorage.removeItem('pixelpal_memories');
    localStorage.removeItem('pixelpal_settings');
    localStorage.removeItem('pixelpal_personas');
    localStorage.removeItem('pixelpal_skills');
    localStorage.removeItem('pixelpal_migration_complete');
    localStorage.removeItem('pixelpal_migration_date');
  });

  describe('hasUnmigratedData', () => {
    it('returns false when no localStorage data exists', () => {
      expect(hasUnmigratedData()).toBe(false);
    });

    it('returns true when messages exist in localStorage', () => {
      localStorage.setItem('pixelpal_messages', JSON.stringify([]));
      expect(hasUnmigratedData()).toBe(true);
    });

    it('returns true when settings exist in localStorage', () => {
      localStorage.setItem('pixelpal_settings', JSON.stringify([]));
      expect(hasUnmigratedData()).toBe(true);
    });
  });

  describe('isMigrationComplete', () => {
    it('returns false when migration has not been completed', () => {
      expect(isMigrationComplete()).toBe(false);
    });

    it('returns true when migration has been completed', () => {
      markMigrationComplete();
      expect(isMigrationComplete()).toBe(true);
    });
  });

  describe('markMigrationComplete', () => {
    it('sets migration_complete flag in localStorage', () => {
      markMigrationComplete();
      expect(localStorage.getItem('pixelpal_migration_complete')).toBe('true');
    });

    it('sets migration_date in localStorage', () => {
      markMigrationComplete();
      expect(localStorage.getItem('pixelpal_migration_date')).not.toBeNull();
    });
  });
});