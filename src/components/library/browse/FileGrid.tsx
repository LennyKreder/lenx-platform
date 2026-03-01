'use client';

import { FileCard } from './FileCard';
import type { FileInfo } from '@/types';

interface FileGridProps {
  files: FileInfo[];
  accessCode: string;
}

export function FileGrid({ files, accessCode }: FileGridProps) {
  if (files.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No files match your current filters. Try adjusting your selection.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {files.map((file) => (
        <FileCard key={file.key} file={file} accessCode={accessCode} />
      ))}
    </div>
  );
}
