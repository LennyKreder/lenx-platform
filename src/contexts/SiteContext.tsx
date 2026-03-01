'use client';

import { createContext, useContext, type ReactNode } from 'react';

export interface CompanyInfo {
  name: string;
  cocNumber?: string;
  vatNumber?: string;
}

export interface SiteContextData {
  id: string;
  code: string;
  name: string;
  siteType: string;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  footerText: string | null;
  companyInfo: CompanyInfo | null;
  contactEmail: string | null;
  // Feature flags
  hasShipping: boolean;
  hasDigitalDelivery: boolean;
  hasBundles: boolean;
  hasTemplates: boolean;
  hasBlog: boolean;
  hasReviews: boolean;
  hasMultilingual: boolean;
  hasBolIntegration: boolean;
}

const SiteContext = createContext<SiteContextData | null>(null);

export function SiteProvider({ site, children }: { site: SiteContextData; children: ReactNode }) {
  return <SiteContext.Provider value={site}>{children}</SiteContext.Provider>;
}

export function useSite(): SiteContextData {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used within SiteProvider');
  return ctx;
}
