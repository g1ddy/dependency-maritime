import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Folder } from 'lucide-react';

export const GroupNode = memo(({ data, selected }: NodeProps) => {
  const label = (data.label as string) || 'unknown';

  let borderClass = 'border-slate-700';
  if (selected) {
    borderClass = 'border-blue-400 ring-2 ring-blue-400';
  }

  return (
    <div
      className={`
        h-full w-full
        border-2 border-dashed bg-slate-900/20 rounded-xl
        transition-all duration-200
        ${borderClass}
      `}
    >
      <div className="bg-slate-800/50 p-2 rounded-t-[10px] flex items-center gap-2 border-b border-slate-700/50">
        <Folder className="h-4 w-4 text-slate-400" />
        <span className="text-slate-300 font-mono text-sm font-semibold">{label}</span>
      </div>
    </div>
  );
});
