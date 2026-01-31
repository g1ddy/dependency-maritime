import { memo } from 'react';
import { type NodeProps, type Node } from '@xyflow/react';
import { Folder } from 'lucide-react';
import { type GroupNodeData } from '../types';
import { useGraphStore } from '../store';
import { STATUS_STYLES } from './styles';

// We extend NodeProps to override 'data' with our specific type
type GroupNodeProps = NodeProps<Node<GroupNodeData>>;

export const GroupNode = memo(({ data, selected }: GroupNodeProps) => {
  const viewMode = useGraphStore((s) => s.viewMode);
  const label = data.label || 'unknown';
  const healthStatus = data.healthStatus || 'default';

  const styles = STATUS_STYLES[healthStatus] || STATUS_STYLES.default;

  // Visual Styling
  let borderClass = styles.border;
  if (selected) {
    borderClass = styles.selected;
  }

  // Heatmap Logic
  const instability = data.metrics?.instability ?? 0;

  let dynamicStyle: React.CSSProperties = {};

  if (viewMode === 'instability' && data.metrics) {
      // 0 (Stable) -> Green (120), 1 (Unstable) -> Red (0)
      const hue = Math.max(0, Math.min(120, (1 - instability) * 120));
      const color = `hsl(${hue}, 70%, 40%)`;
      const bgColor = `hsla(${hue}, 70%, 10%, 0.2)`; // Transparent fill

      dynamicStyle = {
        borderColor: color,
        backgroundColor: bgColor,
        borderStyle: 'solid', // Make solid for heatmap visibility
        borderWidth: selected ? 3 : 2,
      };
  }

  // Determine background class
  // We use styles.bg for 'standard' mode, and a default fallback for others (like 'centrality')
  // unless overridden by inline styles (like in 'instability' mode).
  const bgClass = viewMode === 'standard' ? styles.bg : 'bg-slate-900/20';

  return (
    <div
      data-testid={`node-${label}`}
      className={`
        h-full w-full
        border-2 border-dashed rounded-xl
        transition-all duration-200
        ${bgClass}
        ${borderClass}
      `}
      style={dynamicStyle}
    >
      <div className="bg-slate-800/50 p-2 rounded-t-[10px] flex items-center gap-2 border-b border-slate-700/50">
        <Folder className={`h-4 w-4 ${styles.icon}`} />
        <span className={`${styles.text} font-mono text-sm font-semibold`}>{label}</span>
        {viewMode === 'instability' && data.metrics && (
           <span className="ml-auto text-xs font-mono opacity-70" style={{ color: dynamicStyle.borderColor }}>
             I: {instability.toFixed(2)}
           </span>
        )}
      </div>
    </div>
  );
});
