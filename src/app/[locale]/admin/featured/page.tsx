'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, StarOff, Package, Sparkles } from 'lucide-react';

interface ProductTranslation {
  languageCode: string;
  name: string | null;
}

interface TemplateTranslation {
  languageCode: string;
  name: string;
}

interface BundleTranslation {
  languageCode: string;
  name: string;
}

interface Product {
  id: number;
  year: number | null;
  theme: string | null;
  contentLanguage: string | null;
  isPublished: boolean;
  isFeatured: boolean;
  translations: ProductTranslation[];
  template: {
    translations: TemplateTranslation[];
  } | null;
}

interface Bundle {
  id: number;
  isPublished: boolean;
  isFeatured: boolean;
  isAllAccess: boolean;
  translations: BundleTranslation[];
}

function getProductName(product: Product): string {
  if (product.template) {
    const trans = product.template.translations.find(t => t.languageCode === 'en');
    return trans?.name || product.template.translations[0]?.name || 'Unknown';
  }
  const trans = product.translations.find(t => t.languageCode === 'en');
  return trans?.name || product.translations[0]?.name || 'Standalone Product';
}

function getBundleName(bundle: Bundle): string {
  const trans = bundle.translations.find(t => t.languageCode === 'en');
  return trans?.name || bundle.translations[0]?.name || 'Unknown Bundle';
}

export default function FeaturedPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/admin/featured');
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products);
        setBundles(data.bundles);
      }
    } catch (error) {
      console.error('Failed to fetch featured data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleFeatured = async (type: 'product' | 'bundle', id: number, currentValue: boolean) => {
    const key = `${type}-${id}`;
    setUpdating(key);
    try {
      const response = await fetch('/api/admin/featured', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id, isFeatured: !currentValue }),
      });
      if (response.ok) {
        if (type === 'product') {
          setProducts(prev => prev.map(p =>
            p.id === id ? { ...p, isFeatured: !currentValue } : p
          ));
        } else {
          setBundles(prev => prev.map(b =>
            b.id === id ? { ...b, isFeatured: !currentValue } : b
          ));
        }
      }
    } catch (error) {
      console.error('Failed to toggle featured:', error);
    } finally {
      setUpdating(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const featuredProducts = products.filter(p => p.isFeatured);
  const featuredBundles = bundles.filter(b => b.isFeatured);
  const unfeaturedProducts = products.filter(p => !p.isFeatured);
  const unfeaturedBundles = bundles.filter(b => !b.isFeatured);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Featured Items</h2>
        <p className="text-muted-foreground">
          Manage which products and bundles are highlighted in the shop.
        </p>
      </div>

      {/* Currently Featured */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
            Currently Featured
          </CardTitle>
        </CardHeader>
        <CardContent>
          {featuredProducts.length === 0 && featuredBundles.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No items are currently featured.
            </p>
          ) : (
            <div className="space-y-2">
              {featuredBundles.map(bundle => (
                <div
                  key={`bundle-${bundle.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border bg-yellow-50 dark:bg-yellow-950/20"
                >
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <div>
                      <span className="font-medium">{getBundleName(bundle)}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        (Bundle{bundle.isAllAccess ? ' - All Access' : ''})
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleFeatured('bundle', bundle.id, true)}
                    disabled={updating === `bundle-${bundle.id}`}
                  >
                    <StarOff className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              ))}
              {featuredProducts.map(product => (
                <div
                  key={`product-${product.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border bg-yellow-50 dark:bg-yellow-950/20"
                >
                  <div className="flex items-center gap-3">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="font-medium">{getProductName(product)}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {[product.year, product.theme, product.contentLanguage].filter(Boolean).join(' / ')}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleFeatured('product', product.id, true)}
                    disabled={updating === `product-${product.id}`}
                  >
                    <StarOff className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Bundles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Available Bundles
          </CardTitle>
        </CardHeader>
        <CardContent>
          {unfeaturedBundles.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              All bundles are featured.
            </p>
          ) : (
            <div className="space-y-2">
              {unfeaturedBundles.map(bundle => (
                <div
                  key={`bundle-${bundle.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <div>
                      <span className="font-medium">{getBundleName(bundle)}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {bundle.isAllAccess ? '(All Access)' : ''}
                      </span>
                      {!bundle.isPublished && (
                        <span className="text-xs text-yellow-600 ml-2">(Unpublished)</span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleFeatured('bundle', bundle.id, false)}
                    disabled={updating === `bundle-${bundle.id}`}
                  >
                    <Star className="h-4 w-4 mr-1" />
                    Feature
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Products */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Available Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          {unfeaturedProducts.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              All products are featured.
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {unfeaturedProducts.map(product => (
                <div
                  key={`product-${product.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="font-medium">{getProductName(product)}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {[product.year, product.theme, product.contentLanguage].filter(Boolean).join(' / ')}
                      </span>
                      {!product.isPublished && (
                        <span className="text-xs text-yellow-600 ml-2">(Unpublished)</span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleFeatured('product', product.id, false)}
                    disabled={updating === `product-${product.id}`}
                  >
                    <Star className="h-4 w-4 mr-1" />
                    Feature
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
