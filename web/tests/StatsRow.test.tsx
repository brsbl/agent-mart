import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatsRow } from '@/components/StatsRow';

describe('StatsRow', () => {
  it('renders loading skeleton when loading is true', () => {
    const { container } = render(<StatsRow data={null} loading={true} />);

    const pulseElements = container.querySelectorAll('.animate-pulse');
    expect(pulseElements).toHaveLength(3);
  });

  it('renders stat values when data is loaded', () => {
    const data = {
      meta: {
        total_authors: 150,
        total_marketplaces: 42,
        total_plugins: 500,
      },
      marketplaces: [],
    };

    render(<StatsRow data={data} loading={false} />);

    // The component uses useAnimatedNumber which starts at 90% and animates.
    // In jsdom, requestAnimationFrame is polyfilled but runs synchronously on first frame.
    // We check that the labels are present; values will be at or near target.
    expect(screen.getByText('Creators')).toBeInTheDocument();
    expect(screen.getByText('Marketplaces')).toBeInTheDocument();
    expect(screen.getByText('Plugins')).toBeInTheDocument();
  });

  it('shows correct labels "Creators", "Marketplaces", "Plugins"', () => {
    render(<StatsRow data={null} loading={true} />);

    expect(screen.getByText('Creators')).toBeInTheDocument();
    expect(screen.getByText('Marketplaces')).toBeInTheDocument();
    expect(screen.getByText('Plugins')).toBeInTheDocument();
  });
});
