/**
 * SkillDependencyResolver — V85 Skill Ecosystem
 * Handles skill dependency declaration, resolution, and conflict detection.
 */

import type { SkillDependency, DependencyResolution, DependencyConflict, SkillManifest } from '../../types/skill';
import type { SkillDefinition } from '../skills/types';
import { skillRegistry } from '../skills/skillRegistry';
import { satisfiesVersion, parseVersionRange } from '../../types/skill';
import { getCustomSkill, saveCustomSkill } from '../skills/skillStorage';

const DEPENDENCIES_KEY = 'v85-skill-dependencies';

// =============================================================================
// Dependency Storage
// =============================================================================

interface DependenciesStore {
  [skillId: string]: SkillDependency[];
}

function getDependenciesStore(): DependenciesStore {
  try {
    const raw = localStorage.getItem(DEPENDENCIES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveDependenciesStore(store: DependenciesStore): void {
  localStorage.setItem(DEPENDENCIES_KEY, JSON.stringify(store));
}

// =============================================================================
// Dependency Management
// =============================================================================

/**
 * Get dependencies for a skill.
 */
export function getSkillDependencies(skillId: string): SkillDependency[] {
  const store = getDependenciesStore();
  return store[skillId] ?? [];
}

/**
 * Set dependencies for a skill.
 */
export function setSkillDependencies(skillId: string, dependencies: SkillDependency[]): void {
  const store = getDependenciesStore();
  store[skillId] = dependencies;
  saveDependenciesStore(store);
}

/**
 * Add a dependency to a skill.
 */
export function addSkillDependency(skillId: string, dependency: SkillDependency): void {
  const store = getDependenciesStore();
  if (!store[skillId]) {
    store[skillId] = [];
  }
  const existing = store[skillId].findIndex((d) => d.skillId === dependency.skillId);
  if (existing >= 0) {
    store[skillId][existing] = dependency;
  } else {
    store[skillId].push(dependency);
  }
  saveDependenciesStore(store);
}

/**
 * Remove a dependency from a skill.
 */
export function removeSkillDependency(skillId: string, depSkillId: string): void {
  const store = getDependenciesStore();
  if (store[skillId]) {
    store[skillId] = store[skillId].filter((d) => d.skillId !== depSkillId);
    saveDependenciesStore(store);
  }
}

/**
 * Update the version range for an existing dependency.
 */
export function updateDependencyVersion(
  skillId: string,
  depSkillId: string,
  newVersionRange: string
): void {
  const store = getDependenciesStore();
  if (store[skillId]) {
    const dep = store[skillId].find((d) => d.skillId === depSkillId);
    if (dep) {
      dep.versionRange = newVersionRange;
      saveDependenciesStore(store);
    }
  }
}

// =============================================================================
// Circular Dependency Detection
// =============================================================================

/**
 * Detect circular dependencies in a skill's dependency graph using DFS.
 * Returns an array of skill IDs that are part of a cycle.
 */
export function detectCircularDependencies(skillId: string): string[] {
  const store = getDependenciesStore();
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const cyclePath: string[] = [];

  function dfs(id: string): boolean {
    visited.add(id);
    recursionStack.add(id);
    cyclePath.push(id);

    const deps = store[id] ?? [];
    for (const dep of deps) {
      if (!visited.has(dep.skillId)) {
        if (dfs(dep.skillId)) {
          return true;
        }
      } else if (recursionStack.has(dep.skillId)) {
        // Found a cycle - extract just the cycle portion
        const cycleStart = cyclePath.indexOf(dep.skillId);
        cyclePath.push(dep.skillId); // close the cycle
        return true;
      }
    }

    recursionStack.delete(id);
    cyclePath.pop();
    return false;
  }

  if (dfs(skillId)) {
    // Return the cycle path (from first repeat to last)
    const firstRepeat = cyclePath.indexOf(cyclePath[cyclePath.length - 1]);
    return cyclePath.slice(firstRepeat);
  }

  return [];
}

/**
 * Validate a new dependency addition without saving.
 * Returns any circular dependency that would be introduced.
 */
export function validateNewDependency(
  skillId: string,
  newDepSkillId: string
): { valid: boolean; circularPath?: string[] } {
  // Check direct cycle
  if (skillId === newDepSkillId) {
    return { valid: false, circularPath: [skillId, newDepSkillId] };
  }

  // Temporarily add the dependency and check for cycles
  const store = getDependenciesStore();
  const originalDeps = store[skillId] ?? [];

  store[skillId] = [...originalDeps, { skillId: newDepSkillId, versionRange: '*' }];
  localStorage.setItem(DEPENDENCIES_KEY, JSON.stringify(store));

  const circularPath = detectCircularDependencies(skillId);

  // Restore original
  store[skillId] = originalDeps;
  saveDependenciesStore(store);

  if (circularPath.length > 0) {
    return { valid: false, circularPath };
  }

  return { valid: true };
}

// =============================================================================
// Dependency Resolution
// =============================================================================

/**
 * Resolve a single dependency against installed skills.
 */
export function resolveDependency(dep: SkillDependency): DependencyResolution {
  const skill = skillRegistry.getSkill(dep.skillId);

  if (!skill) {
    return {
      skillId: dep.skillId,
      versionRange: dep.versionRange,
      status: 'missing',
    };
  }

  if (satisfiesVersion(skill.version, dep.versionRange)) {
    return {
      skillId: dep.skillId,
      versionRange: dep.versionRange,
      resolvedVersion: skill.version,
      status: 'resolved',
    };
  }

  // Version doesn't match
  return {
    skillId: dep.skillId,
    versionRange: dep.versionRange,
    resolvedVersion: skill.version,
    status: 'conflict',
  };
}

/**
 * Resolve all dependencies for a skill.
 */
export function resolveAllDependencies(skillId: string): DependencyResolution[] {
  const deps = getSkillDependencies(skillId);
  return deps.map((dep) => resolveDependency(dep));
}

/**
 * Check if all dependencies for a skill are satisfied.
 */
export function areDependenciesSatisfied(skillId: string): {
  satisfied: boolean;
  resolutions: DependencyResolution[];
  missingDeps: string[];
  conflictingDeps: string[];
} {
  const resolutions = resolveAllDependencies(skillId);
  const missingDeps = resolutions
    .filter((r) => r.status === 'missing')
    .map((r) => r.skillId);
  const conflictingDeps = resolutions
    .filter((r) => r.status === 'conflict')
    .map((r) => r.skillId);

  return {
    satisfied: missingDeps.length === 0 && conflictingDeps.length === 0,
    resolutions,
    missingDeps,
    conflictingDeps,
  };
}

// =============================================================================
// Conflict Detection
// =============================================================================

/**
 * Find all dependency conflicts across all skills.
 */
export function findAllConflicts(): DependencyConflict[] {
  const store = getDependenciesStore();
  const conflicts: DependencyConflict[] = [];

  for (const skillId of Object.keys(store)) {
    const deps = store[skillId];
    const skill = skillRegistry.getSkill(skillId);
    if (!skill) continue;

    for (const dep of deps) {
      const depSkill = skillRegistry.getSkill(dep.skillId);
      if (!depSkill) continue;

      if (!satisfiesVersion(depSkill.version, dep.versionRange)) {
        conflicts.push({
          skillId: dep.skillId,
          requestedRange: dep.versionRange,
          installedVersion: depSkill.version,
          conflictingSkill: skillId,
        });
      }
    }
  }

  return conflicts;
}

/**
 * Get skills that depend on a specific skill.
 */
export function getDependents(skillId: string): Array<{ skillId: string; versionRange: string }> {
  const store = getDependenciesStore();
  const dependents: Array<{ skillId: string; versionRange: string }> = [];

  for (const dependentSkillId of Object.keys(store)) {
    if (dependentSkillId === skillId) continue;

    const deps = store[dependentSkillId];
    for (const dep of deps) {
      if (dep.skillId === skillId) {
        dependents.push({ skillId: dependentSkillId, versionRange: dep.versionRange });
      }
    }
  }

  return dependents;
}

// =============================================================================
// Dependency Installation
// =============================================================================

/**
 * Install a skill's dependencies (auto-fetch missing ones).
 * For now, this just returns which dependencies need to be installed.
 * In a real system, this would fetch from a marketplace.
 */
export async function installDependencies(
  skillId: string
): Promise<{
  success: boolean;
  installed: string[];
  failed: Array<{ skillId: string; reason: string }>;
  error?: string;
}> {
  const resolution = areDependenciesSatisfied(skillId);

  if (resolution.satisfied) {
    return { success: true, installed: [], failed: [] };
  }

  const failed: Array<{ skillId: string; reason: string }> = [];

  // Try to install missing dependencies (placeholder - would need marketplace integration)
  for (const missingId of resolution.missingDeps) {
    // In a real implementation, this would fetch the skill from marketplace
    // For now, we just report the failure
    failed.push({
      skillId: missingId,
      reason: 'Dependency not found in marketplace',
    });
  }

  return {
    success: failed.length === 0,
    installed: [],
    failed,
  };
}

/**
 * Validate a skill's dependencies before saving.
 */
export function validateDependencies(
  skillId: string,
  dependencies: SkillDependency[]
): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const store = getDependenciesStore();

  // Check for circular dependencies
  const originalDeps = store[skillId] ?? [];
  store[skillId] = dependencies;
  const circular = detectCircularDependencies(skillId);
  store[skillId] = originalDeps;

  if (circular.length > 0) {
    errors.push(`Circular dependency detected: ${circular.join(' → ')}`);
  }

  // Check each dependency
  for (const dep of dependencies) {
    // Validate version range format
    try {
      parseVersionRange(dep.versionRange);
    } catch {
      errors.push(`Invalid version range "${dep.versionRange}" for ${dep.skillId}`);
    }

    // Check if skill exists
    const depSkill = skillRegistry.getSkill(dep.skillId);
    if (!depSkill) {
      warnings.push(`Dependency "${dep.skillId}" is not installed`);
    } else if (!satisfiesVersion(depSkill.version, dep.versionRange)) {
      warnings.push(
        `Dependency "${dep.skillId}" version ${depSkill.version} does not satisfy "${dep.versionRange}"`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
