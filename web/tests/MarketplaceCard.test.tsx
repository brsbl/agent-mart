import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: vi.fn(({ children, href, ...props }) => <a href={href} {...props}>{children}</a>),
}));

vi.mock('next/image', () => ({
  default: vi.fn(({ src, alt, ...props }) => <img src={src} alt={alt} {...props} />),
}));

import { MarketplaceCard } from '@/components/MarketplaceCard';

const baseProps = {
  marketplace: {
    name: 'My Plugin',
    description: 'A cool plugin for testing',
    categories: ['testing'] as string[],
    repo_full_name: 'testuser/my-plugin',
    signals: { stars: 42, forks: 5, pushed_at: '2026-01-15T00:00:00Z' },
  },
  author_id: 'testuser',
  author_display_name: 'Test User',
  author_avatar_url: 'https://example.com/avatar.png',
};

describe('MarketplaceCard', () => {
  it('renders plugin name', () => {
    render(<MarketplaceCard {...baseProps} />);
    expect(screen.getByText('My Plugin')).toBeInTheDocument();
  });

  it('renders author handle', () => {
    render(<MarketplaceCard {...baseProps} />);
    expect(screen.getByText('@testuser')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<MarketplaceCard {...baseProps} />);
    expect(screen.getByText('A cool plugin for testing')).toBeInTheDocument();
  });

  it('links to /:author/:repo detail page', () => {
    render(<MarketplaceCard {...baseProps} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/testuser/my-plugin');
  });

  it('extracts repo name from repo_full_name for URL', () => {
    const props = {
      ...baseProps,
      marketplace: {
        ...baseProps.marketplace,
        repo_full_name: 'someorg/cool-skills',
      },
      author_id: 'someorg',
    };
    render(<MarketplaceCard {...props} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/someorg/cool-skills');
  });

  it('falls back to name when repo_full_name is missing', () => {
    const props = {
      ...baseProps,
      marketplace: {
        ...baseProps.marketplace,
        repo_full_name: undefined,
      },
    };
    render(<MarketplaceCard {...props} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/testuser/My Plugin');
  });

  it('shows "No description" when description is null', () => {
    const props = {
      ...baseProps,
      marketplace: { ...baseProps.marketplace, description: null },
    };
    render(<MarketplaceCard {...props} />);
    expect(screen.getByText('No description')).toBeInTheDocument();
  });

  it('renders star count', () => {
    render(<MarketplaceCard {...baseProps} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders fork count', () => {
    render(<MarketplaceCard {...baseProps} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows trending badge when enabled and stars_gained_7d > 0', () => {
    const props = {
      ...baseProps,
      marketplace: {
        ...baseProps.marketplace,
        signals: { ...baseProps.marketplace.signals, stars_gained_7d: 15 },
      },
      showTrendingBadge: true,
    };
    render(<MarketplaceCard {...props} />);
    expect(screen.getByText('+15')).toBeInTheDocument();
  });

  it('hides trending badge when showTrendingBadge is false', () => {
    const props = {
      ...baseProps,
      marketplace: {
        ...baseProps.marketplace,
        signals: { ...baseProps.marketplace.signals, stars_gained_7d: 15 },
      },
      showTrendingBadge: false,
    };
    render(<MarketplaceCard {...props} />);
    expect(screen.queryByText('+15')).not.toBeInTheDocument();
  });

  it('renders avatar image when URL is provided', () => {
    render(<MarketplaceCard {...baseProps} />);
    const img = screen.getByAltText('Test User');
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.png');
  });
});
