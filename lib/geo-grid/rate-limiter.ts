// lib/geo-grid/rate-limiter.ts
// Rate limiter for concurrent SERP API requests

export interface RateLimiterConfig {
  maxConcurrent: number; // Max concurrent requests
  requestsPerSecond: number; // Rate limit
  maxRetries: number; // Max retry attempts
  baseDelay: number; // Base delay for exponential backoff (ms)
  maxDelay: number; // Max delay cap (ms)
}

export const DEFAULT_RATE_LIMITER_CONFIG: RateLimiterConfig = {
  maxConcurrent: 3,
  requestsPerSecond: 2,
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000
};

interface QueueItem<T> {
  task: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  retries: number;
}

/**
 * Rate limiter for managing concurrent API requests
 */
export class RateLimiter {
  private config: RateLimiterConfig;
  private activeRequests: number = 0;
  private queue: QueueItem<unknown>[] = [];
  private lastRequestTime: number = 0;
  private minInterval: number;

  constructor(config: Partial<RateLimiterConfig> = {}) {
    this.config = { ...DEFAULT_RATE_LIMITER_CONFIG, ...config };
    this.minInterval = 1000 / this.config.requestsPerSecond;
  }

  /**
   * Execute a task with rate limiting and retry logic
   */
  async execute<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        task: task as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
        retries: 0
      });
      this.processQueue();
    });
  }

  /**
   * Execute multiple tasks with rate limiting
   */
  async executeAll<T>(tasks: (() => Promise<T>)[]): Promise<T[]> {
    return Promise.all(tasks.map(task => this.execute(task)));
  }

  /**
   * Execute tasks and collect results with errors
   */
  async executeAllSettled<T>(
    tasks: (() => Promise<T>)[]
  ): Promise<PromiseSettledResult<T>[]> {
    return Promise.allSettled(tasks.map(task => this.execute(task)));
  }

  private async processQueue(): Promise<void> {
    if (this.activeRequests >= this.config.maxConcurrent || this.queue.length === 0) {
      return;
    }

    // Check rate limit timing
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastRequest;
      setTimeout(() => this.processQueue(), waitTime);
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    this.activeRequests++;
    this.lastRequestTime = Date.now();

    try {
      const result = await item.task();
      item.resolve(result);
    } catch (error) {
      const shouldRetry = this.shouldRetry(error as Error, item.retries);

      if (shouldRetry && item.retries < this.config.maxRetries) {
        // Calculate exponential backoff delay
        const delay = this.calculateBackoffDelay(item.retries);
        item.retries++;

        console.log(
          `Retrying request (attempt ${item.retries}/${this.config.maxRetries}) after ${delay}ms`
        );

        setTimeout(() => {
          this.queue.unshift(item);
          this.processQueue();
        }, delay);
      } else {
        item.reject(error as Error);
      }
    } finally {
      this.activeRequests--;
      // Process next item in queue
      setImmediate(() => this.processQueue());
    }
  }

  private shouldRetry(error: Error, currentRetries: number): boolean {
    if (currentRetries >= this.config.maxRetries) {
      return false;
    }

    // Retry on network errors or rate limit errors
    const errorMessage = error.message.toLowerCase();

    // Rate limit errors (429)
    if (errorMessage.includes("429") || errorMessage.includes("rate limit")) {
      return true;
    }

    // Network errors
    if (
      errorMessage.includes("timeout") ||
      errorMessage.includes("network") ||
      errorMessage.includes("econnreset") ||
      errorMessage.includes("econnrefused") ||
      errorMessage.includes("socket hang up")
    ) {
      return true;
    }

    // Server errors (5xx)
    if (errorMessage.includes("500") || errorMessage.includes("502") ||
        errorMessage.includes("503") || errorMessage.includes("504")) {
      return true;
    }

    return false;
  }

  private calculateBackoffDelay(retryCount: number): number {
    // Exponential backoff with jitter
    const exponentialDelay = this.config.baseDelay * Math.pow(2, retryCount);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    const delay = Math.min(exponentialDelay + jitter, this.config.maxDelay);
    return Math.round(delay);
  }

  /**
   * Get current queue stats
   */
  getStats(): { activeRequests: number; queueLength: number } {
    return {
      activeRequests: this.activeRequests,
      queueLength: this.queue.length
    };
  }

  /**
   * Clear the queue (for cleanup)
   */
  clearQueue(): void {
    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (item) {
        item.reject(new Error("Queue cleared"));
      }
    }
  }
}

/**
 * Progress callback for batch operations
 */
export interface BatchProgressCallback {
  (completed: number, total: number, currentItem?: string): void;
}

/**
 * Batch executor with progress tracking
 */
export class BatchExecutor<T> {
  private rateLimiter: RateLimiter;
  private onProgress?: BatchProgressCallback;

  constructor(
    config: Partial<RateLimiterConfig> = {},
    onProgress?: BatchProgressCallback
  ) {
    this.rateLimiter = new RateLimiter(config);
    this.onProgress = onProgress;
  }

  /**
   * Execute a batch of tasks with progress tracking
   */
  async executeBatch<R>(
    items: T[],
    taskFactory: (item: T, index: number) => Promise<R>,
    getItemLabel?: (item: T) => string
  ): Promise<{ results: R[]; errors: Array<{ index: number; error: Error }> }> {
    const results: R[] = new Array(items.length);
    const errors: Array<{ index: number; error: Error }> = [];
    let completed = 0;

    const tasks = items.map((item, index) => async () => {
      const label = getItemLabel ? getItemLabel(item) : undefined;

      try {
        const result = await taskFactory(item, index);
        results[index] = result;
      } catch (error) {
        errors.push({ index, error: error as Error });
        throw error;
      } finally {
        completed++;
        if (this.onProgress) {
          this.onProgress(completed, items.length, label);
        }
      }
    });

    // Execute all tasks, collecting results even if some fail
    await this.rateLimiter.executeAllSettled(tasks);

    return { results: results.filter(r => r !== undefined), errors };
  }

  /**
   * Get rate limiter stats
   */
  getStats() {
    return this.rateLimiter.getStats();
  }

  /**
   * Clear pending tasks
   */
  clear() {
    this.rateLimiter.clearQueue();
  }
}

/**
 * Create a simple delay promise
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a rate limiter instance with default config
 */
export function createRateLimiter(config?: Partial<RateLimiterConfig>): RateLimiter {
  return new RateLimiter(config);
}
