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

interface DigitalProductFormProps {
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
  };
  templates: Template[];
  onSuccess?: () => void;
}

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

function getTranslation<T extends { languageCode: string; name: string }>(
  translations: T[],
  langCode: string
): string {
  const t = translations.find((tr) => tr.languageCode === langCode);
  return t?.name || translations[0]?.name || '';
}

function getFullTranslation(
  translations: TemplateTranslation[],
  langCode: string
): TemplateTranslation | undefined {
  return translations.find((tr) => tr.languageCode === langCode) || translations[0];
}

function getSlug(slugs: SlugRoute[], langCode: string): string {
  const s = slugs.find((sl) => sl.languageCode === langCode);
  return s?.slug || slugs[0]?.slug || '';
}

export function DigitalProductForm({
  product,
  templates,
  onSuccess,
}: DigitalProductFormProps) {
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

  const getInitialIsDated = () => {
    if (product) {
      return product.year !== null;
    }
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

  const isStandalone = !formData.templateId;

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

  const selectedTemplate = formData.templateId
    ? templates.find((t) => t.id === formData.templateId)
    : null;

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
      if (selectedTemplate.defaultPriceInCents) {
        setPriceInput(String(selectedTemplate.defaultPriceInCents / 100));
      }
      if (selectedTemplate.device && !formData.device) {
        setFormData((prev) => ({ ...prev, device: selectedTemplate.device || '' }));
      }
      if (selectedTemplate.orientation && !formData.orientation) {
        setFormData((prev) => ({ ...prev, orientation: selectedTemplate.orientation || '' }));
      }
      if (selectedTemplate.productType && !formData.productType) {
        setFormData((prev) => ({ ...prev, productType: selectedTemplate.productType || '' }));
      }
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

  // Auto-generate slugs, names, and SEO fields when variant properties change
  useEffect(() => {
    if (!isEditing && selectedTemplate && formData.templateId) {
      const enTemplateSlug = getSlug(selectedTemplate.slugs, 'en');
      const builtIn = { year: formData.year, theme: formData.theme, language: formData.contentLanguage };

      const newEntries: Record<string, { slug: string; name: string; title: string; seoTitle: string; seoDescription: string; description: string }> = {};
      for (const lang of LANGUAGES) {
        const templateSlug = getSlug(selectedTemplate.slugs, lang.code) || enTemplateSlug;
        const templateTrans = getFullTranslation(selectedTemplate.translations, lang.code);

        const slugParts = [
          templateSlug,
          formData.theme ? generateSlug(getThemeName(formData.theme, 'en')) : '',
          formData.device || '',
        ].filter(Boolean);
        const newSlug = slugParts.join('-').toLowerCase().replace(/-+/g, '-').replace(/-$/, '');

        const templateName = templateTrans?.name || '';
        const baseName = templateName
          ? replaceTemplateVariables(templateName, templateVariables, builtIn)
          : '';

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

        const builtInWithName = { ...builtIn, name: suggestedName };

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

      const translationsToSend = (isStandalone || showTranslationOverride)
        ? translations.filter((t) => t.slug || t.name || t.description)
        : undefined;

      const payload: Record<string, unknown> = {
        ...formData,
        year: isDated ? formData.year : null,
        priceInCents: Math.round((parseFloat(priceInput) || 0) * 100),
        templateId: formData.templateId || null,
        device: formData.device || null,
        orientation: formData.orientation || null,
        templateVariables: !isStandalone ? templateVariables : undefined,
        translations: translationsToSend,
        tagIds: isStandalone ? tagIds : undefined,
        etsyListingId: formData.etsyListingId || null,
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

      {/* Template Selection */}
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

      {/* Variant Properties */}
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

      {/* URL Preview */}
      <div className="space-y-2 border rounded-lg p-4 bg-muted/30">
        <Label>URL Preview</Label>
        <code className="block text-sm bg-background p-3 rounded border font-mono">
          {urlPreview}
        </code>
      </div>

      {/* Template Variables */}
      {selectedTemplate && (selectedTemplate.variables as TemplateVariable[] | undefined)?.length ? (
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

      {/* Translations & Slugs */}
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

      {/* Tags (standalone only) */}
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

      {/* Download Code (read-only for existing) */}
      {isEditing && product?.downloadCode && (
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

      {/* Pricing */}
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
