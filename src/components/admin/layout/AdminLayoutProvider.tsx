'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface SiteInfo {
  code: string;
  name: string;
  siteType: string;
}

interface AdminLayoutContextValue {
  currentSite: string;
  currentSiteType: string | null;
  sites: SiteInfo[];
  canViewAll: boolean;
  loading: boolean;
  switchSite: (code: string) => Promise<void>;
}

const AdminLayoutContext = createContext<AdminLayoutContextValue>({
  currentSite: '',
  currentSiteType: null,
  sites: [],
  canViewAll: false,
  loading: true,
  switchSite: async () => {},
});

export function useAdminLayout() {
  return useContext(AdminLayoutContext);
}

export function AdminLayoutProvider({ children }: { children: React.ReactNode }) {
  const [currentSite, setCurrentSite] = useState('');
  const [currentSiteType, setCurrentSiteType] = useState<string | null>(null);
  const [sites, setSites] = useState<SiteInfo[]>([]);
  const [canViewAll, setCanViewAll] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/site')
      .then((res) => res.json())
      .then((data) => {
        setSites(data.sites || []);
        setCurrentSite(data.currentSite || '');
        setCurrentSiteType(data.currentSiteType ?? null);
        setCanViewAll(data.canViewAll || false);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const switchSite = async (code: string) => {
    await fetch('/api/admin/site', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteCode: code }),
    });
    window.location.reload();
  };

  return (
    <AdminLayoutContext.Provider
      value={{ currentSite, currentSiteType, sites, canViewAll, loading, switchSite }}
    >
      {children}
    </AdminLayoutContext.Provider>
  );
}
