import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { FileUploadZone } from '@/components/FileUploadZone';
import { cn } from '@/lib/utils';
import React from 'react';

export interface DataSourcePreset {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.ElementType;
  onClick: () => void;
  loading?: boolean;
  className?: string; // For the button
  iconClassName?: string; // For the icon
}

export interface GenericDataSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  presets?: DataSourcePreset[];
  onFileSelect: (file: File) => void;
  accept?: string;
  uploadLabel?: string;
  uploadSublabel?: string;
  uploadLoading?: boolean;
  error?: { title: string; description: string } | null;
}

export function GenericDataSourceDialog({
  open,
  onOpenChange,
  title = "Select Data Source",
  description = "Choose a preset or upload your own file.",
  presets = [],
  onFileSelect,
  accept,
  uploadLabel = "Click to upload or drag and drop",
  uploadSublabel,
  uploadLoading = false,
  error
}: GenericDataSourceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {presets.length > 0 && (
            <div className={cn("grid gap-4", presets.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
              {presets.map((preset) => {
                const Icon = preset.icon;
                return (
                  <Button
                    key={preset.id}
                    variant="outline"
                    disabled={uploadLoading || presets.some(p => p.loading)}
                    className={cn(
                      "h-24 flex flex-col gap-2 transition-colors",
                      preset.className
                    )}
                    onClick={preset.onClick}
                  >
                    {preset.loading ? (
                      <Loader2 className={cn("h-8 w-8 animate-spin", preset.iconClassName || "text-primary")} />
                    ) : (
                      <Icon className={cn("h-8 w-8", preset.iconClassName || "text-muted-foreground")} />
                    )}
                    <span className="flex flex-col items-center gap-0.5">
                        <span className="font-semibold">{preset.loading ? 'Loading...' : preset.label}</span>
                        {!preset.loading && preset.sublabel && (
                             <span className="text-xs text-muted-foreground font-normal">{preset.sublabel}</span>
                        )}
                    </span>
                  </Button>
                );
              })}
            </div>
          )}

          {presets.length > 0 && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or upload file</span>
              </div>
            </div>
          )}

          <FileUploadZone
            onFileSelect={onFileSelect}
            accept={accept}
            loading={uploadLoading || presets.some(p => p.loading)}
            label={uploadLabel}
            sublabel={uploadSublabel}
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
