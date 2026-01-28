import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';

describe('useCopyToClipboard', () => {
  const mockWriteText = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    // Mock clipboard API
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true
    });
    mockWriteText.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should initialize with copied as false', () => {
    const { result } = renderHook(() => useCopyToClipboard());
    expect(result.current.copied).toBe(false);
  });

  it('should set copied to true after successful copy', async () => {
    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      const success = await result.current.copy('test text');
      expect(success).toBe(true);
    });

    expect(result.current.copied).toBe(true);
    expect(mockWriteText).toHaveBeenCalledWith('test text');
  });

  it('should reset copied to false after delay', async () => {
    const { result } = renderHook(() => useCopyToClipboard(1000));

    await act(async () => {
      await result.current.copy('test text');
    });

    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.copied).toBe(false);
  });

  it('should use default delay of 2000ms', async () => {
    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      await result.current.copy('test text');
    });

    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1999);
    });

    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(result.current.copied).toBe(false);
  });

  it('should return false when clipboard API is not supported', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      writable: true,
      configurable: true
    });

    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      const success = await result.current.copy('test text');
      expect(success).toBe(false);
    });

    expect(result.current.copied).toBe(false);
  });

  it('should return false when clipboard write fails', async () => {
    mockWriteText.mockRejectedValue(new Error('Permission denied'));

    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      const success = await result.current.copy('test text');
      expect(success).toBe(false);
    });

    expect(result.current.copied).toBe(false);
  });

  it('should clear previous timeout when copying again', async () => {
    const { result } = renderHook(() => useCopyToClipboard(1000));

    await act(async () => {
      await result.current.copy('first');
    });

    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    await act(async () => {
      await result.current.copy('second');
    });

    // Still copied
    expect(result.current.copied).toBe(true);

    // Another 500ms passes (total 1000ms since second copy)
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Still copied because timeout was reset
    expect(result.current.copied).toBe(true);

    // Full 1000ms from second copy
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.copied).toBe(false);
  });

  it('should cleanup timeout on unmount', async () => {
    const { result, unmount } = renderHook(() => useCopyToClipboard(1000));

    await act(async () => {
      await result.current.copy('test text');
    });

    expect(result.current.copied).toBe(true);

    unmount();

    // Advancing timers after unmount should not cause issues
    act(() => {
      vi.advanceTimersByTime(1000);
    });
  });

  it('should copy different text values correctly', async () => {
    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      await result.current.copy('claude install anthropic/agent-mart');
    });

    expect(mockWriteText).toHaveBeenCalledWith('claude install anthropic/agent-mart');

    await act(async () => {
      await result.current.copy('npm install package');
    });

    expect(mockWriteText).toHaveBeenCalledWith('npm install package');
  });
});
