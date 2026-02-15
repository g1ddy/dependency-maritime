import { useState, useEffect } from 'react';
import { FileJson, Database } from 'lucide-react';
import { CruiseResultSchema, type ICruiseResult } from '@/schema/dependency-cruiser';
import { ZodError } from 'zod';
import { type ComplexityMetricsMap } from '../types';
import { GenericDataSourceDialog, type DataSourcePreset } from '@/components/DataSourceDialog';

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
  const [loadingSource, setLoadingSource] = useState<'sample' | 'project' | 'upload' | null>(null);
  const [error, setError] = useState<{ title: string; description: string } | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
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

  const handleProjectDataLoad = async () => {
    setLoadingSource('project');
    let metrics: ComplexityMetricsMap | undefined;
    try {
      // Dynamically import to prevent build failure if missing
      const mod = await import('../../../../config/complexity-metrics.json');
      // Handle both default export (traditional JSON module) and direct export
      if (mod && typeof mod === 'object' && 'default' in mod) {
          // The check 'default' in mod ensures this is safe enough for our needs,
          // though TS might complain about 'default' on object.
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
          metrics = (mod as any).default as ComplexityMetricsMap;
      } else {
          metrics = mod as unknown as ComplexityMetricsMap;
      }
    } catch (e) {
      console.warn("Complexity metrics not found or invalid, skipping.", e);
    }

    try {
        loadData(projectData, "Project Graph", metrics);
    } finally {
        setLoadingSource(null);
    }
  };

  const handleSampleDataLoad = async () => {
    setLoadingSource('sample');
    // Simulate slight delay for visual consistency, as local parsing is instant
    await new Promise(resolve => setTimeout(resolve, 300));
    try {
      loadData(sampleData, "Sample Data", undefined);
    } finally {
      setLoadingSource(null);
    }
  };

  const presets: DataSourcePreset[] = [
    {
      id: 'sample',
      label: 'Sample Data',
      icon: Database,
      onClick: () => void handleSampleDataLoad(),
      loading: loadingSource === 'sample',
      className: 'hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30',
      iconClassName: 'text-blue-500'
    },
    {
      id: 'project',
      label: 'Project Graph',
      icon: FileJson,
      onClick: () => void handleProjectDataLoad(),
      loading: loadingSource === 'project',
      className: 'hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950/30',
      iconClassName: 'text-green-500'
    }
  ];

  return (
    <GenericDataSourceDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Select Data Source"
      description="Choose a preset graph or upload your own dependency-cruiser JSON output."
      presets={presets}
      onFileSelect={(file) => void handleFile(file)}
      accept=".json"
      uploadLabel="Click to upload or drag and drop"
      uploadSublabel="JSON files only"
      uploadLoading={loadingSource === 'upload'}
      error={error}
    />
  );
}
