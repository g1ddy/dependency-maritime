import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileJson, Database, Loader2 } from 'lucide-react';
import { CruiseResultSchema, type ICruiseResult } from '@/schema/dependency-cruiser';
import { ZodError } from 'zod';
import { cn } from '@/lib/utils';
import { type ComplexityMetricsMap } from '../types';

// Import data sources
import sampleData from '../../../../sample-data/dependency-graph.json';
import projectData from '../../../../config/dependency-graph.json';

interface DataSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDataLoaded: (data: ICruiseResult, complexityMetrics?: ComplexityMetricsMap) => void;
}

export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
export const MAX_MODULES = 2500;
export const MAX_DEPENDENCIES = 5000;

export function DataSourceDialog({ open, onOpenChange, onDataLoaded }: DataSourceDialogProps) {
  const [dragActive, setDragActive] = useState(false);
  const [loadingSource, setLoadingSource] = useState<'sample' | 'project' | 'upload' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<{ title: string; description: string } | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setDragActive(false);
      setLoadingSource(null);
    }
  }, [open]);

  const validateComplexity = (result: ICruiseResult): string | null => {
    if (result.modules.length > MAX_MODULES) {
      return `The graph contains ${result.modules.length} modules, exceeding the limit of ${MAX_MODULES}. Large graphs can cause browser performance issues.`;
    }

    let totalDependencies = 0;
    if (result.summary && typeof result.summary.totalDependenciesCruised === 'number') {
      totalDependencies = result.summary.totalDependenciesCruised;
    } else {
      totalDependencies = result.modules.reduce((sum, m) => sum + m.dependencies.length, 0);
    }

    if (totalDependencies > MAX_DEPENDENCIES) {
      return `The graph contains ${totalDependencies} dependencies, exceeding the limit of ${MAX_DEPENDENCIES}. Large graphs can cause browser performance issues.`;
    }
    return null;
  };

  const loadData = (data: unknown, sourceName: string, complexityMetrics?: ComplexityMetricsMap) => {
    try {
      const result = CruiseResultSchema.parse(data);

      const complexityError = validateComplexity(result);
      if (complexityError) {
        setError({
          title: "Graph Too Complex",
          description: complexityError
        });
        return;
      }

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
    if (file.size > MAX_FILE_SIZE) {
      setError({
        title: "File Too Large",
        description: `The file exceeds the maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB.`
      });
      return;
    }

    setLoadingSource('upload');
    try {
      const text = await file.text();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const json = JSON.parse(text);
      loadData(json, file.name, undefined);
    } catch (err) {
       console.error("Upload error:", err);
       let title = "Error";
       let description = "An unexpected error occurred.";

       if (err instanceof SyntaxError) {
         title = "Invalid JSON";
         description = "The file content is not valid JSON.";
       } else if (err instanceof Error) {
         description = err.message;
       }
       setError({ title, description });
    } finally {
      setLoadingSource(null);
    }
  };

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loadingSource) return; // Disable drag if loading
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
    if (loadingSource) return; // Disable drop if loading
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      void handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleProjectDataLoad = async () => {
    setLoadingSource('project');
    let metrics: ComplexityMetricsMap | undefined;
    try {
      // Dynamically import to prevent build failure if missing
      const mod = await import('../../../../config/complexity-metrics.json');
      // Handle both default export (traditional JSON module) and direct export
      if (mod && typeof mod === 'object' && 'default' in mod) {
          metrics = mod.default as ComplexityMetricsMap;
      } else {
          metrics = mod as unknown as ComplexityMetricsMap;
      }
    } catch (e) {
      console.warn("Complexity metrics not found or invalid, skipping.", e);
    }

    // Slight delay to ensure UI updates if import is too fast (optional, but nice for UX consistency)
    // await new Promise(resolve => setTimeout(resolve, 300));

    try {
        loadData(projectData, "Project Graph", metrics);
    } finally {
        setLoadingSource(null);
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
              disabled={!!loadingSource}
              className="h-24 flex flex-col gap-2 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
              onClick={() => loadData(sampleData, "Sample Data")}
            >
              <Database className="h-8 w-8 text-blue-500" />
              <span>Sample Data</span>
            </Button>
            <Button
              variant="outline"
              disabled={!!loadingSource}
              className="h-24 flex flex-col gap-2 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors"
              onClick={() => void handleProjectDataLoad()}
            >
              {loadingSource === 'project' ? (
                <Loader2 className="h-8 w-8 text-green-500 animate-spin" />
              ) : (
                <FileJson className="h-8 w-8 text-green-500" />
              )}
              <span>{loadingSource === 'project' ? 'Loading...' : 'Project Graph'}</span>
            </Button>
          </div>

          <button
            type="button"
            disabled={!!loadingSource}
            className={cn(
              "w-full border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              loadingSource ? "cursor-not-allowed opacity-70" : "cursor-pointer",
              dragActive ? "border-primary bg-primary/10" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
            )}
            onDragEnter={onDrag}
            onDragLeave={onDrag}
            onDragOver={onDrag}
            onDrop={onDrop}
            onClick={() => !loadingSource && fileInputRef.current?.click()}
          >
            {loadingSource === 'upload' ? (
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
            ) : (
                <Upload className="h-8 w-8 text-muted-foreground" />
            )}
            <span className="text-center flex flex-col items-center">
              <span className="text-sm font-medium block">
                  {loadingSource === 'upload' ? 'Processing...' : 'Click to upload or drag and drop'}
              </span>
              {!loadingSource && <span className="text-xs text-muted-foreground mt-1 block">JSON files only</span>}
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
             <div role="alert" className="bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20 max-h-40 overflow-auto">
               <div className="font-semibold">{error.title}</div>
               <div className="mt-1 whitespace-pre-wrap break-all">{error.description}</div>
             </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
