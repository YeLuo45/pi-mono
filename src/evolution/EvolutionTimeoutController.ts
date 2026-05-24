/**
 * V155: EvolutionTimeoutController - Timeout and retry management for evolution tasks
 * 
 * Provides withTimeout and withRetry capabilities with exponential backoff.
 */

export interface TimeoutConfig {
  patternAnalysisMs: number;     // 30000
  strategyOptimizationMs: number; // 60000
  skillCrystallizationMs: number; // 120000
  maxRetries: number;            // 3
  retryDelayMs: number;          // 1000
}

export class EvolutionTimeoutController {
  private runningTasks = new Set<string>();
  private active = 0;
  private completed = 0;
  private timedOut = 0;
  private retries = 0;

  /**
   * Execute task with timeout
   */
  withTimeout<T>(task: () => Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.timedOut++;
        reject(new Error('Timeout'));
      }, timeoutMs);

      task()
        .then((result) => {
          clearTimeout(timer);
          this.completed++;
          resolve(result);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  /**
   * Execute task with retry and exponential backoff
   */
  async withRetry<T>(task: () => Promise<T>, config: TimeoutConfig): Promise<T> {
    let lastError: Error | null = null;
    const maxAttempts = config.maxRetries + 1; // initial + retries

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        // Exponential backoff: delay grows exponentially
        const delay = config.retryDelayMs * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
        this.retries++;
      }

      try {
        // Use a default timeout if no specific config available
        const result = await this.withTimeout(task, config.patternAnalysisMs);
        return result;
      } catch (err) {
        lastError = err as Error;
        // If last attempt, rethrow
        if (attempt === maxAttempts - 1) {
          throw lastError;
        }
      }
    }

    throw lastError || new Error('Unknown error');
  }

  /**
   * Get set of running task IDs
   */
  getRunningTasks(): Set<string> {
    return new Set(this.runningTasks);
  }

  /**
   * Cancel a running task
   */
  cancelTask(taskId: string): boolean {
    return this.runningTasks.delete(taskId);
  }

  /**
   * Get controller statistics
   */
  getStats() {
    return {
      active: this.active,
      completed: this.completed,
      timedOut: this.timedOut,
      retries: this.retries,
    };
  }
}