import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LandingSearch } from '@/components/LandingSearch';

vi.mock('@/components/MultiSelectDropdown', () => ({
  MultiSelectDropdown: ({ placeholder }: { placeholder: string }) => (
    <button type="button">{placeholder}</button>
  ),
}));

describe('LandingSearch', () => {
  it('renders search input with placeholder "Search plugins..."', () => {
    render(<LandingSearch data={null} />);

    const input = screen.getByPlaceholderText('Search plugins...');
    expect(input).toBeInTheDocument();
  });

  it('renders Categories button', () => {
    render(<LandingSearch data={null} />);

    expect(screen.getByText('Categories')).toBeInTheDocument();
  });

  it('input accepts text', () => {
    render(<LandingSearch data={null} />);

    const input = screen.getByPlaceholderText('Search plugins...');
    fireEvent.change(input, { target: { value: 'test query' } });
    expect(input).toHaveValue('test query');
  });
});
