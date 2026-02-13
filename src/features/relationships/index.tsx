
import { useState } from 'react';
import { RelationshipGraph } from './components/RelationshipGraph';
import { RelationshipOverlay } from './components/RelationshipOverlay';
import { CsvUploadDialog } from './components/CsvUploadDialog';

export function RelationshipPage() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  return (
    <div className="relative w-full h-full bg-gray-900 overflow-hidden">
      <RelationshipGraph />
      <RelationshipOverlay onUploadClick={() => setIsUploadOpen(true)} />
      <CsvUploadDialog open={isUploadOpen} onOpenChange={setIsUploadOpen} />
    </div>
  );
}
