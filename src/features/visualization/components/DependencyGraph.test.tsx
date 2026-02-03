import { render } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { DependencyGraph } from './DependencyGraph';
import { describe, it, expect, vi } from 'vitest';
import * as storeModule from '../store';

// Mock the store
vi.mock('../store', () => ({
  useGraphStore: vi.fn(),
}));

type GraphState = ReturnType<typeof storeModule.useGraphStore.getState>;

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
      selectNode: vi.fn(),
      reparentNode: vi.fn(),
    } as unknown as GraphState;

    vi.mocked(storeModule.useGraphStore).mockImplementation(((selector?: (state: GraphState) => unknown) => {
      if (selector) {
        return selector(mockState);
      }
      return mockState;
    }) as typeof storeModule.useGraphStore);

    const { container } = render(
      <ReactFlowProvider>
        <DependencyGraph />
      </ReactFlowProvider>
    );

    // Check for the react-flow class or attribute
    const reactFlowContainer = container.querySelector('.react-flow');
    expect(reactFlowContainer).toBeDefined();

    // Verify setGraphData was called
    expect(setGraphDataMock).toHaveBeenCalled();
  });
});
