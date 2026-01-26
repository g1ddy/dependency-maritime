import { ArrowLeft, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"

export function Header() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const appVersion = (import.meta as any).env.VITE_APP_VERSION || "DEV"

  return (
    <header className="h-14 border-b bg-background flex items-center justify-between px-4 z-50 relative">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-lg" data-testid="app-title">
            Dependency Graph
          </span>
          <span className="text-xs text-muted-foreground" data-testid="app-version">
            v{appVersion}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ModeToggle />
        <Button variant="ghost" size="icon">
          <Upload className="h-5 w-5" />
        </Button>
      </div>
    </header>
  )
}
