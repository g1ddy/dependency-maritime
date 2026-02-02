import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useGraphStore } from "../store"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { nodeSize, setNodeSize } = useGraphStore()

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
        </div>
      </DialogContent>
    </Dialog>
  )
}
