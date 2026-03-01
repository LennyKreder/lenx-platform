'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Link2, Unlink, Check, X, FileText } from 'lucide-react';

interface ScannedFile {
  templateSet: string | null;
  timeFormat: string | null;
  weekStart: string | null;
  calendar: string | null;
  exists: boolean;
  filePath: string | null;
  fileName: string | null;
  fileSize: number | null;
}

interface LinkedFile {
  id: number;
  templateSet: string | null;
  timeFormat: string | null;
  weekStart: string | null;
  calendar: string | null;
  filePath: string;
  fileName: string;
  fileSize: number | null;
}

interface ProductFilesManagerProps {
  productId: number;
  templateHasFileVariants: boolean;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getVariantLabel(file: ScannedFile | LinkedFile): string {
  const parts: string[] = [];
  if (file.templateSet) parts.push(file.templateSet);
  if (file.timeFormat) parts.push(file.timeFormat);
  if (file.weekStart) parts.push(file.weekStart);
  if (file.calendar && file.calendar !== 'none') parts.push(file.calendar);
  return parts.length > 0 ? parts.join(' / ') : 'Default';
}

export function ProductFilesManager({
  productId,
  templateHasFileVariants,
}: ProductFilesManagerProps) {
  const [linkedFiles, setLinkedFiles] = useState<LinkedFile[]>([]);
  const [scannedFiles, setScannedFiles] = useState<ScannedFile[]>([]);
  const [summary, setSummary] = useState({ linked: 0, available: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = async () => {
    try {
      const response = await fetch(`/api/admin/products/${productId}/files`);
      if (!response.ok) throw new Error('Failed to fetch files');
      const data = await response.json();
      setLinkedFiles(data.linkedFiles);
      setScannedFiles(data.scannedFiles);
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [productId]);

  const handleScan = async () => {
    setIsScanning(true);
    setError(null);
    await fetchFiles();
    setIsScanning(false);
  };

  const handleAutoLink = async () => {
    setIsLinking(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/products/${productId}/files`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to link files');
      const data = await response.json();
      setLinkedFiles(data.linkedFiles);
      setSummary((prev) => ({ ...prev, linked: data.linkedCount }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkAll = async () => {
    if (!confirm('Remove all file links? The files will remain on disk.')) {
      return;
    }
    try {
      const response = await fetch(`/api/admin/products/${productId}/files`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to unlink files');
      setLinkedFiles([]);
      setSummary((prev) => ({ ...prev, linked: 0 }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-destructive/10 p-4 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Summary and Actions */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            {summary.linked} of {summary.available} available files linked
            {summary.total > summary.available && (
              <span className="text-yellow-600">
                {' '}
                ({summary.total - summary.available} not found on disk)
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleScan} disabled={isScanning}>
            <RefreshCw className={`h-4 w-4 ${isScanning ? 'animate-spin' : ''}`} />
            Scan
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoLink}
            disabled={isLinking || summary.available === 0}
          >
            <Link2 className="h-4 w-4" />
            {isLinking ? 'Linking...' : 'Auto-Link All'}
          </Button>
          {linkedFiles.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleUnlinkAll}>
              <Unlink className="h-4 w-4" />
              Unlink All
            </Button>
          )}
        </div>
      </div>

      {/* File Grid */}
      {templateHasFileVariants ? (
        <div className="rounded-lg border">
          <div className="grid grid-cols-[1fr,100px,100px,80px] gap-4 p-3 border-b bg-muted/50 text-sm font-medium">
            <div>Variant</div>
            <div>Status</div>
            <div>Size</div>
            <div>Linked</div>
          </div>
          <div className="divide-y">
            {scannedFiles.map((file, index) => {
              const isLinked = linkedFiles.some(
                (lf) =>
                  lf.templateSet === file.templateSet &&
                  lf.timeFormat === file.timeFormat &&
                  lf.weekStart === file.weekStart &&
                  lf.calendar === file.calendar
              );

              return (
                <div
                  key={index}
                  className={`grid grid-cols-[1fr,100px,100px,80px] gap-4 p-3 text-sm ${
                    !file.exists ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>{getVariantLabel(file)}</span>
                  </div>
                  <div>
                    {file.exists ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Found
                      </span>
                    ) : (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <X className="h-3 w-3" /> Missing
                      </span>
                    )}
                  </div>
                  <div className="text-muted-foreground">
                    {formatFileSize(file.fileSize)}
                  </div>
                  <div>
                    {isLinked ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Simple view for products without file variants */
        <div className="rounded-lg border p-4">
          {scannedFiles.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No files found for this product. Make sure the files exist at the correct
              path in FILES_PATH.
            </p>
          ) : scannedFiles[0]?.exists ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{scannedFiles[0].fileName}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(scannedFiles[0].fileSize)}
                  </p>
                </div>
              </div>
              {linkedFiles.length > 0 ? (
                <span className="text-green-600 flex items-center gap-1">
                  <Check className="h-4 w-4" /> Linked
                </span>
              ) : (
                <Button variant="outline" size="sm" onClick={handleAutoLink}>
                  <Link2 className="h-4 w-4" />
                  Link File
                </Button>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              File not found on disk. Expected at: {scannedFiles[0]?.filePath || 'unknown'}
            </p>
          )}
        </div>
      )}

      {/* Help text */}
      <p className="text-xs text-muted-foreground">
        Files are stored in <code>FILES_PATH</code> and matched based on the product&apos;s
        year, theme, and language. Click &quot;Scan&quot; to check for new files, then
        &quot;Auto-Link All&quot; to connect them to this product.
      </p>
    </div>
  );
}
