import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Track router calls
const mockReplace = vi.fn();
const mockPush = vi.fn();
let mockPathname = '/browse';
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}));

vi.mock('next/link', () => ({
  default: vi.fn(({ children, href, ...props }) => <a href={href} {...props}>{children}</a>),
}));

vi.mock('next/image', () => ({
  default: vi.fn(({ src, alt, ...props }) => <img src={src} alt={alt} {...props} />),
}));

// Mock fetch for useFetch hook
const mockMarketplacesResponse = {
  meta: { total_authors: 1, total_marketplaces: 1, total_plugins: 1 },
  marketplaces: [
    {
      name: 'test-plugin',
      description: 'A test plugin',
      author_id: 'testuser',
      author_display_name: 'Test User',
      author_avatar_url: '',
      repo_full_name: 'testuser/test-plugin',
      categories: ['testing', 'devops'],
      keywords: [],
      signals: { stars: 10, forks: 2, pushed_at: null },
    },
  ],
};

vi.mock('@/hooks', () => ({
  useFetch: () => ({
    data: mockMarketplacesResponse,
    loading: false,
    error: null,
  }),
}));

vi.mock('@/components/MultiSelectDropdown', () => ({
  MultiSelectDropdown: ({ placeholder }: { placeholder: string }) => (
    <button type="button">{placeholder}</button>
  ),
}));

vi.mock('@/components/SortDropdown', () => ({
  SortDropdown: () => <div data-testid="sort-dropdown">Sort</div>,
}));

import { SearchFilterControls } from '@/components/SearchFilterControls';

describe('SearchFilterControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockSearchParams = new URLSearchParams();
    // Set window.location.search for the updateURL callback
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, search: '' },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders search input', () => {
    render(<SearchFilterControls />);
    expect(screen.getByPlaceholderText('Search plugins, keywords, authors...')).toBeInTheDocument();
  });

  it('routes to /browse when search is submitted (not /)', () => {
    render(<SearchFilterControls />);

    const input = screen.getByPlaceholderText('Search plugins, keywords, authors...');
    fireEvent.change(input, { target: { value: 'my-query' } });
    fireEvent.submit(input.closest('form')!);

    // Flush the debounced URL update
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(mockReplace).toHaveBeenCalled();
    const url = mockReplace.mock.calls[0][0];
    expect(url).toMatch(/^\/browse/);
    expect(url).not.toMatch(/^\/\?/);
    expect(url).toContain('q=my-query');
  });

  it('routes to /browse (no params) when search is cleared', () => {
    mockSearchParams = new URLSearchParams('q=old-query');
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, search: '?q=old-query' },
    });

    render(<SearchFilterControls />);

    const clearButton = screen.getByRole('button', { name: '' });
    // The X button clears the search
    fireEvent.click(clearButton);

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(mockReplace).toHaveBeenCalled();
    const url = mockReplace.mock.calls[0][0];
    expect(url).toBe('/browse');
  });

  it('preserves /browse path when only default params remain', () => {
    render(<SearchFilterControls />);

    const input = screen.getByPlaceholderText('Search plugins, keywords, authors...');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.submit(input.closest('form')!);

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(mockReplace).toHaveBeenCalled();
    const url = mockReplace.mock.calls[0][0];
    expect(url).toBe('/browse');
  });
});
