import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { AppWindow, FileCode, Package, File } from 'lucide-react';
import { type AppNodeData } from '../types';
import { useGraphStore } from '../store';

type AppNodeProps = NodeProps<Node<AppNodeData>>;

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

export const AppNode = memo(({ data, selected }: AppNodeProps) => {
  const viewMode = useGraphStore((s) => s.viewMode);

  const label = data.label || 'unknown';
  const isExternal = !!data.external;

  // Visual states from data
  const isHighlighted = !!data.highlighted;
  const isDimmed = !!data.dimmed;
  const debugColor = data.debugColor;
  const healthStatus = data.healthStatus || 'default';

  // Metrics
  const instability = data.metrics?.instability ?? 0;
  const centrality = data.metrics?.centrality ?? 0;

  // Determine icon based on file extension or type
  let Icon = File;
  if (isExternal) {
    Icon = Package;
  } else if (label.endsWith('.tsx')) {
    Icon = AppWindow;
  } else if (label.endsWith('.ts')) {
    Icon = FileCode;
  }

  const styles = STATUS_STYLES[healthStatus] || STATUS_STYLES.default;

  // Determine base classes
  const opacityClass = isDimmed ? 'opacity-20 grayscale' : 'opacity-100';
  let borderClass = styles.border;

  // Selection overrides
  if (selected) {
    borderClass = styles.selected;
  } else if (isHighlighted) {
    borderClass = styles.highlighted;
  }

  // Calculate dynamic styles for Heatmap Modes
  const dynamicStyle: React.CSSProperties = { ...debugColor ? { borderColor: debugColor } : {} };

  if (viewMode === 'instability') {
    // 0 (Stable) -> Green (120), 1 (Unstable) -> Red (0)
    const hue = Math.max(0, Math.min(120, (1 - instability) * 120));
    const color = `hsl(${hue}, 70%, 40%)`;
    const bgColor = `hsla(${hue}, 70%, 10%, 0.3)`;

    // Override border and background
    // We keep selection borders if selected (handled by CSS specificity/inline logic? Inline wins)
    // If selected, we might want to keep the "Ring" but change the inner border.
    // However, borderClass sets the border color.
    // If we set inline borderColor, it overrides the class.

    dynamicStyle.borderColor = color;
    dynamicStyle.backgroundColor = bgColor;
    // Add a transition for smooth mode switching
    dynamicStyle.transition = 'all 0.3s ease';

    // If selected, maybe add a box shadow manually? Or trust the ring class from Tailwind?
    // Tailwind ring classes usually work independently of border-color.
  } else if (viewMode === 'centrality') {
    // Scale based on centrality.
    // Base 1.0. Max 1.5. Min 0.8.
    // Assuming centrality range [0, 0.05] effectively.
    const scale = Math.min(1.8, Math.max(0.7, 1 + (centrality * 20)));

    dynamicStyle.transform = `scale(${scale})`;
    dynamicStyle.transformOrigin = 'center';
    dynamicStyle.transition = 'transform 0.3s ease';
    // Keep default colors
  }

  return (
    <div
      data-testid={`node-${label}`}
      className={`
        border backdrop-blur px-4 py-2 rounded-lg flex items-center gap-2
        transition-all duration-200
        ${viewMode === 'standard' ? styles.bg : ''}
        ${viewMode === 'standard' ? styles.shadow : ''}
        ${opacityClass}
        ${borderClass}
      `}
      style={dynamicStyle}
    >
      <Handle type="target" position={Position.Top} className={`${styles.handle} !w-2 !h-2`} />

      <Icon className={`h-4 w-4 ${styles.icon}`} />
      <span className={`${styles.text} font-mono text-sm`}>{label}</span>

      <Handle type="source" position={Position.Bottom} className={`${styles.handle} !w-2 !h-2`} />
    </div>
  );
});
