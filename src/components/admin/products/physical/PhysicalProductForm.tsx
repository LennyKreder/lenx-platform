'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TranslationsEditor,
  type Translation,
  type LanguageCode,
} from '@/components/admin/shared/TranslationsEditor';
import { TagSelector } from '@/components/admin/shared/TagSelector';

interface SlugRoute {
  languageCode: string;
  slug: string;
}

interface ProductTranslation {
  languageCode: string;
  name: string | null;
  title?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  description: string | null;
}

interface CategoryOption {
  id: number;
  name: string;
}

interface FamilyOption {
  id: number;
  name: string;
}

interface ProductTag {
  tagId: number;
}

interface PhysicalProductFormProps {
  product?: {
    id: number;
    priceInCents: number;
    currency: string;
    isPublished: boolean;
    isFeatured: boolean;
    translations: ProductTranslation[];
    slugs: SlugRoute[];
    tags?: ProductTag[];
    sku?: string | null;
    ean?: string | null;
    compareAtPriceInCents?: number | null;
    costPriceInCents?: number | null;
    vatRate?: number;
    weightGrams?: number | null;
    hsCode?: string | null;
    countryOfOrigin?: string | null;
    categoryId?: number | null;
    familyId?: number | null;
    familyValue?: string | null;
    contentLanguage?: string | null;
  };
  categories?: CategoryOption[];
  families?: FamilyOption[];
  onSuccess?: () => void;
}

export function PhysicalProductForm({
  product,
  categories = [],
  families = [],
  onSuccess,
}: PhysicalProductFormProps) {
  const router = useRouter();
  const isEditing = !!product;

  const initialTranslations: Translation[] = product
    ? product.slugs.map((s) => {
        const trans = product.translations.find(
          (t) => t.languageCode === s.languageCode
        );
        return {
          languageCode: s.languageCode,
          name: trans?.name || '',
          slug: s.slug,
          title: trans?.title || '',
          seoTitle: trans?.seoTitle || '',
          seoDescription: trans?.seoDescription || '',
          description: trans?.description || '',
        };
      })
    : [];

  const [translations, setTranslations] = useState<Translation[]>(initialTranslations);
  const [tagIds, setTagIds] = useState<number[]>(
    product?.tags?.map(t => t.tagId) || []
  );

  const [formData, setFormData] = useState({
    priceInCents: product?.priceInCents || 0,
    currency: product?.currency || 'EUR',
    isPublished: product?.isPublished || false,
    isFeatured: product?.isFeatured || false,
  });

  const [physicalData, setPhysicalData] = useState({
    sku: product?.sku || '',
    ean: product?.ean || '',
    compareAtPriceInCents: product?.compareAtPriceInCents || 0,
    costPriceInCents: product?.costPriceInCents || 0,
    vatRate: product?.vatRate ?? 21,
    weightGrams: product?.weightGrams || null as number | null,
    hsCode: product?.hsCode || '',
    countryOfOrigin: product?.countryOfOrigin || '',
    categoryId: product?.categoryId || null as number | null,
    familyId: product?.familyId || null as number | null,
    familyValue: product?.familyValue || '',
  });

  const [priceInput, setPriceInput] = useState(
    product?.priceInCents ? String(product.priceInCents / 100) : ''
  );
  const [compareAtPriceInput, setCompareAtPriceInput] = useState(
    product?.compareAtPriceInCents ? String(product.compareAtPriceInCents / 100) : ''
  );
  const [costPriceInput, setCostPriceInput] = useState(
    product?.costPriceInCents ? String(product.costPriceInCents / 100) : ''
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [translationErrors, setTranslationErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setTranslationErrors({});

    // Validate required translations
    const errors: Record<string, string> = {};
    const enTrans = translations.find((t) => t.languageCode === 'en');
    const nlTrans = translations.find((t) => t.languageCode === 'nl');

    if (!enTrans?.slug) {
      errors['en.slug'] = 'English slug is required';
    }
    if (!nlTrans?.slug) {
      errors['nl.slug'] = 'Dutch slug is required';
    }

    if (Object.keys(errors).length > 0) {
      setTranslationErrors(errors);
      setError('Please fix the translation errors above (EN and NL slugs are required).');
      setIsLoading(false);
      return;
    }

    try {
      const url = isEditing
        ? `/api/admin/products/${product.id}`
        : '/api/admin/products';
      const method = isEditing ? 'PUT' : 'POST';

      const translationsToSend = translations.filter((t) => t.slug || t.name || t.description);

      const payload: Record<string, unknown> = {
        ...formData,
        priceInCents: Math.round((parseFloat(priceInput) || 0) * 100),
        templateId: null,
        device: null,
        orientation: null,
        etsyListingId: null,
        translations: translationsToSend,
        tagIds,
        // Physical product fields
        sku: physicalData.sku || null,
        ean: physicalData.ean || null,
        compareAtPriceInCents: Math.round((parseFloat(compareAtPriceInput) || 0) * 100) || null,
        costPriceInCents: Math.round((parseFloat(costPriceInput) || 0) * 100) || null,
        vatRate: physicalData.vatRate,
        weightGrams: physicalData.weightGrams || null,
        hsCode: physicalData.hsCode || null,
        countryOfOrigin: physicalData.countryOfOrigin || null,
        categoryId: physicalData.categoryId || null,
        familyId: physicalData.familyId || null,
        familyValue: physicalData.familyValue || null,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save product');
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/en/admin/products');
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-lg bg-destructive/10 p-4 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Product Details */}
      <div className="space-y-6 border rounded-lg p-6 bg-muted/30">
        <div>
          <h3 className="text-lg font-semibold mb-1">Product Details</h3>
          <p className="text-sm text-muted-foreground">
            Product identifiers and logistics information.
          </p>
        </div>

        {/* SKU & EAN */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="sku">SKU</Label>
            <Input
              id="sku"
              value={physicalData.sku}
              onChange={(e) => setPhysicalData((prev) => ({ ...prev, sku: e.target.value }))}
              placeholder="e.g. MC-YOGA-001"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ean">EAN / Barcode</Label>
            <Input
              id="ean"
              value={physicalData.ean}
              onChange={(e) => setPhysicalData((prev) => ({ ...prev, ean: e.target.value }))}
              placeholder="e.g. 8710000000000"
            />
          </div>
        </div>

        {/* Category */}
        {categories.length > 0 && (
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select
              value={physicalData.categoryId?.toString() || 'none'}
              onValueChange={(value) =>
                setPhysicalData((prev) => ({
                  ...prev,
                  categoryId: value === 'none' ? null : parseInt(value, 10),
                }))
              }
            >
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No category</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Product Family */}
        {families.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Product Family</Label>
              <Select
                value={physicalData.familyId?.toString() || 'none'}
                onValueChange={(value) =>
                  setPhysicalData((prev) => ({
                    ...prev,
                    familyId: value === 'none' ? null : parseInt(value, 10),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select family" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No family</SelectItem>
                  {families.map((fam) => (
                    <SelectItem key={fam.id} value={fam.id.toString()}>
                      {fam.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Groups related products (e.g. same product in different pack sizes).
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="familyValue">Family Variant</Label>
              <Input
                id="familyValue"
                value={physicalData.familyValue}
                onChange={(e) => setPhysicalData((prev) => ({ ...prev, familyValue: e.target.value }))}
                placeholder="e.g. 50-pack, Large"
                disabled={!physicalData.familyId}
              />
            </div>
          </div>
        )}

        {/* Weight & Shipping */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="weightGrams">Weight (grams)</Label>
            <Input
              id="weightGrams"
              type="number"
              min="0"
              value={physicalData.weightGrams ?? ''}
              onChange={(e) =>
                setPhysicalData((prev) => ({
                  ...prev,
                  weightGrams: e.target.value ? parseInt(e.target.value, 10) : null,
                }))
              }
              placeholder="0"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hsCode">HS Code</Label>
            <Input
              id="hsCode"
              value={physicalData.hsCode}
              onChange={(e) => setPhysicalData((prev) => ({ ...prev, hsCode: e.target.value }))}
              placeholder="e.g. 3401.11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="countryOfOrigin">Country of Origin</Label>
            <Input
              id="countryOfOrigin"
              value={physicalData.countryOfOrigin}
              onChange={(e) => setPhysicalData((prev) => ({ ...prev, countryOfOrigin: e.target.value.toUpperCase().slice(0, 2) }))}
              placeholder="NL"
              maxLength={2}
              className="w-20"
            />
          </div>
        </div>
      </div>

      {/* Translations & Slugs */}
      <div className="space-y-2">
        <Label>Translations & Slugs</Label>
        <div className="border rounded-lg p-4">
          <TranslationsEditor
            translations={translations}
            onChange={setTranslations}
            showDescription={true}
            showTitle={true}
            showSeoTitle={true}
            showSeoDescription={true}
            requiredLanguages={['en', 'nl']}
            availableLanguages={
              product?.contentLanguage
                ? [product.contentLanguage as LanguageCode]
                : undefined
            }
            errors={translationErrors}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Name, description, and slugs for EN and NL are required.
        </p>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label>Tags</Label>
        <TagSelector
          selectedTagIds={tagIds}
          onChange={setTagIds}
        />
        <p className="text-xs text-muted-foreground">
          Tags help customers filter products in the shop.
        </p>
      </div>

      {/* Pricing */}
      <div className="space-y-6 border rounded-lg p-6 bg-muted/30">
        <div>
          <h3 className="text-lg font-semibold mb-1">Pricing</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="price">Sell Price (€)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              onBlur={() =>
                setFormData((prev) => ({
                  ...prev,
                  priceInCents: Math.round((parseFloat(priceInput) || 0) * 100),
                }))
              }
              placeholder="0.00"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="compareAtPrice">Compare-at Price (€)</Label>
            <Input
              id="compareAtPrice"
              type="number"
              step="0.01"
              min="0"
              value={compareAtPriceInput}
              onChange={(e) => setCompareAtPriceInput(e.target.value)}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">
              Original price shown struck through.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="costPrice">Cost Price (€)</Label>
            <Input
              id="costPrice"
              type="number"
              step="0.01"
              min="0"
              value={costPriceInput}
              onChange={(e) => setCostPriceInput(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vatRate">VAT Rate (%)</Label>
            <Input
              id="vatRate"
              type="number"
              min="0"
              max="100"
              value={physicalData.vatRate}
              onChange={(e) =>
                setPhysicalData((prev) => ({ ...prev, vatRate: parseInt(e.target.value, 10) || 0 }))
              }
              placeholder="21"
              className="w-20"
            />
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="space-y-4">
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

      {/* Submit */}
      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : isEditing ? 'Update Product' : 'Create Product'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/en/admin/products')}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
