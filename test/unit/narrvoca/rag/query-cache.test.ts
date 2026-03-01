import { QueryCache } from '@/lib/narrvoca/query-cache';

// ---------------------------------------------------------------------------
// Each test gets a fresh cache instance — no shared state
// ---------------------------------------------------------------------------

describe('QueryCache', () => {
  let cache: QueryCache;

  beforeEach(() => {
    cache = new QueryCache();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── get / set ─────────────────────────────────────────────────────────────

  it('returns undefined for a key that was never set', () => {
    expect(cache.get('missing')).toBeUndefined();
  });

  it('returns the value for a key that was set', () => {
    cache.set('key1', 'hello');
    expect(cache.get('key1')).toBe('hello');
  });

  it('round-trips objects without mutation', () => {
    const obj = { a: 1, b: [2, 3] };
    cache.set('obj', obj);
    expect(cache.get('obj')).toEqual(obj);
  });

  it('set overwrites an existing key with the new value', () => {
    cache.set('k', 'first');
    cache.set('k', 'second');
    expect(cache.get('k')).toBe('second');
  });

  // ── TTL / expiry ──────────────────────────────────────────────────────────

  it('returns the value before the TTL expires', () => {
    cache.set('ttl-key', 'alive', 1000);
    jest.advanceTimersByTime(999);
    expect(cache.get('ttl-key')).toBe('alive');
  });

  it('returns undefined after the TTL has elapsed', () => {
    cache.set('ttl-key', 'alive', 1000);
    jest.advanceTimersByTime(1001);
    expect(cache.get('ttl-key')).toBeUndefined();
  });

  it('removes an expired entry from the store on get()', () => {
    cache.set('exp', 'value', 500);
    jest.advanceTimersByTime(600);
    cache.get('exp'); // triggers lazy removal
    expect(cache.size()).toBe(0);
  });

  it('a zero-TTL entry expires immediately', () => {
    cache.set('zero', 'gone', 0);
    jest.advanceTimersByTime(1);
    expect(cache.get('zero')).toBeUndefined();
  });

  // ── has ───────────────────────────────────────────────────────────────────

  it('has() returns true for a valid, non-expired entry', () => {
    cache.set('present', 42, 5000);
    expect(cache.has('present')).toBe(true);
  });

  it('has() returns false for a missing key', () => {
    expect(cache.has('nope')).toBe(false);
  });

  it('has() returns false and removes an expired entry', () => {
    cache.set('exp', 'x', 100);
    jest.advanceTimersByTime(200);
    expect(cache.has('exp')).toBe(false);
    expect(cache.size()).toBe(0);
  });

  // ── invalidate ────────────────────────────────────────────────────────────

  it('invalidate() returns true and removes an existing key', () => {
    cache.set('toRemove', 'val');
    const removed = cache.invalidate('toRemove');
    expect(removed).toBe(true);
    expect(cache.get('toRemove')).toBeUndefined();
  });

  it('invalidate() returns false for a key that does not exist', () => {
    expect(cache.invalidate('ghost')).toBe(false);
  });

  // ── clear ─────────────────────────────────────────────────────────────────

  it('clear() empties the cache', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    cache.clear();
    expect(cache.size()).toBe(0);
    expect(cache.get('a')).toBeUndefined();
  });

  // ── size ──────────────────────────────────────────────────────────────────

  it('size() reflects the number of stored entries', () => {
    expect(cache.size()).toBe(0);
    cache.set('x', 1);
    cache.set('y', 2);
    expect(cache.size()).toBe(2);
  });
});
