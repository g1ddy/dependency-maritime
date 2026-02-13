
import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Upload } from 'lucide-react';
import Papa from 'papaparse';
import { useRelationshipStore } from '../store';
import type { CsvRow } from '../types';

interface CsvUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CsvUploadDialog({ open, onOpenChange }: CsvUploadDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setData, setLoading } = useRelationshipStore();
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File) => {
    setError(null);
    setLoading(true);

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
           console.error("CSV Errors:", results.errors);
           setError(`Failed to parse CSV: ${results.errors[0].message}`);
           setLoading(false);
           return;
        }

        // Validate required columns (basic check)
        const firstRow = results.data[0];
        if (!firstRow || !firstRow.Source || !firstRow.Target) {
            setError("Invalid CSV format. Missing Source/Target columns.");
            setLoading(false);
            return;
        }

        setData(results.data);
        setLoading(false);
        onOpenChange(false);
      },
      error: (err) => {
          setError(`File read error: ${err.message}`);
          setLoading(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Relationship Data</DialogTitle>
          <DialogDescription>
            Upload a CSV file with columns: Source, Target, Relationship_Type, etc.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <button
            type="button"
            className="w-full border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <span className="text-center flex flex-col items-center">
              <span className="text-sm font-medium block">Click to upload CSV</span>
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
