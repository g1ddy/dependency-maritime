import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NodeInspectorPanel } from './NodeInspectorPanel';
import { useGraphStore } from '../store';
import Graph from 'graphology';

describe('NodeInspectorPanel', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    useGraphStore.getState().reset();
    useGraphStore.setState({ isInspectorOpen: false });
  });

  it('renders nothing when closed', () => {
    const { container } = render(<NodeInspectorPanel />);
    expect(container.firstChild).toBeNull();
  });

  it('renders panel when open', () => {
    useGraphStore.setState({ isInspectorOpen: true });
    render(<NodeInspectorPanel />);
    expect(screen.getByText('Node Inspector')).not.toBeNull();
  });

  it('displays placeholder when no node selected', () => {
    useGraphStore.setState({ isInspectorOpen: true, selectedNodeId: null });
    render(<NodeInspectorPanel />);
    expect(screen.getByText('Select a node in the graph to view its details.')).not.toBeNull();
  });

  it('displays node details when node selected', () => {
    const graph = new Graph();
    graph.addNode('node-1', { label: 'My Node', metrics: { instability: 0.5, centrality: 0.1 } });

    useGraphStore.setState({
      isInspectorOpen: true,
      selectedNodeId: 'node-1',
      graph: graph,
      nodes: [
        { id: 'node-1', position: { x: 0, y: 0 }, data: { label: 'My Node', fullPath: 'src/MyNode.tsx', metrics: { instability: 0.5, centrality: 0.1 } } }
      ]
    });

    render(<NodeInspectorPanel />);

    expect(screen.getByText('My Node')).not.toBeNull();
    expect(screen.getByText('src/MyNode.tsx')).not.toBeNull();
    expect(screen.getByText('0.50')).not.toBeNull(); // Instability
    expect(screen.getByText('0.1000')).not.toBeNull(); // Centrality
  });

  it('closes panel when close button clicked', () => {
    useGraphStore.setState({ isInspectorOpen: true });

    render(<NodeInspectorPanel />);

    const closeBtn = screen.getByLabelText('Close Inspector');
    fireEvent.click(closeBtn);

    expect(useGraphStore.getState().isInspectorOpen).toBe(false);
  });
});
