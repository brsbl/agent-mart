import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getCacheEntry,
  setCacheEntry,
  hasCacheEntry,
  clearCache,
} from '@/lib/fetchCache';
import { prefetchUrl } from '@/lib/prefetch';

describe('fetchCache', () => {
  beforeEach(() => {
    clearCache();
  });

  describe('get/set/has/clear', () => {
    it('returns undefined for missing entries', () => {
      expect(getCacheEntry('/missing')).toBeUndefined();
    });

    it('stores and retrieves entries', () => {
      setCacheEntry('/url', { id: 1 });
      expect(getCacheEntry('/url')).toEqual({ id: 1 });
      expect(hasCacheEntry('/url')).toBe(true);
    });

    it('overwrites existing entries', () => {
      setCacheEntry('/url', { id: 1 });
      setCacheEntry('/url', { id: 2 });
      expect(getCacheEntry('/url')).toEqual({ id: 2 });
    });

    it('clears all entries', () => {
      setCacheEntry('/a', 1);
      setCacheEntry('/b', 2);
      clearCache();
      expect(hasCacheEntry('/a')).toBe(false);
      expect(hasCacheEntry('/b')).toBe(false);
    });

    it('evicts oldest entry when at capacity (50)', () => {
      for (let i = 0; i < 50; i++) {
        setCacheEntry(`/url-${i}`, i);
      }
      // All 50 should exist
      expect(hasCacheEntry('/url-0')).toBe(true);

      // Adding 51st should evict the first
      setCacheEntry('/url-50', 50);
      expect(hasCacheEntry('/url-0')).toBe(false);
      expect(hasCacheEntry('/url-50')).toBe(true);
      expect(hasCacheEntry('/url-1')).toBe(true);
    });

    it('does not evict when overwriting existing key', () => {
      for (let i = 0; i < 50; i++) {
        setCacheEntry(`/url-${i}`, i);
      }
      // Overwriting an existing entry should not evict
      setCacheEntry('/url-0', 'updated');
      expect(hasCacheEntry('/url-0')).toBe(true);
      expect(getCacheEntry('/url-0')).toBe('updated');
      expect(hasCacheEntry('/url-1')).toBe(true);
    });
  });
});

describe('prefetchUrl', () => {
  const originalFetch = globalThis.fetch;
  const mockFetch = vi.fn();

  beforeEach(() => {
    clearCache();
    globalThis.fetch = mockFetch;
    mockFetch.mockReset();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('fetches and caches data', async () => {
    const mockData = { name: 'test' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    prefetchUrl('/api/data');

    // Wait for the promise chain to settle
    await vi.waitFor(() => {
      expect(hasCacheEntry('/api/data')).toBe(true);
    });

    expect(getCacheEntry('/api/data')).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('skips if already cached', () => {
    setCacheEntry('/api/data', { cached: true });

    prefetchUrl('/api/data');

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('deduplicates in-flight requests', () => {
    mockFetch.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({ value: 1 }),
      }), 100))
    );

    prefetchUrl('/api/slow');
    prefetchUrl('/api/slow');

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('silently handles fetch errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    prefetchUrl('/api/failing');

    // Wait a tick for the promise to settle
    await new Promise((r) => setTimeout(r, 50));

    // Should not have cached anything
    expect(hasCacheEntry('/api/failing')).toBe(false);
    // Should not throw
  });

  it('silently handles HTTP errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    prefetchUrl('/api/500');

    await new Promise((r) => setTimeout(r, 50));

    expect(hasCacheEntry('/api/500')).toBe(false);
  });

  it('allows retry after failed prefetch', async () => {
    // First attempt fails
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    prefetchUrl('/api/retry');
    await new Promise((r) => setTimeout(r, 50));

    // Second attempt succeeds (in-flight set should be cleared)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ retried: true }),
    });
    prefetchUrl('/api/retry');

    await vi.waitFor(() => {
      expect(hasCacheEntry('/api/retry')).toBe(true);
    });

    expect(getCacheEntry('/api/retry')).toEqual({ retried: true });
  });
});
