import { Menu, Upload, Code, Settings, Network } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"

interface HeaderProps {
  onOpenDataSource: () => void;
  onOpenSettings: () => void;
  currentPath?: string;
}

export function Header({ onOpenDataSource, onOpenSettings, currentPath = '/' }: HeaderProps) {
  const appVersion = (import.meta.env.VITE_APP_VERSION as string) || '0.0.0'

  return (
    <header className="h-14 border-b bg-background flex items-center justify-between px-4 z-50 relative">
      <div className="flex items-center gap-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open Menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
              <SheetDescription>
                Navigate and configure the application
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-2 mt-4">
              <Link to="/">
                <Button variant={currentPath === '/' ? "secondary" : "ghost"} className="w-full justify-start">
                  <Code className="h-4 w-4 mr-2" />
                  Dependency Graph
                </Button>
              </Link>
              <Link to="/relationships">
                <Button variant={currentPath === '/relationships' ? "secondary" : "ghost"} className="w-full justify-start">
                  <Network className="h-4 w-4 mr-2" />
                  Relationship Diagram
                </Button>
              </Link>
            </div>
            <div className="border-t my-4 pt-4">
              <Button variant="ghost" className="w-full justify-start" onClick={onOpenSettings}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex items-center gap-1 border-r pr-4 mr-1">
          <Link to="/">
            <Button variant={currentPath === '/' ? "secondary" : "ghost"} size="sm" className={cn("gap-2", currentPath === '/' && "bg-secondary")} aria-label="Dependency Graph">
              <Code className="h-4 w-4" />
              <span className="hidden sm:inline" data-testid="app-title">Dependency Graph</span>
            </Button>
          </Link>
          <Link to="/relationships">
            <Button variant={currentPath === '/relationships' ? "secondary" : "ghost"} size="sm" className={cn("gap-2", currentPath === '/relationships' && "bg-secondary")} aria-label="Relationships">
              <Network className="h-4 w-4" />
              <span className="hidden sm:inline">Relationships</span>
            </Button>
          </Link>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-xs text-muted-foreground mr-2" data-testid="app-version">
            v{appVersion}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ModeToggle />
        {(currentPath === '/' || currentPath === '/relationships') && (
          <Button variant="ghost" size="icon" onClick={onOpenDataSource} aria-label="Upload/Select Data Source">
            <Upload className="h-5 w-5" />
          </Button>
        )}
      </div>
    </header>
  )
}
