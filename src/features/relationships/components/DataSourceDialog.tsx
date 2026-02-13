
import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, Database } from 'lucide-react';
import Papa from 'papaparse';
import { useRelationshipStore } from '../store';
import type { CsvRow } from '../types';
import classVisualizationCsv from '../../../../sample-data/class_visualization.csv?raw';
import { cn } from '@/lib/utils';

interface DataSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DataSourceDialog({ open, onOpenChange }: DataSourceDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setData, setLoading } = useRelationshipStore();
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const parseCsv = (csvString: string, sourceName: string) => {
    setLoading(true);
    setError(null);

    Papa.parse<CsvRow>(csvString, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
           console.error("CSV Errors:", results.errors);
           setError(`Failed to parse ${sourceName}: ${results.errors[0].message}`);
           setLoading(false);
           return;
        }

        // Validate required columns (basic check)
        const firstRow = results.data[0];
        if (!firstRow || !firstRow.Source || !firstRow.Target || !firstRow.Target_Domain || !firstRow.Relationship_Weight) {
          setError(`Invalid CSV format in ${sourceName}. Missing required columns (Source, Target, Target_Domain, Relationship_Weight).`);
            setLoading(false);
            return;
        }

        setData(results.data);
        setLoading(false);
        onOpenChange(false);
      },
      error: (err: Error) => {
          setError(`Error reading ${sourceName}: ${err.message}`);
          setLoading(false);
      }
    });
  };

  const handleFile = (file: File) => {
      if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
          setError("Please upload a CSV file.");
          return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
          const text = e.target?.result as string;
          parseCsv(text, file.name);
      };
      reader.onerror = () => {
          setError("Failed to read file.");
      };
      reader.readAsText(file);
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
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Data Source</DialogTitle>
          <DialogDescription>
            Choose a preset dataset or upload your own CSV.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-4">
                 <Button
                    variant="outline"
                    className="h-24 flex flex-col gap-2 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                    onClick={() => parseCsv(classVisualizationCsv, "Sample Class Visualization")}
                  >
                    <Database className="h-8 w-8 text-blue-500" />
                    <span className="flex flex-col items-center">
                        <span className="font-semibold">Sample Data</span>
                        <span className="text-xs text-muted-foreground font-normal">Class Visualization (Software Arch)</span>
                    </span>
                  </Button>
            </div>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or upload CSV</span>
                </div>
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
              <span className="text-xs text-muted-foreground mt-1 block">CSV files only</span>
            </span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFile(e.target.files[0]);
              e.target.value = '';
            }}
          />

          {error && (
              <div className="text-destructive text-sm bg-destructive/10 p-2 rounded">
                  {error}
              </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
