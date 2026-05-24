/**
 * V155: CircuitBreaker - Circuit breaker pattern implementation
 * 
 * States: closed (normal) → open (failing) → half-open (testing recovery)
 * After failureThreshold failures, opens for recoveryTimeoutMs before trying half-open.
 */

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  failureThreshold: number;      // default 5
  recoveryTimeoutMs: number;     // default 60000 (1min后尝试半开)
  halfOpenRequests: number;      // default 3 (半开时允许3个测试请求)
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryTimeoutMs: 60000,
  halfOpenRequests: 3,
};

export class CircuitBreaker {
  state: CircuitState = 'closed';
  failureCount: number = 0;
  lastFailureTime: number = 0;
  private config: CircuitBreakerConfig;
  private halfOpenAttempts = 0;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Record successful execution - resets failure count in closed state,
   * or decrements halfOpenAttempts in half-open state
   */
  recordSuccess(): void {
    if (this.state === 'closed') {
      this.failureCount = 0;
    } else if (this.state === 'half-open') {
      this.halfOpenAttempts++;
      if (this.halfOpenAttempts >= this.config.halfOpenRequests) {
        // All half-open requests succeeded, close the circuit
        this.state = 'closed';
        this.failureCount = 0;
        this.halfOpenAttempts = 0;
      }
    }
  }

  /**
   * Record failed execution
   */
  recordFailure(): void {
    this.failureCount++;
    if (this.state === 'closed' && this.failureCount >= this.config.failureThreshold) {
      this.state = 'open';
      this.lastFailureTime = Date.now();
    } else if (this.state === 'half-open') {
      // Any failure in half-open immediately opens the circuit
      this.state = 'open';
      this.lastFailureTime = Date.now();
      this.halfOpenAttempts = 0;
    }
  }

  /**
   * Check if execution is allowed
   */
  canExecute(): boolean {
    if (this.state === 'closed') {
      return true;
    }
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.config.recoveryTimeoutMs) {
        this.state = 'half-open';
        this.halfOpenAttempts = 0;
        return true;
      }
      return false;
    }
    return true; // half-open
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Reset circuit breaker to initial closed state
   */
  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.halfOpenAttempts = 0;
  }
}