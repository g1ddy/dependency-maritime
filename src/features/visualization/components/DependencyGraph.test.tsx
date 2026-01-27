import { render } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { DependencyGraph } from './DependencyGraph';
import { describe, it, expect, vi } from 'vitest';

const { useGraphStoreMock, getStateMock } = vi.hoisted(() => {
  const getState = vi.fn();
  const useGraphStore = vi.fn();
  // Assigning getState to the mock function itself to simulate Zustand's api
  Object.assign(useGraphStore, { getState });
  return { useGraphStoreMock: useGraphStore, getStateMock: getState };
});

vi.mock('../store', () => ({
  useGraphStore: useGraphStoreMock,
}));

describe('DependencyGraph', () => {
  it('renders the React Flow component and loads data', () => {
    // Setup mock store return values
    const setGraphDataMock = vi.fn();
    const rehydrateGraphMock = vi.fn();
    const selectNodeMock = vi.fn();

    const mockState = {
      nodes: [],
      edges: [],
      onNodesChange: vi.fn(),
      onEdgesChange: vi.fn(),
      setGraphData: setGraphDataMock,
      rehydrateGraph: rehydrateGraphMock,
      selectNode: selectNodeMock,
      rawGraphData: null,
    };

    useGraphStoreMock.mockReturnValue(mockState);
    getStateMock.mockReturnValue({ rawGraphData: null });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(storeModule.useGraphStore).mockReturnValue(mockState as any);

    const { container } = render(
      <ReactFlowProvider>
        <DependencyGraph />
      </ReactFlowProvider>
    );

    render(<DependencyGraph />);

    // We expect the effect to run
    expect(rehydrateGraphMock).toHaveBeenCalled();
    expect(setGraphDataMock).toHaveBeenCalled();
  });
});
