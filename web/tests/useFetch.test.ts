import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFetch } from '@/hooks/useFetch';

describe('useFetch', () => {
  const originalFetch = globalThis.fetch;
  const mockFetch = vi.fn();

  beforeEach(() => {
    globalThis.fetch = mockFetch;
    mockFetch.mockReset();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('successful fetches', () => {
    it('should return data on successful fetch', async () => {
      const mockData = { id: 1, name: 'Test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData)
      });

      const { result } = renderHook(() => useFetch<typeof mockData>('/api/test'));

      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockData);
      expect(result.current.error).toBeNull();
    });

    it('should call fetch with the provided URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      renderHook(() => useFetch('/api/users'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/users', expect.objectContaining({
          signal: expect.any(AbortSignal)
        }));
      });
    });
  });

  describe('error handling', () => {
    it('should set error on HTTP error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const { result } = renderHook(() => useFetch('/api/not-found'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch data');
      expect(result.current.data).toBeNull();
    });

    it('should use custom error message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      const { result } = renderHook(() =>
        useFetch('/api/error', 'Custom error message')
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Custom error message');
    });

    it('should set error on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useFetch('/api/test'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch data');
      expect(result.current.data).toBeNull();
    });
  });

  describe('conditional fetching (null URL)', () => {
    it('should not fetch when URL is null', async () => {
      const { result } = renderHook(() => useFetch(null));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should start fetching when URL changes from null to string', async () => {
      const mockData = { value: 'test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData)
      });

      const { result, rerender } = renderHook(
        ({ url }) => useFetch<typeof mockData>(url),
        { initialProps: { url: null as string | null } }
      );

      // Initially null URL - no fetch
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      expect(mockFetch).not.toHaveBeenCalled();

      // Change to valid URL
      rerender({ url: '/api/test' });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData);
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('URL changes', () => {
    it('should refetch when URL changes', async () => {
      const mockData1 = { id: 1 };
      const mockData2 = { id: 2 };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockData1)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockData2)
        });

      const { result, rerender } = renderHook(
        ({ url }) => useFetch<typeof mockData1>(url),
        { initialProps: { url: '/api/item/1' } }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData1);
      });

      rerender({ url: '/api/item/2' });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData2);
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should keep stale data visible during refetch (stale-while-revalidate)', async () => {
      const mockData1 = { id: 1 };
      let resolveSecond: (value: unknown) => void;
      const secondFetchPromise = new Promise((resolve) => {
        resolveSecond = resolve;
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockData1)
        })
        .mockImplementationOnce(() => secondFetchPromise);

      const { result, rerender } = renderHook(
        ({ url }) => useFetch<typeof mockData1>(url),
        { initialProps: { url: '/api/item/1' } }
      );

      // Wait for first fetch to complete
      await waitFor(() => {
        expect(result.current.data).toEqual(mockData1);
      });

      // Change URL - should start loading but keep stale data
      rerender({ url: '/api/item/2' });

      // Stale data should still be visible during loading
      expect(result.current.loading).toBe(true);
      expect(result.current.data).toEqual(mockData1);

      // Resolve second fetch
      const mockData2 = { id: 2 };
      resolveSecond!({
        ok: true,
        json: () => Promise.resolve(mockData2)
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData2);
      });
    });
  });

  describe('abort controller', () => {
    it('should abort previous request when URL changes', async () => {
      let abortedFirst = false;
      const firstController = { aborted: false };

      mockFetch.mockImplementation((url, options) => {
        if (url === '/api/first') {
          options.signal.addEventListener('abort', () => {
            abortedFirst = true;
            firstController.aborted = true;
          });
          // Never resolve - we want to see if it gets aborted
          return new Promise(() => {});
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 2 })
        });
      });

      const { rerender } = renderHook(
        ({ url }) => useFetch(url),
        { initialProps: { url: '/api/first' } }
      );

      // Change URL before first request completes
      rerender({ url: '/api/second' });

      await waitFor(() => {
        expect(abortedFirst).toBe(true);
      });
    });

    it('should abort request on unmount', async () => {
      let aborted = false;

      mockFetch.mockImplementation((_, options) => {
        options.signal.addEventListener('abort', () => {
          aborted = true;
        });
        return new Promise(() => {});
      });

      const { unmount } = renderHook(() => useFetch('/api/test'));

      unmount();

      expect(aborted).toBe(true);
    });

    it('should not set state after abort', async () => {
      const abortError = new DOMException('The operation was aborted', 'AbortError');

      mockFetch.mockRejectedValueOnce(abortError);

      const { result } = renderHook(() => useFetch('/api/test'));

      // The hook should handle abort errors gracefully
      // Loading stays true because we don't update state on abort
      await new Promise(resolve => setTimeout(resolve, 50));

      // No error should be set for abort
      expect(result.current.error).toBeNull();
    });
  });

  describe('error message dependency', () => {
    it('should refetch when error message changes', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ value: 1 })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ value: 2 })
        });

      const { result, rerender } = renderHook(
        ({ errorMsg }) => useFetch('/api/test', errorMsg),
        { initialProps: { errorMsg: 'Error 1' } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      rerender({ errorMsg: 'Error 2' });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('initial state', () => {
    it('should initialize with loading true and null data/error', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useFetch('/api/test'));

      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });
});
