import { useMemo } from "react"
import { useShallow } from 'zustand/react/shallow'
import { Box, Hammer, Globe, Wand2, Monitor, Cpu, PanelRight, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useGraphStore, type ViewMode } from "../store"
import { cn } from "@/lib/utils"
import { type ModuleCategory } from "../logic/filters"
import { type AppNodeData, type GroupNodeData } from "../types"

type FilterConfig = {
  key: ModuleCategory | 'all';
  label: string;
  icon: React.ElementType;
};

const FILTERS: FilterConfig[] = [
  { key: 'all', label: 'All Modules', icon: Box },
  { key: 'core', label: 'Core', icon: Cpu },
  { key: 'ui', label: 'UI Kit', icon: Monitor },
  { key: 'util', label: 'Util', icon: Hammer },
];

// Status configuration map for GraphOverlay
const STATUS_CONFIG = {
  healthy: { label: 'Healthy', color: 'text-green-500', dot: 'bg-green-500' },
  warning: { label: 'Warning', color: 'text-yellow-500', dot: 'bg-yellow-500' },
  unhealthy: { label: 'Unhealthy', color: 'text-red-500', dot: 'bg-red-500' },
  default: { label: 'Unknown', color: 'text-muted-foreground', dot: 'bg-muted-foreground' }
};

const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  standard: 'Standard',
  instability: 'Instability Heatmap',
};

export function GraphOverlay() {
  const {
    hideTypeDefinitions,
    activeFilters,
    isInspectorOpen,
    viewMode,
    hasUnsavedChanges,
    toggleTypeDefinitions,
    setFilter,
    setInspectorOpen,
    setViewMode,
    resetSimulation,
    isolateModule,
    toggleIsolateModule
  } = useGraphStore(useShallow((state) => ({
    hideTypeDefinitions: state.hideTypeDefinitions,
    activeFilters: state.activeFilters,
    isInspectorOpen: state.isInspectorOpen,
    viewMode: state.viewMode,
    hasUnsavedChanges: state.hasUnsavedChanges,
    toggleTypeDefinitions: state.toggleTypeDefinitions,
    setFilter: state.setFilter,
    setInspectorOpen: state.setInspectorOpen,
    setViewMode: state.setViewMode,
    resetSimulation: state.resetSimulation,
    isolateModule: state.isolateModule,
    toggleIsolateModule: state.toggleIsolateModule,
  })));

  // Optimize: Select only the necessary data for the selected node to prevent re-renders
  // when other nodes (including the selected one) move during drag.
  // We explicitly pick data fields to ensure shallow equality works if the node object
  // reference changes but data content remains the same.
  const selectedNode = useGraphStore(useShallow((state) => {
    const node = state.selectedNodeId ? state.nodes.find((n) => n.id === state.selectedNodeId) : null;
    if (!node) return null;
    return {
      id: node.id,
      data: node.data,
    };
  }));

  const { scoreDisplay, statusConfig } = useMemo(() => {
    if (!selectedNode) return { scoreDisplay: 'N/A', statusConfig: STATUS_CONFIG.default };

    // Check if it's a file node or group node
    const data = selectedNode.data as AppNodeData; // Works for GroupNodeData too as it has similar fields
    const score = data.metrics?.compoundScore;
    const status = data.healthStatus || 'default';
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.default;

    return {
      scoreDisplay: score !== undefined ? score.toFixed(1) : 'N/A',
      statusConfig: config
    };
  }, [selectedNode]);

  const getFilterButtonClass = (isActive: boolean) =>
    cn(
      "gap-2 shadow-md transition-colors",
      isActive
        ? "bg-blue-600 hover:bg-blue-700 text-white border-transparent"
        : "bg-background/50 backdrop-blur border-border/50 hover:bg-background/80 text-foreground"
    );

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col p-4">
      {/* Top Bar */}
      <div className="flex justify-between items-start pointer-events-auto">
        <div className="flex flex-col gap-4">
          {/* Filters */}
          <div className="flex gap-2">
            {FILTERS.map((filter) => {
              const Icon = filter.icon;
              const isActive =
                filter.key === 'all'
                  ? activeFilters.length === 0
                  : activeFilters.includes(filter.key);

              return (
                <Button
                  key={filter.key}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  className={getFilterButtonClass(isActive)}
                  onClick={() => setFilter(filter.key)}
                  aria-pressed={isActive}
                >
                  <Icon className="h-3 w-3" /> {filter.label}
                </Button>
              );
            })}
          </div>

          {/* Secondary Filters */}
          <div className="flex items-center gap-2">
              {/* Type Defs Toggle */}
              <div className="flex items-center space-x-2 bg-background/50 backdrop-blur p-2 rounded-md border border-border/50 w-fit pointer-events-auto">
                 <Switch
                    id="hide-type-defs"
                    checked={hideTypeDefinitions}
                    onCheckedChange={toggleTypeDefinitions}
                 />
                 <Label htmlFor="hide-type-defs" className="text-sm cursor-pointer">Hide Type Definitions</Label>
              </div>

              {/* View Mode Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                   <Button variant="outline" size="sm" className="bg-background/50 backdrop-blur border-border/50 gap-2">
                      <Eye className="h-4 w-4" />
                      View: {VIEW_MODE_LABELS[viewMode]}
                   </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                   <DropdownMenuRadioGroup value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                      <DropdownMenuRadioItem value="standard">Standard</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="instability">Instability Heatmap</DropdownMenuRadioItem>
                   </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pointer-events-auto">
          {hasUnsavedChanges && (
            <Button
              variant="outline"
              className="gap-2 shadow-lg bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
              onClick={resetSimulation}
            >
              Reset Simulation
            </Button>
          )}
          <Button
            variant="outline"
            className={cn("gap-2 shadow-lg bg-background/50 backdrop-blur border-border/50 hover:bg-background/80", isInspectorOpen && "bg-accent text-accent-foreground")}
            onClick={() => setInspectorOpen(!isInspectorOpen)}
            aria-pressed={isInspectorOpen}
          >
            <PanelRight className="h-4 w-4" /> Inspector
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="bg-blue-600/50 gap-2 shadow-lg shadow-blue-900/10 text-white/50 cursor-not-allowed hover:bg-blue-600/50"
                data-testid="refactor-graph-btn"
                aria-disabled="true"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              >
                <Wand2 className="h-4 w-4" /> Refactor Graph
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Coming in Phase 3</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom Interface */}
      <div className="flex items-end justify-between pointer-events-auto">
        {/* Node Details Panel */}
        {selectedNode ? (
          <Card className="w-96 p-4 bg-card/90 backdrop-blur flex flex-col gap-4 shadow-xl border-border/50">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded bg-blue-600/20 flex items-center justify-center text-blue-400">
                <Globe className="h-5 w-5" />
              </div>
              <div className="overflow-hidden">
                <h3 className="font-semibold text-sm truncate" title={selectedNode.data.label as string}>
                  {selectedNode.data.label as string}
                </h3>
                <p className="text-xs text-muted-foreground truncate" title={(selectedNode.data.fullPath || selectedNode.id) as string}>
                  {(selectedNode.data.fullPath || selectedNode.id) as string}
                </p>
              </div>
              <div className="ml-auto text-right whitespace-nowrap">
                <div className="text-sm font-bold" title="Compound Complexity Score">{scoreDisplay} Score</div>
                <div className="text-xs text-muted-foreground mb-1">
                  {((selectedNode.data as AppNodeData | GroupNodeData).metrics?.loc ?? "N/A")} LOC
                </div>
                <div className={`text-xs ${statusConfig.color} flex items-center gap-1 justify-end`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`} /> {statusConfig.label}
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Visual Settings</h4>
              <div className="flex items-center space-x-2">
                <Switch id="critical-paths" defaultChecked />
                <Label htmlFor="critical-paths" className="text-sm cursor-pointer">Highlight Critical Paths</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="circular-deps" />
                <Label htmlFor="circular-deps" className="text-sm cursor-pointer">Show Circular Dependencies</Label>
              </div>
            </div>

            <div className="bg-muted/50 p-3 rounded-md mt-1 border border-border/50">
              <div className="flex justify-between items-center mb-1">
                <Label htmlFor="isolate-module" className="text-xs font-semibold cursor-pointer">Isolate Module</Label>
                <Switch
                  id="isolate-module"
                  data-testid="isolate-module-toggle"
                  checked={isolateModule}
                  onCheckedChange={toggleIsolateModule}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">Hide all unconnected nodes</p>
            </div>
          </Card>
        ) : (
          <div className="w-96" /> /* Spacer to keep zoom controls aligned if needed, or just remove */
        )}

      </div>
    </div>
  )
}
