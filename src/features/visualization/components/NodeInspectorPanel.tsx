import { useMemo, useCallback } from "react";
import { X, ArrowRight, ArrowLeft, Activity, Info, Box } from "lucide-react";
import { useGraphStore } from "../store";
import { getFolderDescendants } from "../logic/graph-utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { type AppNodeData, type GroupNodeData } from "../types";

export function NodeInspectorPanel() {
  const {
    isInspectorOpen,
    setInspectorOpen,
    selectedNodeId,
    nodesById,
    graph,
    selectNode
  } = useGraphStore();

  // Helper to get neighbors
  const getNeighbors = useCallback((direction: 'in' | 'out') => {
    if (!graph || !selectedNodeId) return [];

    const selectedNode = nodesById.get(selectedNodeId);

    // If Group Node: Aggregate dependencies from all descendants
    if (selectedNode?.type === 'groupNode') {
       const descendants = getFolderDescendants(graph, selectedNodeId);

       const uniqueNeighbors = new Set<string>();

       descendants.forEach(childId => {
          const neighbors = direction === 'in' ? graph.inNeighbors(childId) : graph.outNeighbors(childId);
          neighbors.forEach(nId => {
             // Skip if neighbor is internal to the group
             if (nId.startsWith(selectedNodeId + '/')) return;

             // Find parent folder of the neighbor to aggregate
             // Optimization (Bolt): Replaced array allocation nId.split('/').pop().join('/')
             // with lastIndexOf/substring to minimize GC pressure when processing large folders.
             const lastSlashIndex = nId.lastIndexOf('/');
             const parentPath = lastSlashIndex > 0 ? nId.substring(0, lastSlashIndex) : (lastSlashIndex === 0 ? '/' : '');

             // If parent path is valid and not the selected node itself (circular case?), add it
             // Also ensure we don't just add empty string for external deps
             if (parentPath && parentPath !== selectedNodeId && nodesById.has(parentPath)) {
                 uniqueNeighbors.add(parentPath);
             } else {
                 // Fallback to file/package ID
                 uniqueNeighbors.add(nId);
             }
          });
       });

       return Array.from(uniqueNeighbors).map(id => {
          const node = nodesById.get(id);
          const label = (node?.data?.label as string) || id;
          return { id, label };
       });
    }

    // Standard File Node Logic
    if (!graph.hasNode(selectedNodeId)) return [];

    const neighbors = direction === 'in' ? graph.inNeighbors(selectedNodeId) : graph.outNeighbors(selectedNodeId);
    return neighbors.map(id => {
       const node = nodesById.get(id);
       const graphLabel = graph.getNodeAttribute(id, 'label') as string;
       const label = (node?.data?.label as string) || graphLabel || id;
       return { id, label };
    });
  }, [graph, selectedNodeId, nodesById]);

  const dependencies = useMemo(() => getNeighbors('out'), [getNeighbors]);
  const dependents = useMemo(() => getNeighbors('in'), [getNeighbors]);

  // Find the selected node data.
  const selectedNode = selectedNodeId ? nodesById.get(selectedNodeId) : null;
  const metrics = selectedNode ? (selectedNode.data as AppNodeData | GroupNodeData).metrics : undefined;
  const label = selectedNode ? (selectedNode.data.label as string) : '';
  const fullPath = selectedNode ? ((selectedNode.data as AppNodeData).fullPath || selectedNode.id) : '';

  if (!isInspectorOpen) return null;

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
                    {label}
                  </h3>
                  {selectedNode.type === 'groupNode' && <Badge variant="outline">Folder</Badge>}
               </div>
               <p className="text-xs text-muted-foreground mt-1 break-all font-mono bg-muted p-1 rounded">
                 {fullPath}
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
                    value={metrics?.cyclomaticComplexity ?? "N/A"}
                    description={selectedNode.type === 'groupNode' ? "Total Cyclomatic" : "Cyclomatic"}
                 />
                 <MetricCard
                    label="LOC"
                    value={metrics?.loc ?? "N/A"}
                    description={selectedNode.type === 'groupNode' ? "Total LOC" : "Lines of Code"}
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
                 className="w-full text-left text-xs px-2 py-1.5 rounded-md hover:bg-muted/80 truncate transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
