import { useEffect, useRef, useState } from "react";
import { getCacheEntry, hasCacheEntry, setCacheEntry } from "@/lib/fetchCache";

/**
 * State returned by the useFetch hook
 */
interface UseFetchState<T> {
  /** The fetched data, or null if not yet loaded or on error */
  data: T | null;
  /** Whether the fetch is in progress */
  loading: boolean;
  /** Error message if the fetch failed, null otherwise */
  error: string | null;
}

/**
 * A generic hook for fetching data with cache-first behavior and proper AbortController handling.
 *
 * @param url - The URL to fetch from. Pass null to skip fetching (conditional fetch).
 * @param errorMessage - Custom error message to display on fetch failure.
 * @returns An object containing { data, loading, error }
 *
 * @example
 * // Basic usage
 * const { data, loading, error } = useFetch<User>('/api/user');
 *
 * @example
 * // Conditional fetching (won't fetch until userId is available)
 * const url = userId ? `/api/users/${userId}` : null;
 * const { data, loading, error } = useFetch<User>(url);
 */
export function useFetch<T>(
  url: string | null,
  errorMessage = "Failed to fetch data"
): UseFetchState<T> {
  const [data, setData] = useState<T | null>(() => {
    if (url === null) return null;
    return getCacheEntry<T>(url) ?? null;
  });
  const [loading, setLoading] = useState(() => {
    if (url === null) return false;
    return !hasCacheEntry(url);
  });
  const [error, setError] = useState<string | null>(null);

  // Store errorMessage in a ref to keep it out of the dependency array
  const errorMessageRef = useRef(errorMessage);
  errorMessageRef.current = errorMessage;

  // Track current URL to prevent stale state updates
  const currentUrlRef = useRef(url);
  currentUrlRef.current = url;

  useEffect(() => {
    // Skip fetch if URL is null (conditional fetching)
    if (url === null) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    // Cache hit — return early, no fetch needed
    const cached = getCacheEntry<T>(url);
    if (cached !== undefined) {
      setData(cached);
      setError(null);
      setLoading(false);
      return;
    }

    // Cache miss — fetch from network
    setError(null);
    setLoading(true);

    const controller = new AbortController();
    const fetchUrl = url; // Capture url for closure since TypeScript narrowing doesn't persist

    async function fetchData() {
      try {
        const res = await fetch(fetchUrl, { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json: T = await res.json();
        setCacheEntry(fetchUrl, json);
        // Only update state if this is still the current URL
        if (currentUrlRef.current === fetchUrl) {
          setData(json);
        }
      } catch (err) {
        // Ignore abort errors - component unmounted or URL changed
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        if (process.env.NODE_ENV === "development") {
          console.error("Fetch error:", err);
        }
        if (currentUrlRef.current === fetchUrl) {
          setError(errorMessageRef.current);
        }
      } finally {
        // Only update loading state if the request wasn't aborted
        if (!controller.signal.aborted && currentUrlRef.current === fetchUrl) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => controller.abort();
  }, [url]);

  return { data, loading, error };
}
