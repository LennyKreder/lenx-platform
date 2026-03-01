'use client';

import { useState, useMemo } from 'react';
import { LibraryProductGrid } from './LibraryProductGrid';
import { LibraryFilters, type FilterState } from './LibraryFilters';
import type { AccessibleProduct } from '@/lib/customer-access';
import { themes } from '@/config/themes';

interface LibraryProductsPageProps {
  products: AccessibleProduct[];
  locale: string;
  accessCode: string;
}

export function LibraryProductsPage({ products, locale, accessCode }: LibraryProductsPageProps) {
  const [filters, setFilters] = useState<FilterState>({
    year: null,
    theme: null,
    language: null,
    mode: null,
  });

  // Extract available filter options from products
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    products.forEach((p) => {
      if (p.year) years.add(p.year);
    });
    return Array.from(years).sort((a, b) => b - a); // Descending
  }, [products]);

  const availableThemes = useMemo(() => {
    const themes = new Set<string>();
    products.forEach((p) => {
      if (p.theme) themes.add(p.theme);
    });
    return Array.from(themes).sort();
  }, [products]);

  const availableLanguages = useMemo(() => {
    const languages = new Set<string>();
    products.forEach((p) => {
      if (p.contentLanguage) languages.add(p.contentLanguage);
    });
    return Array.from(languages).sort();
  }, [products]);

  const availableModes = useMemo(() => {
    const modes = new Set<string>();
    products.forEach((p) => {
      if (p.theme) {
        const themeConfig = themes[p.theme as keyof typeof themes];
        if (themeConfig) modes.add(themeConfig.mode);
      }
    });
    return Array.from(modes).sort();
  }, [products]);

  // Filter products based on current filter state
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (filters.year && product.year !== parseInt(filters.year, 10)) {
        return false;
      }
      if (filters.theme && product.theme !== filters.theme) {
        return false;
      }
      if (filters.language && product.contentLanguage !== filters.language) {
        return false;
      }
      if (filters.mode && product.theme) {
        const themeConfig = themes[product.theme as keyof typeof themes];
        if (themeConfig && themeConfig.mode !== filters.mode) {
          return false;
        }
      }
      return true;
    });
  }, [products, filters]);

  const showFilters = availableYears.length > 1 || availableThemes.length > 1 || availableLanguages.length > 1 || availableModes.length > 1;

  const isNL = locale === 'nl';

  return (
    <div className="space-y-6">
      {/* Header with count and filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-muted-foreground">
            {isNL
              ? `${filteredProducts.length} van ${products.length} product${products.length !== 1 ? 'en' : ''}`
              : `${filteredProducts.length} of ${products.length} product${products.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {showFilters && (
          <LibraryFilters
            filters={filters}
            onFiltersChange={setFilters}
            availableYears={availableYears}
            availableThemes={availableThemes}
            availableLanguages={availableLanguages}
            availableModes={availableModes}
          />
        )}
      </div>

      {/* Product Grid */}
      <LibraryProductGrid
        products={filteredProducts}
        locale={locale}
        accessCode={accessCode}
      />
    </div>
  );
}
