'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Tag } from 'lucide-react';
import { themes, getThemeName } from '@/config/themes';
import { devices } from '@/config/devices';
import { getProductTypeName } from '@/config/product-types';
import type { FilterVisibility } from './ShopPageClient';

interface ShopFiltersProps {
  years: number[];
  availableThemes: string[];
  availableDevices: string[];
  availableProductTypes: string[];
  availableCategories?: { id: number; name: string }[];
  selectedYear: string;
  selectedTheme: string;
  selectedThemeMode: string;
  selectedDevice: string;
  selectedItemType: string;
  selectedProductType: string;
  selectedCategory: string;
  onSale: boolean;
  minPrice: string;
  maxPrice: string;
  onYearChange: (year: string) => void;
  onThemeChange: (theme: string) => void;
  onThemeModeChange: (mode: string) => void;
  onDeviceChange: (device: string) => void;
  onItemTypeChange: (type: string) => void;
  onProductTypeChange: (productType: string) => void;
  onCategoryChange: (category: string) => void;
  onSaleChange: (onSale: boolean) => void;
  onMinPriceChange: (price: string) => void;
  onMaxPriceChange: (price: string) => void;
  onClearFilters: () => void;
  locale: string;
  visibleFilters?: FilterVisibility;
}

export function ShopFilters({
  years,
  availableThemes,
  availableDevices,
  availableProductTypes,
  availableCategories = [],
  selectedYear,
  selectedTheme,
  selectedThemeMode,
  selectedDevice,
  selectedItemType,
  selectedProductType,
  selectedCategory,
  onSale,
  minPrice,
  maxPrice,
  onYearChange,
  onThemeChange,
  onThemeModeChange,
  onDeviceChange,
  onItemTypeChange,
  onProductTypeChange,
  onCategoryChange,
  onSaleChange,
  onMinPriceChange,
  onMaxPriceChange,
  onClearFilters,
  locale,
  visibleFilters,
}: ShopFiltersProps) {
  const isNL = locale === 'nl';
  const hasActiveFilters =
    selectedYear !== 'all' ||
    selectedTheme !== 'all' ||
    selectedThemeMode !== 'all' ||
    selectedDevice !== 'all' ||
    selectedItemType !== 'all' ||
    selectedProductType !== 'all' ||
    selectedCategory !== 'all' ||
    onSale ||
    minPrice !== '' ||
    maxPrice !== '';

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Year Filter */}
      {visibleFilters?.year !== false && years.length > 0 && (
        <Select value={selectedYear} onValueChange={onYearChange}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder={isNL ? 'Jaar' : 'Year'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isNL ? 'Alle jaren' : 'All Years'}</SelectItem>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Theme Filter */}
      {visibleFilters?.theme !== false && availableThemes.length > 0 && (
        <Select value={selectedTheme} onValueChange={onThemeChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={isNL ? 'Thema' : 'Theme'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isNL ? "Alle thema's" : 'All Themes'}</SelectItem>
            {[...availableThemes]
              .sort((a, b) => {
                const nameA = getThemeName(a, locale);
                const nameB = getThemeName(b, locale);
                return nameA.localeCompare(nameB);
              })
              .map((themeId) => {
                const theme = themes[themeId as keyof typeof themes];
                return (
                  <SelectItem key={themeId} value={themeId}>
                    <span className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: theme?.previewColor || '#888' }}
                      />
                      {getThemeName(themeId, locale)}
                    </span>
                  </SelectItem>
                );
              })}
          </SelectContent>
        </Select>
      )}

      {/* Theme Mode Filter */}
      {visibleFilters?.themeMode !== false && (
        <Select value={selectedThemeMode} onValueChange={onThemeModeChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={isNL ? 'Modus' : 'Mode'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isNL ? 'Alle modi' : 'All Modes'}</SelectItem>
            <SelectItem value="light">{isNL ? 'Licht' : 'Light'}</SelectItem>
            <SelectItem value="dark">{isNL ? 'Donker' : 'Dark'}</SelectItem>
          </SelectContent>
        </Select>
      )}

      {/* Device Filter */}
      {visibleFilters?.device !== false && availableDevices.length > 0 && (
        <Select value={selectedDevice} onValueChange={onDeviceChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={isNL ? 'Apparaat' : 'Device'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isNL ? 'Alle apparaten' : 'All Devices'}</SelectItem>
            {availableDevices.map((deviceId) => {
              const device = devices[deviceId as keyof typeof devices];
              return (
                <SelectItem key={deviceId} value={deviceId}>
                  {device?.name || deviceId}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      )}

      {/* Product Type Filter */}
      {visibleFilters?.productType !== false && availableProductTypes.length > 0 && (
        <Select value={selectedProductType} onValueChange={onProductTypeChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={isNL ? 'Type' : 'Type'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isNL ? 'Alle types' : 'All Types'}</SelectItem>
            {availableProductTypes.map((typeId) => (
              <SelectItem key={typeId} value={typeId}>
                {getProductTypeName(typeId, locale)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Category Filter */}
      {visibleFilters?.category !== false && availableCategories.length > 0 && (
        <Select value={selectedCategory} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={isNL ? 'Categorie' : 'Category'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isNL ? 'Alle categorieën' : 'All Categories'}</SelectItem>
            {availableCategories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id.toString()}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Item Type Filter (Products / Bundles) */}
      {visibleFilters?.itemType !== false && (
        <Select value={selectedItemType} onValueChange={onItemTypeChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={isNL ? 'Type' : 'Type'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isNL ? 'Alles' : 'All Items'}</SelectItem>
            <SelectItem value="products">{isNL ? 'Producten' : 'Products Only'}</SelectItem>
            <SelectItem value="bundles">{isNL ? 'Bundels' : 'Bundles Only'}</SelectItem>
          </SelectContent>
        </Select>
      )}

      {/* On Sale Toggle */}
      {visibleFilters?.onSale !== false && (
        <button
          onClick={() => onSaleChange(!onSale)}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            onSale
              ? 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800'
              : 'bg-muted text-muted-foreground hover:bg-muted/80 border border-transparent'
          }`}
        >
          <Tag className="w-4 h-4" />
          {isNL ? 'Kortingen' : 'On Sale'}
        </button>
      )}

      {/* Price Range */}
      <div className="flex items-center gap-1">
        <Input
          type="number"
          value={minPrice}
          onChange={(e) => onMinPriceChange(e.target.value)}
          placeholder={isNL ? '€ min' : '€ min'}
          className="w-[80px] text-sm"
          min={0}
        />
        <span className="text-muted-foreground text-sm">-</span>
        <Input
          type="number"
          value={maxPrice}
          onChange={(e) => onMaxPriceChange(e.target.value)}
          placeholder={isNL ? '€ max' : '€ max'}
          className="w-[80px] text-sm"
          min={0}
        />
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="text-muted-foreground"
        >
          <X className="w-4 h-4 mr-1" />
          {isNL ? 'Wissen' : 'Clear'}
        </Button>
      )}
    </div>
  );
}
