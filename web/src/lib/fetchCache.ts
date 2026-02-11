const MAX_CACHE_SIZE = 50;

const cache = new Map<string, unknown>();

export function getCacheEntry<T>(url: string): T | undefined {
  return cache.get(url) as T | undefined;
}

export function setCacheEntry<T>(url: string, data: T): void {
  // Evict oldest entry if at capacity
  if (!cache.has(url) && cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value!;
    cache.delete(firstKey);
  }
  cache.set(url, data);
}

export function hasCacheEntry(url: string): boolean {
  return cache.has(url);
}

export function clearCache(): void {
  cache.clear();
}
