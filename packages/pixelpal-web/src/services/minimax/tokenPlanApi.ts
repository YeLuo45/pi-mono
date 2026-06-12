/**
 * MiniMax Token Plan API - V96
 * 
 * API for querying MiniMax token balance and plan information.
 * Official docs: https://www.minimaxi.com/document
 */

const TOKEN_PLAN_API = 'https://api.minimax.io/v1/text/理解和风控/chatcompletion_pro';

export interface TokenPlanInfo {
  available: number;    // Available tokens
  total: number;        // Total tokens in plan
  expiresAt?: string;   // Expiration date (ISO string)
  planType?: string;    // Plan type name
}

export interface TokenUsageInfo {
  usedToday: number;
  usedTotal: number;
  quotaDaily: number;
}

/**
 * Query MiniMax token plan information
 * @param apiKey - MiniMax API key
 * @returns Token plan info including available, total, expiration
 */
export async function queryTokenPlan(apiKey: string): Promise<TokenPlanInfo> {
  try {
    const response = await fetch(TOKEN_PLAN_API, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Token Plan API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      available: data.available ?? data.remain_tokens ?? 0,
      total: data.total ?? data.total_tokens ?? 0,
      expiresAt: data.expires_at ?? data.expire_time,
      planType: data.plan_type ?? data.plan_name,
    };
  } catch (error) {
    console.error('[MiniMax TokenPlan] Failed to query token plan:', error);
    throw error;
  }
}

/**
 * Query MiniMax daily token usage
 * @param apiKey - MiniMax API key
 * @returns Daily usage information
 */
export async function queryTokenUsage(apiKey: string): Promise<TokenUsageInfo> {
  try {
    const response = await fetch(`${TOKEN_PLAN_API}/usage`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Token Usage API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      usedToday: data.used_today ?? data.daily_used ?? 0,
      usedTotal: data.used_total ?? 0,
      quotaDaily: data.quota_daily ?? data.daily_quota ?? 0,
    };
  } catch (error) {
    console.error('[MiniMax TokenPlan] Failed to query token usage:', error);
    throw error;
  }
}

/**
 * Check if token plan is low and needs attention
 * @param planInfo - Token plan info from queryTokenPlan
 * @param threshold - Low threshold percentage (default 10%)
 * @returns True if plan is running low
 */
export function isPlanLow(planInfo: TokenPlanInfo, threshold: number = 0.1): boolean {
  if (planInfo.total === 0) return true;
  return (planInfo.available / planInfo.total) < threshold;
}

/**
 * Get days until plan expiration
 * @param planInfo - Token plan info from queryTokenPlan
 * @returns Days until expiration, or -1 if no expiration
 */
export function getDaysUntilExpiration(planInfo: TokenPlanInfo): number {
  if (!planInfo.expiresAt) return -1;
  
  const expires = new Date(planInfo.expiresAt);
  const now = new Date();
  const diffMs = expires.getTime() - now.getTime();
  
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export default {
  queryTokenPlan,
  queryTokenUsage,
  isPlanLow,
  getDaysUntilExpiration,
};
