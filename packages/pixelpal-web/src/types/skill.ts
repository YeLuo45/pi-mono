/**
 * V85 Skill Ecosystem - Type Definitions
 * Extends V77 Skill types with rating, version, dependency, and review support.
 */

import type { SkillManifest, SkillDefinition, SkillCategory } from '../services/skills/types';

// Re-export existing skill types
export { type SkillManifest, type SkillDefinition, type SkillCategory };

// =============================================================================
// Skill Metadata & Ecosystem (V85)
// =============================================================================

export interface SkillStats {
  installs: number;
  rating: number;
  ratingsCount: number;
  calls: number;
}

export interface SkillVersion {
  version: string;
  changelog: string;
  createdAt: number;
  manifest: SkillManifest;
}

export interface SkillDependency {
  skillId: string;
  versionRange: string;
}

export interface SkillReview {
  id: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: number;
}

/**
 * Full skill metadata for the marketplace/ecosystem.
 * Extends SkillDefinition with ecosystem-specific fields.
 */
export interface SkillMetadata extends SkillDefinition {
  stats: SkillStats;
  versions: SkillVersion[];
  reviews: SkillReview[];
  dependencies: SkillDependency[];
}

// =============================================================================
// Version Range Parsing (Semantic Versioning)
// =============================================================================

export type SemverOperator = '=' | '>=' | '<=' | '>' | '<' | '^' | '~';

export interface ParsedVersionRange {
  operator: SemverOperator;
  major: number;
  minor: number;
  patch: number;
}

/**
 * Parse a version range string like "1.0.0", "^1.2.0", "~1.0.0", ">=2.0.0"
 */
export function parseVersionRange(range: string): ParsedVersionRange {
  let operator: SemverOperator = '=';
  let versionStr = range.trim();

  if (versionStr.startsWith('^')) {
    operator = '^';
    versionStr = versionStr.slice(1);
  } else if (versionStr.startsWith('~')) {
    operator = '~';
    versionStr = versionStr.slice(1);
  } else if (versionStr.startsWith('>=')) {
    operator = '>=';
    versionStr = versionStr.slice(2);
  } else if (versionStr.startsWith('<=')) {
    operator = '<=';
    versionStr = versionStr.slice(2);
  } else if (versionStr.startsWith('>')) {
    operator = '>';
    versionStr = versionStr.slice(1);
  } else if (versionStr.startsWith('<')) {
    operator = '<';
    versionStr = versionStr.slice(1);
  }

  const parts = versionStr.split('.').map(Number);
  return {
    operator,
    major: parts[0] ?? 0,
    minor: parts[1] ?? 0,
    patch: parts[2] ?? 0,
  };
}

/**
 * Check if a version satisfies a version range.
 */
export function satisfiesVersion(version: string, rangeStr: string): boolean {
  const verParts = version.split('.').map(Number);
  const vMaj = verParts[0] ?? 0;
  const vMin = verParts[1] ?? 0;
  const vPat = verParts[2] ?? 0;

  const range = parseVersionRange(rangeStr);
  const { operator, major, minor, patch } = range;

  switch (operator) {
    case '=':
      return vMaj === major && vMin === minor && vPat === patch;
    case '>=':
      return vMaj > major || (vMaj === major && vMin > minor) || (vMaj === major && vMin === minor && vPat >= patch);
    case '<=':
      return vMaj < major || (vMaj === major && vMin < minor) || (vMaj === major && vMin === minor && vPat <= patch);
    case '>':
      return vMaj > major || (vMaj === major && vMin > minor) || (vMaj === major && vMin === minor && vPat > patch);
    case '<':
      return vMaj < major || (vMaj === major && vMin < minor) || (vMaj === major && vMin === minor && vPat < patch);
    case '^':
      // Caret: compatible major version
      return vMaj === major && (vMin > minor || (vMin === minor && vPat >= patch));
    case '~':
      // Tilde: compatible minor version
      return vMaj === major && vMin === minor && vPat >= patch;
    default:
      return false;
  }
}

/**
 * Compare two semantic versions. Returns -1 if a < b, 0 if a == b, 1 if a > b.
 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const av = aParts[i] ?? 0;
    const bv = bParts[i] ?? 0;
    if (av < bv) return -1;
    if (av > bv) return 1;
  }
  return 0;
}

/**
 * Increment a semantic version component.
 */
export function incrementVersion(version: string, type: 'major' | 'minor' | 'patch'): string {
  const parts = version.split('.').map(Number);
  const [major, minor, patch] = [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];

  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
  }
}

// =============================================================================
// Dependency Resolution
// =============================================================================

export interface DependencyResolution {
  skillId: string;
  versionRange: string;
  resolvedVersion?: string;
  status: 'resolved' | 'missing' | 'conflict' | 'circular';
}

export interface DependencyConflict {
  skillId: string;
  requestedRange: string;
  installedVersion: string;
  conflictingSkill: string;
}

// =============================================================================
// Rating & Review
// =============================================================================

export interface RatingSubmission {
  skillId: string;
  userId: string;
  rating: number;
  comment?: string;
}

// =============================================================================
// Marketplace Extensions
// =============================================================================

export type SortOption = 'popular' | 'rating' | 'newest' | 'trending';

export interface MarketplaceFilters {
  query: string;
  category: SkillCategory | 'all';
  sortBy: SortOption;
  minRating?: number;
}
