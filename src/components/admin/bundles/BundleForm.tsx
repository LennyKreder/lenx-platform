'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  TranslationsEditor,
  type Translation,
} from '@/components/admin/shared/TranslationsEditor';

interface SlugRoute {
  languageCode: string;
  slug: string;
}

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
  title?: string | null;
  shortDescription?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  description: string | null;
}

interface Product {
  id: number;
  year: number | null;
  theme: string | null;
  contentLanguage: string | null;
  priceInCents: number;
  translations: ProductTranslation[];
  slugs: SlugRoute[];
  template: {
    translations: TemplateTranslation[];
    slugs: SlugRoute[];
  } | null;
}

interface BundleItem {
  productId?: number | null;
  product?: {
    id: number;
    translations: ProductTranslation[];
    slugs: SlugRoute[];
  } | null;
}

interface BundleFormProps {
  bundle?: {
    id: number;
    discountPercent: number | null;
    fixedPriceInCents: number | null;
    currency: string;
    contentLanguage: string | null;
    isAllAccess: boolean;
    etsyListingId: string | null;
    downloadCode: string;
    isPublished: boolean;
    isFeatured: boolean;
    translations: BundleTranslation[];
    slugs: SlugRoute[];
    items: BundleItem[];
  };
  products: Product[];
  onSuccess?: () => void;
}

// Helper to get translation for a specific language
function getTranslation<T extends { languageCode: string; name: string | null }>(
  translations: T[],
  langCode: string
): string {
  const t = translations.find((tr) => tr.languageCode === langCode);
  return t?.name || translations[0]?.name || '';
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export function BundleForm({
  bundle,
  products,
  onSuccess,
}: BundleFormProps) {
  const router = useRouter();
  const isEditing = !!bundle;

  // Get initial values from bundle (name and slug are universal)
  const initialName = bundle?.translations?.[0]?.name || '';
  const initialSlug = bundle?.slugs?.[0]?.slug || '';

  // Build initial translations array for per-language fields (title, shortDescription, seoTitle, seoDescription, description)
  const initialTranslations: Translation[] = bundle?.translations?.map((t) => ({
    languageCode: t.languageCode,
    name: '', // Not used in tabs
    slug: '', // Not used in tabs
    title: t.title || '',
    shortDescription: t.shortDescription || '',
    seoTitle: t.seoTitle || '',
    seoDescription: t.seoDescription || '',
    description: t.description || '',
  })) || [];

  // Basic form state - single name/slug, per-language SEO/descriptions
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [translations, setTranslations] = useState<Translation[]>(initialTranslations);
  const [formData, setFormData] = useState({
    pricingType: bundle?.fixedPriceInCents
      ? 'fixed'
      : bundle?.discountPercent
      ? 'discount'
      : 'fixed',
    discountPercent: bundle?.discountPercent ? String(bundle.discountPercent) : '',
    currency: bundle?.currency || 'EUR',
    contentLanguage: bundle?.contentLanguage || '',
    isAllAccess: bundle?.isAllAccess || false,
    etsyListingId: bundle?.etsyListingId || '',
    isPublished: bundle?.isPublished || false,
    isFeatured: bundle?.isFeatured || false,
    productIds: bundle?.items
      .filter((i) => i.productId)
      .map((i) => i.productId!) || [],
  });
  const [priceInput, setPriceInput] = useState(
    bundle?.fixedPriceInCents ? String(bundle.fixedPriceInCents / 100) : ''
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [translationErrors, setTranslationErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setTranslationErrors({});

    // Validate required fields
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors['name'] = 'Name is required';
    }
    if (!slug.trim()) {
      errors['slug'] = 'Slug is required';
    }

    if (Object.keys(errors).length > 0) {
      setTranslationErrors(errors);
      setIsLoading(false);
      return;
    }

    // Build translations array for API (same name/slug for all, per-language SEO/descriptions)
    // We need at least EN and NL for routing
    const allLangs = ['en', 'nl', 'de', 'fr', 'es', 'it'];

    const translationsForApi = allLangs.map((lang) => {
      const t = translations.find((tr) => tr.languageCode === lang);
      return {
        languageCode: lang,
        name: name.trim(),
        slug: slug.trim(),
        title: t?.title || '',
        shortDescription: t?.shortDescription || '',
        seoTitle: t?.seoTitle || '',
        seoDescription: t?.seoDescription || '',
        description: t?.description || '',
      };
    });

    try {
      const url = isEditing
        ? `/api/admin/bundles/${bundle.id}`
        : '/api/admin/bundles';
      const method = isEditing ? 'PUT' : 'POST';

      const payload = {
        translations: translationsForApi,
        discountPercent:
          formData.pricingType === 'discount' ? parseInt(formData.discountPercent, 10) || 0 : null,
        fixedPriceInCents:
          formData.pricingType === 'fixed' ? Math.round((parseFloat(priceInput) || 0) * 100) : null,
        currency: formData.currency,
        contentLanguage: formData.contentLanguage || null,
        isAllAccess: formData.isAllAccess,
        etsyListingId: formData.etsyListingId || null,
        isPublished: formData.isPublished,
        isFeatured: formData.isFeatured,
        productIds: formData.isAllAccess ? [] : formData.productIds,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save bundle');
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/en/admin/bundles');
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleProduct = (productId: number) => {
    setFormData((prev) => ({
      ...prev,
      productIds: prev.productIds.includes(productId)
        ? prev.productIds.filter((id) => id !== productId)
        : [...prev.productIds, productId],
    }));
  };

  const totalProductPrice = products
    .filter((p) => formData.productIds.includes(p.id))
    .reduce((sum, p) => sum + p.priceInCents, 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-destructive/10 p-4 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Name & Slug */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              // Auto-generate slug if empty or matches previous auto-generated
              if (!slug || slug === generateSlug(name)) {
                setSlug(generateSlug(e.target.value));
              }
            }}
            placeholder="Bundle name"
            className={translationErrors['name'] ? 'border-destructive' : ''}
          />
          {translationErrors['name'] && (
            <p className="text-sm text-destructive">{translationErrors['name']}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="slug">URL Slug <span className="text-destructive">*</span></Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="url-slug"
            className={translationErrors['slug'] ? 'border-destructive' : ''}
          />
          {translationErrors['slug'] && (
            <p className="text-sm text-destructive">{translationErrors['slug']}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Same slug is used for all language versions of the bundle.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="contentLanguage">Content Language</Label>
          <select
            id="contentLanguage"
            value={formData.contentLanguage}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, contentLanguage: e.target.value }))
            }
            className="w-full px-3 py-2 border rounded-md text-sm bg-background"
          >
            <option value="">All Languages (shows in all shops)</option>
            <option value="en">English only</option>
            <option value="nl">Dutch only</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Controls which shop this bundle appears in. Leave empty to show in all shops.
          </p>
        </div>
      </div>

      {/* Per-Language Content */}
      <div className="space-y-2">
        <Label>Per-Language Content</Label>
        <div className="rounded-lg border p-4">
          <TranslationsEditor
            translations={translations}
            onChange={setTranslations}
            showName={false}
            showSlug={false}
            showDescription={true}
            showTitle={true}
            showShortDescription={true}
            showSeoTitle={true}
            showSeoDescription={true}
            requiredLanguages={[]}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Title (H1), SEO fields, and descriptions are per-language. Use {'{{name}}'}, {'{{year}}'}, {'{{theme}}'}, {'{{siteName}}'} as placeholders.
        </p>
      </div>

      {/* Download Code (read-only for existing) */}
      {isEditing && bundle?.downloadCode && (
        <div className="space-y-1.5">
          <Label>Download Code</Label>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-muted rounded-md font-mono text-sm">
              {bundle.downloadCode}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard.writeText(bundle.downloadCode)}
            >
              Copy
            </Button>
          </div>
        </div>
      )}

      {/* All Access Toggle */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isAllAccess"
            checked={formData.isAllAccess}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, isAllAccess: e.target.checked }))
            }
            className="h-4 w-4 rounded border-gray-300"
          />
          <div>
            <Label htmlFor="isAllAccess" className="font-medium">
              All Access Bundle
            </Label>
            <p className="text-xs text-muted-foreground">
              Grants access to ALL published products, current and future.
            </p>
          </div>
        </div>
      </div>

      {/* Product/Category Selection (only if not All Access) */}
      {!formData.isAllAccess && (
        <div className="space-y-4">
          <Label>Bundle Contents</Label>

          {/* Products */}
          <div className="rounded-lg border p-4 space-y-2">
            <p className="text-sm font-medium">Include Specific Products</p>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {products.map((product) => (
                <label
                  key={product.id}
                  className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.productIds.includes(product.id)}
                    onChange={() => toggleProduct(product.id)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <div className="flex-1">
                    <span className="font-medium">
                      {product.template
                        ? getTranslation(product.template.translations, 'en')
                        : getTranslation(product.translations, 'en') || 'Standalone Product'}
                    </span>
                    <span className="text-muted-foreground text-sm ml-2">
                      {[product.year, product.theme, product.contentLanguage, !product.template && '(Standalone)']
                        .filter(Boolean)
                        .join(' / ')}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {(product.priceInCents / 100).toFixed(2)} EUR
                  </span>
                </label>
              ))}
            </div>
            {formData.productIds.length > 0 && (
              <p className="text-sm text-muted-foreground pt-2 border-t">
                {formData.productIds.length} product(s) selected &middot; Total
                value: {(totalProductPrice / 100).toFixed(2)} EUR
              </p>
            )}
          </div>
        </div>
      )}

      {/* Pricing */}
      <div className="space-y-4">
        <Label>Pricing</Label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="pricingType"
              checked={formData.pricingType === 'fixed'}
              onChange={() =>
                setFormData((prev) => ({ ...prev, pricingType: 'fixed' }))
              }
              className="h-4 w-4"
            />
            Fixed Price
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="pricingType"
              checked={formData.pricingType === 'discount'}
              onChange={() =>
                setFormData((prev) => ({ ...prev, pricingType: 'discount' }))
              }
              className="h-4 w-4"
            />
            Discount Percentage
          </label>
        </div>

        {formData.pricingType === 'fixed' ? (
          <div className="flex items-center gap-2 max-w-xs">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              placeholder="0.00"
            />
            <span className="text-muted-foreground">{formData.currency}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 max-w-xs">
            <Input
              type="number"
              min="0"
              max="100"
              value={formData.discountPercent}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  discountPercent: e.target.value,
                }))
              }
              placeholder="0"
            />
            <span className="text-muted-foreground">% off</span>
          </div>
        )}
      </div>

      {/* Etsy */}
      <div className="space-y-1.5">
        <Label htmlFor="etsyListingId">Etsy Listing ID</Label>
        <Input
          id="etsyListingId"
          value={formData.etsyListingId}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, etsyListingId: e.target.value }))
          }
          placeholder="Optional"
        />
      </div>

      {/* Published */}
      {/* Published & Featured */}
      <div className="flex flex-wrap gap-6">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isPublished"
            checked={formData.isPublished}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, isPublished: e.target.checked }))
            }
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label htmlFor="isPublished" className="font-normal">
            Published (visible in shop)
          </Label>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isFeatured"
            checked={formData.isFeatured}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, isFeatured: e.target.checked }))
            }
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label htmlFor="isFeatured" className="font-normal">
            Featured (highlighted in shop)
          </Label>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : isEditing ? 'Update Bundle' : 'Create Bundle'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/en/admin/bundles')}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
