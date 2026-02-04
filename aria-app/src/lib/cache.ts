/**
 * Simple in-memory cache with TTL (Time To Live)
 * Useful for caching API responses to reduce network requests
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const DEFAULT_MAX_SIZE = 50;

class Cache {
  private cache: Map<string, CacheEntry<any>>;
  private maxSize: number;

  constructor(maxSize: number = DEFAULT_MAX_SIZE) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  /**
   * Get value from cache
   * Returns null if not found or expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;

    // Check if expired
    if (age > entry.ttl) {
      if (__DEV__) {
        console.log(`[Cache] Expired: ${key} (age: ${Math.round(age / 1000)}s)`);
      }
      this.cache.delete(key);
      return null;
    }

    if (__DEV__) {
      console.log(
        `[Cache] Hit: ${key} (age: ${Math.round(age / 1000)}s, ttl: ${Math.round(entry.ttl / 1000)}s)`
      );
    }

    return entry.data as T;
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
    // Enforce max size by removing oldest entry
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
        if (__DEV__) {
          console.log(`[Cache] Evicted oldest: ${oldestKey}`);
        }
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });

    if (__DEV__) {
      console.log(`[Cache] Set: ${key} (ttl: ${Math.round(ttl / 1000)}s)`);
    }
  }

  /**
   * Remove value from cache
   */
  delete(key: string): void {
    const deleted = this.cache.delete(key);
    if (__DEV__ && deleted) {
      console.log(`[Cache] Delete: ${key}`);
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    if (__DEV__) {
      console.log(`[Cache] Cleared ${size} entries`);
    }
  }

  /**
   * Clear expired entries
   */
  clearExpired(): number {
    const now = Date.now();
    let cleared = 0;

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age > entry.ttl) {
        this.cache.delete(key);
        cleared++;
      }
    }

    if (__DEV__ && cleared > 0) {
      console.log(`[Cache] Cleared ${cleared} expired entries`);
    }

    return cleared;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      entries: entries.map(([key, entry]) => ({
        key,
        age: Math.round((now - entry.timestamp) / 1000),
        ttl: Math.round(entry.ttl / 1000),
        isExpired: now - entry.timestamp > entry.ttl,
      })),
    };
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }
}

// Global cache instance
const globalCache = new Cache();

/**
 * Wrap an async function with caching
 */
export function cacheable<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: CacheOptions & { keyGenerator?: (...args: Parameters<T>) => string } = {}
): T {
  const { ttl = DEFAULT_TTL, keyGenerator } = options;

  return (async (...args: any[]) => {
    // Generate cache key
    const cacheKey = keyGenerator
      ? keyGenerator(...args)
      : `${fn.name}:${JSON.stringify(args)}`;

    // Try to get from cache
    const cached = globalCache.get<any>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    try {
      const result = await fn(...args);
      globalCache.set(cacheKey, result, ttl);
      return result;
    } catch (error) {
      // Don't cache errors
      throw error;
    }
  }) as T;
}

/**
 * Create a namespaced cache instance
 */
export function createCache(namespace: string, maxSize?: number): {
  get: <T>(key: string) => T | null;
  set: <T>(key: string, data: T, ttl?: number) => void;
  delete: (key: string) => void;
  clear: () => void;
  invalidatePattern: (pattern: RegExp) => number;
} {
  const cache = new Cache(maxSize);

  return {
    get: <T>(key: string) => cache.get<T>(`${namespace}:${key}`),
    set: <T>(key: string, data: T, ttl?: number) => cache.set(`${namespace}:${key}`, data, ttl),
    delete: (key: string) => cache.delete(`${namespace}:${key}`),
    clear: () => cache.clear(),
    invalidatePattern: (pattern: RegExp) => {
      let count = 0;
      const keys = Array.from((cache as any).cache.keys());
      for (const key of keys) {
        if (key.startsWith(`${namespace}:`) && pattern.test(key)) {
          cache.delete(key);
          count++;
        }
      }
      return count;
    },
  };
}

// Export global cache instance
export { globalCache as cache };

// Export cache utilities
export const CacheUtils = {
  /**
   * Clear all expired entries from global cache
   */
  clearExpired: () => globalCache.clearExpired(),

  /**
   * Get cache statistics
   */
  getStats: () => globalCache.getStats(),

  /**
   * Clear all cache
   */
  clearAll: () => globalCache.clear(),

  /**
   * Invalidate cache entries matching a pattern
   */
  invalidatePattern: (pattern: RegExp) => {
    const stats = globalCache.getStats();
    let count = 0;
    for (const entry of stats.entries) {
      if (pattern.test(entry.key)) {
        globalCache.delete(entry.key);
        count++;
      }
    }
    return count;
  },
};

// TTL presets
export const CacheTTL = {
  SHORT: 1 * 60 * 1000, // 1 minute
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 30 * 60 * 1000, // 30 minutes
  HOUR: 60 * 60 * 1000, // 1 hour
  DAY: 24 * 60 * 60 * 1000, // 24 hours
};
