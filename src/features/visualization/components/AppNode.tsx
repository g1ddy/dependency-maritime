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
  const healthStatus = data.healthStatus || 'default';

  // Determine icon based on file extension or type
  let Icon = File;
  if (isExternal) {
    Icon = Package;
  } else if (label.endsWith('.tsx')) {
    Icon = AppWindow;
  } else if (label.endsWith('.ts')) {
    Icon = FileCode;
  }

  // Visual Styles Map
  const STATUS_STYLES = {
    healthy: {
      border: 'border-green-500/50',
      bg: 'bg-green-950/30',
      text: 'text-green-100',
      icon: 'text-green-400',
      handle: '!bg-green-500/50',
      shadow: 'shadow-[0_0_30px_-5px_rgba(34,197,94,0.3)]',
      selected: 'border-green-400 ring-2 ring-green-400',
      highlighted: 'border-green-400/80 ring-1 ring-green-400/50'
    },
    warning: {
      border: 'border-yellow-500/50',
      bg: 'bg-yellow-950/30',
      text: 'text-yellow-100',
      icon: 'text-yellow-400',
      handle: '!bg-yellow-500/50',
      shadow: 'shadow-[0_0_30px_-5px_rgba(234,179,8,0.3)]',
      selected: 'border-yellow-400 ring-2 ring-yellow-400',
      highlighted: 'border-yellow-400/80 ring-1 ring-yellow-400/50'
    },
    unhealthy: {
      border: 'border-red-500/50',
      bg: 'bg-red-950/30',
      text: 'text-red-100',
      icon: 'text-red-400',
      handle: '!bg-red-500/50',
      shadow: 'shadow-[0_0_30px_-5px_rgba(239,68,68,0.3)]',
      selected: 'border-red-400 ring-2 ring-red-400',
      highlighted: 'border-red-400/80 ring-1 ring-red-400/50'
    },
    default: {
      border: 'border-blue-500/50',
      bg: 'bg-blue-950/30',
      text: 'text-blue-100',
      icon: 'text-blue-400',
      handle: '!bg-blue-500/50',
      shadow: 'shadow-[0_0_30px_-5px_rgba(37,99,235,0.3)]',
      selected: 'border-blue-400 ring-2 ring-blue-400',
      highlighted: 'border-blue-400/80 ring-1 ring-blue-400/50'
    }
  };

  const styles = STATUS_STYLES[healthStatus] || STATUS_STYLES.default;

  // Determine styles
  const opacityClass = isDimmed ? 'opacity-20 grayscale' : 'opacity-100';

  let borderClass = styles.border;
  if (selected) {
    borderClass = styles.selected;
  } else if (isHighlighted) {
    borderClass = styles.highlighted;
  }

  // If debugColor is present (after async processing), we override the border color
  // to prove the update happened.
  const debugStyle = debugColor ? { borderColor: debugColor } : {};

  return (
    <div
      data-testid={`node-${label}`}
      className={`
        border backdrop-blur px-4 py-2 rounded-lg flex items-center gap-2
        transition-all duration-200
        ${styles.bg}
        ${styles.shadow}
        ${opacityClass}
        ${borderClass}
      `}
      style={debugStyle}
    >
      <Handle type="target" position={Position.Top} className={`${styles.handle} !w-2 !h-2`} />

      <Icon className={`h-4 w-4 ${styles.icon}`} />
      <span className={`${styles.text} font-mono text-sm`}>{label}</span>

      <Handle type="source" position={Position.Bottom} className={`${styles.handle} !w-2 !h-2`} />
    </div>
  );
});
