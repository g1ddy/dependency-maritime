// Visual Styles Map shared between AppNode and GroupNode
export const STATUS_STYLES = {
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
