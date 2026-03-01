'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Package, Layers } from 'lucide-react';
import { themes } from '@/config/themes';

interface SlugRoute {
  languageCode: string;
  slug: string;
}

interface ProductTemplateTranslation {
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
  downloadCode: string;
  slugs: SlugRoute[];
  template: { translations: ProductTemplateTranslation[] };
}

interface Bundle {
  id: number;
  downloadCode: string;
  isAllAccess: boolean;
  slugs: SlugRoute[];
  translations: BundleTranslation[];
}

interface Access {
  id: number;
  productId: number | null;
  bundleId: number | null;
  grantedAt: string;
  grantedBy: string;
  product: Product | null;
  bundle: Bundle | null;
}

interface CustomerAccessManagerProps {
  customerId: number;
  access: Access[];
  products: Product[];
  bundles: Bundle[];
  onAccessChange: () => void;
}

// Helper functions
function getTemplateName(translations: ProductTemplateTranslation[]): string {
  return translations.find(t => t.languageCode === 'en')?.name || translations[0]?.name || 'Unnamed';
}

function getBundleName(translations: BundleTranslation[]): string {
  return translations.find(t => t.languageCode === 'en')?.name || translations[0]?.name || 'Unnamed';
}

export function CustomerAccessManager({
  customerId,
  access,
  products,
  bundles,
  onAccessChange,
}: CustomerAccessManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [accessType, setAccessType] = useState<'product' | 'bundle'>('product');
  const [selectedId, setSelectedId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGrant = async () => {
    if (!selectedId) return;
    setIsLoading(true);

    try {
      const response = await fetch(`/api/admin/customers/${customerId}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [accessType === 'product' ? 'productId' : 'bundleId']: parseInt(
            selectedId,
            10
          ),
        }),
      });

      if (response.ok) {
        setIsAdding(false);
        setSelectedId('');
        onAccessChange();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to grant access');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevoke = async (accessId: number) => {
    if (!confirm('Revoke this access?')) return;

    const response = await fetch(
      `/api/admin/customers/${customerId}/access?accessId=${accessId}`,
      { method: 'DELETE' }
    );

    if (response.ok) {
      onAccessChange();
    } else {
      const data = await response.json();
      alert(data.error || 'Failed to revoke access');
    }
  };

  // Filter out products/bundles that customer already has access to
  const ownedProductIds = new Set(access.filter((a) => a.productId).map((a) => a.productId));
  const ownedBundleIds = new Set(access.filter((a) => a.bundleId).map((a) => a.bundleId));
  const availableProducts = products.filter((p) => !ownedProductIds.has(p.id));
  const availableBundles = bundles.filter((b) => !ownedBundleIds.has(b.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Product Access ({access.length})</h3>
        {!isAdding && (
          <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4" />
            Grant Access
          </Button>
        )}
      </div>

      {/* Add access form */}
      {isAdding && (
        <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
          <div className="flex gap-2">
            <Select
              value={accessType}
              onValueChange={(v) => {
                setAccessType(v as 'product' | 'bundle');
                setSelectedId('');
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="product">Product</SelectItem>
                <SelectItem value="bundle">Bundle</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={`Select a ${accessType}...`} />
              </SelectTrigger>
              <SelectContent>
                {accessType === 'product' ? (
                  availableProducts.length === 0 ? (
                    <SelectItem value="" disabled>
                      No available products
                    </SelectItem>
                  ) : (
                    availableProducts.map((product) => {
                      const themeData = product.theme
                        ? themes[product.theme as keyof typeof themes]
                        : null;
                      const templateName = getTemplateName(product.template.translations);
                      return (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          {templateName}
                          {product.year && ` ${product.year}`}
                          {themeData && ` - ${themeData.name}`}
                          {product.contentLanguage && ` (${product.contentLanguage.toUpperCase()})`}
                        </SelectItem>
                      );
                    })
                  )
                ) : availableBundles.length === 0 ? (
                  <SelectItem value="" disabled>
                    No available bundles
                  </SelectItem>
                ) : (
                  availableBundles.map((bundle) => {
                    const bundleName = getBundleName(bundle.translations);
                    return (
                      <SelectItem key={bundle.id} value={bundle.id.toString()}>
                        {bundleName}
                        {bundle.isAllAccess && ' (All Access)'}
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleGrant} disabled={!selectedId || isLoading}>
              {isLoading ? 'Granting...' : 'Grant Access'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAdding(false);
                setSelectedId('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Access list */}
      {access.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          No product access. Click &quot;Grant Access&quot; to add products.
        </p>
      ) : (
        <div className="space-y-2">
          {access.map((item) => {
            const isProduct = !!item.product;
            const themeData =
              item.product?.theme
                ? themes[item.product.theme as keyof typeof themes]
                : null;

            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  {isProduct ? (
                    <Package className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Layers className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    {isProduct ? (
                      <>
                        <span className="font-medium">
                          {item.product ? getTemplateName(item.product.template.translations) : 'Unknown'}
                        </span>
                        <span className="text-muted-foreground text-sm ml-2">
                          {[
                            item.product?.year,
                            themeData?.name,
                            item.product?.contentLanguage?.toUpperCase(),
                          ]
                            .filter(Boolean)
                            .join(' / ')}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-medium">
                          {item.bundle ? getBundleName(item.bundle.translations) : 'Unknown'}
                        </span>
                        {item.bundle?.isAllAccess && (
                          <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                            All Access
                          </span>
                        )}
                      </>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Granted {new Date(item.grantedAt).toLocaleDateString('en-GB')} via{' '}
                      {item.grantedBy}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleRevoke(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
