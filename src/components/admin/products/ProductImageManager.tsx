'use client';

import { useState } from 'react';
import { ProductImageUploader } from './ProductImageUploader';

interface ProductImageManagerProps {
  productId: number;
  initialImages: string[];
  onVideoUploaded?: (videoUrl: string) => void;
}

export function ProductImageManager({
  productId,
  initialImages,
  onVideoUploaded,
}: ProductImageManagerProps) {
  const [images, setImages] = useState<string[]>(initialImages);

  return (
    <ProductImageUploader
      productId={productId}
      images={images}
      onImagesChange={setImages}
      onVideoUploaded={onVideoUploaded}
    />
  );
}
