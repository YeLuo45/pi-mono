/**
 * CostCalculator Service for PixelPal V88
 * 
 * Calculates the cost of AI API calls based on provider pricing.
 */

import type { ProviderPricing } from '../../types/usage';
import { DEFAULT_PRICING } from '../../types/usage';

class CostCalculator {
  private pricing: Map<string, ProviderPricing> = new Map();

  constructor() {
    // Initialize with default pricing
    DEFAULT_PRICING.forEach(p => {
      this.pricing.set(p.providerId, p);
    });
  }

  /**
   * Update pricing for a provider
   */
  setPricing(providerId: string, promptPrice: number, completionPrice: number): void {
    this.pricing.set(providerId, {
      providerId,
      promptTokenPrice: promptPrice,
      completionTokenPrice: completionPrice,
    });
  }

  /**
   * Get pricing for a provider
   */
  getPricing(providerId: string): ProviderPricing | undefined {
    return this.pricing.get(providerId);
  }

  /**
   * Calculate cost for a given token usage
   */
  calculateCost(
    providerId: string,
    promptTokens: number,
    completionTokens: number
  ): number {
    const pricing = this.pricing.get(providerId);
    if (!pricing) {
      // Default to free if provider not found
      return 0;
    }

    const promptCost = (promptTokens / 1_000_000) * pricing.promptTokenPrice;
    const completionCost = (completionTokens / 1_000_000) * pricing.completionTokenPrice;
    return promptCost + completionCost;
  }

  /**
   * Estimate cost before making a call (based on typical input/output ratios)
   */
  estimateCost(providerId: string, estimatedPromptTokens: number, estimatedCompletionTokens?: number): number {
    const pricing = this.pricing.get(providerId);
    if (!pricing) return 0;

    const promptCost = (estimatedPromptTokens / 1_000_000) * pricing.promptTokenPrice;
    
    // If completion tokens not provided, estimate as 2x prompt
    const estimatedCompletion = estimatedCompletionTokens ?? estimatedPromptTokens * 2;
    const completionCost = (estimatedCompletion / 1_000_000) * pricing.completionTokenPrice;
    
    return promptCost + completionCost;
  }

  /**
   * Get cost per 1K tokens for a provider
   */
  getCostPerThousandTokens(providerId: string): { prompt: number; completion: number; average: number } {
    const pricing = this.pricing.get(providerId);
    if (!pricing) {
      return { prompt: 0, completion: 0, average: 0 };
    }
    
    // Average assuming 50/50 prompt/completion ratio
    const average = (pricing.promptTokenPrice + pricing.completionTokenPrice) / 2;
    return {
      prompt: pricing.promptTokenPrice,
      completion: pricing.completionTokenPrice,
      average,
    };
  }

  /**
   * Format cost for display
   */
  formatCost(cost: number): string {
    if (cost < 0.0001) return '$0.00';
    if (cost < 0.01) return `$${cost.toFixed(4)}`;
    if (cost < 1) return `$${cost.toFixed(3)}`;
    return `$${cost.toFixed(2)}`;
  }

  /**
   * Format token count for display
   */
  formatTokens(tokens: number): string {
    if (tokens < 1000) return `${tokens}`;
    if (tokens < 1_000_000) return `${(tokens / 1000).toFixed(1)}K`;
    return `${(tokens / 1_000_000).toFixed(2)}M`;
  }

  /**
   * Get estimated monthly cost based on current usage rate
   */
  estimateMonthlyCost(currentCostThisMonth: number, daysElapsed: number): number {
    if (daysElapsed <= 0) return 0;
    const dailyRate = currentCostThisMonth / daysElapsed;
    const daysInMonth = 30; // Approximate
    return dailyRate * daysInMonth;
  }
}

// Export singleton
export const costCalculator = new CostCalculator();
export default costCalculator;
