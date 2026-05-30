/**
 * ToolVersion Tests
 * V165: Tests for version management
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  registerToolVersion,
  getToolVersions,
  getLatestVersion,
  deprecateTool,
  getDeprecatedTools,
  isToolDeprecated,
  clearAllVersions,
  ToolVersion,
} from '../ToolVersion'

describe('ToolVersion', () => {
  beforeEach(() => {
    clearAllVersions()
  })

  afterEach(() => {
    clearAllVersions()
  })

  describe('registerToolVersion', () => {
    it('should register a new version for a tool', () => {
      const version: ToolVersion = {
        version: '1.0.0',
        changelog: 'Initial release',
        deprecated: false,
        releasedAt: '2025-01-01T00:00:00Z',
      }

      registerToolVersion('test-tool', version)
      const versions = getToolVersions('test-tool')

      expect(versions).toHaveLength(1)
      expect(versions[0].version).toBe('1.0.0')
    })

    it('should register multiple versions for a tool', () => {
      const v1: ToolVersion = {
        version: '1.0.0',
        changelog: 'Initial',
        deprecated: false,
        releasedAt: '2025-01-01T00:00:00Z',
      }
      const v2: ToolVersion = {
        version: '2.0.0',
        changelog: 'Major update',
        deprecated: false,
        releasedAt: '2025-02-01T00:00:00Z',
      }

      registerToolVersion('test-tool', v1)
      registerToolVersion('test-tool', v2)
      const versions = getToolVersions('test-tool')

      expect(versions).toHaveLength(2)
    })

    it('should update existing version if same version registered', () => {
      const v1: ToolVersion = {
        version: '1.0.0',
        changelog: 'Initial release',
        deprecated: false,
        releasedAt: '2025-01-01T00:00:00Z',
      }
      const v1Updated: ToolVersion = {
        version: '1.0.0',
        changelog: 'Updated changelog',
        deprecated: true,
        releasedAt: '2025-01-15T00:00:00Z',
      }

      registerToolVersion('test-tool', v1)
      registerToolVersion('test-tool', v1Updated)
      const versions = getToolVersions('test-tool')

      expect(versions).toHaveLength(1)
      expect(versions[0].changelog).toBe('Updated changelog')
    })

    it('should sort versions by release date (newest first)', () => {
      const v1: ToolVersion = {
        version: '1.0.0',
        changelog: 'First',
        deprecated: false,
        releasedAt: '2025-01-01T00:00:00Z',
      }
      const v2: ToolVersion = {
        version: '2.0.0',
        changelog: 'Second',
        deprecated: false,
        releasedAt: '2025-03-01T00:00:00Z',
      }
      const v3: ToolVersion = {
        version: '1.5.0',
        changelog: 'Third',
        deprecated: false,
        releasedAt: '2025-02-01T00:00:00Z',
      }

      registerToolVersion('test-tool', v1)
      registerToolVersion('test-tool', v2)
      registerToolVersion('test-tool', v3)
      const versions = getToolVersions('test-tool')

      expect(versions[0].version).toBe('2.0.0')
      expect(versions[1].version).toBe('1.5.0')
      expect(versions[2].version).toBe('1.0.0')
    })

    it('should handle multiple tools independently', () => {
      const v1: ToolVersion = {
        version: '1.0.0',
        changelog: 'Tool A',
        deprecated: false,
        releasedAt: '2025-01-01T00:00:00Z',
      }
      const v2: ToolVersion = {
        version: '1.0.0',
        changelog: 'Tool B',
        deprecated: false,
        releasedAt: '2025-01-01T00:00:00Z',
      }

      registerToolVersion('tool-a', v1)
      registerToolVersion('tool-b', v2)

      expect(getToolVersions('tool-a')).toHaveLength(1)
      expect(getToolVersions('tool-b')).toHaveLength(1)
    })
  })

  describe('getToolVersions', () => {
    it('should return empty array for non-existent tool', () => {
      const versions = getToolVersions('non-existent')
      expect(versions).toHaveLength(0)
    })

    it('should return all versions for a tool', () => {
      const versions: ToolVersion[] = [
        { version: '1.0.0', changelog: 'v1', deprecated: false, releasedAt: '2025-01-01T00:00:00Z' },
        { version: '2.0.0', changelog: 'v2', deprecated: false, releasedAt: '2025-02-01T00:00:00Z' },
        { version: '3.0.0', changelog: 'v3', deprecated: false, releasedAt: '2025-03-01T00:00:00Z' },
      ]

      for (const v of versions) {
        registerToolVersion('multi-version-tool', v)
      }

      const result = getToolVersions('multi-version-tool')
      expect(result).toHaveLength(3)
    })
  })

  describe('getLatestVersion', () => {
    it('should return undefined for non-existent tool', () => {
      const latest = getLatestVersion('non-existent')
      expect(latest).toBeUndefined()
    })

    it('should return the most recent version', () => {
      const v1: ToolVersion = {
        version: '1.0.0',
        changelog: 'Old',
        deprecated: false,
        releasedAt: '2025-01-01T00:00:00Z',
      }
      const v2: ToolVersion = {
        version: '2.0.0',
        changelog: 'New',
        deprecated: false,
        releasedAt: '2025-12-31T00:00:00Z',
      }

      registerToolVersion('latest-tool', v1)
      registerToolVersion('latest-tool', v2)
      const latest = getLatestVersion('latest-tool')

      expect(latest?.version).toBe('2.0.0')
    })

    it('should return single version if only one exists', () => {
      const v1: ToolVersion = {
        version: '1.0.0',
        changelog: 'Only',
        deprecated: false,
        releasedAt: '2025-01-01T00:00:00Z',
      }

      registerToolVersion('single-tool', v1)
      const latest = getLatestVersion('single-tool')

      expect(latest?.version).toBe('1.0.0')
    })
  })

  describe('deprecateTool', () => {
    it('should mark a tool as deprecated', () => {
      const v1: ToolVersion = {
        version: '1.0.0',
        changelog: 'Initial',
        deprecated: false,
        releasedAt: '2025-01-01T00:00:00Z',
      }

      registerToolVersion('deprecated-tool', v1)
      deprecateTool('deprecated-tool', '1.0.0')

      expect(isToolDeprecated('deprecated-tool')).toBe(true)
    })

    it('should mark specific version as deprecated in version list', () => {
      const v1: ToolVersion = {
        version: '1.0.0',
        changelog: 'Old version',
        deprecated: false,
        releasedAt: '2025-01-01T00:00:00Z',
      }
      const v2: ToolVersion = {
        version: '2.0.0',
        changelog: 'Current version',
        deprecated: false,
        releasedAt: '2025-06-01T00:00:00Z',
      }

      registerToolVersion('specific-deprec', v1)
      registerToolVersion('specific-deprec', v2)
      deprecateTool('specific-deprec', '1.0.0')

      const versions = getToolVersions('specific-deprec')
      const oldVersion = versions.find(v => v.version === '1.0.0')
      expect(oldVersion?.deprecated).toBe(true)
      
      const newVersion = versions.find(v => v.version === '2.0.0')
      expect(newVersion?.deprecated).toBe(false)
    })

    it('should add tool to deprecated tools list', () => {
      const v1: ToolVersion = {
        version: '1.0.0',
        changelog: 'Test',
        deprecated: false,
        releasedAt: '2025-01-01T00:00:00Z',
      }

      registerToolVersion('will-deprec', v1)
      deprecateTool('will-deprec', '1.0.0')

      const deprecated = getDeprecatedTools()
      expect(deprecated).toContain('will-deprec')
    })

    it('should silently handle deprecating non-existent version', () => {
      const v1: ToolVersion = {
        version: '1.0.0',
        changelog: 'Test',
        deprecated: false,
        releasedAt: '2025-01-01T00:00:00Z',
      }

      registerToolVersion('tool', v1)
      // Should not throw
      deprecateTool('tool', '99.0.0')
      
      expect(isToolDeprecated('tool')).toBe(true)
    })
  })

  describe('getDeprecatedTools', () => {
    it('should return empty array when no tools deprecated', () => {
      const deprecated = getDeprecatedTools()
      expect(deprecated).toHaveLength(0)
    })

    it('should return all deprecated tools', () => {
      const v1: ToolVersion = { version: '1.0.0', changelog: 'A', deprecated: false, releasedAt: '2025-01-01T00:00:00Z' }
      const v2: ToolVersion = { version: '1.0.0', changelog: 'B', deprecated: false, releasedAt: '2025-01-01T00:00:00Z' }

      registerToolVersion('dep-a', v1)
      registerToolVersion('dep-b', v2)
      deprecateTool('dep-a', '1.0.0')
      deprecateTool('dep-b', '1.0.0')

      const deprecated = getDeprecatedTools()
      expect(deprecated).toContain('dep-a')
      expect(deprecated).toContain('dep-b')
    })
  })

  describe('isToolDeprecated', () => {
    it('should return false for non-deprecated tool', () => {
      const v1: ToolVersion = {
        version: '1.0.0',
        changelog: 'Test',
        deprecated: false,
        releasedAt: '2025-01-01T00:00:00Z',
      }

      registerToolVersion('not-deprecated', v1)
      expect(isToolDeprecated('not-deprecated')).toBe(false)
    })

    it('should return false for non-existent tool', () => {
      expect(isToolDeprecated('never-existed')).toBe(false)
    })
  })

  describe('clearAllVersions', () => {
    it('should clear all version data', () => {
      const v1: ToolVersion = { version: '1.0.0', changelog: 'A', deprecated: false, releasedAt: '2025-01-01T00:00:00Z' }
      const v2: ToolVersion = { version: '1.0.0', changelog: 'B', deprecated: false, releasedAt: '2025-01-01T00:00:00Z' }

      registerToolVersion('tool1', v1)
      registerToolVersion('tool2', v2)
      deprecateTool('tool1', '1.0.0')

      clearAllVersions()

      expect(getToolVersions('tool1')).toHaveLength(0)
      expect(getToolVersions('tool2')).toHaveLength(0)
      expect(getDeprecatedTools()).toHaveLength(0)
    })
  })
})