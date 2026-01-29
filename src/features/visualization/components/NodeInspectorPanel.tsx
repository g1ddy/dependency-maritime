import { X, ArrowRight, ArrowLeft, Activity, Info, Box } from "lucide-react";
import { useGraphStore } from "../store";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { type AppNodeData } from "../types";

export function NodeInspectorPanel() {
  const {
    isInspectorOpen,
    setInspectorOpen,
    selectedNodeId,
    nodes,
    graph,
    selectNode
  } = useGraphStore();

  if (!isInspectorOpen) return null;

  // Find the selected node data.
  // If no node is selected, we show a placeholder.
  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;

  // Helper to get neighbors
  const getNeighbors = (direction: 'in' | 'out') => {
    if (!graph || !selectedNodeId) return [];

    // Safety check if node exists in graph (might be filtered out or group node handling)
    if (!graph.hasNode(selectedNodeId)) return [];

    const neighbors = direction === 'in' ? graph.inNeighbors(selectedNodeId) : graph.outNeighbors(selectedNodeId);
    return neighbors.map(id => {
       // Try to find in rendered nodes first to get current state if needed, or fallback to graph attributes
       const node = nodes.find(n => n.id === id);
       // graph.getNodeAttribute returns any, so we cast or assume string
       const graphLabel = graph.getNodeAttribute(id, 'label') as string;
       const label = (node?.data?.label as string) || graphLabel || id;
       return { id, label };
    });
  };

  const dependencies = getNeighbors('out');
  const dependents = getNeighbors('in');

  const metrics = selectedNode ? (selectedNode.data as AppNodeData).metrics : undefined;

  return (
    <div className={cn(
      "absolute right-0 top-0 h-full w-80 bg-background border-l shadow-xl z-20 flex flex-col transition-all duration-300 ease-in-out",
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold flex items-center gap-2">
          <Info className="h-4 w-4 text-blue-500" />
          Node Inspector
        </h2>
        <Button variant="ghost" size="icon" onClick={() => setInspectorOpen(false)} aria-label="Close Inspector">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {selectedNode ? (
          <>
            {/* Identity */}
            <div>
               <div className="flex items-start justify-between">
                  <h3 className="text-lg font-bold break-words leading-tight">
                    {(selectedNode.data as AppNodeData).label}
                  </h3>
               </div>
               <p className="text-xs text-muted-foreground mt-1 break-all font-mono bg-muted p-1 rounded">
                 {(selectedNode.data as AppNodeData).fullPath || selectedNode.id}
               </p>
            </div>

            <Separator />

            {/* Metrics */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                 <Activity className="h-3 w-3" /> Metrics
              </h4>
              <div className="grid grid-cols-2 gap-3">
                 <MetricCard
                    label="Instability"
                    value={metrics?.instability?.toFixed(2) ?? "N/A"}
                    description="0=Stable, 1=Volatile"
                    color={getInstabilityColor(metrics?.instability)}
                 />
                 <MetricCard
                    label="Centrality"
                    value={metrics?.centrality?.toFixed(4) ?? "N/A"}
                    description="PageRank Score"
                 />
                 <MetricCard
                    label="Complexity"
                    value="N/A"
                    description="Cyclomatic"
                 />
              </div>
            </div>

            <Separator />

            {/* Relations */}
            <div className="space-y-4">
               <RelationList
                  title="Dependencies"
                  items={dependencies}
                  icon={ArrowRight}
                  onSelect={selectNode}
                  emptyText="No dependencies"
               />
               <RelationList
                  title="Dependents"
                  items={dependents}
                  icon={ArrowLeft}
                  onSelect={selectNode}
                  emptyText="No dependents"
               />
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
            <Box className="h-12 w-12 mb-4 opacity-20" />
            <p>Select a node in the graph to view its details.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Helpers

function MetricCard({ label, value, description, color }: { label: string, value: string | number, description?: string, color?: string }) {
  return (
    <div className="bg-muted/40 p-3 rounded-lg border">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={cn("text-xl font-bold", color)}>{value}</div>
      {description && <div className="text-[10px] text-muted-foreground mt-1">{description}</div>}
    </div>
  );
}

function getInstabilityColor(value?: number) {
  if (value === undefined) return "";
  if (value < 0.3) return "text-green-500";
  if (value > 0.7) return "text-red-500";
  return "text-yellow-500";
}

interface RelationItem {
  id: string;
  label: string;
}

interface RelationListProps {
  title: string;
  items: RelationItem[];
  icon: React.ElementType;
  onSelect: (id: string) => void;
  emptyText: string;
}

function RelationList({ title, items, icon: Icon, onSelect, emptyText }: RelationListProps) {
  return (
    <div>
       <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
         <Icon className="h-3 w-3" /> {title} <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{items.length}</Badge>
       </h4>
       {items.length === 0 ? (
         <p className="text-xs text-muted-foreground italic pl-5">{emptyText}</p>
       ) : (
         <ul className="space-y-1">
           {items.map((item) => (
             <li key={item.id}>
               <button
                 className="w-full text-left text-xs px-2 py-1.5 rounded-md hover:bg-muted/80 truncate transition-colors flex items-center gap-2"
                 onClick={() => onSelect(item.id)}
                 title={item.id}
               >
                 <div className="h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                 <span className="truncate">{item.label}</span>
               </button>
             </li>
           ))}
         </ul>
       )}
    </div>
  )
}
