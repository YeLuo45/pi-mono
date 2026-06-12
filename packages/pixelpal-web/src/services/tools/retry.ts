export class ToolRetryStrategy {
  private static readonly RETRYABLE_PATTERNS = [
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'network',
    'timeout',
    'rate limit',
    '429',
    '503',
    '502',
    '504',
  ];

  private static readonly NON_RETRYABLE_PATTERNS = [
    'SyntaxError',
    'ParseError',
    'ValidationError',
    'invalid',
    'undefined',
    'null',
  ];

  static shouldRetry(toolName: string, error: unknown): boolean {
    const errorStr = String(error ?? '');
    const isRetryable = this.RETRYABLE_PATTERNS.some((p) =>
      errorStr.toLowerCase().includes(p.toLowerCase())
    );
    const isNonRetryable = this.NON_RETRYABLE_PATTERNS.some((p) =>
      errorStr.toLowerCase().includes(p.toLowerCase())
    );
    return isRetryable && !isNonRetryable;
  }

  static getDelay(attempt: number, error: unknown): number {
    const baseDelay = Math.pow(2, attempt) * 1000;
    return Math.min(baseDelay, 60000);
  }
}
