import { vi } from 'vitest';
import { type LayoutWorkerMessage } from '@/features/visualization/logic/layout.worker';
import { type Node } from '@xyflow/react';

// Mock the Web Worker for Layout
vi.mock('@/features/visualization/logic/layout.worker?worker', () => {
  return {
    default: class MockWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: ErrorEvent) => void) | null = null;

      postMessage(data: LayoutWorkerMessage) {
        // Simulate async response
        setTimeout(() => {
          // Special hook for testing errors
          // @ts-expect-error - testing purpose
          if (data.options?.direction === 'TRIGGER_ERROR') {
            if (this.onerror) {
              this.onerror({ message: 'Mocked Worker Error' } as ErrorEvent);
            }
            return;
          }

          if (this.onmessage) {
            const { nodes, edges } = data;
            // Return dummy layout result (preserve inputs but reset positions)
            this.onmessage({
              data: {
                nodes: nodes.map((n: Node) => ({ ...n, position: { x: 0, y: 0 } })),
                edges
              }
            } as MessageEvent);
          }
        }, 10);
      }

      terminate() {}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      addEventListener(type: string, listener: any) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        if (type === 'message') this.onmessage = listener;
      }
      removeEventListener() {}
    }
  };
});
