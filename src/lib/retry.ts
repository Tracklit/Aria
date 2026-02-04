/**
 * Retry utility for API requests with exponential backoff
 */

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  shouldRetry?: (error: Error) => boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

const defaultRetryOptions: Required<Omit<RetryOptions, 'onRetry'>> = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  shouldRetry: (error: Error) => {
    // Retry on network errors or 5xx server errors
    const status = (error as any).status;
    if (!status) return true; // Network error
    return status >= 500 && status < 600;
  },
};

/**
 * Exponential backoff delay calculation
 * Returns delay in milliseconds with jitter to prevent thundering herd
 */
function calculateDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const delayWithJitter = exponentialDelay * (0.5 + Math.random() * 0.5);
  return Math.min(delayWithJitter, maxDelay);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...defaultRetryOptions, ...options };
  let lastError: Error;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry if this is the last attempt
      if (attempt === opts.maxRetries) {
        throw lastError;
      }

      // Check if we should retry this error
      if (opts.shouldRetry && !opts.shouldRetry(lastError)) {
        throw lastError;
      }

      // Calculate delay and wait
      const delay = calculateDelay(attempt, opts.baseDelay, opts.maxDelay);

      if (__DEV__) {
        console.log(
          `[Retry] Attempt ${attempt + 1}/${opts.maxRetries + 1} failed. ` +
          `Retrying in ${Math.round(delay)}ms...`,
          lastError.message
        );
      }

      // Call onRetry callback if provided
      if (options.onRetry) {
        options.onRetry(attempt + 1, lastError);
      }

      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Create a retryable version of a function
 */
export function makeRetryable<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = {}
): T {
  return ((...args: any[]) => {
    return retryWithBackoff(() => fn(...args), options);
  }) as T;
}

/**
 * Batch retry multiple promises with different retry strategies
 */
export async function retryBatch<T>(
  tasks: Array<{ fn: () => Promise<T>; options?: RetryOptions }>,
  options: { failFast?: boolean } = {}
): Promise<Array<T | Error>> {
  const { failFast = false } = options;

  if (failFast) {
    // Stop on first failure
    const results: Array<T | Error> = [];
    for (const task of tasks) {
      try {
        const result = await retryWithBackoff(task.fn, task.options);
        results.push(result);
      } catch (error) {
        results.push(error as Error);
        break;
      }
    }
    return results;
  } else {
    // Continue even if some fail
    return Promise.all(
      tasks.map(async (task) => {
        try {
          return await retryWithBackoff(task.fn, task.options);
        } catch (error) {
          return error as Error;
        }
      })
    );
  }
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: Error): boolean {
  const status = (error as any).status;

  // Network errors (no status)
  if (!status) return true;

  // Server errors (5xx)
  if (status >= 500 && status < 600) return true;

  // Rate limiting (429)
  if (status === 429) return true;

  // Timeouts (408, 504)
  if (status === 408 || status === 504) return true;

  return false;
}

/**
 * Get a user-friendly error message for retry failures
 */
export function getRetryErrorMessage(error: Error, attempts: number): string {
  const status = (error as any).status;

  if (status === 429) {
    return 'Service is busy. Please try again in a moment.';
  }

  if (status >= 500) {
    return `Server error (${status}). We've tried ${attempts} times. Please try again later.`;
  }

  if (!status) {
    return `Network error. We've tried ${attempts} times. Please check your connection.`;
  }

  return error.message || 'An error occurred. Please try again.';
}
