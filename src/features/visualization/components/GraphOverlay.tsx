import { Code, Download, Settings, Box, Layers, Hammer, Plus, Minus, Maximize, Globe, Wand2, Monitor, Cpu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export function GraphOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col p-4">
      {/* Top Bar */}
      <div className="flex justify-between items-start pointer-events-auto">
        <div className="flex flex-col gap-4">
          {/* Tools */}
          <Card className="flex items-center p-1 gap-1 w-fit bg-card/80 backdrop-blur border-border/50 shadow-sm">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <Code className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <Settings className="h-4 w-4" />
            </Button>
          </Card>

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
        <Button className="bg-blue-600 hover:bg-blue-700 gap-2 pointer-events-auto shadow-lg shadow-blue-900/20 text-white" data-testid="refactor-graph-btn">
          <Wand2 className="h-4 w-4" /> Refactor Graph
        </Button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Center Fake Node (Visual Only) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="border border-blue-500/50 bg-blue-950/30 backdrop-blur px-4 py-2 rounded-lg flex items-center gap-2 shadow-[0_0_30px_-5px_rgba(37,99,235,0.3)]">
          <Layers className="h-4 w-4 text-blue-400" />
          <span className="text-blue-100 font-mono text-sm">App.tsx</span>
        </div>
      </div>

      {/* Bottom Interface */}
      <div className="flex items-end justify-between pointer-events-auto">
        {/* Node Details Panel */}
        <Card className="w-96 p-4 bg-card/90 backdrop-blur flex flex-col gap-4 shadow-xl border-border/50">
           <div className="flex items-center gap-3">
             <div className="h-10 w-10 rounded bg-blue-600/20 flex items-center justify-center text-blue-400">
               <Globe className="h-5 w-5" />
             </div>
             <div>
               <h3 className="font-semibold text-sm">User.tsx</h3>
               <p className="text-xs text-muted-foreground">/src/components/profile</p>
             </div>
             <div className="ml-auto text-right">
               <div className="text-sm font-bold">142 LOC</div>
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

        {/* Zoom Controls */}
        <div className="flex flex-col gap-2">
          <Button variant="secondary" size="icon" className="h-10 w-10 shadow-md border border-border/50" data-testid="zoom-in-btn">
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="icon" className="h-10 w-10 shadow-md border border-border/50" data-testid="zoom-out-btn">
            <Minus className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="icon" className="h-10 w-10 shadow-md border border-border/50" data-testid="fit-view-btn">
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
