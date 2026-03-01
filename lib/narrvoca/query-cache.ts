// =============================================================================
// NarrVoca 2.0 — In-memory query cache with TTL
// Reduces redundant DB and OpenAI calls for frequently-accessed read data
// such as grading rubrics (per node_id) that change rarely.
//
// Usage:
//   import { queryCache } from '@/lib/narrvoca/query-cache';
//
//   const cached = queryCache.get<GradingRubric[]>(`rubrics:${node_id}`);
//   if (!cached) {
//     const data = await fetchRubrics(node_id);
//     queryCache.set(`rubrics:${node_id}`, data);
//   }
// =============================================================================

export const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class QueryCache {
  private store = new Map<string, CacheEntry<unknown>>();

  /** Returns the cached value, or undefined if missing or expired. */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  /** Stores a value with an optional TTL in milliseconds (default 5 min). */
  set<T>(key: string, value: T, ttlMs: number = DEFAULT_TTL_MS): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  /** Returns true if the key exists and has not expired. Removes stale entries. */
  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  /** Removes a key. Returns true if the key existed, false otherwise. */
  invalidate(key: string): boolean {
    return this.store.delete(key);
  }

  /** Removes all entries. */
  clear(): void {
    this.store.clear();
  }

  /** Returns the number of stored entries (may include entries not yet lazily-expired). */
  size(): number {
    return this.store.size;
  }
}

// Singleton instance used across API routes in the same Node.js process.
export const queryCache = new QueryCache();
