import { Box, Hammer, Plus, Minus, Maximize, Globe, Wand2, Monitor, Cpu } from "lucide-react"
import { useReactFlow } from "@xyflow/react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useGraphStore } from "../store"

export function GraphOverlay() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { selectedNodeId, nodes } = useGraphStore();

  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col p-4">
      {/* Top Bar */}
      <div className="flex justify-between items-start pointer-events-auto">
        <div className="flex flex-col gap-4">
          {/* Filters */}
          <div className="flex gap-2">
            <Button variant="default" size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-md">
              <Box className="h-3 w-3" /> All Modules
            </Button>
            <Button variant="outline" size="sm" className="gap-2 bg-background/50 backdrop-blur border-border/50 hover:bg-background/80">
              <Cpu className="h-3 w-3" /> Core
            </Button>
            <Button variant="outline" size="sm" className="gap-2 bg-background/50 backdrop-blur border-border/50 hover:bg-background/80">
              <Monitor className="h-3 w-3" /> UI Kit
            </Button>
            <Button variant="outline" size="sm" className="gap-2 bg-background/50 backdrop-blur border-border/50 hover:bg-background/80">
              <Hammer className="h-3 w-3" /> Util
            </Button>
          </div>
        </div>

        {/* Action Button */}
        <Button
          className="bg-blue-600 hover:bg-blue-700 gap-2 pointer-events-auto shadow-lg shadow-blue-900/20 text-white"
          data-testid="refactor-graph-btn"
        >
          <Wand2 className="h-4 w-4" /> Refactor Graph
        </Button>
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
                <p className="text-xs text-muted-foreground truncate" title={selectedNode.id}>
                  {selectedNode.id}
                </p>
              </div>
              <div className="ml-auto text-right whitespace-nowrap">
                <div className="text-sm font-bold">N/A LOC</div>
                <div className="text-xs text-green-500 flex items-center gap-1 justify-end">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Healthy
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
                <span className="text-xs font-semibold">Isolate Module</span>
                <Switch id="isolate-module" data-testid="isolate-module-toggle" />
              </div>
              <p className="text-[10px] text-muted-foreground">Hide all unconnected nodes</p>
            </div>
          </Card>
        ) : (
          <div className="w-96" /> /* Spacer to keep zoom controls aligned if needed, or just remove */
        )}

        {/* Zoom Controls */}
        <div className="flex flex-col gap-2 ml-auto">
          <Button
            variant="secondary"
            size="icon"
            className="h-10 w-10 shadow-md border border-border/50"
            data-testid="zoom-in-btn"
            onClick={() => zoomIn()}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="h-10 w-10 shadow-md border border-border/50"
            data-testid="zoom-out-btn"
            onClick={() => zoomOut()}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="h-10 w-10 shadow-md border border-border/50"
            data-testid="fit-view-btn"
            onClick={() => fitView()}
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
