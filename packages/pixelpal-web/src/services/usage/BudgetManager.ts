/**
 * BudgetManager Service for PixelPal V88
 * 
 * Manages cost budgets and alerts.
 */

import type { CostBudget } from '../../types/usage';

const STORAGE_KEY = 'pixelpal-cost-budgets';

export type BudgetAlertType = 'warning' | 'critical' | 'exceeded';

export interface BudgetAlert {
  type: BudgetAlertType;
  budgetId: string;
  budgetType: 'daily' | 'weekly' | 'monthly';
  limit: number;
  current: number;
  percentage: number;
  providerId?: string;
}

class BudgetManager {
  private budgets: CostBudget[] = [];
  private listeners: Set<(alert: BudgetAlert) => void> = new Set();

  constructor() {
    this.loadFromStorage();
    this.ensureDefaultBudgets();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.budgets = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load budgets from storage:', e);
      this.budgets = [];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.budgets));
    } catch (e) {
      console.warn('Failed to save budgets to storage:', e);
    }
  }

  private ensureDefaultBudgets(): void {
    const now = Date.now();
    
    // Daily budget
    if (!this.budgets.find(b => b.type === 'daily')) {
      this.budgets.push({
        id: 'default-daily',
        type: 'daily',
        limit: 10, // $10/day default
        current: 0,
        resetAt: this.getNextResetTime('daily'),
        enabled: false,
      });
    }

    // Weekly budget
    if (!this.budgets.find(b => b.type === 'weekly')) {
      this.budgets.push({
        id: 'default-weekly',
        type: 'weekly',
        limit: 50, // $50/week default
        current: 0,
        resetAt: this.getNextResetTime('weekly'),
        enabled: false,
      });
    }

    // Monthly budget
    if (!this.budgets.find(b => b.type === 'monthly')) {
      this.budgets.push({
        id: 'default-monthly',
        type: 'monthly',
        limit: 200, // $200/month default
        current: 0,
        resetAt: this.getNextResetTime('monthly'),
        enabled: false,
      });
    }

    this.saveToStorage();
  }

  private getNextResetTime(type: 'daily' | 'weekly' | 'monthly'): number {
    const now = new Date();
    
    if (type === 'daily') {
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      return tomorrow.getTime();
    }
    
    if (type === 'weekly') {
      const nextWeek = new Date(now);
      nextWeek.setDate(now.getDate() + (7 - now.getDay()));
      nextWeek.setHours(0, 0, 0, 0);
      return nextWeek.getTime();
    }
    
    // Monthly
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.getTime();
  }

  /**
   * Check and update budget after cost is incurred
   * Returns alert if budget is exceeded or near limit
   */
  checkBudget(amount: number, providerId?: string): BudgetAlert | null {
    const now = Date.now();

    for (const budget of this.budgets) {
      if (!budget.enabled) continue;
      
      // Check if provider-specific budget
      if (budget.providerId && budget.providerId !== providerId) continue;

      // Check if it's time to reset
      if (now >= budget.resetAt) {
        budget.current = 0;
        budget.resetAt = this.getNextResetTime(budget.type);
      }

      // Add the cost
      budget.current += amount;

      // Check thresholds
      const percentage = (budget.current / budget.limit) * 100;
      
      if (percentage >= 100) {
        const alert: BudgetAlert = {
          type: 'exceeded',
          budgetId: budget.id,
          budgetType: budget.type,
          limit: budget.limit,
          current: budget.current,
          percentage,
          providerId: budget.providerId,
        };
        this.notifyListeners(alert);
        this.saveToStorage();
        return alert;
      }
      
      if (percentage >= 90) {
        const alert: BudgetAlert = {
          type: 'critical',
          budgetId: budget.id,
          budgetType: budget.type,
          limit: budget.limit,
          current: budget.current,
          percentage,
          providerId: budget.providerId,
        };
        this.notifyListeners(alert);
        return alert;
      }
      
      if (percentage >= 75) {
        const alert: BudgetAlert = {
          type: 'warning',
          budgetId: budget.id,
          budgetType: budget.type,
          limit: budget.limit,
          current: budget.current,
          percentage,
          providerId: budget.providerId,
        };
        this.notifyListeners(alert);
        return alert;
      }
    }

    this.saveToStorage();
    return null;
  }

  /**
   * Update budget current spend (call after usage is recorded)
   */
  updateBudgetSpend(amount: number, providerId?: string): void {
    const now = Date.now();

    for (const budget of this.budgets) {
      if (!budget.enabled) continue;
      if (budget.providerId && budget.providerId !== providerId) continue;

      // Check if it's time to reset
      if (now >= budget.resetAt) {
        budget.current = 0;
        budget.resetAt = this.getNextResetTime(budget.type);
      }

      budget.current += amount;
    }

    this.saveToStorage();
  }

  /**
   * Get all budgets
   */
  getBudgets(): CostBudget[] {
    return [...this.budgets];
  }

  /**
   * Get budget by type
   */
  getBudgetByType(type: 'daily' | 'weekly' | 'monthly', providerId?: string): CostBudget | undefined {
    return this.budgets.find(b => b.type === type && (!providerId || b.providerId === providerId));
  }

  /**
   * Set a budget limit
   */
  setBudget(type: 'daily' | 'weekly' | 'monthly', limit: number, enabled: boolean, providerId?: string): void {
    let budget = this.budgets.find(b => b.type === type && (!providerId || b.providerId === providerId));
    
    if (!budget) {
      budget = {
        id: providerId ? `${providerId}-${type}` : `default-${type}`,
        type,
        limit,
        current: 0,
        resetAt: this.getNextResetTime(type),
        enabled,
        providerId,
      };
      this.budgets.push(budget);
    } else {
      budget.limit = limit;
      budget.enabled = enabled;
    }

    this.saveToStorage();
  }

  /**
   * Enable/disable a budget
   */
  setBudgetEnabled(type: 'daily' | 'weekly' | 'monthly', enabled: boolean, providerId?: string): void {
    const budget = this.getBudgetByType(type, providerId);
    if (budget) {
      budget.enabled = enabled;
      this.saveToStorage();
    }
  }

  /**
   * Reset a specific budget
   */
  resetBudget(budgetId: string): void {
    const budget = this.budgets.find(b => b.id === budgetId);
    if (budget) {
      budget.current = 0;
      budget.resetAt = this.getNextResetTime(budget.type);
      this.saveToStorage();
    }
  }

  /**
   * Reset all budgets
   */
  resetAllBudgets(): void {
    for (const budget of this.budgets) {
      budget.current = 0;
      budget.resetAt = this.getNextResetTime(budget.type);
    }
    this.saveToStorage();
  }

  /**
   * Subscribe to budget alerts
   */
  subscribe(listener: (alert: BudgetAlert) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(alert: BudgetAlert): void {
    this.listeners.forEach(listener => {
      try {
        listener(alert);
      } catch (e) {
        console.warn('BudgetManager listener error:', e);
      }
    });
  }

  /**
   * Format budget type for display
   */
  formatBudgetType(type: 'daily' | 'weekly' | 'monthly'): string {
    switch (type) {
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
    }
  }

  /**
   * Get time until next reset
   */
  getTimeUntilReset(budgetId: string): number {
    const budget = this.budgets.find(b => b.id === budgetId);
    if (!budget) return 0;
    return Math.max(0, budget.resetAt - Date.now());
  }
}

// Export singleton
export const budgetManager = new BudgetManager();
export default budgetManager;
