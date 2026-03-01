'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Video, Loader2 } from 'lucide-react';

interface ProductVideoUploaderProps {
  productId: number;
  videoUrl: string | null;
  onVideoChange: (videoUrl: string | null) => void;
}

export function ProductVideoUploader({
  productId,
  videoUrl,
  onVideoChange,
}: ProductVideoUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('video', file);

    try {
      const response = await fetch(`/api/admin/products/${productId}/video`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload video');
      }

      onVideoChange(data.videoUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload video');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/products/${productId}/video`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove video');
      }

      onVideoChange(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove video');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {videoUrl ? (
        <div className="relative rounded-lg border overflow-hidden bg-muted">
          <video
            src={videoUrl}
            controls
            className="w-full max-h-[300px]"
          />
          <div className="absolute top-2 right-2">
            <Button
              type="button"
              variant="destructive"
              size="icon-sm"
              onClick={handleRemove}
              disabled={isDeleting}
              className="h-8 w-8"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-lg text-muted-foreground">
          <Video className="h-12 w-12 mb-3" />
          <p className="text-sm">No video yet</p>
          <p className="text-xs mt-1">Upload a video to show on the product page</p>
        </div>
      )}

      <div className="flex items-center gap-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              {videoUrl ? 'Replace Video' : 'Upload Video'}
            </>
          )}
        </Button>
        <span className="text-xs text-muted-foreground">
          MP4 or WebM. Max 50MB.
        </span>
      </div>
    </div>
  );
}
