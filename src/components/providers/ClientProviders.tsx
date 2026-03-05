'use client';

import { ReactNode } from 'react';
import { CartProvider } from '@/contexts/CartContext';

interface ClientProvidersProps {
  children: ReactNode;
  locale: string;
}

export function ClientProviders({ children, locale }: ClientProvidersProps) {
  return (
    <CartProvider>
      {children}
    </CartProvider>
  );
}
