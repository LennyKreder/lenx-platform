'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { ThemeId } from '@/config/themes';
import type { LanguageId } from '@/config/languages';
import type { DeviceId, Orientation } from '@/config/devices';

export interface AccessCodeData {
  code: string;
  productType: string;
  theme: ThemeId | 'all';
  language: LanguageId | 'all';
  device: DeviceId | null;
  orientation: Orientation | null;
  email: string | null;
  createdAt: string;
  expiresAt: string | null;
}

// Keep backwards compatibility alias
export type PurchaseData = AccessCodeData;

const AccessCodeContext = createContext<AccessCodeData | null>(null);

export function AccessCodeProvider({
  children,
  accessCode,
}: {
  children: ReactNode;
  accessCode: AccessCodeData;
}) {
  return (
    <AccessCodeContext.Provider value={accessCode}>
      {children}
    </AccessCodeContext.Provider>
  );
}

// Keep backwards compatibility alias
export const PurchaseProvider = ({
  children,
  purchase,
}: {
  children: ReactNode;
  purchase: AccessCodeData;
}) => (
  <AccessCodeProvider accessCode={purchase}>
    {children}
  </AccessCodeProvider>
);

export function useAccessCode() {
  const context = useContext(AccessCodeContext);
  if (!context) {
    throw new Error('useAccessCode must be used within an AccessCodeProvider');
  }
  return context;
}

// Keep backwards compatibility alias
export const usePurchase = useAccessCode;
