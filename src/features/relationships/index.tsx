
import { useState } from 'react';
import { RelationshipGraph } from './components/RelationshipGraph';
import { RelationshipOverlay } from './components/RelationshipOverlay';
import { DataSourceDialog } from './components/DataSourceDialog';

export function RelationshipPage() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  return (
    <div className="relative w-full h-full bg-gray-900 overflow-hidden">
      <RelationshipGraph />
      <RelationshipOverlay onUploadClick={() => setIsUploadOpen(true)} />
      <DataSourceDialog open={isUploadOpen} onOpenChange={setIsUploadOpen} />
    </div>
  );
}
