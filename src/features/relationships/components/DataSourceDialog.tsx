import { useState } from 'react';
import { Database } from 'lucide-react';
import Papa from 'papaparse';
import { useRelationshipStore } from '../store';
import type { CsvRow } from '../types';
import classVisualizationCsv from '../../../../sample-data/class_visualization.csv?raw';
import { GenericDataSourceDialog, type DataSourcePreset } from '@/components/DataSourceDialog';

export const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

interface DataSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DataSourceDialog({ open, onOpenChange }: DataSourceDialogProps) {
  const { setData, setLoading, isLoading } = useRelationshipStore();
  const [error, setError] = useState<{ title: string; description: string } | null>(null);

  const parseCsv = (csvString: string) => {
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
             description: "Failed to parse the provided CSV data. The file may be corrupted or incorrectly formatted."
           });
           setLoading(false);
           return;
        }

        // Validate required columns (basic check)
        const firstRow = results.data[0];
        if (!firstRow || !firstRow.Source || !firstRow.Target || !firstRow.Target_Domain || !firstRow.Relationship_Weight) {
          setError({
            title: "Invalid Format",
            description: "Invalid CSV format. Missing required columns (Source, Target, Target_Domain, Relationship_Weight)."
          });
          setLoading(false);
          return;
        }

        setData(results.data);
        setLoading(false);
        onOpenChange(false);
      },
      error: (err: Error) => {
          console.error(`Error reading CSV:`, err);
          setError({
            title: "Read Error",
            description: "An unexpected error occurred while reading the data source."
          });
          setLoading(false);
      }
    });
  };

  const handleFile = (file: File) => {
      if (file.size > MAX_FILE_SIZE) {
          setError({
            title: "File Too Large",
            description: `The file exceeds the maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB.`
          });
          return;
      }

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
          parseCsv(text);
      };
      reader.onerror = () => {
          setError({
            title: "Read Error",
            description: "Failed to read file."
          });
      };
      reader.readAsText(file);
  };

  const presets: DataSourcePreset[] = [
    {
      id: 'sample',
      label: 'Sample Data',
      sublabel: 'Class Visualization (Software Arch)',
      icon: Database,
      onClick: () => parseCsv(classVisualizationCsv),
      loading: isLoading,
      className: 'hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30',
      iconClassName: 'text-blue-500'
    }
  ];

  return (
    <GenericDataSourceDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Select Data Source"
      description="Choose a preset dataset or upload your own CSV."
      presets={presets}
      onFileSelect={handleFile}
      accept=".csv"
      uploadLabel="Click to upload or drag and drop"
      uploadSublabel="CSV files only"
      uploadLoading={isLoading}
      error={error}
    />
  );
}
