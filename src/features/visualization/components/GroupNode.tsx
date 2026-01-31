import { memo } from 'react';
import { type NodeProps, type Node } from '@xyflow/react';
import { Folder } from 'lucide-react';
import { type GroupNodeData } from '../types';
import { useGraphStore } from '../store';

// We extend NodeProps to override 'data' with our specific type
type GroupNodeProps = NodeProps<Node<GroupNodeData>>;

export const GroupNode = memo(({ data, selected }: GroupNodeProps) => {
  const viewMode = useGraphStore((s) => s.viewMode);
  const label = data.label || 'unknown';

  // Default Style
  let borderClass = 'border-slate-700';
  if (selected) {
    borderClass = 'border-blue-400 ring-2 ring-blue-400';
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

  return (
    <div
      data-testid={`node-${label}`}
      className={`
        h-full w-full
        border-2 border-dashed bg-slate-900/20 rounded-xl
        transition-all duration-200
        ${borderClass}
      `}
      style={dynamicStyle}
    >
      <div className="bg-slate-800/50 p-2 rounded-t-[10px] flex items-center gap-2 border-b border-slate-700/50">
        <Folder className="h-4 w-4 text-slate-400" />
        <span className="text-slate-300 font-mono text-sm font-semibold">{label}</span>
        {viewMode === 'instability' && data.metrics && (
           <span className="ml-auto text-xs font-mono opacity-70" style={{ color: dynamicStyle.borderColor }}>
             I: {instability.toFixed(2)}
           </span>
        )}
      </div>
    </div>
  );
});
