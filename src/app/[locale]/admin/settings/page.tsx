'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Loader2, Save, Eye, Filter, LayoutGrid, ArrowUpDown, Globe,
  Paintbrush, Search, Building2, MenuIcon, ToggleLeft, CreditCard,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { locales, type Locale } from '@/lib/i18n';
import { MenuEditor, type MenuItemData } from '@/components/admin/settings/MenuEditor';

const localeNames: Record<Locale, string> = {
  en: 'English',
  nl: 'Nederlands',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
};

// ─── Types ──────────────────────────────────────────────

interface ShopSettings {
  showRecentlyViewed: boolean;
  showRelatedProducts: boolean;
  recentlyViewedMaxQty: number;
  relatedProductsMaxQty: number;
  showFilterYear: boolean;
  showFilterTheme: boolean;
  showFilterThemeMode: boolean;
  showFilterDevice: boolean;
  showFilterItemType: boolean;
  showFilterProductType: boolean;
  showFilterCategory: boolean;
  itemsPerPage: number;
  productDefaultSortBy: 'name' | 'createdAt' | 'year' | 'theme';
  productDefaultSortOrder: 'asc' | 'desc';
  activeLocales: Locale[];
}

interface SiteBranding {
  siteType: string;
  name: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  footerText: string | null;
  defaultMetaTitle: string | null;
  defaultMetaDescription: string | null;
  contactEmail: string | null;
  fromEmail: string | null;
  companyInfo: { name: string; cocNumber: string; vatNumber: string };
  gaTrackingId: string | null;
  stripeAccountId: string | null;
  stripeWebhookSecret: string | null;
  hasShipping: boolean;
  hasDigitalDelivery: boolean;
  hasMultilingual: boolean;
  hasBolIntegration: boolean;
  hasBundles: boolean;
  hasTemplates: boolean;
  hasBlog: boolean;
  hasReviews: boolean;
}

interface MenuConfig {
  header: MenuItemData[];
  footer: MenuItemData[];
}

// ─── Save button helper ─────────────────────────────────

function SaveButton({ saving, saved, onClick }: { saving: boolean; saved: boolean; onClick: () => void }) {
  return (
    <Button onClick={onClick} disabled={saving} size="sm">
      {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
      {saved ? 'Saved!' : 'Save'}
    </Button>
  );
}

// ─── Main page ──────────────────────────────────────────

export default function SettingsPage() {
  // Shop settings state
  const [shop, setShop] = useState<ShopSettings | null>(null);
  const [shopLoading, setShopLoading] = useState(true);
  const [shopSaving, setShopSaving] = useState(false);
  const [shopSaved, setShopSaved] = useState(false);

  // Site branding state
  const [branding, setBranding] = useState<SiteBranding | null>(null);
  const [brandingLoading, setBrandingLoading] = useState(true);
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [brandingSaved, setBrandingSaved] = useState(false);

  // Menus state
  const [menus, setMenus] = useState<MenuConfig | null>(null);
  const [menusLoading, setMenusLoading] = useState(true);
  const [menusSaving, setMenusSaving] = useState(false);
  const [menusSaved, setMenusSaved] = useState(false);

  // ─── Fetch data ───────────────────────────────────────

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((res) => res.json())
      .then((data) => setShop(data))
      .catch(() => {})
      .finally(() => setShopLoading(false));

    fetch('/api/admin/site/branding')
      .then((res) => res.json())
      .then((data) => setBranding(data))
      .catch(() => {})
      .finally(() => setBrandingLoading(false));

    fetch('/api/admin/menus')
      .then((res) => res.json())
      .then((data) => setMenus(data))
      .catch(() => {})
      .finally(() => setMenusLoading(false));
  }, []);

  // ─── Shop save ────────────────────────────────────────

  const saveShop = useCallback(async () => {
    if (!shop) return;
    setShopSaving(true);
    setShopSaved(false);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shop),
      });
      if (res.ok) {
        const updated = await res.json();
        setShop(updated);
        setShopSaved(true);
        setTimeout(() => setShopSaved(false), 2000);
      }
    } catch {} finally {
      setShopSaving(false);
    }
  }, [shop]);

  // ─── Branding save (partial — only sends changed section) ──

  const saveBranding = useCallback(async (fields: Partial<SiteBranding>) => {
    setBrandingSaving(true);
    setBrandingSaved(false);
    try {
      const res = await fetch('/api/admin/site/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      if (res.ok) {
        const updated = await res.json();
        setBranding(updated);
        setBrandingSaved(true);
        setTimeout(() => setBrandingSaved(false), 2000);
      }
    } catch {} finally {
      setBrandingSaving(false);
    }
  }, []);

  // ─── Menus save ───────────────────────────────────────

  const saveMenus = useCallback(async () => {
    if (!menus) return;
    setMenusSaving(true);
    setMenusSaved(false);
    try {
      const res = await fetch('/api/admin/menus', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(menus),
      });
      if (res.ok) {
        const updated = await res.json();
        setMenus(updated);
        setMenusSaved(true);
        setTimeout(() => setMenusSaved(false), 2000);
      }
    } catch {} finally {
      setMenusSaving(false);
    }
  }, [menus]);

  // ─── Shop helpers ─────────────────────────────────────

  const shopToggle = (key: keyof ShopSettings) => {
    if (!shop) return;
    setShop({ ...shop, [key]: !shop[key] });
  };

  const shopLocaleToggle = (locale: Locale) => {
    if (!shop) return;
    const current = shop.activeLocales;
    const isActive = current.includes(locale);
    if (isActive && (current.length <= 1 || locale === 'en')) return;
    const updated = isActive ? current.filter((l) => l !== locale) : [...current, locale];
    setShop({ ...shop, activeLocales: updated });
  };

  // ─── Branding helpers ─────────────────────────────────

  const b = (key: keyof SiteBranding, value: unknown) => {
    if (!branding) return;
    setBranding({ ...branding, [key]: value });
  };

  const bCompany = (key: string, value: string) => {
    if (!branding) return;
    setBranding({ ...branding, companyInfo: { ...branding.companyInfo, [key]: value } });
  };

  // ─── Loading state ────────────────────────────────────

  const isLoading = shopLoading || brandingLoading || menusLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your site configuration, branding, and features.
        </p>
      </div>

      <Tabs defaultValue="branding">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="branding"><Paintbrush className="h-3 w-3 mr-1" />Branding</TabsTrigger>
          <TabsTrigger value="seo"><Search className="h-3 w-3 mr-1" />SEO</TabsTrigger>
          <TabsTrigger value="business"><Building2 className="h-3 w-3 mr-1" />Business</TabsTrigger>
          <TabsTrigger value="menus"><MenuIcon className="h-3 w-3 mr-1" />Menus</TabsTrigger>
          <TabsTrigger value="features"><ToggleLeft className="h-3 w-3 mr-1" />Features</TabsTrigger>
          <TabsTrigger value="shop"><Eye className="h-3 w-3 mr-1" />Shop</TabsTrigger>
          <TabsTrigger value="payment"><CreditCard className="h-3 w-3 mr-1" />Payment</TabsTrigger>
        </TabsList>

        {/* ═══════ BRANDING TAB ═══════ */}
        <TabsContent value="branding">
          {branding && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Paintbrush className="h-5 w-5" />
                    Branding
                  </CardTitle>
                  <CardDescription>Site name, logo, colors, and footer text.</CardDescription>
                </div>
                <SaveButton saving={brandingSaving} saved={brandingSaved} onClick={() => saveBranding({
                  name: branding.name,
                  logoUrl: branding.logoUrl,
                  faviconUrl: branding.faviconUrl,
                  primaryColor: branding.primaryColor,
                  accentColor: branding.accentColor,
                  footerText: branding.footerText,
                })} />
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Site Name</Label>
                    <Input value={branding.name} onChange={(e) => b('name', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Footer Text</Label>
                    <Input
                      value={branding.footerText || ''}
                      onChange={(e) => b('footerText', e.target.value)}
                      placeholder="Shown in footer (defaults to site name)"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Logo URL</Label>
                    <Input
                      value={branding.logoUrl || ''}
                      onChange={(e) => b('logoUrl', e.target.value)}
                      placeholder="https://... or /images/logo.png"
                    />
                    {branding.logoUrl && (
                      <div className="p-2 border rounded bg-muted/50">
                        <img src={branding.logoUrl} alt="Logo preview" className="h-8 object-contain" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Favicon URL</Label>
                    <Input
                      value={branding.faviconUrl || ''}
                      onChange={(e) => b('faviconUrl', e.target.value)}
                      placeholder="https://... or /images/favicon.ico"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Primary Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={branding.primaryColor || '#000000'}
                        onChange={(e) => b('primaryColor', e.target.value)}
                        className="h-9 w-12 rounded border cursor-pointer"
                      />
                      <Input
                        value={branding.primaryColor || ''}
                        onChange={(e) => b('primaryColor', e.target.value)}
                        placeholder="#000000"
                        className="flex-1"
                      />
                      {branding.primaryColor && (
                        <Button variant="ghost" size="sm" onClick={() => b('primaryColor', null)}>
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Accent Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={branding.accentColor || '#000000'}
                        onChange={(e) => b('accentColor', e.target.value)}
                        className="h-9 w-12 rounded border cursor-pointer"
                      />
                      <Input
                        value={branding.accentColor || ''}
                        onChange={(e) => b('accentColor', e.target.value)}
                        placeholder="#000000"
                        className="flex-1"
                      />
                      {branding.accentColor && (
                        <Button variant="ghost" size="sm" onClick={() => b('accentColor', null)}>
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══════ SEO TAB ═══════ */}
        <TabsContent value="seo">
          {branding && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    SEO & Analytics
                  </CardTitle>
                  <CardDescription>Default meta tags and tracking.</CardDescription>
                </div>
                <SaveButton saving={brandingSaving} saved={brandingSaved} onClick={() => saveBranding({
                  defaultMetaTitle: branding.defaultMetaTitle,
                  defaultMetaDescription: branding.defaultMetaDescription,
                  gaTrackingId: branding.gaTrackingId,
                })} />
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Default Meta Title</Label>
                  <Input
                    value={branding.defaultMetaTitle || ''}
                    onChange={(e) => b('defaultMetaTitle', e.target.value)}
                    placeholder="Site name is used if empty"
                  />
                  <p className="text-xs text-muted-foreground">
                    Used as the default page title. Individual pages can override this.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Default Meta Description</Label>
                  <Textarea
                    value={branding.defaultMetaDescription || ''}
                    onChange={(e) => b('defaultMetaDescription', e.target.value)}
                    placeholder="A brief description of your site for search engines"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Google Analytics Tracking ID</Label>
                  <Input
                    value={branding.gaTrackingId || ''}
                    onChange={(e) => b('gaTrackingId', e.target.value)}
                    placeholder="G-XXXXXXXXXX"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══════ BUSINESS TAB ═══════ */}
        <TabsContent value="business">
          {branding && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Business Info
                  </CardTitle>
                  <CardDescription>Contact details and company information shown in the footer.</CardDescription>
                </div>
                <SaveButton saving={brandingSaving} saved={brandingSaved} onClick={() => saveBranding({
                  contactEmail: branding.contactEmail,
                  fromEmail: branding.fromEmail,
                  companyInfo: branding.companyInfo,
                })} />
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Contact Email</Label>
                    <Input
                      type="email"
                      value={branding.contactEmail || ''}
                      onChange={(e) => b('contactEmail', e.target.value)}
                      placeholder="info@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>From Email (transactional)</Label>
                    <Input
                      type="email"
                      value={branding.fromEmail || ''}
                      onChange={(e) => b('fromEmail', e.target.value)}
                      placeholder="noreply@example.com"
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Company Info (shown in footer)</h4>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Company Name</Label>
                      <Input
                        value={branding.companyInfo.name || ''}
                        onChange={(e) => bCompany('name', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>CoC Number (KvK)</Label>
                      <Input
                        value={branding.companyInfo.cocNumber || ''}
                        onChange={(e) => bCompany('cocNumber', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>VAT Number (BTW)</Label>
                      <Input
                        value={branding.companyInfo.vatNumber || ''}
                        onChange={(e) => bCompany('vatNumber', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══════ MENUS TAB ═══════ */}
        <TabsContent value="menus">
          {menus && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MenuIcon className="h-5 w-5" />
                    Navigation Menus
                  </CardTitle>
                  <CardDescription>Configure header and footer navigation links.</CardDescription>
                </div>
                <SaveButton saving={menusSaving} saved={menusSaved} onClick={saveMenus} />
              </CardHeader>
              <CardContent className="space-y-8">
                <MenuEditor
                  title="Header Menu"
                  items={menus.header || []}
                  onChange={(items) => setMenus({ ...menus, header: items })}
                />
                <div className="border-t" />
                <MenuEditor
                  title="Footer Menu"
                  items={menus.footer || []}
                  onChange={(items) => setMenus({ ...menus, footer: items })}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══════ FEATURES TAB ═══════ */}
        <TabsContent value="features">
          {branding && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ToggleLeft className="h-5 w-5" />
                    Feature Flags
                  </CardTitle>
                  <CardDescription>Enable or disable site features.</CardDescription>
                </div>
                <SaveButton saving={brandingSaving} saved={brandingSaved} onClick={() => saveBranding({
                  hasShipping: branding.hasShipping,
                  hasDigitalDelivery: branding.hasDigitalDelivery,
                  hasMultilingual: branding.hasMultilingual,
                  hasBolIntegration: branding.hasBolIntegration,
                  hasBundles: branding.hasBundles,
                  hasTemplates: branding.hasTemplates,
                  hasBlog: branding.hasBlog,
                  hasReviews: branding.hasReviews,
                })} />
              </CardHeader>
              <CardContent className="space-y-4">
                {([
                  { key: 'hasShipping', label: 'Shipping', desc: 'Enable physical product shipping and address collection at checkout.' },
                  { key: 'hasDigitalDelivery', label: 'Digital Delivery', desc: 'Enable digital product downloads and library access.' },
                  { key: 'hasBundles', label: 'Bundles', desc: 'Allow creating product bundles with discounted pricing.' },
                  { key: 'hasTemplates', label: 'Templates', desc: 'Enable product templates for bulk product creation.' },
                  { key: 'hasBlog', label: 'Blog', desc: 'Show blog section in navigation and enable blog post management.' },
                  { key: 'hasReviews', label: 'Reviews', desc: 'Allow customers to leave product reviews.' },
                  { key: 'hasMultilingual', label: 'Multilingual', desc: 'Enable multi-language support for content and navigation.' },
                  { key: 'hasBolIntegration', label: 'Bol.com Integration', desc: 'Enable product sync with Bol.com marketplace.' },
                ] as const).map(({ key, label, desc }, index) => (
                  <div key={key}>
                    {index > 0 && <div className="border-t mb-4" />}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">{label}</Label>
                        <p className="text-sm text-muted-foreground">{desc}</p>
                      </div>
                      <Switch
                        checked={branding[key]}
                        onCheckedChange={(checked) => b(key, checked)}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══════ SHOP TAB ═══════ */}
        <TabsContent value="shop">
          {shop && (
            <div className="space-y-6">
              <div className="flex justify-end">
                <SaveButton saving={shopSaving} saved={shopSaved} onClick={saveShop} />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Shop Display
                  </CardTitle>
                  <CardDescription>Control which sections are visible on the shop pages.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Recently Viewed</Label>
                      <p className="text-sm text-muted-foreground">
                        Show a &quot;Recently Viewed&quot; section on the shop page.
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Select
                        value={shop.recentlyViewedMaxQty.toString()}
                        onValueChange={(v) => setShop({ ...shop, recentlyViewedMaxQty: parseInt(v, 10) })}
                        disabled={!shop.showRecentlyViewed}
                      >
                        <SelectTrigger className="w-[80px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[2, 3, 4, 6, 8].map((n) => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Switch checked={shop.showRecentlyViewed} onCheckedChange={() => shopToggle('showRecentlyViewed')} />
                    </div>
                  </div>
                  <div className="border-t" />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Related Products</Label>
                      <p className="text-sm text-muted-foreground">
                        Show a &quot;You might also like&quot; section on product detail pages.
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Select
                        value={shop.relatedProductsMaxQty.toString()}
                        onValueChange={(v) => setShop({ ...shop, relatedProductsMaxQty: parseInt(v, 10) })}
                        disabled={!shop.showRelatedProducts}
                      >
                        <SelectTrigger className="w-[80px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[2, 3, 4, 6, 8].map((n) => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Switch checked={shop.showRelatedProducts} onCheckedChange={() => shopToggle('showRelatedProducts')} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Shop Filters
                  </CardTitle>
                  <CardDescription>Choose which filter options are visible in the shop.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(branding?.siteType === 'physical' ? [
                    { key: 'showFilterCategory', label: 'Category' },
                    { key: 'showFilterItemType', label: 'Item Type (Products/Bundles)' },
                  ] as const : [
                    { key: 'showFilterYear', label: 'Year' },
                    { key: 'showFilterTheme', label: 'Theme' },
                    { key: 'showFilterThemeMode', label: 'Theme Mode (Light/Dark)' },
                    { key: 'showFilterDevice', label: 'Device' },
                    { key: 'showFilterItemType', label: 'Item Type (Products/Bundles)' },
                    { key: 'showFilterProductType', label: 'Product Type (Planners/Notebooks/etc.)' },
                    { key: 'showFilterCategory', label: 'Category' },
                  ] as const).map(({ key, label }, index) => (
                    <div key={key}>
                      {index > 0 && <div className="border-t mb-4" />}
                      <div className="flex items-center justify-between">
                        <Label className="text-base">{label}</Label>
                        <Switch checked={shop[key]} onCheckedChange={() => shopToggle(key)} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LayoutGrid className="h-5 w-5" />
                    Pagination
                  </CardTitle>
                  <CardDescription>Configure how many items are displayed per page.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Items Per Page</Label>
                      <p className="text-sm text-muted-foreground">Number of products shown per page in the shop.</p>
                    </div>
                    <Select
                      value={shop.itemsPerPage.toString()}
                      onValueChange={(v) => setShop({ ...shop, itemsPerPage: parseInt(v, 10) })}
                    >
                      <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[8, 12, 16, 24, 36, 48].map((n) => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowUpDown className="h-5 w-5" />
                    Product Sorting
                  </CardTitle>
                  <CardDescription>Set the default sorting order for products in the shop.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Sort By</Label>
                      <p className="text-sm text-muted-foreground">Default field to sort products by.</p>
                    </div>
                    <Select
                      value={shop.productDefaultSortBy}
                      onValueChange={(v) => setShop({ ...shop, productDefaultSortBy: v as ShopSettings['productDefaultSortBy'] })}
                    >
                      <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="createdAt">Date Added</SelectItem>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="year">Year</SelectItem>
                        <SelectItem value="theme">Theme</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="border-t" />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Sort Order</Label>
                      <p className="text-sm text-muted-foreground">Default sort direction.</p>
                    </div>
                    <Select
                      value={shop.productDefaultSortOrder}
                      onValueChange={(v) => setShop({ ...shop, productDefaultSortOrder: v as ShopSettings['productDefaultSortOrder'] })}
                    >
                      <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asc">Ascending</SelectItem>
                        <SelectItem value="desc">Descending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Languages
                  </CardTitle>
                  <CardDescription>Choose which languages are available in the frontend. English is always enabled.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {locales.map((locale, index) => (
                    <div key={locale}>
                      {index > 0 && <div className="border-t mb-4" />}
                      <div className="flex items-center justify-between">
                        <Label className="text-base">{localeNames[locale]}</Label>
                        <Switch
                          checked={shop.activeLocales.includes(locale)}
                          onCheckedChange={() => shopLocaleToggle(locale)}
                          disabled={locale === 'en'}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ═══════ PAYMENT TAB ═══════ */}
        <TabsContent value="payment">
          {branding && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment (Stripe)
                  </CardTitle>
                  <CardDescription>Stripe configuration for this site.</CardDescription>
                </div>
                <SaveButton saving={brandingSaving} saved={brandingSaved} onClick={() => saveBranding({
                  stripeAccountId: branding.stripeAccountId,
                  stripeWebhookSecret: branding.stripeWebhookSecret,
                })} />
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Stripe Account ID</Label>
                  <Input
                    value={branding.stripeAccountId || ''}
                    onChange={(e) => b('stripeAccountId', e.target.value)}
                    placeholder="acct_..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Stripe Webhook Secret</Label>
                  <Input
                    type="password"
                    value={branding.stripeWebhookSecret || ''}
                    onChange={(e) => b('stripeWebhookSecret', e.target.value)}
                    placeholder="whsec_..."
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
