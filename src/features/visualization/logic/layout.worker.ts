import { applyDagreLayout, type LayoutOptions } from './layout';
import { type Node, type Edge } from '@xyflow/react';

export interface LayoutWorkerMessage {
  nodes: Node[];
  edges: Edge[];
  options: LayoutOptions;
}

export interface LayoutWorkerResponse {
  nodes: Node[];
  edges: Edge[];
}

self.onmessage = (event: MessageEvent<LayoutWorkerMessage>) => {
  const { nodes, edges, options } = event.data;

  try {
    const result = applyDagreLayout(nodes, edges, options);
    self.postMessage(result);
  } catch (error) {
    console.error('Worker layout failed', error);
    // In case of error, return the original nodes/edges so the app doesn't crash
    self.postMessage({ nodes, edges });
  }
};
