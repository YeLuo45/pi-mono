/**
 * SkillRatingService — V85 Skill Ecosystem
 * Manages skill ratings, reviews, and statistics using localStorage.
 */

import type { SkillReview, RatingSubmission } from '../../types/skill';
import type { MarketplaceSkill, SkillRating } from '../../data/sampleMarketplaceSkills';

const RATINGS_KEY = 'v85-skill-ratings';
const REVIEWS_KEY = 'v85-skill-reviews';
const CALLS_KEY = 'v85-skill-calls';

// =============================================================================
// Rating Storage
// =============================================================================

function getRatingsStore(): Record<string, SkillRating[]> {
  try {
    const raw = localStorage.getItem(RATINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveRatingsStore(store: Record<string, SkillRating[]>): void {
  localStorage.setItem(RATINGS_KEY, JSON.stringify(store));
}

function getReviewsStore(): Record<string, SkillReview[]> {
  try {
    const raw = localStorage.getItem(REVIEWS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveReviewsStore(store: Record<string, SkillReview[]>): void {
  localStorage.setItem(REVIEWS_KEY, JSON.stringify(store));
}

function getCallsStore(): Record<string, number> {
  try {
    const raw = localStorage.getItem(CALLS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCallsStore(store: Record<string, number>): void {
  localStorage.setItem(CALLS_KEY, JSON.stringify(store));
}

// =============================================================================
// Ratings
// =============================================================================

/**
 * Get all ratings for a skill.
 */
export function getRatings(skillId: string): SkillRating[] {
  const store = getRatingsStore();
  return store[skillId] ?? [];
}

/**
 * Get the average rating for a skill.
 */
export function getAverageRating(skillId: string): number {
  const ratings = getRatings(skillId);
  if (ratings.length === 0) return 0;
  const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}

/**
 * Get the total number of ratings for a skill.
 */
export function getRatingsCount(skillId: string): number {
  return getRatings(skillId).length;
}

/**
 * Submit or update a rating for a skill.
 */
export function submitRating(submission: RatingSubmission): SkillRating {
  const { skillId, userId, rating, comment } = submission;
  const store = getRatingsStore();

  if (!store[skillId]) {
    store[skillId] = [];
  }

  const existingIndex = store[skillId].findIndex((r) => r.userId === userId);
  const newRating: SkillRating = {
    userId,
    rating: Math.min(5, Math.max(1, rating)) as 1 | 2 | 3 | 4 | 5,
    review: comment,
    createdAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    store[skillId][existingIndex] = newRating;
  } else {
    store[skillId].push(newRating);
  }

  saveRatingsStore(store);

  // Also save as review if comment provided
  if (comment?.trim()) {
    const reviewsStore = getReviewsStore();
    if (!reviewsStore[skillId]) {
      reviewsStore[skillId] = [];
    }
    const reviewId = `${userId}-${Date.now()}`;
    const newReview: SkillReview = {
      id: reviewId,
      userId,
      rating: newRating.rating,
      comment: comment.trim(),
      createdAt: Date.now(),
    };
    const revIdx = reviewsStore[skillId].findIndex((r) => r.userId === userId);
    if (revIdx >= 0) {
      reviewsStore[skillId][revIdx] = newReview;
    } else {
      reviewsStore[skillId].push(newReview);
    }
    saveReviewsStore(reviewsStore);
  }

  return newRating;
}

/**
 * Get a user's rating for a skill.
 */
export function getUserRating(skillId: string, userId: string): SkillRating | null {
  const ratings = getRatings(skillId);
  return ratings.find((r) => r.userId === userId) ?? null;
}

// =============================================================================
// Reviews
// =============================================================================

/**
 * Get all reviews for a skill.
 */
export function getReviews(skillId: string): SkillReview[] {
  const store = getReviewsStore();
  return store[skillId] ?? [];
}

/**
 * Get paginated reviews for a skill.
 */
export function getReviewsPaginated(
  skillId: string,
  page: number = 1,
  pageSize: number = 10
): { reviews: SkillReview[]; total: number; hasMore: boolean } {
  const allReviews = getReviews(skillId);
  // Sort by newest first
  const sorted = [...allReviews].sort((a, b) => b.createdAt - a.createdAt);
  const start = (page - 1) * pageSize;
  const reviews = sorted.slice(start, start + pageSize);
  return {
    reviews,
    total: allReviews.length,
    hasMore: start + pageSize < allReviews.length,
  };
}

/**
 * Add a review for a skill.
 */
export function addReview(skillId: string, userId: string, rating: number, comment: string): SkillReview {
  const store = getReviewsStore();

  if (!store[skillId]) {
    store[skillId] = [];
  }

  const id = `${userId}-${Date.now()}`;
  const review: SkillReview = {
    id,
    userId,
    rating: Math.min(5, Math.max(1, rating)),
    comment: comment.trim(),
    createdAt: Date.now(),
  };

  const existingIndex = store[skillId].findIndex((r) => r.userId === userId);
  if (existingIndex >= 0) {
    review.id = store[skillId][existingIndex].id;
    store[skillId][existingIndex] = review;
  } else {
    store[skillId].push(review);
  }

  saveReviewsStore(store);

  // Also update the rating entry
  submitRating({ skillId, userId, rating, comment });

  return review;
}

/**
 * Delete a user's review.
 */
export function deleteReview(skillId: string, userId: string): void {
  const store = getReviewsStore();
  if (store[skillId]) {
    store[skillId] = store[skillId].filter((r) => r.userId !== userId);
    saveReviewsStore(store);
  }
}

// =============================================================================
// Usage Statistics
// =============================================================================

/**
 * Get call count for a skill.
 */
export function getCallCount(skillId: string): number {
  const store = getCallsStore();
  return store[skillId] ?? 0;
}

/**
 * Increment call count for a skill.
 */
export function incrementCallCount(skillId: string): void {
  const store = getCallsStore();
  store[skillId] = (store[skillId] ?? 0) + 1;
  saveCallsStore(store);
}

/**
 * Get all call counts.
 */
export function getAllCallCounts(): Record<string, number> {
  return getCallsStore();
}

/**
 * Get top skills by call count.
 */
export function getTopSkillsByCalls(limit: number = 10): Array<{ skillId: string; calls: number }> {
  const store = getCallsStore();
  return Object.entries(store)
    .map(([skillId, calls]) => ({ skillId, calls }))
    .sort((a, b) => b.calls - a.calls)
    .slice(0, limit);
}

// =============================================================================
// Combined Stats
// =============================================================================

export interface SkillStatsData {
  rating: number;
  ratingsCount: number;
  installs: number;
  calls: number;
}

/**
 * Get full stats for a skill.
 */
export function getSkillStats(
  skillId: string,
  marketplaceSkill?: MarketplaceSkill
): SkillStatsData {
  const rating = getAverageRating(skillId);
  const ratingsCount = getRatingsCount(skillId);
  const installs = marketplaceSkill?.installCount ?? 0;
  const calls = getCallCount(skillId);

  return { rating, ratingsCount, installs, calls };
}

/**
 * Get rating distribution for a skill (count per star).
 */
export function getRatingDistribution(
  skillId: string
): Record<1 | 2 | 3 | 4 | 5, number> {
  const ratings = getRatings(skillId);
  const dist: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  for (const r of ratings) {
    if (r.rating >= 1 && r.rating <= 5) {
      dist[r.rating as 1 | 2 | 3 | 4 | 5]++;
    }
  }

  return dist;
}

/**
 * Format a rating as display string.
 */
export function formatRating(rating: number): string {
  if (rating === 0) return 'N/A';
  return rating.toFixed(1);
}

/**
 * Get user's display ID (simple anonymous ID based on localStorage).
 */
export function getCurrentUserId(): string {
  const key = 'v85-user-id';
  let userId = localStorage.getItem(key);
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    localStorage.setItem(key, userId);
  }
  return userId;
}
