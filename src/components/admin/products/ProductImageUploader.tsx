'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, GripVertical, Image as ImageIcon, Loader2, Video } from 'lucide-react';

interface ProductImageUploaderProps {
  productId: number;
  images: string[];
  onImagesChange: (images: string[]) => void;
  onVideoUploaded?: (videoUrl: string) => void;
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const VIDEO_TYPES = ['video/mp4', 'video/webm'];

export function ProductImageUploader({
  productId,
  images,
  onImagesChange,
  onVideoUploaded,
}: ProductImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const imageFiles = fileArray.filter(f => IMAGE_TYPES.includes(f.type));
    const videoFiles = fileArray.filter(f => VIDEO_TYPES.includes(f.type));
    const unknownFiles = fileArray.filter(f => !IMAGE_TYPES.includes(f.type) && !VIDEO_TYPES.includes(f.type));

    setIsUploading(true);
    setError(null);
    setUploadMessage(null);

    const messages: string[] = [];

    try {
      // Upload images
      if (imageFiles.length > 0) {
        const formData = new FormData();
        for (const file of imageFiles) {
          formData.append('images', file);
        }

        const response = await fetch(`/api/admin/products/${productId}/images`, {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to upload images');
        }

        onImagesChange(data.images);

        if (data.errors && data.errors.length > 0) {
          messages.push(...data.errors);
        }
      }

      // Upload video (only first one if multiple)
      if (videoFiles.length > 0 && onVideoUploaded) {
        const videoFile = videoFiles[0];
        const formData = new FormData();
        formData.append('video', videoFile);

        const response = await fetch(`/api/admin/products/${productId}/video`, {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          messages.push(data.error || 'Failed to upload video');
        } else {
          onVideoUploaded(data.videoUrl);
          messages.push('Video uploaded successfully');
        }

        if (videoFiles.length > 1) {
          messages.push(`Only 1 video allowed - ${videoFiles.length - 1} video(s) skipped`);
        }
      } else if (videoFiles.length > 0 && !onVideoUploaded) {
        messages.push('Video upload not supported in this context');
      }

      // Report unknown files
      if (unknownFiles.length > 0) {
        messages.push(`${unknownFiles.length} file(s) skipped - unsupported format`);
      }

      if (messages.length > 0) {
        setUploadMessage(messages.join('. '));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload files');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processFiles(files);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await processFiles(files);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Only set false if leaving the drop zone entirely
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDragOverZone = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleRemove = async (imageUrl: string) => {
    try {
      const response = await fetch(`/api/admin/products/${productId}/images`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove image');
      }

      onImagesChange(data.images);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove image');
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    // Reorder locally for visual feedback
    const newImages = [...images];
    const [removed] = newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, removed);
    onImagesChange(newImages);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex === null) return;

    // Save new order to server
    try {
      await fetch(`/api/admin/products/${productId}/images`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images }),
      });
    } catch (err) {
      console.error('Failed to save image order:', err);
    }

    setDraggedIndex(null);
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

      {uploadMessage && (
        <div className="rounded-lg bg-muted p-3 text-muted-foreground text-sm">
          {uploadMessage}
          <button
            onClick={() => setUploadMessage(null)}
            className="ml-2 underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((imageUrl, index) => (
            <div
              key={imageUrl}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`relative group aspect-square rounded-lg border-2 overflow-hidden bg-muted ${
                draggedIndex === index
                  ? 'border-primary opacity-50'
                  : 'border-transparent hover:border-muted-foreground/20'
              }`}
            >
              {/* Image */}
              <img
                src={imageUrl}
                alt={`Product image ${index + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {/* Drag handle */}
                <div className="absolute top-2 left-2 p-1 bg-white/20 rounded cursor-grab active:cursor-grabbing">
                  <GripVertical className="h-4 w-4 text-white" />
                </div>

                {/* Remove button */}
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-sm"
                  onClick={() => handleRemove(imageUrl)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* First image badge */}
              {index === 0 && (
                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded">
                  Main
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Drop Zone / Empty state */}
      <div
        ref={dropZoneRef}
        onDrop={handleDrop}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOverZone}
        className={`flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        {isUploading ? (
          <>
            <Loader2 className="h-12 w-12 mb-3 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </>
        ) : isDragOver ? (
          <>
            <Upload className="h-12 w-12 mb-3 text-primary" />
            <p className="text-sm text-primary font-medium">Drop files here</p>
          </>
        ) : (
          <>
            <div className="flex gap-2 mb-3">
              <ImageIcon className="h-10 w-10 text-muted-foreground" />
              <Video className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              {images.length === 0 ? 'No images yet' : 'Add more images'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Drag & drop or click to upload
            </p>
          </>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />

      <p className="text-xs text-muted-foreground">
        Images: JPEG, PNG, WebP, GIF (max 5MB). Videos: MP4, WebM (max 50MB). Drag images to reorder.
      </p>
    </div>
  );
}
