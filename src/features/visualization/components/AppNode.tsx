import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { AppWindow, FileCode, Package, File } from 'lucide-react';
import { type AppNodeData } from '../types';
import { useGraphStore } from '../store';
import { STATUS_STYLES } from './styles';

type AppNodeProps = NodeProps<Node<AppNodeData>>;

export const AppNode = memo(({ data, selected }: AppNodeProps) => {
  const viewMode = useGraphStore((s) => s.viewMode);
  const nodeSize = useGraphStore((s) => s.nodeSize);

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
  const dynamicStyle: React.CSSProperties = {
    ...(debugColor ? { borderColor: debugColor } : {}),
    // Ensure consistent transition for smooth mode switching to prevent glitches
    transition: 'all 0.3s ease'
  };

  if (viewMode === 'instability') {
    // 0 (Stable) -> Green (120), 1 (Unstable) -> Red (0)
    const hue = Math.max(0, Math.min(120, (1 - instability) * 120));
    const color = `hsl(${hue}, 70%, 40%)`;
    const bgColor = `hsla(${hue}, 70%, 10%, 0.3)`;

    dynamicStyle.borderColor = color;
    dynamicStyle.backgroundColor = bgColor;
  }

  // Handle Node Sizing
  if (nodeSize === 'centrality') {
    // Scale based on centrality.
    // Base 1.0. Max 1.5. Min 0.8.
    // Assuming centrality range [0, 0.05] effectively.
    const scale = Math.min(1.8, Math.max(0.7, 1 + (centrality * 20)));

    dynamicStyle.transform = `scale(${scale})`;
    dynamicStyle.transformOrigin = 'center';
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
