'use client';

import { useState } from 'react';
import { ProductImageUploader } from './ProductImageUploader';
import { ProductVideoUploader } from './ProductVideoUploader';
import { Image, Video } from 'lucide-react';

interface ProductMediaSectionProps {
  productId: number;
  initialImages: string[];
  initialVideoUrl: string | null;
}

export function ProductMediaSection({
  productId,
  initialImages,
  initialVideoUrl,
}: ProductMediaSectionProps) {
  const [images, setImages] = useState<string[]>(initialImages);
  const [videoUrl, setVideoUrl] = useState<string | null>(initialVideoUrl);

  return (
    <div className="space-y-6">
      {/* Product Images */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Image className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Product Images & Video</h3>
        </div>
        <ProductImageUploader
          productId={productId}
          images={images}
          onImagesChange={setImages}
          onVideoUploaded={setVideoUrl}
        />
      </div>

      {/* Product Video */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Video className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Product Video</h3>
        </div>
        <ProductVideoUploader
          productId={productId}
          videoUrl={videoUrl}
          onVideoChange={setVideoUrl}
        />
      </div>
    </div>
  );
}
