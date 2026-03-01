'use client';

import { useState, useEffect } from 'react';
import { Loader2, Save, Eye, Filter, LayoutGrid, ArrowUpDown, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { locales, type Locale } from '@/lib/i18n';

const localeNames: Record<Locale, string> = {
  en: 'English',
  nl: 'Nederlands',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
};

interface SiteSettings {
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
  itemsPerPage: number;
  productDefaultSortBy: 'name' | 'createdAt' | 'year' | 'theme';
  productDefaultSortOrder: 'asc' | 'desc';
  activeLocales: Locale[];
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((res) => res.json())
      .then((data) => {
        setSettings(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    setSaved(false);

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        const updated = await response.json();
        setSettings(updated);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = (key: keyof SiteSettings) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: !settings[key] });
  };

  const handleLocaleToggle = (locale: Locale) => {
    if (!settings) return;
    const current = settings.activeLocales;
    const isActive = current.includes(locale);

    // Don't allow disabling the last locale or English
    if (isActive && (current.length <= 1 || locale === 'en')) return;

    const updated = isActive
      ? current.filter((l) => l !== locale)
      : [...current, locale];

    setSettings({ ...settings, activeLocales: updated });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        Failed to load settings.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">
            Manage shop features and display options.
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {saved ? 'Saved!' : 'Save Changes'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Shop Display
          </CardTitle>
          <CardDescription>
            Control which sections are visible on the shop pages.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="recentlyViewed" className="text-base">
                Recently Viewed
              </Label>
              <p className="text-sm text-muted-foreground">
                Show a &quot;Recently Viewed&quot; section on the shop page based on browsing history.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Select
                value={settings.recentlyViewedMaxQty.toString()}
                onValueChange={(value) =>
                  setSettings({ ...settings, recentlyViewedMaxQty: parseInt(value, 10) })
                }
                disabled={!settings.showRecentlyViewed}
              >
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="6">6</SelectItem>
                  <SelectItem value="8">8</SelectItem>
                </SelectContent>
              </Select>
              <Switch
                id="recentlyViewed"
                checked={settings.showRecentlyViewed}
                onCheckedChange={() => handleToggle('showRecentlyViewed')}
              />
            </div>
          </div>

          <div className="border-t" />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="relatedProducts" className="text-base">
                Related Products
              </Label>
              <p className="text-sm text-muted-foreground">
                Show a &quot;You might also like&quot; section on product detail pages.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Select
                value={settings.relatedProductsMaxQty.toString()}
                onValueChange={(value) =>
                  setSettings({ ...settings, relatedProductsMaxQty: parseInt(value, 10) })
                }
                disabled={!settings.showRelatedProducts}
              >
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="6">6</SelectItem>
                  <SelectItem value="8">8</SelectItem>
                </SelectContent>
              </Select>
              <Switch
                id="relatedProducts"
                checked={settings.showRelatedProducts}
                onCheckedChange={() => handleToggle('showRelatedProducts')}
              />
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
          <CardDescription>
            Choose which filter options are visible in the shop.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="filterYear" className="text-base">Year</Label>
            <Switch
              id="filterYear"
              checked={settings.showFilterYear}
              onCheckedChange={() => handleToggle('showFilterYear')}
            />
          </div>

          <div className="border-t" />

          <div className="flex items-center justify-between">
            <Label htmlFor="filterTheme" className="text-base">Theme</Label>
            <Switch
              id="filterTheme"
              checked={settings.showFilterTheme}
              onCheckedChange={() => handleToggle('showFilterTheme')}
            />
          </div>

          <div className="border-t" />

          <div className="flex items-center justify-between">
            <Label htmlFor="filterThemeMode" className="text-base">Theme Mode (Light/Dark)</Label>
            <Switch
              id="filterThemeMode"
              checked={settings.showFilterThemeMode}
              onCheckedChange={() => handleToggle('showFilterThemeMode')}
            />
          </div>

          <div className="border-t" />

          <div className="flex items-center justify-between">
            <Label htmlFor="filterDevice" className="text-base">Device</Label>
            <Switch
              id="filterDevice"
              checked={settings.showFilterDevice}
              onCheckedChange={() => handleToggle('showFilterDevice')}
            />
          </div>

          <div className="border-t" />

          <div className="flex items-center justify-between">
            <Label htmlFor="filterItemType" className="text-base">Item Type (Products/Bundles)</Label>
            <Switch
              id="filterItemType"
              checked={settings.showFilterItemType}
              onCheckedChange={() => handleToggle('showFilterItemType')}
            />
          </div>

          <div className="border-t" />

          <div className="flex items-center justify-between">
            <Label htmlFor="filterProductType" className="text-base">Product Type (Planners/Notebooks/etc.)</Label>
            <Switch
              id="filterProductType"
              checked={settings.showFilterProductType}
              onCheckedChange={() => handleToggle('showFilterProductType')}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5" />
            Pagination
          </CardTitle>
          <CardDescription>
            Configure how many items are displayed per page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="itemsPerPage" className="text-base">
                Items Per Page
              </Label>
              <p className="text-sm text-muted-foreground">
                Number of products shown per page in the shop.
              </p>
            </div>
            <Select
              value={settings.itemsPerPage.toString()}
              onValueChange={(value) =>
                setSettings({ ...settings, itemsPerPage: parseInt(value, 10) })
              }
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="8">8</SelectItem>
                <SelectItem value="12">12</SelectItem>
                <SelectItem value="16">16</SelectItem>
                <SelectItem value="24">24</SelectItem>
                <SelectItem value="36">36</SelectItem>
                <SelectItem value="48">48</SelectItem>
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
          <CardDescription>
            Set the default sorting order for products in the shop.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sortBy" className="text-base">
                Sort By
              </Label>
              <p className="text-sm text-muted-foreground">
                Default field to sort products by.
              </p>
            </div>
            <Select
              value={settings.productDefaultSortBy}
              onValueChange={(value) =>
                setSettings({ ...settings, productDefaultSortBy: value as SiteSettings['productDefaultSortBy'] })
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
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
              <Label htmlFor="sortOrder" className="text-base">
                Sort Order
              </Label>
              <p className="text-sm text-muted-foreground">
                Default sort direction.
              </p>
            </div>
            <Select
              value={settings.productDefaultSortOrder}
              onValueChange={(value) =>
                setSettings({ ...settings, productDefaultSortOrder: value as SiteSettings['productDefaultSortOrder'] })
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
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
          <CardDescription>
            Choose which languages are available in the frontend. English is always enabled.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {locales.map((locale, index) => (
            <div key={locale}>
              {index > 0 && <div className="border-t mb-4" />}
              <div className="flex items-center justify-between">
                <Label htmlFor={`locale-${locale}`} className="text-base">
                  {localeNames[locale]}
                </Label>
                <Switch
                  id={`locale-${locale}`}
                  checked={settings.activeLocales.includes(locale)}
                  onCheckedChange={() => handleLocaleToggle(locale)}
                  disabled={locale === 'en'}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
