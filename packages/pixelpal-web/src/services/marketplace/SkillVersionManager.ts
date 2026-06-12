/**
 * SkillVersionManager — V85 Skill Ecosystem
 * Handles semantic versioning, version history, updates, and rollbacks.
 */

import type { SkillVersion, SkillManifest } from '../../types/skill';
import type { SkillDefinition } from '../skills/types';
import { skillRegistry } from '../skills/skillRegistry';
import { saveCustomSkill, getCustomSkill } from '../skills/skillStorage';

const VERSION_HISTORY_KEY = 'v85-version-history';

// =============================================================================
// Version History Storage
// =============================================================================

interface VersionHistoryEntry {
  skillId: string;
  version: string;
  changelog: string;
  createdAt: number;
  manifest: SkillManifest;
}

interface VersionHistoryStore {
  [skillId: string]: VersionHistoryEntry[];
}

function getVersionHistoryStore(): VersionHistoryStore {
  try {
    const raw = localStorage.getItem(VERSION_HISTORY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveVersionHistoryStore(store: VersionHistoryStore): void {
  localStorage.setItem(VERSION_HISTORY_KEY, JSON.stringify(store));
}

// =============================================================================
// Version History
// =============================================================================

/**
 * Get full version history for a skill.
 */
export function getVersionHistory(skillId: string): SkillVersion[] {
  const store = getVersionHistoryStore();
  return store[skillId] ?? [];
}

/**
 * Get the latest version entry for a skill.
 */
export function getLatestVersion(skillId: string): SkillVersion | null {
  const history = getVersionHistory(skillId);
  if (history.length === 0) return null;
  return history[history.length - 1];
}

/**
 * Get a specific version for a skill.
 */
export function getSpecificVersion(skillId: string, version: string): SkillVersion | null {
  const history = getVersionHistory(skillId);
  return history.find((v) => v.version === version) ?? null;
}

// =============================================================================
// Version Recording
// =============================================================================

/**
 * Record a new version for a skill (called when saving a new version).
 */
export async function recordVersion(
  skillId: string,
  version: string,
  changelog: string,
  manifest: SkillManifest
): Promise<void> {
  const store = getVersionHistoryStore();

  if (!store[skillId]) {
    store[skillId] = [];
  }

  // Check if version already exists (update instead)
  const existingIndex = store[skillId].findIndex((v) => v.version === version);
  const entry: VersionHistoryEntry = {
    skillId,
    version,
    changelog,
    createdAt: Date.now(),
    manifest,
  };

  if (existingIndex >= 0) {
    store[skillId][existingIndex] = entry;
  } else {
    store[skillId].push(entry);
  }

  // Sort by version ascending
  store[skillId].sort((a, b) => {
    const [am, an, ap] = a.version.split('.').map(Number);
    const [bm, bn, bp] = b.version.split('.').map(Number);
    if (am !== bm) return am - bm;
    if (an !== bn) return an - bn;
    return ap - bp;
  });

  saveVersionHistoryStore(store);
}

/**
 * Record the initial version when a skill is first saved.
 */
export async function recordInitialVersion(skill: SkillDefinition): Promise<void> {
  await recordVersion(skill.id, skill.version, 'Initial release', {
    id: skill.id,
    name: skill.name,
    version: skill.version,
    author: skill.author,
    description: skill.description,
    icon: skill.icon,
    category: skill.category,
    tags: skill.tags,
    chatTriggerable: skill.chatTriggerable,
    chatKeywords: skill.chatKeywords,
    order: skill.order,
  });
}

// =============================================================================
// Version Updates
// =============================================================================

export type VersionBumpType = 'major' | 'minor' | 'patch';

function incrementVersion(version: string, type: VersionBumpType): string {
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

/**
 * Update a skill to a new version with changelog.
 */
export async function updateSkillVersion(
  skillId: string,
  newVersion: string,
  changelog: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const skill = await getCustomSkill(skillId);
    if (!skill) {
      return { success: false, error: 'Skill not found' };
    }

    const oldVersion = skill.version;
    skill.version = newVersion;

    // Save updated skill
    await saveCustomSkill(skill);

    // Record in version history
    await recordVersion(skillId, newVersion, changelog, {
      id: skill.id,
      name: skill.name,
      version: newVersion,
      author: skill.author,
      description: skill.description,
      icon: skill.icon,
      category: skill.category,
      tags: skill.tags,
      chatTriggerable: skill.chatTriggerable,
      chatKeywords: skill.chatKeywords,
      order: skill.order,
    });

    console.log(`[SkillVersionManager] Updated skill ${skillId}: ${oldVersion} → ${newVersion}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Bump a skill's version (major/minor/patch).
 */
export async function bumpSkillVersion(
  skillId: string,
  bumpType: VersionBumpType,
  changelog: string
): Promise<{ success: boolean; newVersion?: string; error?: string }> {
  try {
    const skill = await getCustomSkill(skillId);
    if (!skill) {
      return { success: false, error: 'Skill not found' };
    }

    const oldVersion = skill.version;
    const newVersion = incrementVersion(oldVersion, bumpType);

    const result = await updateSkillVersion(skillId, newVersion, changelog);
    if (result.success) {
      return { success: true, newVersion };
    }
    return result;
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// =============================================================================
// Rollback
// =============================================================================

/**
 * Roll back a skill to a previous version.
 */
export async function rollbackSkillVersion(
  skillId: string,
  targetVersion: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const history = getVersionHistory(skillId);
    const targetEntry = history.find((v) => v.version === targetVersion);

    if (!targetEntry) {
      return { success: false, error: `Version ${targetVersion} not found in history` };
    }

    // Get current skill
    const currentSkill = await getCustomSkill(skillId);
    if (!currentSkill) {
      return { success: false, error: 'Skill not found' };
    }

    // Record rollback in history
    await recordVersion(
      skillId,
      currentSkill.version,
      `Rollback to ${targetVersion}`,
      {
        id: currentSkill.id,
        name: currentSkill.name,
        version: currentSkill.version,
        author: currentSkill.author,
        description: currentSkill.description,
        icon: currentSkill.icon,
        category: currentSkill.category,
        tags: currentSkill.tags,
        chatTriggerable: currentSkill.chatTriggerable,
        chatKeywords: currentSkill.chatKeywords,
        order: currentSkill.order,
      }
    );

    // Restore the target version manifest
    const restoredSkill: SkillDefinition = {
      ...currentSkill,
      version: targetEntry.manifest.version,
      description: targetEntry.manifest.description,
      systemPrompt: (currentSkill as any).systemPrompt ?? '',
      examplePrompts: (currentSkill as any).examplePrompts ?? [],
      requiredContext: (currentSkill as any).requiredContext ?? [],
      optionalContext: (currentSkill as any).optionalContext ?? [],
      maxSteps: (currentSkill as any).maxSteps ?? 5,
      showSteps: (currentSkill as any).showSteps ?? false,
      enabled: currentSkill.enabled,
    };

    await saveCustomSkill(restoredSkill);
    await skillRegistry.loadSkills();

    console.log(`[SkillVersionManager] Rolled back skill ${skillId} to ${targetVersion}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Get available versions for rollback (all except current).
 */
export function getRollbackVersions(skillId: string): SkillVersion[] {
  const history = getVersionHistory(skillId);
  if (history.length <= 1) return [];

  // Return all except the last (current) version
  return history.slice(0, -1);
}

/**
 * Check if a newer version is available for a skill.
 */
export function hasNewerVersion(
  skillId: string,
  currentVersion: string
): { available: boolean; latestVersion?: string; changelog?: string } {
  const history = getVersionHistory(skillId);
  if (history.length === 0) return { available: false };

  const latest = history[history.length - 1];
  const [curMaj, curMin, curPat] = currentVersion.split('.').map(Number);
  const [latMaj, latMin, latPat] = latest.version.split('.').map(Number);

  const isNewer =
    latMaj > curMaj ||
    (latMaj === curMaj && latMin > curMin) ||
    (latMaj === curMaj && latMin === curMin && latPat > curPat);

  if (isNewer) {
    return {
      available: true,
      latestVersion: latest.version,
      changelog: latest.changelog,
    };
  }

  return { available: false };
}

// =============================================================================
// Update Notifications
// =============================================================================

export interface UpdateNotification {
  skillId: string;
  skillName: string;
  currentVersion: string;
  newVersion: string;
  changelog: string;
  notifiedAt: number;
}

const UPDATE_NOTIFICATIONS_KEY = 'v85-update-notifications';

/**
 * Get all pending update notifications.
 */
export function getUpdateNotifications(): UpdateNotification[] {
  try {
    const raw = localStorage.getItem(UPDATE_NOTIFICATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Mark an update notification as seen/dismissed.
 */
export function dismissUpdateNotification(skillId: string): void {
  const notifications = getUpdateNotifications().filter((n) => n.skillId !== skillId);
  localStorage.setItem(UPDATE_NOTIFICATIONS_KEY, JSON.stringify(notifications));
}

/**
 * Check for updates for all installed skills and return pending notifications.
 */
export async function checkForUpdates(): Promise<UpdateNotification[]> {
  const notifications: UpdateNotification[] = [];
  const historyStore = getVersionHistoryStore();

  for (const skillId of Object.keys(historyStore)) {
    const skill = await getCustomSkill(skillId);
    if (!skill) continue;

    const check = hasNewerVersion(skillId, skill.version);
    if (check.available && check.latestVersion) {
      notifications.push({
        skillId,
        skillName: skill.name,
        currentVersion: skill.version,
        newVersion: check.latestVersion,
        changelog: check.changelog ?? '',
        notifiedAt: Date.now(),
      });
    }
  }

  return notifications;
}
