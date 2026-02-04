/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { vi } from 'vitest';

// Mock the Web Worker for Layout
vi.mock('@/features/visualization/logic/layout.worker?worker', () => {
  return {
    default: class MockWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: ErrorEvent) => void) | null = null;

      postMessage(data: any) {
        // Simulate async response
        setTimeout(() => {
          if (this.onmessage) {
            const { nodes, edges } = data;
            // Return dummy layout result (preserve inputs but reset positions)
            this.onmessage({
              data: {
                nodes: nodes.map((n: any) => ({ ...n, position: { x: 0, y: 0 } })),
                edges
              }
            } as MessageEvent);
          }
        }, 10);
      }

      terminate() {}
      addEventListener(type: string, listener: any) {
        if (type === 'message') this.onmessage = listener;
      }
      removeEventListener() {}
    }
  };
});
