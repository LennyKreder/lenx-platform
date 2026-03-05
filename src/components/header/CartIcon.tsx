'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';

export function CartIcon() {
  const { itemCount, isLoading } = useCart();
  const params = useParams();
  const locale = (params.locale as string) || 'en';

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      asChild
      aria-label="Open cart"
    >
      <Link href={`/${locale}/cart`}>
        <ShoppingCart className="h-5 w-5" />
        {!isLoading && itemCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center">
            {itemCount > 9 ? '9+' : itemCount}
          </span>
        )}
      </Link>
    </Button>
  );
}
