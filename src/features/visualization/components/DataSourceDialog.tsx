import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileJson, Database } from 'lucide-react';
import { CruiseResultSchema, type ICruiseResult } from '@/schema/dependency-cruiser';
import { ZodError } from 'zod';
import { cn } from '@/lib/utils';

// Import data sources
import sampleData from '../../../../sample-data/dependency-graph.json';
import projectData from '../../../../config/dependency-graph.json';

interface DataSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDataLoaded: (data: ICruiseResult, complexityMetrics?: Record<string, any>) => void;
}

export function DataSourceDialog({ open, onOpenChange, onDataLoaded }: DataSourceDialogProps) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<{ title: string; description: string } | null>(null);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(null);
      setDragActive(false);
    }
  }, [open]);

  const loadData = (data: unknown, sourceName: string, complexityMetrics?: Record<string, any>) => {
    try {
      const result = CruiseResultSchema.parse(data);
      onDataLoaded(result, complexityMetrics);
      onOpenChange(false);
      setError(null);
    } catch (err) {
      console.error(`Error loading ${sourceName}:`, err);
      if (err instanceof ZodError) {
        const details = err.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(", ");
        setError({
          title: 'Validation Error',
          description: `The ${sourceName} data is invalid: ${details}`
        });
      } else {
        setError({
          title: 'Invalid Data',
          description: `Failed to load ${sourceName}. The data does not match the expected schema.`
        });
      }
    }
  };

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const json = JSON.parse(text);
      const result = CruiseResultSchema.parse(json);
      onDataLoaded(result);
      onOpenChange(false);
      setError(null);
    } catch (err) {
       console.error("Upload error:", err);
       let title = "Error";
       let description = "An unexpected error occurred.";

       if (err instanceof SyntaxError) {
         title = "Invalid JSON";
         description = "The file content is not valid JSON.";
       } else if (err instanceof ZodError) {
         title = "Validation Error";
         const details = err.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(", ");
         description = "Schema mismatch: " + details;
       } else if (err instanceof Error) {
         description = err.message;
       }
       setError({ title, description });
    }
  };

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      void handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Data Source</DialogTitle>
          <DialogDescription>
            Choose a preset graph or upload your own dependency-cruiser JSON output.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="h-24 flex flex-col gap-2 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
              onClick={() => loadData(sampleData, "Sample Data")}
            >
              <Database className="h-8 w-8 text-blue-500" />
              <span>Sample Data</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col gap-2 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors"
              onClick={async () => {
                let metrics;
                try {
                  // Dynamically import to prevent build failure if missing
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                  const module = await import('../../../../config/complexity-metrics.json');
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                  metrics = module.default;
                } catch {
                  console.warn("Complexity metrics not found, skipping.");
                }
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                loadData(projectData, "Project Graph", metrics);
              }}
            >
              <FileJson className="h-8 w-8 text-green-500" />
              <span>Project Graph</span>
            </Button>
          </div>

          <button
            type="button"
            className={cn(
              "w-full border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              dragActive ? "border-primary bg-primary/10" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
            )}
            onDragEnter={onDrag}
            onDragLeave={onDrag}
            onDragOver={onDrag}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <span className="text-center flex flex-col items-center">
              <span className="text-sm font-medium block">Click to upload or drag and drop</span>
              <span className="text-xs text-muted-foreground mt-1 block">JSON files only</span>
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) void handleFile(e.target.files[0]);
              // Reset value to allow re-selection
              e.target.value = '';
            }}
          />

          {error && (
             <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20 max-h-40 overflow-auto">
               <div className="font-semibold">{error.title}</div>
               <div className="mt-1 whitespace-pre-wrap break-all">{error.description}</div>
             </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
