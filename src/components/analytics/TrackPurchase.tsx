'use client';

import { useEffect } from 'react';
import { trackPurchase } from '@/lib/analytics';

interface PurchaseItem {
  id: number;
  name: string;
  priceInCents: number;
  currency: string;
  category?: string;
}

interface TrackPurchaseProps {
  transactionId: string;
  items: PurchaseItem[];
  totalInCents: number;
  currency: string;
}

export function TrackPurchase({ transactionId, items, totalInCents, currency }: TrackPurchaseProps) {
  useEffect(() => {
    trackPurchase(transactionId, items, totalInCents, currency);
  }, []);

  return null;
}
