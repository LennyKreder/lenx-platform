'use client';

import { useState } from 'react';
import { ProductVideoUploader } from './ProductVideoUploader';

interface ProductVideoManagerProps {
  productId: number;
  initialVideoUrl: string | null;
}

export function ProductVideoManager({
  productId,
  initialVideoUrl,
}: ProductVideoManagerProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(initialVideoUrl);

  return (
    <ProductVideoUploader
      productId={productId}
      videoUrl={videoUrl}
      onVideoChange={setVideoUrl}
    />
  );
}
