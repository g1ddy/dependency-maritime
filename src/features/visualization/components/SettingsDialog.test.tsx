import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { SettingsDialog } from './SettingsDialog';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useGraphStore } from '../store';

// Mock the store
vi.mock('../store', () => ({
  useGraphStore: vi.fn(),
}));

describe('SettingsDialog', () => {
  const setNodeSizeMock = vi.fn();
  const onOpenChangeMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementation
    (useGraphStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) => {
        if (!selector) return {}; // Safety fallback
        // Simulate the selectors used in the component
        const state = {
            nodeSize: 'uniform',
            setNodeSize: setNodeSizeMock
        };
        return selector(state);
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders correctly when open', () => {
    render(<SettingsDialog open={true} onOpenChange={onOpenChangeMock} />);
    expect(screen.getByText('Visual Settings')).toBeDefined();
    expect(screen.getByText('Size by Centrality')).toBeDefined();
  });

  it('does not render content when closed', () => {
    render(<SettingsDialog open={false} onOpenChange={onOpenChangeMock} />);
    // Radix Dialog behavior: content is likely not in the document or hidden
    // Querying by text might fail or return null depending on implementation
    const title = screen.queryByText('Visual Settings');
    expect(title).toBeNull();
  });

  it('toggles node size when switch is clicked', () => {
    render(<SettingsDialog open={true} onOpenChange={onOpenChangeMock} />);

    const switchElement = screen.getByRole('switch', { name: /size by centrality/i });
    expect(switchElement.getAttribute('aria-checked')).toBe('false');

    fireEvent.click(switchElement);

    expect(setNodeSizeMock).toHaveBeenCalledWith('centrality');
  });

  it('reflects active state when nodeSize is centrality', () => {
    // Override mock for this test scenario
    (useGraphStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) => {
        const state = {
            nodeSize: 'centrality',
            setNodeSize: setNodeSizeMock
        };
        return selector(state);
    });

    render(<SettingsDialog open={true} onOpenChange={onOpenChangeMock} />);

    const switchElement = screen.getByRole('switch', { name: /size by centrality/i });
    expect(switchElement.getAttribute('aria-checked')).toBe('true');
  });
});
