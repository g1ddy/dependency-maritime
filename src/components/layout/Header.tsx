import "../../vite-env.d.ts"
import { Menu, Upload, Code, Download, Settings } from "lucide-react"
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

export function Header() {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const appVersion = import.meta.env.VITE_APP_VERSION || "DEV"

  return (
    <header className="h-14 border-b bg-background flex items-center justify-between px-4 z-50 relative">
      <div className="flex items-center gap-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="top">
            <SheetHeader>
              <SheetTitle>Actions</SheetTitle>
              <SheetDescription>
                Project settings and tools
              </SheetDescription>
            </SheetHeader>
            <div className="flex gap-4 mt-4">
              {[
                { icon: Code, label: "Code" },
                { icon: Download, label: "Export" },
                { icon: Settings, label: "Settings" },
              ].map(({ icon: Icon, label }) => (
                <Button
                  key={label}
                  variant="ghost"
                  className="flex flex-col items-center gap-1 h-auto p-2"
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-xs">{label}</span>
                </Button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
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
