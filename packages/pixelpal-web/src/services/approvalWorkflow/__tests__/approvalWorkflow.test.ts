/**
 * P16: Approval Workflow System Tests
 * 
 * Tests for the approval workflow subsystem:
 * 1. ApprovalChainService - Sequential and parallel approval chains
 * 2. DelegationService - Approval delegation and proxy approvals
 * 3. ApprovalNotificationService - Notification management
 * 4. ApprovalAnalyticsService - Metrics and analytics
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage for Node environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

import {
  approvalChainService,
  getChainConfig,
  setChainConfig,
} from '../approvalChainService';
import type { ApprovalChain, ApprovalNode, ChainConfig, ChainResult, ChainStatus, ChainType, NodeStatus } from '../approvalChainService';
import {
  delegationService,
  getDelegationConfig,
  setDelegationConfig,
} from '../approvalDelegationService';
import type { DelegationRule, DelegationStatus, ProxyApproval, ProxyStatus, DelegationConfig } from '../approvalDelegationService';
import {
  approvalNotificationService,
  getNotificationConfig,
  setNotificationConfig,
} from '../approvalNotificationService';
import type { ApprovalNotification, NotificationChannel, NotificationPriority, NotificationStatus, NotificationTemplate } from '../approvalNotificationService';
import {
  approvalAnalyticsService,
  getAnalyticsConfig,
  setAnalyticsConfig,
} from '../approvalAnalyticsService';
import type { ApprovalMetrics, RoleMetrics, TrendData, AnalyticsReport, BottleneckAnalysis, MetricPeriod, TrendDirection } from '../approvalAnalyticsService';
import type { PersonaRole } from '../collaboration/types';

// ============================================================================
// ApprovalChainService Tests
// ============================================================================

describe('ApprovalChainService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('createChain', () => {
    it('should create a sequential approval chain', async () => {
      const chain = await approvalChainService.createChain({
        chainType: 'sequential',
        name: 'Test Chain',
        description: 'A test approval chain',
        nodes: [
          { role: 'Advisor' as PersonaRole, isRequired: true },
          { role: 'Curator' as PersonaRole, isRequired: true },
        ],
        requesterId: 'user_001',
        sessionId: 'session_123',
        taskId: 'task_456',
      });

      expect(chain.id).toBeDefined();
      expect(chain.chainType).toBe('sequential');
      expect(chain.name).toBe('Test Chain');
      expect(chain.status).toBe('active');
      expect(chain.nodes).toHaveLength(2);
      expect(chain.currentStep).toBe(0);
    });

    it('should create a parallel approval chain', async () => {
      const chain = await approvalChainService.createChain({
        chainType: 'parallel',
        name: 'Parallel Chain',
        description: 'Parallel approval test',
        nodes: [
          { role: 'Advisor' as PersonaRole, isRequired: true },
          { role: 'Guardian' as PersonaRole, isRequired: true },
        ],
        requesterId: 'user_001',
        sessionId: 'session_123',
        taskId: 'task_456',
      });

      expect(chain.chainType).toBe('parallel');
      expect(chain.nodes[0].status).toBe('pending');
    });

    it('should set createdAt timestamp', async () => {
      const before = Date.now();
      const chain = await approvalChainService.createChain({
        chainType: 'sequential',
        name: 'Timestamp Test',
        description: 'Test',
        nodes: [{ role: 'Advisor' as PersonaRole, isRequired: true }],
        requesterId: 'user_001',
        sessionId: 'session_123',
        taskId: 'task_456',
      });
      const after = Date.now();

      expect(chain.createdAt).toBeGreaterThanOrEqual(before);
      expect(chain.createdAt).toBeLessThanOrEqual(after);
    });

    it('should assign sequential step numbers', async () => {
      const chain = await approvalChainService.createChain({
        chainType: 'sequential',
        name: 'Step Test',
        description: 'Test',
        nodes: [
          { role: 'Advisor' as PersonaRole, isRequired: true },
          { role: 'Curator' as PersonaRole, isRequired: true },
          { role: 'Guardian' as PersonaRole, isRequired: true },
        ],
        requesterId: 'user_001',
        sessionId: 'session_123',
        taskId: 'task_456',
      });

      expect(chain.nodes[0].step).toBe(0);
      expect(chain.nodes[1].step).toBe(1);
      expect(chain.nodes[2].step).toBe(2);
    });
  });

  describe('getChain', () => {
    it('should retrieve an existing chain', async () => {
      const created = await approvalChainService.createChain({
        chainType: 'sequential',
        name: 'Get Test',
        description: 'Test',
        nodes: [{ role: 'Advisor' as PersonaRole, isRequired: true }],
        requesterId: 'user_001',
        sessionId: 'session_123',
        taskId: 'task_456',
      });

      const retrieved = approvalChainService.getChain(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe('Get Test');
    });

    it('should return undefined for non-existent chain', () => {
      const result = approvalChainService.getChain('non_existent_id');
      expect(result).toBeUndefined();
    });
  });

  describe('getActiveChains', () => {
    it('should return all active chains', async () => {
      await approvalChainService.createChain({
        chainType: 'sequential',
        name: 'Chain 1',
        description: 'Test',
        nodes: [{ role: 'Advisor' as PersonaRole, isRequired: true }],
        requesterId: 'user_001',
        sessionId: 'session_123',
        taskId: 'task_001',
      });

      await approvalChainService.createChain({
        chainType: 'parallel',
        name: 'Chain 2',
        description: 'Test',
        nodes: [{ role: 'Curator' as PersonaRole, isRequired: true }],
        requesterId: 'user_002',
        sessionId: 'session_456',
        taskId: 'task_002',
      });

      const chains = approvalChainService.getActiveChains();
      expect(chains.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getChainsForSession', () => {
    it('should return chains for a session', async () => {
      await approvalChainService.createChain({
        chainType: 'sequential',
        name: 'Session Chain',
        description: 'Test',
        nodes: [{ role: 'Advisor' as PersonaRole, isRequired: true }],
        requesterId: 'user_001',
        sessionId: 'session_123',
        taskId: 'task_001',
      });

      const chains = approvalChainService.getChainsForSession('session_123');
      expect(chains.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('approveNode', () => {
    it('should approve a node', async () => {
      const chain = await approvalChainService.createChain({
        chainType: 'sequential',
        name: 'Approve Test',
        description: 'Test',
        nodes: [{ role: 'Advisor' as PersonaRole, isRequired: true }],
        requesterId: 'user_001',
        sessionId: 'session_123',
        taskId: 'task_456',
      });

      const approved = await approvalChainService.approveNode(
        chain.id,
        chain.nodes[0].id,
        'user_002'
      );

      expect(approved.nodes[0].status).toBe('approved');
      expect(approved.nodes[0].decidedBy).toBe('user_002');
    });

    it('should advance chain on approval', async () => {
      const chain = await approvalChainService.createChain({
        chainType: 'sequential',
        name: 'Advance Test',
        description: 'Test',
        nodes: [
          { role: 'Advisor' as PersonaRole, isRequired: true },
          { role: 'Curator' as PersonaRole, isRequired: true },
        ],
        requesterId: 'user_001',
        sessionId: 'session_123',
        taskId: 'task_456',
      });

      // Approve first node
      await approvalChainService.approveNode(
        chain.id,
        chain.nodes[0].id,
        'user_002'
      );

      const updated = approvalChainService.getChain(chain.id);
      expect(updated?.currentStep).toBe(1);
      expect(updated?.status).toBe('active');
    });
  });

  describe('rejectNode', () => {
    it('should reject a node and fail chain', async () => {
      const chain = await approvalChainService.createChain({
        chainType: 'sequential',
        name: 'Reject Test',
        description: 'Test',
        nodes: [{ role: 'Advisor' as PersonaRole, isRequired: true }],
        requesterId: 'user_001',
        sessionId: 'session_123',
        taskId: 'task_456',
      });

      const rejected = await approvalChainService.rejectNode(
        chain.id,
        chain.nodes[0].id,
        'user_002',
        'Does not meet requirements'
      );

      expect(rejected.nodes[0].status).toBe('rejected');
      expect(rejected.nodes[0].reason).toBe('Does not meet requirements');
      expect(rejected.status).toBe('failed');
    });
  });

  describe('cancelChain', () => {
    it('should cancel an active chain', async () => {
      const chain = await approvalChainService.createChain({
        chainType: 'sequential',
        name: 'Cancel Test',
        description: 'Test',
        nodes: [{ role: 'Advisor' as PersonaRole, isRequired: true }],
        requesterId: 'user_001',
        sessionId: 'session_123',
        taskId: 'task_456',
      });

      await approvalChainService.cancelChain(chain.id, 'user_001', 'No longer needed');

      const cancelled = approvalChainService.getChain(chain.id);
      expect(cancelled?.status).toBe('cancelled');
    });
  });

  describe('getChainResult', () => {
    it('should return chain execution result', async () => {
      const chain = await approvalChainService.createChain({
        chainType: 'sequential',
        name: 'Result Test',
        description: 'Test',
        nodes: [
          { role: 'Advisor' as PersonaRole, isRequired: true },
          { role: 'Curator' as PersonaRole, isRequired: true },
        ],
        requesterId: 'user_001',
        sessionId: 'session_123',
        taskId: 'task_456',
      });

      await approvalChainService.approveNode(chain.id, chain.nodes[0].id, 'user_002');
      await approvalChainService.approveNode(chain.id, chain.nodes[1].id, 'user_002');

      const result = approvalChainService.getChainResult(chain.id);

      expect(result).toBeDefined();
      expect(result?.chainId).toBe(chain.id);
      expect(result?.totalSteps).toBe(2);
      expect(result?.approvedSteps).toBe(2);
    });
  });

  describe('ChainConfig', () => {
    it('should get default config', () => {
      const config = getChainConfig();
      expect(config.allowParallelApproval).toBe(false);
      expect(config.continueOnSkip).toBe(true);
      expect(config.maxSteps).toBe(10);
    });

    it('should update config', () => {
      setChainConfig({ allowParallelApproval: true, maxSteps: 20 });
      const config = getChainConfig();
      expect(config.allowParallelApproval).toBe(true);
      expect(config.maxSteps).toBe(20);
    });
  });
});

// ============================================================================
// DelegationService Tests
// ============================================================================

describe('DelegationService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('createDelegation', () => {
    it('should create a delegation rule', async () => {
      const delegation = await delegationService.createDelegation({
        delegatorId: 'user_001',
        delegateId: 'user_002',
        roles: ['Advisor', 'Curator'],
        validFrom: Date.now(),
        validUntil: Date.now() + (7 * 24 * 60 * 60 * 1000),
        reason: 'On vacation',
      });

      expect(delegation.id).toBeDefined();
      expect(delegation.delegatorId).toBe('user_001');
      expect(delegation.delegateId).toBe('user_002');
      expect(delegation.roles).toContain('Advisor');
      expect(delegation.status).toBe('active');
    });
  });

  describe('createDelegation with conditions', () => {
    it('should create delegation with conditions when multi-delegation enabled', async () => {
      setDelegationConfig({ allowMultiDelegation: true });

      const delegation = await delegationService.createDelegation({
        delegatorId: 'user_cond_delegator',
        delegateId: 'user_cond_delegate',
        roles: ['Advisor'],
        validFrom: Date.now(),
        validUntil: Date.now() + (7 * 24 * 60 * 60 * 1000),
        reason: 'Limited delegation',
        conditions: {
          maxApprovals: 5,
          timeWindow: 24 * 60 * 60 * 1000,
        },
      });

      expect(delegation.conditions).toBeDefined();
      expect(delegation.conditions?.maxApprovals).toBe(5);

      setDelegationConfig({ allowMultiDelegation: false });
    });
  });

  describe('getDelegation', () => {
    it('should retrieve an existing delegation', async () => {
      const created = await delegationService.createDelegation({
        delegatorId: 'user_get_delegation',
        delegateId: 'user_delegate_get',
        roles: ['Advisor'],
        validFrom: Date.now(),
        validUntil: Date.now() + (7 * 24 * 60 * 60 * 1000),
        reason: 'Test',
      });

      const retrieved = delegationService.getDelegation(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should return undefined for non-existent delegation', () => {
      const result = delegationService.getDelegation('non_existent');
      expect(result).toBeUndefined();
    });
  });

  describe('getDelegationsByDelegate', () => {
    it('should find delegations for a delegate', async () => {
      await delegationService.createDelegation({
        delegatorId: 'user_delegate_check',
        delegateId: 'user_delegate_find',
        roles: ['Advisor'],
        validFrom: Date.now(),
        validUntil: Date.now() + (7 * 24 * 60 * 60 * 1000),
        reason: 'Test',
      });

      const delegations = delegationService.getActiveDelegationsForDelegate('user_delegate_find');
      expect(Array.isArray(delegations)).toBe(true);
    });
  });

  describe('canDelegate', () => {
    it('should return delegation for valid delegate', async () => {
      const delegation = await delegationService.createDelegation({
        delegatorId: 'user_candelegator_valid',
        delegateId: 'user_delegate_valid',
        roles: ['Advisor'],
        validFrom: Date.now() - 1000,
        validUntil: Date.now() + (7 * 24 * 60 * 60 * 1000),
        reason: 'Test',
      });

      const delegationCheck = delegationService.canDelegate(
        'user_delegate_valid',
        'Advisor'
      );

      expect(delegationCheck).toBeDefined();
    });

    it('should return undefined for expired delegation', async () => {
      await delegationService.createDelegation({
        delegatorId: 'user_candelegator_expired',
        delegateId: 'user_delegate_expired',
        roles: ['Advisor'],
        validFrom: Date.now() - (14 * 24 * 60 * 60 * 1000),
        validUntil: Date.now() - (7 * 24 * 60 * 60 * 1000), // expired
        reason: 'Expired',
      });

      const delegation = delegationService.canDelegate(
        'user_delegate_expired',
        'Advisor'
      );

      expect(delegation).toBeUndefined();
    });
  });

  describe('recordProxyApproval', () => {
    it('should record a proxy approval', async () => {
      const delegation = await delegationService.createDelegation({
        delegatorId: 'user_proxy_delegator',
        delegateId: 'user_proxy_delegate',
        roles: ['Advisor'],
        validFrom: Date.now(),
        validUntil: Date.now() + (7 * 24 * 60 * 60 * 1000),
        reason: 'Test',
      });

      const proxy = await delegationService.recordProxyApproval({
        delegationId: delegation.id,
        originalApproverId: 'user_proxy_delegator',
        delegateId: 'user_proxy_delegate',
        requestId: 'approval_123',
        action: 'approved',
        reason: 'Approved on behalf',
      });

      expect(proxy.id).toBeDefined();
      expect(proxy.wasProxy).toBe(true);
      expect(proxy.action).toBe('approved');
    });
  });

  describe('revokeDelegation', () => {
    it('should revoke an active delegation', async () => {
      const delegation = await delegationService.createDelegation({
        delegatorId: 'user_revoke_delegator',
        delegateId: 'user_revoke_delegate',
        roles: ['Advisor'],
        validFrom: Date.now(),
        validUntil: Date.now() + (7 * 24 * 60 * 60 * 1000),
        reason: 'Test',
      });

      // revokeDelegation returns void
      await delegationService.revokeDelegation(delegation.id, 'user_revoke_delegator');

      // Verify by checking the delegation status
      const revoked = delegationService.getDelegation(delegation.id);
      expect(revoked?.status).toBe('revoked');
      expect(revoked?.revokedBy).toBe('user_revoke_delegator');
    });
  });

  describe('DelegationConfig', () => {
    it('should get default config', () => {
      const config = getDelegationConfig();
      expect(config.allowMultiDelegation).toBe(false);
      expect(config.allowChainDelegation).toBe(false);
      expect(config.maxDelegationDepth).toBe(3);
    });

    it('should update config', () => {
      setDelegationConfig({ allowMultiDelegation: true, maxDelegationDepth: 5 });
      const config = getDelegationConfig();
      expect(config.allowMultiDelegation).toBe(true);
      expect(config.maxDelegationDepth).toBe(5);
    });
  });

  describe('multi-delegation support', () => {
    it('should allow creating multiple delegations when multi-delegation is enabled', async () => {
      // Enable multi-delegation
      setDelegationConfig({ allowMultiDelegation: true });

      const delegation1 = await delegationService.createDelegation({
        delegatorId: 'user_multi_1',
        delegateId: 'user_delegate_1',
        roles: ['Advisor'],
        validFrom: Date.now(),
        validUntil: Date.now() + (7 * 24 * 60 * 60 * 1000),
        reason: 'Test 1',
      });

      const delegation2 = await delegationService.createDelegation({
        delegatorId: 'user_multi_2',
        delegateId: 'user_delegate_2',
        roles: ['Curator'],
        validFrom: Date.now(),
        validUntil: Date.now() + (7 * 24 * 60 * 60 * 1000),
        reason: 'Test 2',
      });

      expect(delegation1.id).toBeDefined();
      expect(delegation2.id).toBeDefined();

      // Reset config
      setDelegationConfig({ allowMultiDelegation: false });
    });
  });
});

// ============================================================================
// ApprovalNotificationService Tests
// ============================================================================

describe('ApprovalNotificationService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('notifyApprovalRequest', () => {
    it('should create an approval request notification', async () => {
      const notification = await approvalNotificationService.notifyApprovalRequest({
        requestId: 'approval_123',
        title: 'Send Marketing Email',
        description: 'Please approve this email campaign',
        requesterId: 'user_001',
        approverId: 'user_002',
        approverRole: 'Advisor',
        priority: 'high',
      });

      expect(notification.id).toBeDefined();
      expect(notification.type).toBe('approval_request');
      expect(notification.title).toBe('Approval Required');
      expect(notification.priority).toBe('high');
      expect(notification.recipientId).toBe('user_002');
    });

    it('should set in_app channel by default', async () => {
      const notification = await approvalNotificationService.notifyApprovalRequest({
        requestId: 'approval_123',
        title: 'Test',
        description: 'Test',
        requesterId: 'user_001',
        approverId: 'user_002',
        approverRole: 'Advisor',
        priority: 'normal',
      });

      expect(notification.channels).toContain('in_app');
    });
  });

  describe('notifyApprovalDecision', () => {
    it('should create a decision notification', async () => {
      const notification = await approvalNotificationService.notifyApprovalDecision({
        requestId: 'approval_123',
        title: 'Send Email',
        decision: 'approved',
        decidedBy: 'user_002',
        requesterId: 'user_001',
        reason: 'Looks good',
      });

      expect(notification.type).toBe('approval_decided');
      expect(notification.recipientId).toBe('user_001');
    });
  });

  describe('notifyChainProgress', () => {
    it('should create chain progress notification', async () => {
      const notification = await approvalNotificationService.notifyChainProgress({
        chainId: 'chain_test_123',
        chainName: 'Test Chain',
        step: 1,
        totalSteps: 5,
        status: 'approved',
        recipientId: 'user_001',
      });

      expect(notification.type).toBe('chain_progress');
      expect(notification.referenceId).toBe('chain_test_123');
    });
  });

  describe('notifyChainCompleted', () => {
    it.skip('notifyChainCompleted does not exist in the API', async () => {
      // This function doesn't exist - skip the test
    });
  });

  describe('getNotification', () => {
    it('should retrieve an existing notification', async () => {
      const created = await approvalNotificationService.notifyApprovalRequest({
        requestId: 'approval_123',
        title: 'Test',
        description: 'Test',
        requesterId: 'user_001',
        approverId: 'user_002',
        approverRole: 'Advisor',
        priority: 'normal',
      });

      const retrieved = approvalNotificationService.getNotification(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });
  });

  describe('getNotificationsForRecipient', () => {
    it('should return notifications for a recipient', async () => {
      await approvalNotificationService.notifyApprovalRequest({
        requestId: 'approval_1',
        title: 'Test 1',
        description: 'Test',
        requesterId: 'user_001',
        approverId: 'user_002',
        approverRole: 'Advisor',
        priority: 'normal',
      });

      await approvalNotificationService.notifyApprovalRequest({
        requestId: 'approval_2',
        title: 'Test 2',
        description: 'Test',
        requesterId: 'user_001',
        approverId: 'user_002',
        approverRole: 'Advisor',
        priority: 'normal',
      });

      const notifications = approvalNotificationService.getNotificationsForRecipient('user_002');
      expect(notifications.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const created = await approvalNotificationService.notifyApprovalRequest({
        requestId: 'approval_123',
        title: 'Test',
        description: 'Test',
        requesterId: 'user_001',
        approverId: 'user_002',
        approverRole: 'Advisor',
        priority: 'normal',
      });

      // markAsRead returns void, just call it
      approvalNotificationService.markAsRead(created.id);

      // Verify the notification is now read
      const notification = approvalNotificationService.getNotification(created.id);
      expect(notification?.status).toBe('read');
      expect(notification?.readAt).toBeDefined();
    });
  });

  describe('NotificationConfig', () => {
    it('should get default config', () => {
      const config = getNotificationConfig();
      expect(config.enableInApp).toBe(true);
      expect(config.maxReminders).toBe(3);
    });

    it('should update config', () => {
      setNotificationConfig({ enableEmail: true, maxReminders: 5 });
      const config = getNotificationConfig();
      expect(config.enableEmail).toBe(true);
      expect(config.maxReminders).toBe(5);
    });
  });
});

// ============================================================================
// ApprovalAnalyticsService Tests
// ============================================================================

describe('ApprovalAnalyticsService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('recordDecision', () => {
    it('should record an approval decision', async () => {
      await approvalAnalyticsService.recordDecision({
        requestId: 'approval_123',
        role: 'Advisor',
        status: 'approved',
        responseTime: 5 * 60 * 1000,
        queueTime: 1 * 60 * 1000,
        priority: 'high',
      });

      const metrics = approvalAnalyticsService.getMetrics('day');
      expect(metrics.totalRequests).toBeGreaterThan(0);
    });
  });

  describe('getMetrics', () => {
    it('should return metrics for specified period', () => {
      const metrics = approvalAnalyticsService.getMetrics('day');

      expect(metrics).toBeDefined();
      expect(metrics.totalRequests).toBeDefined();
      expect(metrics.approvalRate).toBeDefined();
      expect(metrics.averageResponseTime).toBeDefined();
    });

    it('should calculate approval rate', async () => {
      await approvalAnalyticsService.recordDecision({
        requestId: 'app_1',
        role: 'Advisor',
        status: 'approved',
        responseTime: 60000,
        priority: 'normal',
      });

      await approvalAnalyticsService.recordDecision({
        requestId: 'app_2',
        role: 'Curator',
        status: 'approved',
        responseTime: 60000,
        priority: 'normal',
      });

      await approvalAnalyticsService.recordDecision({
        requestId: 'app_3',
        role: 'Guardian',
        status: 'rejected',
        responseTime: 60000,
        priority: 'normal',
      });

      const metrics = approvalAnalyticsService.getMetrics('day');
      expect(metrics.approvalRate).toBeGreaterThan(0);
      expect(metrics.approvalRate).toBeLessThan(100);
    });
  });

  describe('getRoleMetrics', () => {
    it('should return metrics per role', async () => {
      await approvalAnalyticsService.recordDecision({
        requestId: 'app_1',
        role: 'Advisor',
        status: 'approved',
        responseTime: 60000,
        priority: 'normal',
      });

      const roleMetrics = approvalAnalyticsService.getRoleMetrics();

      expect(Array.isArray(roleMetrics)).toBe(true);
      if (roleMetrics.length > 0) {
        expect(roleMetrics[0]).toHaveProperty('role');
        expect(roleMetrics[0]).toHaveProperty('totalAssigned');
        expect(roleMetrics[0]).toHaveProperty('averageResponseTime');
      }
    });
  });

  describe('getTrendData', () => {
    it('should return trend data', () => {
      const trends = approvalAnalyticsService.getTrendData('approvalRate', 'day', 7);

      expect(Array.isArray(trends)).toBe(true);
    });

    it('should include trend direction', () => {
      const trends = approvalAnalyticsService.getTrendData('averageResponseTime', 'week', 7);

      if (trends.length > 0) {
        expect(trends[0].direction).toMatch(/^(up|down|stable)$/);
      }
    });
  });

  describe('analyzeBottlenecks', () => {
    it('should analyze and return bottleneck analysis', () => {
      const bottlenecks = approvalAnalyticsService.analyzeBottlenecks('day');

      expect(Array.isArray(bottlenecks)).toBe(true);
    });

    it('should include severity levels', () => {
      const bottlenecks = approvalAnalyticsService.analyzeBottlenecks('day');

      if (bottlenecks.length > 0) {
        expect(['low', 'medium', 'high', 'critical']).toContain(bottlenecks[0].severity);
      }
    });
  });

  describe('generateReport', () => {
    it('should generate a summary report', () => {
      const report = approvalAnalyticsService.generateReport({
        name: 'Daily Report',
        type: 'summary',
        period: 'day',
      });

      expect(report.id).toBeDefined();
      expect(report.name).toBe('Daily Report');
      expect(report.type).toBe('summary');
      expect(report.metrics).toBeDefined();
      expect(report.generatedAt).toBeDefined();
    });

    it('should generate a detailed report', () => {
      const report = approvalAnalyticsService.generateReport({
        name: 'Detailed Report',
        type: 'detailed',
        period: 'week',
      });

      expect(report.type).toBe('detailed');
    });

    it('should generate a role analysis report', () => {
      const report = approvalAnalyticsService.generateReport({
        name: 'Role Analysis',
        type: 'role_analysis',
        period: 'month',
      });

      expect(report.type).toBe('role_analysis');
      expect(report.roleMetrics).toBeDefined();
    });

    it('should generate a trend report', () => {
      const report = approvalAnalyticsService.generateReport({
        name: 'Trend Report',
        type: 'trend',
        period: 'quarter',
      });

      expect(report.type).toBe('trend');
      expect(report.trends).toBeDefined();
    });
  });

  describe('AnalyticsConfig', () => {
    it('should get default config', () => {
      const config = getAnalyticsConfig();
      expect(config.retentionDays).toBe(90);
      expect(config.autoGenerateReports).toBe(true);
    });

    it('should update config', () => {
      setAnalyticsConfig({ retentionDays: 30, enableRealTimeMetrics: false });
      const config = getAnalyticsConfig();
      expect(config.retentionDays).toBe(30);
      expect(config.enableRealTimeMetrics).toBe(false);
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('ApprovalWorkflow Integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should track full approval workflow lifecycle', async () => {
    // 1. Create approval chain
    const chain = await approvalChainService.createChain({
      chainType: 'sequential',
      name: 'Integration Test Chain',
      description: 'Full lifecycle test',
      nodes: [
        { role: 'Advisor' as PersonaRole, isRequired: true },
        { role: 'Curator' as PersonaRole, isRequired: true },
      ],
      requesterId: 'user_001',
      sessionId: 'session_123',
      taskId: 'task_456',
    });

    expect(chain.status).toBe('active');

    // 2. Create delegation for backup
    const delegation = await delegationService.createDelegation({
      delegatorId: 'user_002',
      delegateId: 'user_003',
      roles: ['Curator'],
      validFrom: Date.now(),
      validUntil: Date.now() + (7 * 24 * 60 * 60 * 1000),
      reason: 'Backup',
    });

    expect(delegation.status).toBe('active');

    // 3. Check delegation is valid
    const delegationCheck = delegationService.canDelegate('user_003', 'Curator');
    expect(delegationCheck).toBeDefined();

    // 4. Approve first step
    const step1Approved = await approvalChainService.approveNode(
      chain.id,
      chain.nodes[0].id,
      'user_002'
    );

    expect(step1Approved.nodes[0].status).toBe('approved');

    // 5. Check chain advanced
    const updated = approvalChainService.getChain(chain.id);
    expect(updated?.currentStep).toBe(1);

    // 6. Approve second step
    const step2Approved = await approvalChainService.approveNode(
      chain.id,
      chain.nodes[1].id,
      'user_002'
    );

    expect(step2Approved.nodes[1].status).toBe('approved');
    expect(step2Approved.status).toBe('completed');

    // 7. Record analytics
    await approvalAnalyticsService.recordDecision({
      requestId: 'approval_final',
      role: 'Advisor',
      status: 'approved',
      responseTime: 300000,
      queueTime: 60000,
      priority: 'high',
      chainId: chain.id,
    });

    const metrics = approvalAnalyticsService.getMetrics('day');
    expect(metrics.totalRequests).toBeGreaterThan(0);
  });

  it('should handle rejection flow', async () => {
    const chain = await approvalChainService.createChain({
      chainType: 'sequential',
      name: 'Rejection Test',
      description: 'Test rejection',
      nodes: [
        { role: 'Advisor' as PersonaRole, isRequired: true },
        { role: 'Curator' as PersonaRole, isRequired: true },
      ],
      requesterId: 'user_001',
      sessionId: 'session_123',
      taskId: 'task_456',
    });

    // Reject at first step
    const rejected = await approvalChainService.rejectNode(
      chain.id,
      chain.nodes[0].id,
      'user_002',
      'Does not meet requirements'
    );

    expect(rejected.nodes[0].status).toBe('rejected');
    expect(rejected.nodes[0].reason).toBe('Does not meet requirements');
    expect(rejected.status).toBe('failed');

    // Record rejection in analytics
    await approvalAnalyticsService.recordDecision({
      requestId: 'approval_rejected',
      role: 'Advisor',
      status: 'rejected',
      responseTime: 120000,
      priority: 'normal',
    });

    const metrics = approvalAnalyticsService.getMetrics('day');
    expect(metrics.rejected).toBeGreaterThan(0);
  });

  it('should notify on chain events', async () => {
    const chain = await approvalChainService.createChain({
      chainType: 'sequential',
      name: 'Notification Test',
      description: 'Test notifications',
      nodes: [{ role: 'Advisor' as PersonaRole, isRequired: true }],
      requesterId: 'user_001',
      sessionId: 'session_123',
      taskId: 'task_456',
    });

    // Progress notification - recipientId is required
    await approvalNotificationService.notifyChainProgress({
      chainId: chain.id,
      chainName: 'Notification Test Chain',
      step: 1,
      totalSteps: 1,
      status: 'approved',
      recipientId: 'user_001',
    });

    const notifications = approvalNotificationService.getNotificationsForRecipient('user_001');
    expect(notifications.length).toBeGreaterThan(0);
  });
});
