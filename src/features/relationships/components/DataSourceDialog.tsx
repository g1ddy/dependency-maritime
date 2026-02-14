
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Database } from 'lucide-react';
import Papa from 'papaparse';
import { useRelationshipStore } from '../store';
import type { CsvRow } from '../types';
import classVisualizationCsv from '../../../../sample-data/class_visualization.csv?raw';
import { FileUploadZone } from '@/components/FileUploadZone';

interface DataSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DataSourceDialog({ open, onOpenChange }: DataSourceDialogProps) {
  const { setData, setLoading, isLoading } = useRelationshipStore();
  const [error, setError] = useState<{ title: string; description: string } | null>(null);

  const parseCsv = (csvString: string, sourceName: string) => {
    setLoading(true);
    setError(null);

    Papa.parse<CsvRow>(csvString, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
           console.error("CSV Errors:", results.errors);
           setError({
             title: "Parsing Error",
             description: `Failed to parse ${sourceName}: ${results.errors[0].message}`
           });
           setLoading(false);
           return;
        }

        // Validate required columns (basic check)
        const firstRow = results.data[0];
        if (!firstRow || !firstRow.Source || !firstRow.Target || !firstRow.Target_Domain || !firstRow.Relationship_Weight) {
          setError({
            title: "Invalid Format",
            description: `Invalid CSV format in ${sourceName}. Missing required columns (Source, Target, Target_Domain, Relationship_Weight).`
          });
          setLoading(false);
          return;
        }

        setData(results.data);
        setLoading(false);
        onOpenChange(false);
      },
      error: (err: Error) => {
          setError({
            title: "Read Error",
            description: `Error reading ${sourceName}: ${err.message}`
          });
          setLoading(false);
      }
    });
  };

  const handleFile = (file: File) => {
      if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
          setError({
            title: "Invalid File Type",
            description: "Please upload a CSV file."
          });
          return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
          const text = e.target?.result as string;
          parseCsv(text, file.name);
      };
      reader.onerror = () => {
          setError({
            title: "Read Error",
            description: "Failed to read file."
          });
      };
      reader.readAsText(file);
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

          <FileUploadZone
            onFileSelect={handleFile}
            accept=".csv"
            loading={isLoading}
            label="Click to upload or drag and drop"
            sublabel="CSV files only"
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
