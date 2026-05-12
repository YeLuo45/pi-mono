/**
 * V78: Marketplace Service
 * Handles community skills and ratings CRUD operations using localStorage.
 */

import type { SkillDefinition, SkillCategory } from '../skills/types';
import { sampleMarketplaceSkills, sampleRatings, type MarketplaceSkill, type SkillRating } from '../../data/sampleMarketplaceSkills';
import { saveCustomSkill } from '../skills/skillStorage';
import { skillRegistry } from '../skills/skillRegistry';

const COMMUNITY_SKILLS_KEY = 'community-skills';
const SKILL_RATINGS_KEY = 'skill-ratings';
const INSTALL_COUNT_KEY = 'skill-install-counts';

// =============================================================================
// Community Skills (localStorage)
// =============================================================================

/**
 * Get all community skills from localStorage.
 * Seeds with sample data if empty.
 */
export function getCommunitySkills(): MarketplaceSkill[] {
  try {
    const stored = localStorage.getItem(COMMUNITY_SKILLS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    // First time: seed with sample data
    seedCommunitySkills();
    return sampleMarketplaceSkills;
  } catch {
    return sampleMarketplaceSkills;
  }
}

/**
 * Seed community skills with sample data (only runs once).
 */
function seedCommunitySkills(): void {
  localStorage.setItem(COMMUNITY_SKILLS_KEY, JSON.stringify(sampleMarketplaceSkills));
  localStorage.setItem(SKILL_RATINGS_KEY, JSON.stringify(sampleRatings));
}

/**
 * Save a skill to the community marketplace.
 */
export async function shareSkillToMarketplace(skill: SkillDefinition): Promise<MarketplaceSkill> {
  const communitySkills = getCommunitySkills();
  
  const marketplaceSkill: MarketplaceSkill = {
    ...skill,
    installCount: 0,
    avgRating: 0,
    uploadedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  // Check if skill already exists (update) or is new
  const existingIndex = communitySkills.findIndex(s => s.id === skill.id);
  if (existingIndex >= 0) {
    communitySkills[existingIndex] = {
      ...marketplaceSkill,
      installCount: communitySkills[existingIndex].installCount,
      avgRating: communitySkills[existingIndex].avgRating,
    };
  } else {
    communitySkills.push(marketplaceSkill);
  }
  
  localStorage.setItem(COMMUNITY_SKILLS_KEY, JSON.stringify(communitySkills));
  return marketplaceSkill;
}

/**
 * Remove a skill from the community marketplace.
 */
export function removeFromMarketplace(skillId: string): void {
  const communitySkills = getCommunitySkills();
  const filtered = communitySkills.filter(s => s.id !== skillId);
  localStorage.setItem(COMMUNITY_SKILLS_KEY, JSON.stringify(filtered));
}

// =============================================================================
// Ratings
// =============================================================================

/**
 * Get ratings for a specific skill.
 */
export function getSkillRatings(skillId: string): SkillRating[] {
  try {
    const stored = localStorage.getItem(SKILL_RATINGS_KEY);
    if (stored) {
      const ratings = JSON.parse(stored);
      return ratings[skillId] || [];
    }
    return sampleRatings[skillId] || [];
  } catch {
    return sampleRatings[skillId] || [];
  }
}

/**
 * Add a rating for a skill.
 */
export function addSkillRating(skillId: string, rating: SkillRating): void {
  const stored = localStorage.getItem(SKILL_RATINGS_KEY);
  const ratings = stored ? JSON.parse(stored) : {};
  
  if (!ratings[skillId]) {
    ratings[skillId] = [];
  }
  
  // Check if user already rated
  const existingIndex = ratings[skillId].findIndex((r: SkillRating) => r.userId === rating.userId);
  if (existingIndex >= 0) {
    ratings[skillId][existingIndex] = rating;
  } else {
    ratings[skillId].push(rating);
  }
  
  localStorage.setItem(SKILL_RATINGS_KEY, JSON.stringify(ratings));
  
  // Update average rating for the skill
  updateSkillAvgRating(skillId);
}

/**
 * Update the average rating for a skill.
 */
function updateSkillAvgRating(skillId: string): void {
  const communitySkills = getCommunitySkills();
  const ratings = getSkillRatings(skillId);
  
  if (ratings.length === 0) return;
  
  const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
  
  const skillIndex = communitySkills.findIndex(s => s.id === skillId);
  if (skillIndex >= 0) {
    communitySkills[skillIndex].avgRating = Math.round(avgRating * 10) / 10;
    localStorage.setItem(COMMUNITY_SKILLS_KEY, JSON.stringify(communitySkills));
  }
}

// =============================================================================
// Install Count
// =============================================================================

/**
 * Get install count for a skill.
 */
export function getInstallCount(skillId: string): number {
  try {
    const stored = localStorage.getItem(INSTALL_COUNT_KEY);
    if (stored) {
      const counts = JSON.parse(stored);
      return counts[skillId] || 0;
    }
    // Return from marketplace skill data
    const communitySkills = getCommunitySkills();
    const skill = communitySkills.find(s => s.id === skillId);
    return skill?.installCount || 0;
  } catch {
    return 0;
  }
}

/**
 * Increment install count for a skill.
 */
function incrementInstallCount(skillId: string): void {
  const stored = localStorage.getItem(INSTALL_COUNT_KEY);
  const counts = stored ? JSON.parse(stored) : {};
  
  counts[skillId] = (counts[skillId] || 0) + 1;
  localStorage.setItem(INSTALL_COUNT_KEY, JSON.stringify(counts));
  
  // Also update in community skills
  const communitySkills = getCommunitySkills();
  const skillIndex = communitySkills.findIndex(s => s.id === skillId);
  if (skillIndex >= 0) {
    communitySkills[skillIndex].installCount++;
    localStorage.setItem(COMMUNITY_SKILLS_KEY, JSON.stringify(communitySkills));
  }
}

// =============================================================================
// Skill Installation
// =============================================================================

/**
 * Install a marketplace skill to user's custom skills (IndexedDB).
 */
export async function installMarketplaceSkill(skill: MarketplaceSkill): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if already installed
    const existingSkill = await skillRegistry.getSkill(skill.id);
    if (existingSkill) {
      return { success: false, error: 'Already installed' };
    }
    
    // Create SkillDefinition from MarketplaceSkill (remove marketplace-specific fields)
    const skillDefinition: SkillDefinition = {
      id: skill.id,
      name: skill.name,
      description: skill.description,
      icon: skill.icon,
      version: skill.version,
      author: skill.author,
      category: skill.category,
      tags: skill.tags,
      chatTriggerable: skill.chatTriggerable,
      chatKeywords: skill.chatKeywords,
      order: skill.order,
      enabled: true,
      systemPrompt: skill.systemPrompt,
      examplePrompts: skill.examplePrompts,
      requiredContext: skill.requiredContext,
      optionalContext: skill.optionalContext,
      maxSteps: skill.maxSteps,
      showSteps: skill.showSteps,
    };
    
    // Save to IndexedDB
    await saveCustomSkill(skillDefinition);
    
    // Increment install count
    incrementInstallCount(skill.id);
    
    // Reload skills in registry
    await skillRegistry.loadSkills();
    
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Check if a skill is installed.
 */
export async function isSkillInstalled(skillId: string): Promise<boolean> {
  const skill = await skillRegistry.getSkill(skillId);
  return !!skill;
}

// =============================================================================
// Search & Filter
// =============================================================================

/**
 * Search community skills by query.
 */
export function searchCommunitySkills(
  query: string,
  category?: SkillCategory | 'all'
): MarketplaceSkill[] {
  let skills = getCommunitySkills();
  
  // Filter by category
  if (category && category !== 'all') {
    skills = skills.filter(s => s.category === category);
  }
  
  // Filter by search query
  if (query.trim()) {
    const q = query.toLowerCase();
    skills = skills.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.tags.some(tag => tag.toLowerCase().includes(q)) ||
      s.author.toLowerCase().includes(q)
    );
  }
  
  return skills;
}

/**
 * Sort skills by criteria.
 */
export function sortCommunitySkills(
  skills: MarketplaceSkill[],
  sortBy: 'popular' | 'rating' | 'newest' = 'popular'
): MarketplaceSkill[] {
  const sorted = [...skills];
  
  switch (sortBy) {
    case 'popular':
      sorted.sort((a, b) => b.installCount - a.installCount);
      break;
    case 'rating':
      sorted.sort((a, b) => b.avgRating - a.avgRating);
      break;
    case 'newest':
      sorted.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      break;
  }
  
  return sorted;
}
