import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { AppWindow, FileCode, Package, File } from 'lucide-react';
import { type AppNodeData } from '../types';

type AppNodeProps = NodeProps<Node<AppNodeData>>;

export const AppNode = memo(({ data, selected }: AppNodeProps) => {
  const label = data.label || 'unknown';
  const isExternal = !!data.external;

  // Visual states from data
  const isHighlighted = !!data.highlighted;
  const isDimmed = !!data.dimmed;
  const debugColor = data.debugColor;

  // Determine icon based on file extension or type
  let Icon = File;
  if (isExternal) {
    Icon = Package;
  } else if (label.endsWith('.tsx')) {
    Icon = AppWindow;
  } else if (label.endsWith('.ts')) {
    Icon = FileCode;
  }

  // Determine styles
  const opacityClass = isDimmed ? 'opacity-20 grayscale' : 'opacity-100';

  let borderClass = 'border-blue-500/50';
  if (selected) {
    borderClass = 'border-blue-400 ring-2 ring-blue-400';
  } else if (isHighlighted) {
    borderClass = 'border-blue-400/80 ring-1 ring-blue-400/50';
  }

  // If debugColor is present (after async processing), we override the border color
  // to prove the update happened.
  const debugStyle = debugColor ? { borderColor: debugColor } : {};

  return (
    <div
      data-testid={`node-${label}`}
      className={`
        border bg-blue-950/30 backdrop-blur px-4 py-2 rounded-lg flex items-center gap-2 shadow-[0_0_30px_-5px_rgba(37,99,235,0.3)]
        transition-all duration-200
        ${opacityClass}
        ${borderClass}
      `}
      style={debugStyle}
    >
      <Handle type="target" position={Position.Top} className="!bg-blue-500/50 !w-2 !h-2" />

      <Icon className="h-4 w-4 text-blue-400" />
      <span className="text-blue-100 font-mono text-sm">{label}</span>

      <Handle type="source" position={Position.Bottom} className="!bg-blue-500/50 !w-2 !h-2" />
    </div>
  );
});
