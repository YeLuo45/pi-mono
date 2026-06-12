/**
 * SandboxSecurity - Capability-based security for sandboxes
 */

import type { SecurityPolicy, AuditEntry, SandboxPermission, Sandbox } from '../types';
import { SandboxManager } from './SandboxManager';

export class SandboxSecurity {
  private manager: SandboxManager;
  private policy: SecurityPolicy;
  private auditLog: AuditEntry[] = [];

  constructor(manager: SandboxManager, policy?: Partial<SecurityPolicy>) {
    this.manager = manager;
    this.policy = {
      allowedCapabilities: policy?.allowedCapabilities || ['read', 'execute'],
      deniedCapabilities: policy?.deniedCapabilities || ['system', 'eval'],
      resourceLimits: policy?.resourceLimits || { maxMemoryMB: 512, maxCpuMs: 5000, maxExecutionMs: 30000 },
      auditLog: policy?.auditLog ?? true,
      maxConcurrentSandboxes: policy?.maxConcurrentSandboxes || 10,
    };
  }

  // ===========================================================================
  // Capability Checks
  // ===========================================================================

  checkCapability(sandboxId: string, capability: string): boolean {
    const sandbox = this.manager.get(sandboxId);
    if (!sandbox) return false;

    if (this.policy.deniedCapabilities.includes(capability)) {
      this.log(sandboxId, 'capability_denied', capability, false);
      return false;
    }

    const allowed = this.policy.allowedCapabilities.includes(capability) ||
                    this.policy.allowedCapabilities.includes('*');
    
    this.log(sandboxId, 'capability_check', capability, allowed);
    return allowed;
  }

  checkPermission(sandbox: Sandbox, permission: SandboxPermission): boolean {
    const hasPermission = sandbox.permissions.includes(permission);
    this.log(sandbox.id, 'permission_check', permission, hasPermission);
    return hasPermission;
  }

  // ===========================================================================
  // Resource Checks
  // ===========================================================================

  checkResourceLimit(sandboxId: string, usage: { memoryMB: number; cpuMs: number }): { allowed: boolean; reason?: string } {
    const sandbox = this.manager.get(sandboxId);
    if (!sandbox) return { allowed: false, reason: 'Sandbox not found' };

    const { maxMemoryMB, maxCpuMs } = this.policy.resourceLimits;

    if (usage.memoryMB > maxMemoryMB) {
      return { allowed: false, reason: `Memory limit exceeded: ${usage.memoryMB}MB > ${maxMemoryMB}MB` };
    }

    if (usage.cpuMs > maxCpuMs) {
      return { allowed: false, reason: `CPU limit exceeded: ${usage.cpuMs}ms > ${maxCpuMs}ms` };
    }

    return { allowed: true };
  }

  // ===========================================================================
  // Malicious Behavior Detection
  // ===========================================================================

  detectMaliciousCode(code: string): { isMalicious: boolean; reasons: string[] } {
    const reasons: string[] = [];

    const maliciousPatterns = [
      { pattern: /eval\s*\(/, reason: 'Use of eval()' },
      { pattern: /Function\s*\(/, reason: 'Use of Function constructor' },
      { pattern: /document\.cookie/, reason: 'Cookie access' },
      { pattern: /localStorage\./, reason: 'LocalStorage access' },
      { pattern: /sessionStorage\./, reason: 'SessionStorage access' },
      { pattern: /importScripts/, reason: 'Dynamic script loading' },
      { pattern: /window\.opener/, reason: 'Window opener access' },
      { pattern: /postMessage\s*\(/, reason: 'postMessage without targetOrigin' },
    ];

    for (const { pattern, reason } of maliciousPatterns) {
      if (pattern.test(code)) {
        reasons.push(reason);
      }
    }

    return {
      isMalicious: reasons.length > 0,
      reasons,
    };
  }

  // ===========================================================================
  // Sandbox Escape Prevention
  // ===========================================================================

  preventEscape(code: string): { isSafe: boolean; issues: string[] } {
    const issues: string[] = [];

    const escapePatterns = [
      { pattern: /prototype\s*=/, reason: 'Prototype modification' },
      { pattern: /__proto__/, reason: 'Prototype chain access' },
      { pattern: /constructor\s*=/, reason: 'Constructor modification' },
      { pattern: /Object\.freeze/, reason: 'Object freezing' },
      { pattern: /Reflect\.set/, reason: 'Reflective set' },
    ];

    for (const { pattern, reason } of escapePatterns) {
      if (pattern.test(code)) {
        issues.push(reason);
      }
    }

    return {
      isSafe: issues.length === 0,
      issues,
    };
  }

  // ===========================================================================
  // Audit Log
  // ===========================================================================

  private log(sandboxId: string, action: string, resource?: string, allowed?: boolean): void {
    if (!this.policy.auditLog) return;

    this.auditLog.push({
      sandboxId,
      action,
      resource,
      timestamp: Date.now(),
      allowed: allowed ?? true,
    });
  }

  getAuditLog(sandboxId?: string): AuditEntry[] {
    if (sandboxId) {
      return this.auditLog.filter(e => e.sandboxId === sandboxId);
    }
    return [...this.auditLog];
  }

  clearAuditLog(sandboxId?: string): void {
    if (sandboxId) {
      this.auditLog = this.auditLog.filter(e => e.sandboxId !== sandboxId);
    } else {
      this.auditLog = [];
    }
  }

  // ===========================================================================
  // Policy Management
  // ===========================================================================

  updatePolicy(updates: Partial<SecurityPolicy>): void {
    this.policy = { ...this.policy, ...updates };
  }

  getPolicy(): SecurityPolicy {
    return { ...this.policy };
  }
}
