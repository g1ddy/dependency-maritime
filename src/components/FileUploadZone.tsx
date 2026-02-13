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

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
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
          dragActive ? "border-primary bg-primary/10" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
        )}
        onDragEnter={onDrag}
        onDragLeave={onDrag}
        onDragOver={onDrag}
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
