import { type Node } from '@xyflow/react';

export interface AppNodeData extends Record<string, unknown> {
  label: string;
  external?: boolean;
  highlighted?: boolean;
  dimmed?: boolean;
}

export interface GroupNodeData extends Record<string, unknown> {
  label: string;
}

// React Flow's Node type might not expose positionAbsolute in all versions or it might be optional.
// We define a CustomNode that definitely has it if needed, or we just trust the runtime.
// The user asked to "explicitly include positionAbsolute if it's consistently expected".
export type CustomNode = Node & {
  positionAbsolute?: { x: number; y: number };
  data: AppNodeData | GroupNodeData;
};
