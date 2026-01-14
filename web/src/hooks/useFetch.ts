import { useEffect, useState } from "react";

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
 * A generic hook for fetching data with proper AbortController handling.
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
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Skip fetch if URL is null (conditional fetching)
    if (url === null) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    // Reset state when URL changes to a valid URL
    setData(null);
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
        setData(json);
      } catch (err) {
        // Ignore abort errors - component unmounted or URL changed
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        if (process.env.NODE_ENV === "development") {
          console.error("Fetch error:", err);
        }
        setError(errorMessage);
      } finally {
        // Only update loading state if the request wasn't aborted
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => controller.abort();
  }, [url, errorMessage]);

  return { data, loading, error };
}
