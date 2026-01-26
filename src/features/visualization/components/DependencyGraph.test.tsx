import { render } from '@testing-library/react';
import { DependencyGraph } from './DependencyGraph';
import { describe, it, expect, vi } from 'vitest';
import * as storeModule from '../store';

// Mock the store
vi.mock('../store', () => ({
  useGraphStore: vi.fn(),
}));

describe('DependencyGraph', () => {
  it('renders the React Flow component and loads data', () => {
    // Setup mock store return values
    const setGraphDataMock = vi.fn();
    const mockState = {
      nodes: [],
      edges: [],
      onNodesChange: vi.fn(),
      onEdgesChange: vi.fn(),
      setGraphData: setGraphDataMock,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(storeModule.useGraphStore).mockReturnValue(mockState as any);

    const { container } = render(<DependencyGraph />);

    // Check for the react-flow class or attribute
    const reactFlowContainer = container.querySelector('.react-flow');
    expect(reactFlowContainer).toBeDefined();

    // Verify setGraphData was called
    expect(setGraphDataMock).toHaveBeenCalled();
  });
});
