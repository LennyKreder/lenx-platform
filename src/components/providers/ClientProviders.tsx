'use client';

import { ReactNode } from 'react';
import { CartProvider } from '@/contexts/CartContext';
import { CartDrawer } from '@/components/cart';

interface ClientProvidersProps {
  children: ReactNode;
  locale: string;
}

export function ClientProviders({ children, locale }: ClientProvidersProps) {
  return (
    <CartProvider>
      {children}
      <CartDrawer locale={locale} />
    </CartProvider>
  );
}
