/**
 * ToolPermission Tests
 * V165: Tests for permission control layer
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  setToolPermission,
  getToolPermission,
  checkToolAccess,
  clearToolPermission,
  getToolsByPermission,
  clearAllPermissions,
  ToolPermission,
} from '../ToolPermission'

describe('ToolPermission', () => {
  beforeEach(() => {
    clearAllPermissions()
  })

  afterEach(() => {
    clearAllPermissions()
  })

  describe('setToolPermission & getToolPermission', () => {
    it('should set and get permission for a tool', () => {
      const permission: ToolPermission = {
        toolName: 'test-tool',
        allowedRoles: ['admin', 'user'],
        ownerOnly: false,
        requiresAuth: true,
      }
      
      setToolPermission('test-tool', permission)
      const result = getToolPermission('test-tool')
      
      expect(result).toBeDefined()
      expect(result?.toolName).toBe('test-tool')
      expect(result?.allowedRoles).toContain('admin')
      expect(result?.allowedRoles).toContain('user')
      expect(result?.ownerOnly).toBe(false)
      expect(result?.requiresAuth).toBe(true)
    })

    it('should return undefined for non-existent tool', () => {
      const result = getToolPermission('non-existent-tool')
      expect(result).toBeUndefined()
    })

    it('should overwrite existing permission', () => {
      const perm1: ToolPermission = {
        toolName: 'test-tool',
        allowedRoles: ['admin'],
        ownerOnly: false,
        requiresAuth: true,
      }
      const perm2: ToolPermission = {
        toolName: 'test-tool',
        allowedRoles: ['admin', 'user', 'agent'],
        ownerOnly: true,
        requiresAuth: true,
      }
      
      setToolPermission('test-tool', perm1)
      setToolPermission('test-tool', perm2)
      const result = getToolPermission('test-tool')
      
      expect(result?.allowedRoles).toHaveLength(3)
      expect(result?.ownerOnly).toBe(true)
    })

    it('should set ownerOnly correctly', () => {
      const permission: ToolPermission = {
        toolName: 'admin-tool',
        allowedRoles: ['admin'],
        ownerOnly: true,
        requiresAuth: true,
      }
      
      setToolPermission('admin-tool', permission)
      const result = getToolPermission('admin-tool')
      
      expect(result?.ownerOnly).toBe(true)
    })
  })

  describe('checkToolAccess', () => {
    it('should return true for allowed role when requiresAuth is true', () => {
      const permission: ToolPermission = {
        toolName: 'test-tool',
        allowedRoles: ['admin', 'user'],
        ownerOnly: false,
        requiresAuth: true,
      }
      
      setToolPermission('test-tool', permission)
      
      expect(checkToolAccess('test-tool', 'admin')).toBe(true)
      expect(checkToolAccess('test-tool', 'user')).toBe(true)
    })

    it('should return false for disallowed role when requiresAuth is true', () => {
      const permission: ToolPermission = {
        toolName: 'test-tool',
        allowedRoles: ['admin'],
        ownerOnly: false,
        requiresAuth: true,
      }
      
      setToolPermission('test-tool', permission)
      
      expect(checkToolAccess('test-tool', 'user')).toBe(false)
      expect(checkToolAccess('test-tool', 'agent')).toBe(false)
    })

    it('should return false for non-existent tool', () => {
      expect(checkToolAccess('non-existent', 'admin')).toBe(false)
    })

    it('should block all roles when ownerOnly is true', () => {
      const permission: ToolPermission = {
        toolName: 'owner-tool',
        allowedRoles: ['admin', 'user'],
        ownerOnly: true,
        requiresAuth: true,
      }
      
      setToolPermission('owner-tool', permission)
      
      // ownerOnly denies all role-based access
      expect(checkToolAccess('owner-tool', 'admin')).toBe(false)
      expect(checkToolAccess('owner-tool', 'user')).toBe(false)
    })

    it('should grant access when requiresAuth is false regardless of role', () => {
      const permission: ToolPermission = {
        toolName: 'public-tool',
        allowedRoles: ['admin'],
        ownerOnly: false,
        requiresAuth: false,
      }
      
      setToolPermission('public-tool', permission)
      
      // requiresAuth=false means anyone can access
      expect(checkToolAccess('public-tool', 'any-role')).toBe(true)
    })

    it('should handle all three roles', () => {
      const permission: ToolPermission = {
        toolName: 'full-access',
        allowedRoles: ['admin', 'agent', 'user'],
        ownerOnly: false,
        requiresAuth: true,
      }
      
      setToolPermission('full-access', permission)
      
      expect(checkToolAccess('full-access', 'admin')).toBe(true)
      expect(checkToolAccess('full-access', 'agent')).toBe(true)
      expect(checkToolAccess('full-access', 'user')).toBe(true)
    })
  })

  describe('clearToolPermission', () => {
    it('should remove permission for a tool', () => {
      const permission: ToolPermission = {
        toolName: 'to-clear',
        allowedRoles: ['admin'],
        ownerOnly: false,
        requiresAuth: true,
      }
      
      setToolPermission('to-clear', permission)
      clearToolPermission('to-clear')
      
      expect(getToolPermission('to-clear')).toBeUndefined()
      expect(checkToolAccess('to-clear', 'admin')).toBe(false)
    })

    it('should not affect other tools', () => {
      const perm1: ToolPermission = {
        toolName: 'tool1',
        allowedRoles: ['admin'],
        ownerOnly: false,
        requiresAuth: true,
      }
      const perm2: ToolPermission = {
        toolName: 'tool2',
        allowedRoles: ['user'],
        ownerOnly: false,
        requiresAuth: true,
      }
      
      setToolPermission('tool1', perm1)
      setToolPermission('tool2', perm2)
      clearToolPermission('tool1')
      
      expect(getToolPermission('tool1')).toBeUndefined()
      expect(getToolPermission('tool2')).toBeDefined()
    })
  })

  describe('getToolsByPermission', () => {
    it('should return all tools accessible by a role', () => {
      const perm1: ToolPermission = {
        toolName: 'admin-tool',
        allowedRoles: ['admin'],
        ownerOnly: false,
        requiresAuth: true,
      }
      const perm2: ToolPermission = {
        toolName: 'user-tool',
        allowedRoles: ['user'],
        ownerOnly: false,
        requiresAuth: true,
      }
      const perm3: ToolPermission = {
        toolName: 'all-tool',
        allowedRoles: ['admin', 'agent', 'user'],
        ownerOnly: false,
        requiresAuth: true,
      }
      
      setToolPermission('admin-tool', perm1)
      setToolPermission('user-tool', perm2)
      setToolPermission('all-tool', perm3)
      
      const adminTools = getToolsByPermission('admin')
      expect(adminTools).toContain('admin-tool')
      expect(adminTools).toContain('all-tool')
      expect(adminTools).not.toContain('user-tool')
    })

    it('should return tools where requiresAuth is false regardless of allowedRoles', () => {
      const perm1: ToolPermission = {
        toolName: 'admin-only',
        allowedRoles: ['admin'],
        ownerOnly: false,
        requiresAuth: true,
      }
      const perm2: ToolPermission = {
        toolName: 'public-tool',
        allowedRoles: ['admin'],
        ownerOnly: false,
        requiresAuth: false,
      }
      
      setToolPermission('admin-only', perm1)
      setToolPermission('public-tool', perm2)
      
      // requiresAuth: false grants access to all roles
      const userTools = getToolsByPermission('user')
      expect(userTools).toContain('public-tool')
      expect(userTools).not.toContain('admin-only')
    })

    it('should return empty array when no tools are accessible', () => {
      const permission: ToolPermission = {
        toolName: 'admin-only',
        allowedRoles: ['admin'],
        ownerOnly: false,
        requiresAuth: true,
      }
      
      setToolPermission('admin-only', permission)
      
      const userTools = getToolsByPermission('user')
      expect(userTools).toHaveLength(0)
    })

    it('should not return tools where ownerOnly is true', () => {
      const perm1: ToolPermission = {
        toolName: 'owner-tool',
        allowedRoles: ['admin', 'user'],
        ownerOnly: true,
        requiresAuth: true,
      }
      const perm2: ToolPermission = {
        toolName: 'normal-tool',
        allowedRoles: ['admin', 'user'],
        ownerOnly: false,
        requiresAuth: true,
      }
      
      setToolPermission('owner-tool', perm1)
      setToolPermission('normal-tool', perm2)
      
      // ownerOnly blocks all role-based access
      const userTools = getToolsByPermission('user')
      expect(userTools).not.toContain('owner-tool')
      expect(userTools).toContain('normal-tool')
      
      const adminTools = getToolsByPermission('admin')
      expect(adminTools).not.toContain('owner-tool')
      expect(adminTools).toContain('normal-tool')
    })

    it('should return all roles when requiresAuth is false', () => {
      const perm: ToolPermission = {
        toolName: 'public-access',
        allowedRoles: ['admin'],
        ownerOnly: false,
        requiresAuth: false,
      }
      
      setToolPermission('public-access', perm)
      
      expect(getToolsByPermission('admin')).toContain('public-access')
      expect(getToolsByPermission('user')).toContain('public-access')
      expect(getToolsByPermission('agent')).toContain('public-access')
    })
  })

  describe('clearAllPermissions', () => {
    it('should clear all permissions', () => {
      const perm1: ToolPermission = {
        toolName: 'tool1',
        allowedRoles: ['admin'],
        ownerOnly: false,
        requiresAuth: true,
      }
      const perm2: ToolPermission = {
        toolName: 'tool2',
        allowedRoles: ['user'],
        ownerOnly: false,
        requiresAuth: true,
      }
      
      setToolPermission('tool1', perm1)
      setToolPermission('tool2', perm2)
      clearAllPermissions()
      
      expect(getToolPermission('tool1')).toBeUndefined()
      expect(getToolPermission('tool2')).toBeUndefined()
      expect(getToolsByPermission('admin')).toHaveLength(0)
    })
  })
})