import { useState, useRef } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  loading?: boolean;
  label?: string;
  sublabel?: string;
  className?: string;
}

export function FileUploadZone({
  onFileSelect,
  accept = ".json",
  loading = false,
  label = "Click to upload or drag and drop",
  sublabel = "JSON files only",
  className
}: FileUploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  // Derive active state but also allow resetting via counter
  const isActuallyActive = loading ? false : dragActive;

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;

    // Check if files are being dragged
    if (e.dataTransfer?.types?.includes('Files')) {
      dragCounter.current++;
      setDragActive(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;

    dragCounter.current--;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setDragActive(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    // This is necessary to allow dropping
    e.preventDefault();
    e.stopPropagation();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    dragCounter.current = 0;
    setDragActive(false);

    if (loading) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        disabled={loading}
        className={cn(
          "w-full border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          loading ? "cursor-not-allowed opacity-70" : "cursor-pointer",
          isActuallyActive ? "border-primary bg-primary/10" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={onDrop}
        onClick={() => !loading && fileInputRef.current?.click()}
      >
        {loading ? (
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        ) : (
          <Upload className="h-8 w-8 text-muted-foreground" />
        )}
        <span className="text-center flex flex-col items-center">
          <span className="text-sm font-medium block">
            {loading ? 'Processing...' : label}
          </span>
          {!loading && sublabel && (
            <span className="text-xs text-muted-foreground mt-1 block">
              {sublabel}
            </span>
          )}
        </span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) onFileSelect(e.target.files[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
