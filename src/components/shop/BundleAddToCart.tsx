'use client';

import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';

interface BundleAddToCartProps {
  bundle: {
    id: number;
    name: string;
    priceInCents: number;
    originalPriceInCents?: number; // Total value of products before bundle discount
    currency: string;
    images: string[];
    isAllAccess?: boolean;
    theme?: string | null;
  };
  locale: string;
}

export function BundleAddToCart({ bundle, locale }: BundleAddToCartProps) {
  const { addItem, setIsOpen } = useCart();
  const isNL = locale === 'nl';

  const handleAddToCart = () => {
    addItem({
      productId: bundle.id,
      bundleId: bundle.id,
      isAllAccessBundle: bundle.isAllAccess,
      name: bundle.name,
      priceInCents: bundle.priceInCents,
      originalPriceInCents: bundle.originalPriceInCents,
      currency: bundle.currency,
      image: bundle.images[0] || '/placeholder-bundle.png',
      theme: bundle.theme,
    });
    setIsOpen(true);
  };

  return (
    <Button size="lg" className="w-full text-lg py-6" onClick={handleAddToCart}>
      <ShoppingCart className="h-5 w-5 mr-2" />
      {isNL ? 'In winkelwagen' : 'Add to Cart'}
    </Button>
  );
}
