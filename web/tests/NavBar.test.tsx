import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

let mockPathname = '/browse';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  usePathname: () => mockPathname,
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/link', () => ({
  default: vi.fn(({ children, href, ...props }) => <a href={href} {...props}>{children}</a>),
}));

// Mock SearchFilterControls to avoid its internal complexity
vi.mock('@/components/SearchFilterControls', () => ({
  SearchFilterControls: () => <div data-testid="search-filter-controls">Search Controls</div>,
}));

import { NavBar } from '@/components/NavBar';

describe('NavBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = '/browse';
  });

  it('renders the logo linking to /browse', () => {
    render(<NavBar />);
    const links = screen.getAllByRole('link');
    const browseLinks = links.filter(link => link.getAttribute('href') === '/browse');
    expect(browseLinks.length).toBeGreaterThan(0);
  });

  it('renders GitHub link', () => {
    render(<NavBar />);
    expect(screen.getAllByLabelText('View source on GitHub').length).toBeGreaterThan(0);
  });

  it('shows search controls on /browse', () => {
    mockPathname = '/browse';
    render(<NavBar />);
    expect(screen.getAllByTestId('search-filter-controls').length).toBeGreaterThan(0);
  });

  it('hides search controls on non-browse pages', () => {
    mockPathname = '/';
    render(<NavBar />);
    expect(screen.queryByTestId('search-filter-controls')).not.toBeInTheDocument();
  });

  it('hides search controls on plugin detail pages', () => {
    mockPathname = '/someuser/someplugin';
    render(<NavBar />);
    expect(screen.queryByTestId('search-filter-controls')).not.toBeInTheDocument();
  });

  it('constrains search controls to grid width while logo/GitHub stay at edges', () => {
    mockPathname = '/browse';
    const { container } = render(<NavBar />);
    const header = container.querySelector('header');
    // Outer navbar container should NOT have max-w-6xl
    const outerContainer = header?.firstElementChild;
    expect(outerContainer?.className).not.toContain('max-w-6xl');
    // Inner wrapper around search controls should have max-w-6xl
    const gridWrapper = container.querySelector('.max-w-6xl');
    expect(gridWrapper).toBeInTheDocument();
    const searchControls = gridWrapper?.querySelector('[data-testid="search-filter-controls"]');
    expect(searchControls).toBeInTheDocument();
  });
});
