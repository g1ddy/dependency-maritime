import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useGraphStore, type LayoutEngine } from "../store"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const LAYOUT_ENGINE_LABELS: Record<LayoutEngine, string> = {
  dagre: 'Hierarchical (Dagre)',
  elk: 'ELK',
};

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const nodeSize = useGraphStore((s) => s.nodeSize)
  const setNodeSize = useGraphStore((s) => s.setNodeSize)
  const layoutEngine = useGraphStore((s) => s.layoutEngine)
  const setLayoutEngine = useGraphStore((s) => s.setLayoutEngine)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Visual Settings</DialogTitle>
          <DialogDescription>
            Configure how the dependency graph is visualized.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="node-size-mode" className="flex flex-col space-y-1">
              <span>Size by Centrality</span>
              <span className="font-normal text-xs text-muted-foreground">
                Scale nodes based on their importance (PageRank)
              </span>
            </Label>
            <Switch
              id="node-size-mode"
              checked={nodeSize === 'centrality'}
              onCheckedChange={(checked) => setNodeSize(checked ? 'centrality' : 'uniform')}
            />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <Label className="flex flex-col space-y-1">
              <span>Layout Engine</span>
              <span className="font-normal text-xs text-muted-foreground">
                Choose the algorithm for arranging nodes
              </span>
            </Label>
            <DropdownMenu>
               <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="min-w-[140px] justify-center">
                    {LAYOUT_ENGINE_LABELS[layoutEngine]}
                  </Button>
               </DropdownMenuTrigger>
               <DropdownMenuContent>
                  <DropdownMenuRadioGroup value={layoutEngine} onValueChange={(v) => setLayoutEngine(v as LayoutEngine)}>
                     <DropdownMenuRadioItem value="dagre">{LAYOUT_ENGINE_LABELS.dagre}</DropdownMenuRadioItem>
                     <DropdownMenuRadioItem value="elk">{LAYOUT_ENGINE_LABELS.elk}</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
               </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
