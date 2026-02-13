
import { useEffect } from 'react';
import { RelationshipGraph } from './components/RelationshipGraph';
import { RelationshipOverlay } from './components/RelationshipOverlay';
import { useRelationshipStore } from './store';
import Papa from 'papaparse';
import type { CsvRow } from './types';
import classVisualizationCsv from '../../../sample-data/class_visualization.csv?raw';

interface RelationshipPageProps {
  onOpenUpload: () => void;
}

export function RelationshipPage({ onOpenUpload }: RelationshipPageProps) {
  const { nodes, setData } = useRelationshipStore();

  useEffect(() => {
    // Load sample data by default if no data exists
    if (nodes.length === 0) {
      Papa.parse<CsvRow>(classVisualizationCsv, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            setData(results.data);
          }
        },
        error: (err: Error) => {
          console.error("Failed to load default sample data:", err);
        }
      });
    }
  }, []); // Run only on mount

  return (
    <div className="relative w-full h-full bg-gray-900 overflow-hidden">
      <RelationshipGraph />
      <RelationshipOverlay onUploadClick={onOpenUpload} />
    </div>
  );
}
