import "../../vite-env.d.ts"
import { useRef } from "react"
import { Menu, Upload, Code, Download, Settings, Database, FileJson, LayoutTemplate } from "lucide-react"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface HeaderProps {
  onUpload: (file: File) => void;
  onLoadSample: () => void;
  onLoadProject: () => void;
}

export function Header({ onUpload, onLoadSample, onLoadProject }: HeaderProps) {
  const appVersion = import.meta.env.VITE_APP_VERSION as string
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    onUpload(file)

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
             <Button variant="outline" size="sm" className="gap-2">
                <Database className="h-4 w-4" />
                <span>Data Source</span>
             </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Load Graph Data</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" /> Upload JSON...
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLoadSample}>
              <LayoutTemplate className="mr-2 h-4 w-4" /> Load Sample Data
            </DropdownMenuItem>
             <DropdownMenuItem onClick={onLoadProject}>
              <FileJson className="mr-2 h-4 w-4" /> Load Project Graph
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
        />
      </div>
    </header>
  )
}
