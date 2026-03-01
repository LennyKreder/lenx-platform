'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TranslationsEditor,
  LANGUAGES,
  type Translation,
  type LanguageCode,
} from '@/components/admin/shared/TranslationsEditor';
import { TagSelector } from '@/components/admin/shared/TagSelector';
import { themes, getThemeName } from '@/config/themes';
import { productTypes } from '@/config/product-types';
import { devices } from '@/config/devices';
import { generateSlug } from '@/lib/slug-utils';
import { replaceTemplateVariables, type TemplateVariable } from '@/lib/template-variables';

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

interface TemplateTranslation {
  languageCode: string;
  name: string;
  title?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  description?: string | null;
}

interface Template {
  id: number;
  translations: TemplateTranslation[];
  slugs: SlugRoute[];
  variables?: TemplateVariable[] | unknown;
  defaultPriceInCents?: number;
  device?: string | null;
  orientation?: string | null;
  productType?: string | null;
  isDated?: boolean;
  startYear?: number | null;
  contentLanguages?: string[];
}

interface ProductTag {
  tagId: number;
}

interface CategoryOption {
  id: number;
  name: string;
}

interface FamilyOption {
  id: number;
  name: string;
}

interface ProductFormProps {
  siteType?: string; // 'digital' | 'physical'
  product?: {
    id: number;
    templateId: number | null;
    year: number | null;
    theme: string | null;
    contentLanguage: string | null;
    productType: string | null;
    device: string | null;
    orientation: string | null;
    templateVariables?: Record<string, string> | unknown;
    priceInCents: number;
    currency: string;
    etsyListingId: string | null;
    downloadCode: string;
    isPublished: boolean;
    isFeatured: boolean;
    translations: ProductTranslation[];
    slugs: SlugRoute[];
    tags?: ProductTag[];
    // Physical product fields
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
  };
  templates: Template[];
  categories?: CategoryOption[];
  families?: FamilyOption[];
  onSuccess?: () => void;
}

// All available content languages for products
const productLanguages = [
  { id: 'en', label: 'English', labels: { en: 'English', nl: 'Engels', de: 'Englisch', fr: 'Anglais', es: 'Inglés', it: 'Inglese' } },
  { id: 'nl', label: 'Dutch', labels: { en: 'Dutch', nl: 'Nederlands', de: 'Niederländisch', fr: 'Néerlandais', es: 'Neerlandés', it: 'Olandese' } },
  { id: 'de', label: 'German', labels: { en: 'German', nl: 'Duits', de: 'Deutsch', fr: 'Allemand', es: 'Alemán', it: 'Tedesco' } },
  { id: 'fr', label: 'French', labels: { en: 'French', nl: 'Frans', de: 'Französisch', fr: 'Français', es: 'Francés', it: 'Francese' } },
  { id: 'es', label: 'Spanish', labels: { en: 'Spanish', nl: 'Spaans', de: 'Spanisch', fr: 'Espagnol', es: 'Español', it: 'Spagnolo' } },
  { id: 'it', label: 'Italian', labels: { en: 'Italian', nl: 'Italiaans', de: 'Italienisch', fr: 'Italien', es: 'Italiano', it: 'Italiano' } },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear + i);

// Helper to get translation for a specific language
function getTranslation<T extends { languageCode: string; name: string }>(
  translations: T[],
  langCode: string
): string {
  const t = translations.find((tr) => tr.languageCode === langCode);
  return t?.name || translations[0]?.name || '';
}

// Helper to get full translation object for a specific language
function getFullTranslation(
  translations: TemplateTranslation[],
  langCode: string
): TemplateTranslation | undefined {
  return translations.find((tr) => tr.languageCode === langCode) || translations[0];
}

// Helper to get slug for a specific language
function getSlug(slugs: SlugRoute[], langCode: string): string {
  const s = slugs.find((sl) => sl.languageCode === langCode);
  return s?.slug || slugs[0]?.slug || '';
}

export function ProductForm({
  siteType = 'digital',
  product,
  templates,
  categories = [],
  families = [],
  onSuccess,
}: ProductFormProps) {
  const router = useRouter();
  const isEditing = !!product;
  const isPhysical = siteType === 'physical';

  // Convert existing product data to translations format
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

  // Determine initial isDated value from product year or template
  const getInitialIsDated = () => {
    if (product) {
      return product.year !== null;
    }
    // For new products, check template's isDated setting
    const template = templates.find(t => t.id === templates[0]?.id);
    return template?.isDated ?? true;
  };

  const [isDated, setIsDated] = useState(getInitialIsDated());
  const [formData, setFormData] = useState({
    templateId: product?.templateId || (templates[0]?.id || null) as number | null,
    year: product?.year ?? (currentYear as number | null),
    theme: product?.theme || '',
    contentLanguage: product?.contentLanguage || '',
    productType: product?.productType || '',
    device: product?.device || '',
    orientation: product?.orientation || '',
    priceInCents: product?.priceInCents || 0,
    currency: product?.currency || 'EUR',
    etsyListingId: product?.etsyListingId || '',
    isPublished: product?.isPublished || false,
    isFeatured: product?.isFeatured || false,
  });

  // Physical product fields
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
  const [compareAtPriceInput, setCompareAtPriceInput] = useState(
    product?.compareAtPriceInCents ? String(product.compareAtPriceInCents / 100) : ''
  );
  const [costPriceInput, setCostPriceInput] = useState(
    product?.costPriceInCents ? String(product.costPriceInCents / 100) : ''
  );

  // Determine if this is a standalone product (no template)
  const isStandalone = isPhysical || !formData.templateId;

  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>(
    (product?.templateVariables as Record<string, string>) || {}
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [translationErrors, setTranslationErrors] = useState<Record<string, string>>({});
  const [showTranslationOverride, setShowTranslationOverride] = useState(false);
  const [priceInput, setPriceInput] = useState(
    product?.priceInCents ? String(product.priceInCents / 100) : ''
  );

  // Get selected template for auto-slug generation
  const selectedTemplate = formData.templateId
    ? templates.find((t) => t.id === formData.templateId)
    : null;

  // URL preview calculation
  const urlPreview = useMemo(() => {
    const typeConfig = formData.productType
      ? productTypes[formData.productType as keyof typeof productTypes]
      : null;
    const urlSegment = typeConfig?.urlSegment || 'planners';
    const dated = typeConfig?.dated ?? true;

    const enSlug = translations.find((t) => t.languageCode === 'en')?.slug || '{slug}';

    if (dated && isDated) {
      return `/{locale}/shop/${urlSegment}/${formData.year || '{year}'}/${enSlug}`;
    }
    if (dated && !isDated) {
      return `/{locale}/shop/${urlSegment}/undated/${enSlug}`;
    }
    return `/{locale}/shop/${urlSegment}/${enSlug}`;
  }, [formData.productType, formData.year, isDated, translations]);

  // Get available orientations based on selected device
  const availableOrientations = useMemo(() => {
    if (formData.device && devices[formData.device as keyof typeof devices]) {
      return devices[formData.device as keyof typeof devices].orientations;
    }
    return ['portrait', 'landscape'] as const;
  }, [formData.device]);

  // Initialize defaults from template when template changes
  useEffect(() => {
    if (selectedTemplate?.variables) {
      const vars = selectedTemplate.variables as TemplateVariable[];
      setTemplateVariables((prev) => {
        const updated = { ...prev };
        vars.forEach((v) => {
          if (!(v.key in updated) && v.defaultValue) {
            updated[v.key] = v.defaultValue;
          }
        });
        return updated;
      });
    }
    if (!isEditing && selectedTemplate) {
      // Set price from template
      if (selectedTemplate.defaultPriceInCents) {
        setPriceInput(String(selectedTemplate.defaultPriceInCents / 100));
      }
      // Set device from template
      if (selectedTemplate.device && !formData.device) {
        setFormData((prev) => ({ ...prev, device: selectedTemplate.device || '' }));
      }
      // Set orientation from template
      if (selectedTemplate.orientation && !formData.orientation) {
        setFormData((prev) => ({ ...prev, orientation: selectedTemplate.orientation || '' }));
      }
      // Set productType from template
      if (selectedTemplate.productType && !formData.productType) {
        setFormData((prev) => ({ ...prev, productType: selectedTemplate.productType || '' }));
      }
      // Set isDated from template
      if (selectedTemplate.isDated !== undefined) {
        setIsDated(selectedTemplate.isDated);
        if (!selectedTemplate.isDated) {
          setFormData((prev) => ({ ...prev, year: null }));
        } else if (selectedTemplate.startYear && !formData.year) {
          setFormData((prev) => ({ ...prev, year: selectedTemplate.startYear ?? null }));
        }
      }
    }
  }, [selectedTemplate, isEditing, formData.device, formData.orientation, formData.productType, formData.year]);

  // Auto-generate slugs, names, and SEO fields when variant properties change (only for new products with templates)
  // New slug format: {template-name}-{theme}-{device} (no year, no contentLanguage)
  useEffect(() => {
    if (!isEditing && selectedTemplate && formData.templateId) {
      const enTemplateSlug = getSlug(selectedTemplate.slugs, 'en');
      const builtIn = { year: formData.year, theme: formData.theme, language: formData.contentLanguage };

      // Pre-compute all translation fields for all languages before updating state
      const newEntries: Record<string, { slug: string; name: string; title: string; seoTitle: string; seoDescription: string; description: string }> = {};
      for (const lang of LANGUAGES) {
        const templateSlug = getSlug(selectedTemplate.slugs, lang.code) || enTemplateSlug;
        const templateTrans = getFullTranslation(selectedTemplate.translations, lang.code);

        // Build slug in format: {template-name}-{theme}-{device}
        // Example: minimalist-soft-rose-tablet
        const slugParts = [
          templateSlug,
          formData.theme ? generateSlug(getThemeName(formData.theme, 'en')) : '', // Use English theme name for slug
          formData.device || '',
        ].filter(Boolean);
        const newSlug = slugParts.join('-').toLowerCase().replace(/-+/g, '-').replace(/-$/, '');

        // Build product name with translated display names
        const templateName = templateTrans?.name || '';
        const baseName = templateName
          ? replaceTemplateVariables(templateName, templateVariables, builtIn)
          : '';

        // Name includes year, language, and theme for display purposes
        const langEntry = formData.contentLanguage ? productLanguages.find((l) => l.id === formData.contentLanguage) : null;
        const nameParts = [
          isDated && formData.year ? formData.year.toString() : '',
          langEntry ? (langEntry.labels[lang.code as keyof typeof langEntry.labels] || langEntry.label) : '',
          formData.theme ? getThemeName(formData.theme, lang.code) : '',
        ].filter(Boolean);
        const variantSuffix = nameParts.join(' ');

        let suggestedName = '';
        if (baseName && variantSuffix) {
          suggestedName = `${baseName} - ${variantSuffix}`;
        } else {
          suggestedName = baseName || variantSuffix;
        }

        // Include name in built-in variables for SEO fields
        const builtInWithName = { ...builtIn, name: suggestedName };

        // Replace variables in all SEO fields from template
        const title = templateTrans?.title
          ? replaceTemplateVariables(templateTrans.title, templateVariables, builtInWithName)
          : '';
        const seoTitle = templateTrans?.seoTitle
          ? replaceTemplateVariables(templateTrans.seoTitle, templateVariables, builtInWithName)
          : '';
        const seoDescription = templateTrans?.seoDescription
          ? replaceTemplateVariables(templateTrans.seoDescription, templateVariables, builtInWithName)
          : '';
        const description = templateTrans?.description
          ? replaceTemplateVariables(templateTrans.description, templateVariables, builtInWithName)
          : '';

        newEntries[lang.code] = { slug: newSlug, name: suggestedName, title, seoTitle, seoDescription, description };
      }

      setTranslations((prev) => {
        const updated = [...prev];
        for (const lang of LANGUAGES) {
          const entry = newEntries[lang.code];
          const idx = updated.findIndex((t) => t.languageCode === lang.code);
          if (idx >= 0) {
            updated[idx] = {
              ...updated[idx],
              slug: entry.slug,
              name: entry.name,
              title: entry.title,
              seoTitle: entry.seoTitle,
              seoDescription: entry.seoDescription,
              description: entry.description,
            };
          } else {
            updated.push({
              languageCode: lang.code,
              name: entry.name,
              slug: entry.slug,
              title: entry.title,
              seoTitle: entry.seoTitle,
              seoDescription: entry.seoDescription,
              description: entry.description,
            });
          }
        }
        return updated;
      });
    }
  }, [
    formData.year,
    formData.theme,
    formData.contentLanguage,
    formData.device,
    formData.templateId,
    selectedTemplate,
    templateVariables,
    isEditing,
    isDated,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setTranslationErrors({});

    // Validate required translations (en and nl must have slugs)
    // Skip for template-based products unless override is active
    if (isStandalone || showTranslationOverride) {
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
    }

    try {
      const url = isEditing
        ? `/api/admin/products/${product.id}`
        : '/api/admin/products';
      const method = isEditing ? 'PUT' : 'POST';

      // Filter translations to only include those with content
      // For template-based products, only send translations if override is active
      const translationsToSend = (isStandalone || showTranslationOverride)
        ? translations.filter((t) => t.slug || t.name || t.description)
        : undefined;

      const payload: Record<string, unknown> = {
        ...formData,
        year: isDated ? formData.year : null,
        priceInCents: Math.round((parseFloat(priceInput) || 0) * 100),
        templateId: isPhysical ? null : (formData.templateId || null),
        device: isPhysical ? null : (formData.device || null),
        orientation: isPhysical ? null : (formData.orientation || null),
        templateVariables: (!isStandalone && !isPhysical) ? templateVariables : undefined,
        translations: translationsToSend,
        tagIds: isStandalone ? tagIds : undefined,
        etsyListingId: isPhysical ? null : (formData.etsyListingId || null),
      };

      // Add physical product fields
      if (isPhysical) {
        payload.sku = physicalData.sku || null;
        payload.ean = physicalData.ean || null;
        payload.compareAtPriceInCents = Math.round((parseFloat(compareAtPriceInput) || 0) * 100) || null;
        payload.costPriceInCents = Math.round((parseFloat(costPriceInput) || 0) * 100) || null;
        payload.vatRate = physicalData.vatRate;
        payload.weightGrams = physicalData.weightGrams || null;
        payload.hsCode = physicalData.hsCode || null;
        payload.countryOfOrigin = physicalData.countryOfOrigin || null;
        payload.categoryId = physicalData.categoryId || null;
        payload.familyId = physicalData.familyId || null;
        payload.familyValue = physicalData.familyValue || null;
      }

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

      {/* Section 1: Template Selection (digital only) */}
      {!isPhysical && (
        <div className="space-y-1.5">
          <Label>Product Template</Label>
          <Select
            value={formData.templateId?.toString() || 'none'}
            onValueChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                templateId: value === 'none' ? null : parseInt(value, 10),
              }))
            }
            disabled={isEditing}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Template (Standalone Product)</SelectItem>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id.toString()}>
                  {getTranslation(template.translations, 'en')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isEditing && (
            <p className="text-xs text-muted-foreground">
              Template cannot be changed after creation.
            </p>
          )}
          {isStandalone && (
            <p className="text-xs text-muted-foreground">
              Standalone products require their own name, description, and tags.
            </p>
          )}
        </div>
      )}

      {/* Physical Product Fields */}
      {isPhysical && (
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
      )}

      {/* Section 2: Variant Properties (digital only) */}
      {!isPhysical && (
        <div className="space-y-6 border rounded-lg p-6 bg-muted/30">
          <div>
            <h3 className="text-lg font-semibold mb-1">Variant Properties</h3>
            <p className="text-sm text-muted-foreground">
              Configure the specific variant properties for this product.
            </p>
          </div>

          {/* Content Language */}
          <div className="space-y-3">
            <Label>Content Language</Label>
            <Select
              value={formData.contentLanguage || 'none'}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  contentLanguage: value === 'none' ? '' : value,
                }))
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select content language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Language-agnostic</SelectItem>
                {productLanguages.map((lang) => (
                  <SelectItem key={lang.id} value={lang.id}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {formData.contentLanguage
                ? `Only visible in the ${productLanguages.find(l => l.id === formData.contentLanguage)?.label} shop.`
                : 'Visible everywhere (language-agnostic product).'}
            </p>
          </div>

          {/* Theme Selection */}
          <div className="space-y-3">
            <Label>Theme/Color</Label>
            <Select
              value={formData.theme || 'none'}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  theme: value === 'none' ? '' : value,
                }))
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No theme</SelectItem>
                {Object.entries(themes)
                  .filter(([id]) => id !== 'premium_gold')
                  .sort(([, a], [, b]) => a.name.localeCompare(b.name))
                  .map(([id, theme]) => (
                    <SelectItem key={id} value={id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: theme.previewColor }}
                        />
                        {theme.name}
                      </span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Product Type */}
          <div className="space-y-3">
            <Label>Product Type</Label>
            <Select
              value={formData.productType || 'none'}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  productType: value === 'none' ? '' : value,
                }))
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No type</SelectItem>
                {Object.entries(productTypes).map(([id, type]) => (
                  <SelectItem key={id} value={id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Determines URL structure and whether year is required.
            </p>
          </div>

          {/* Device & Orientation */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Device</Label>
              <Select
                value={formData.device || 'none'}
                onValueChange={(value) => {
                  setFormData((prev) => ({
                    ...prev,
                    device: value === 'none' ? '' : value,
                    orientation: value !== 'none' && (devices[value as keyof typeof devices]?.orientations as readonly ('portrait' | 'landscape')[])?.includes(prev.orientation as 'portrait' | 'landscape')
                      ? prev.orientation
                      : '',
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select device" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No device</SelectItem>
                  {Object.entries(devices).map(([id, device]) => (
                    <SelectItem key={id} value={id}>
                      {device.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Orientation</Label>
              <Select
                value={formData.orientation || 'none'}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    orientation: value === 'none' ? '' : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select orientation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No orientation</SelectItem>
                  {availableOrientations.map((orient) => (
                    <SelectItem key={orient} value={orient}>
                      {orient.charAt(0).toUpperCase() + orient.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Year / Dated toggle */}
          <div className="space-y-3">
            <Label>Year</Label>
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isDated"
                  checked={isDated}
                  onCheckedChange={(checked) => {
                    setIsDated(checked as boolean);
                    if (!checked) {
                      setFormData((prev) => ({ ...prev, year: null }));
                    } else if (!formData.year) {
                      setFormData((prev) => ({ ...prev, year: currentYear }));
                    }
                  }}
                />
                <label htmlFor="isDated" className="text-sm font-medium">
                  Dated (includes year in product)
                </label>
              </div>
              {isDated && (
                <Select
                  value={formData.year?.toString() || ''}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      year: value ? parseInt(value, 10) : null,
                    }))
                  }
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {isDated
                ? 'Product will include the selected year in its name and URL.'
                : 'Product will be undated (no year in name or URL).'}
            </p>
          </div>
        </div>
      )}

      {/* Section 3: URL Preview (digital only) */}
      {!isPhysical && (
        <div className="space-y-2 border rounded-lg p-4 bg-muted/30">
          <Label>URL Preview</Label>
          <code className="block text-sm bg-background p-3 rounded border font-mono">
            {urlPreview}
          </code>
        </div>
      )}

      {/* Section 4: Template Variables (digital only) */}
      {!isPhysical && selectedTemplate && (selectedTemplate.variables as TemplateVariable[] | undefined)?.length ? (
        <div className="space-y-3">
          <Label>Template Variables</Label>
          <div className="rounded-lg border p-4 space-y-3">
            {(selectedTemplate.variables as TemplateVariable[]).map((variable) => (
              <div key={variable.key} className="space-y-1">
                <Label htmlFor={`var-${variable.key}`}>{variable.label}</Label>
                <Input
                  id={`var-${variable.key}`}
                  value={templateVariables[variable.key] || ''}
                  onChange={(e) =>
                    setTemplateVariables((prev) => ({
                      ...prev,
                      [variable.key]: e.target.value,
                    }))
                  }
                  placeholder={variable.defaultValue || `Enter ${variable.label}`}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            These values replace {'{{'}<span>variableName</span>{'}}' } placeholders in the template name and description.
          </p>
        </div>
      ) : null}

      {/* Section 5: Translations & Slugs */}
      {isStandalone ? (
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
                formData.contentLanguage
                  ? [formData.contentLanguage as LanguageCode]
                  : undefined
              }
              errors={translationErrors}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Standalone products require name and description. Slugs are required for EN and NL.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="showTranslationOverride"
              checked={showTranslationOverride}
              onChange={(e) => setShowTranslationOverride(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="showTranslationOverride" className="cursor-pointer">
              Override template content
            </Label>
          </div>
          {showTranslationOverride && (
            <>
              <div className="border rounded-lg p-4">
                <TranslationsEditor
                  translations={translations}
                  onChange={setTranslations}
                  showDescription={false}
                  showTitle={true}
                  showSeoTitle={true}
                  showSeoDescription={true}
                  requiredLanguages={['en', 'nl']}
                  availableLanguages={
                    formData.contentLanguage
                      ? [formData.contentLanguage as LanguageCode]
                      : undefined
                  }
                  errors={translationErrors}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                SEO fields auto-populate from template with {'{{name}}'}, {'{{year}}'}, {'{{theme}}'}, {'{{siteName}}'} replaced.
              </p>
            </>
          )}
        </div>
      )}

      {/* Section 6: Tags (only for standalone products) */}
      {isStandalone && (
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
      )}

      {/* Section 7: Download Code (read-only for existing, digital only) */}
      {!isPhysical && isEditing && product?.downloadCode && (
        <div className="space-y-2">
          <Label>Download Code</Label>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-muted rounded-md font-mono text-sm">
              {product.downloadCode}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard.writeText(product.downloadCode)}
            >
              Copy
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Customers use this code to access their downloads.
          </p>
        </div>
      )}

      {/* Section 8: Pricing */}
      <div className="space-y-4">
        {isPhysical ? (
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
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="price">Price (€)</Label>
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
                className="w-32"
              />
            </div>

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
          </div>
        )}
      </div>

      {/* Section 9: Status */}
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
            Published (visible in shop and library)
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
