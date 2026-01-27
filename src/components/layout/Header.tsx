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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useRef, useState } from "react"
import { type ICruiseResult, CruiseResultSchema } from "@/schema/dependency-cruiser"
import { ZodError } from "zod"

interface HeaderProps {
  onDataLoaded?: (data: ICruiseResult) => void;
}

export function Header({ onDataLoaded }: HeaderProps) {
  const appVersion = import.meta.env.VITE_APP_VERSION as string

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorDetails, setErrorDetails] = useState({ title: "", description: "" })

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const json = JSON.parse(text)
      const result = CruiseResultSchema.parse(json)
      onDataLoaded?.(result)
    } catch (error) {
      console.error("Upload error:", error)
      let title = "Error"
      let description = "An unexpected error occurred."

      if (error instanceof SyntaxError) {
        title = "Invalid JSON"
        description = "The file content is not valid JSON. Please check the file and try again."
      } else if (error instanceof ZodError) {
        title = "Validation Error"
        const details = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(", ")
        description = "The JSON structure does not match the expected schema. " + (details || error.message)
      } else if (error instanceof Error) {
        description = error.message
      }

      setErrorDetails({ title, description })
      setErrorDialogOpen(true)
    } finally {
      // Reset input value to allow re-uploading the same file if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
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
        <input
          type="file"
          accept=".json"
          ref={fileInputRef}
          className="hidden"
          onChange={(e) => { void handleFileChange(e) }}
          data-testid="file-input"
        />
        <Button variant="ghost" size="icon" onClick={handleUploadClick} aria-label="Upload JSON">
          <Upload className="h-5 w-5" />
        </Button>
      </div>

      <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{errorDetails.title}</DialogTitle>
            <DialogDescription className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap break-words">
              {errorDetails.description}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </header>
  )
}
