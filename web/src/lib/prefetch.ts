import { hasCacheEntry, setCacheEntry } from "./fetchCache";

const inFlight = new Set<string>();

export function prefetchUrl(url: string): void {
  if (hasCacheEntry(url) || inFlight.has(url)) return;

  inFlight.add(url);

  fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => {
      setCacheEntry(url, data);
    })
    .catch(() => {
      // Silently swallow — useFetch handles errors on the real request
    })
    .finally(() => {
      inFlight.delete(url);
    });
}
