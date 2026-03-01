'use client';

import { useState, useMemo } from 'react';
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
import { TagSelector } from '@/components/admin/shared/TagSelector';
import { TranslationsEditor, type Translation, type LanguageCode } from '@/components/admin/shared/TranslationsEditor';
import { FilePropertiesSelector } from './FilePropertiesSelector';
import { TemplateVariablesEditor } from './TemplateVariablesEditor';
import { devices, type DeviceId, type Orientation } from '@/config/devices';
import { themes } from '@/config/themes';
import { productTypes } from '@/config/product-types';
import type { TemplateVariable } from '@/lib/template-variables';

interface FilePropertyConfig {
  templateSet?: boolean;
  timeFormat?: boolean;
  weekStart?: boolean;
  calendar?: boolean;
}

interface SlugRoute {
  languageCode: string;
  slug: string;
}

interface TemplateTranslation {
  languageCode: string;
  name: string;
  title?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  description?: string | null;
}

interface TemplateTag {
  tagId: number;
}

interface TemplateFormProps {
  template?: {
    id: number;
    fileProperties: FilePropertyConfig;
    variables?: TemplateVariable[] | unknown;
    defaultPriceInCents?: number;
    device: string | null;
    orientation: string | null;
    productType: string | null;
    isDated: boolean;
    startYear: number | null;
    contentLanguages: string[];
    themeSelection: string;
    selectedThemes: string[];
    sortOrder: number;
    isActive: boolean;
    translations: TemplateTranslation[];
    slugs: SlugRoute[];
    tags?: TemplateTag[];
  };
  onSuccess?: () => void;
}

const allLanguages = [
  { id: 'en', label: 'English' },
  { id: 'nl', label: 'Dutch' },
  { id: 'de', label: 'German' },
  { id: 'fr', label: 'French' },
  { id: 'es', label: 'Spanish' },
  { id: 'it', label: 'Italian' },
];

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear + i);

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

export function TemplateForm({ template, onSuccess }: TemplateFormProps) {
  const router = useRouter();
  const isEditing = !!template;

  // Get initial values from template (name and slug are universal)
  const initialName = template?.translations?.[0]?.name || '';
  const initialSlug = template?.slugs?.[0]?.slug || '';

  // Build initial translations array for per-language fields (title, seoTitle, seoDescription, description)
  const initialTranslations: Translation[] = template?.translations?.map((t) => ({
    languageCode: t.languageCode,
    name: '', // Not used in tabs
    slug: '', // Not used in tabs
    title: t.title || '',
    seoTitle: t.seoTitle || '',
    seoDescription: t.seoDescription || '',
    description: t.description || '',
  })) || [];

  // Basic form state - single name/slug, per-language SEO/descriptions
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [translations, setTranslations] = useState<Translation[]>(initialTranslations);
  const [tagIds, setTagIds] = useState<number[]>(
    template?.tags?.map(t => t.tagId) || []
  );
  const [fileProperties, setFileProperties] = useState<FilePropertyConfig>(
    (template?.fileProperties as FilePropertyConfig) || {
      templateSet: true,
      timeFormat: true,
      weekStart: true,
      calendar: true,
    }
  );
  const [variables, setVariables] = useState<TemplateVariable[]>(
    (template?.variables as TemplateVariable[]) || []
  );
  const [defaultPrice, setDefaultPrice] = useState(
    template?.defaultPriceInCents ? String(template.defaultPriceInCents / 100) : ''
  );
  const [device, setDevice] = useState<string>(template?.device || 'ipad');
  const [orientation, setOrientation] = useState<string>(template?.orientation || 'portrait');
  const [sortOrder, setSortOrder] = useState(template?.sortOrder || 0);
  const [isActive, setIsActive] = useState(template?.isActive ?? true);

  // Variant generation state
  const [productType, setProductType] = useState<string>(template?.productType || 'planner');
  const [isDated, setIsDated] = useState(template?.isDated ?? true);
  const [startYear, setStartYear] = useState<number>(template?.startYear || currentYear);
  const [contentLanguages, setContentLanguages] = useState<string[]>(
    template?.contentLanguages || ['en', 'nl']
  );
  const [themeSelection, setThemeSelection] = useState<string>(template?.themeSelection || 'all');
  const [selectedThemes, setSelectedThemes] = useState<string[]>(
    template?.selectedThemes || []
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // URL preview
  const urlPreview = useMemo(() => {
    const typeConfig = productTypes[productType as keyof typeof productTypes];
    const urlSegment = typeConfig?.urlSegment || 'planners';
    const dated = typeConfig?.dated ?? true;

    const slugPreview = slug || generateSlug(name) || '{slug}';
    const themePreview = '{theme}';
    const devicePreview = device || '{device}';
    const fullSlug = `${slugPreview}-${themePreview}-${devicePreview}`;

    if (dated && isDated) {
      return `/{locale}/shop/${urlSegment}/{year}/${fullSlug}`;
    }
    if (dated && !isDated) {
      return `/{locale}/shop/${urlSegment}/undated/${fullSlug}`;
    }
    return `/{locale}/shop/${urlSegment}/${fullSlug}`;
  }, [productType, slug, name, device, isDated]);

  const handleLanguageToggle = (langId: string, checked: boolean) => {
    if (checked) {
      setContentLanguages([...contentLanguages, langId]);
    } else {
      setContentLanguages(contentLanguages.filter(l => l !== langId));
    }
  };

  const handleThemeToggle = (themeId: string, checked: boolean) => {
    if (checked) {
      setSelectedThemes([...selectedThemes, themeId]);
    } else {
      setSelectedThemes(selectedThemes.filter(t => t !== themeId));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setValidationErrors({});

    // Validate required fields
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors['name'] = 'Name is required';
    }
    if (!slug.trim()) {
      errors['slug'] = 'Slug is required';
    }

    // Validate specific themes if selected
    if (themeSelection === 'specific' && selectedThemes.length === 0) {
      errors['selectedThemes'] = 'At least one theme must be selected';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setIsLoading(false);
      return;
    }

    // Build translations array for API (same name/slug for all, per-language SEO/descriptions)
    // We need at least EN and NL for routing
    const languagesToInclude = contentLanguages.length > 0 ? contentLanguages : ['en', 'nl'];
    // Always include EN and NL even if not in contentLanguages (for routing)
    const allLangs = [...new Set([...languagesToInclude, 'en', 'nl'])];

    const translationsForApi = allLangs.map((lang) => {
      const t = translations.find((tr) => tr.languageCode === lang);
      return {
        languageCode: lang,
        name: name.trim(),
        slug: slug.trim(),
        title: t?.title || '',
        seoTitle: t?.seoTitle || '',
        seoDescription: t?.seoDescription || '',
        description: t?.description || '',
      };
    });

    try {
      const url = isEditing
        ? `/api/admin/templates/${template.id}`
        : '/api/admin/templates';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          translations: translationsForApi,
          tagIds,
          fileProperties,
          variables: variables.filter(v => v.key && v.label),
          defaultPriceInCents: Math.round((parseFloat(defaultPrice) || 0) * 100),
          device,
          orientation,
          productType,
          isDated,
          startYear: isDated ? startYear : null,
          contentLanguages,
          themeSelection,
          selectedThemes: themeSelection === 'specific' ? selectedThemes : [],
          sortOrder,
          isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save template');
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/en/admin/templates');
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Get theme list excluding premium_gold
  const availableThemes = Object.entries(themes).filter(([id]) => id !== 'premium_gold');

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-lg bg-destructive/10 p-4 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Section 1: Variant Generation Settings */}
      <div className="space-y-6 border rounded-lg p-6 bg-muted/30">
        <div>
          <h3 className="text-lg font-semibold mb-1">Variant Generation Settings</h3>
          <p className="text-sm text-muted-foreground">
            Configure which product variants will be generated from this template.
          </p>
        </div>

        {/* Product Languages */}
        <div className="space-y-3">
          <Label>Product Languages</Label>
          <div className="flex gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="lang-all"
                name="languageSelection"
                checked={contentLanguages.length === 0}
                onChange={() => setContentLanguages([])}
                className="h-4 w-4"
              />
              <label htmlFor="lang-all" className="text-sm font-medium">
                Visible everywhere
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="lang-specific"
                name="languageSelection"
                checked={contentLanguages.length > 0}
                onChange={() => setContentLanguages(['en', 'nl'])}
                className="h-4 w-4"
              />
              <label htmlFor="lang-specific" className="text-sm font-medium">
                Specific languages
              </label>
            </div>
          </div>

          {contentLanguages.length > 0 && (
            <div className="flex flex-wrap gap-4 mt-3 p-4 border rounded-lg bg-background">
              {allLanguages.map((lang) => (
                <div key={lang.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`lang-${lang.id}`}
                    checked={contentLanguages.includes(lang.id)}
                    onCheckedChange={(checked) => handleLanguageToggle(lang.id, checked as boolean)}
                  />
                  <label
                    htmlFor={`lang-${lang.id}`}
                    className="text-sm leading-none"
                  >
                    {lang.label}
                  </label>
                </div>
              ))}
            </div>
          )}
          {validationErrors['contentLanguages'] && (
            <p className="text-sm text-destructive">{validationErrors['contentLanguages']}</p>
          )}
        </div>

        {/* Theme Selection */}
        <div className="space-y-3">
          <Label>Themes</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="theme-all"
                name="themeSelection"
                value="all"
                checked={themeSelection === 'all'}
                onChange={() => setThemeSelection('all')}
                className="h-4 w-4"
              />
              <label htmlFor="theme-all" className="text-sm font-medium">
                All themes
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="theme-tablet"
                name="themeSelection"
                value="tablet"
                checked={themeSelection === 'tablet'}
                onChange={() => setThemeSelection('tablet')}
                className="h-4 w-4"
              />
              <label htmlFor="theme-tablet" className="text-sm font-medium">
                Tablet themes
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="theme-e-ink"
                name="themeSelection"
                value="e_ink"
                checked={themeSelection === 'e_ink'}
                onChange={() => setThemeSelection('e_ink')}
                className="h-4 w-4"
              />
              <label htmlFor="theme-e-ink" className="text-sm font-medium">
                E-ink themes
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="theme-filofax"
                name="themeSelection"
                value="filofax"
                checked={themeSelection === 'filofax'}
                onChange={() => setThemeSelection('filofax')}
                className="h-4 w-4"
              />
              <label htmlFor="theme-filofax" className="text-sm font-medium">
                Filofax themes
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="theme-specific"
                name="themeSelection"
                value="specific"
                checked={themeSelection === 'specific'}
                onChange={() => setThemeSelection('specific')}
                className="h-4 w-4"
              />
              <label htmlFor="theme-specific" className="text-sm font-medium">
                Specific themes
              </label>
            </div>
          </div>

          {themeSelection === 'specific' && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-3 p-4 border rounded-lg bg-background">
              {availableThemes.map(([id, theme]) => (
                <div key={id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`theme-${id}`}
                    checked={selectedThemes.includes(id)}
                    onCheckedChange={(checked) => handleThemeToggle(id, checked as boolean)}
                  />
                  <label
                    htmlFor={`theme-${id}`}
                    className="text-sm leading-none flex items-center gap-2"
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: theme.previewColor }}
                    />
                    {theme.name}
                  </label>
                </div>
              ))}
            </div>
          )}
          {validationErrors['selectedThemes'] && (
            <p className="text-sm text-destructive">{validationErrors['selectedThemes']}</p>
          )}
        </div>

        {/* Product Type */}
        <div className="space-y-1.5">
          <Label>Product Type</Label>
          <Select
            value={productType}
            onValueChange={(value) => {
              setProductType(value);
              const typeConfig = productTypes[value as keyof typeof productTypes];
              setIsDated(typeConfig?.dated ?? true);
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
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
              value={device}
              onValueChange={(value) => {
                const selectedDevice = devices[value as DeviceId];
                setDevice(value);
                if (selectedDevice && !(selectedDevice.orientations as readonly Orientation[]).includes(orientation as Orientation)) {
                  setOrientation(selectedDevice.orientations[0]);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select device" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(devices).map(([id, d]) => (
                  <SelectItem key={id} value={id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Orientation</Label>
            <Select
              value={orientation}
              onValueChange={setOrientation}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select orientation" />
              </SelectTrigger>
              <SelectContent>
                {(devices[device as DeviceId]?.orientations || ['portrait', 'landscape']).map((orient) => (
                  <SelectItem key={orient} value={orient}>
                    {orient.charAt(0).toUpperCase() + orient.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Year / Dated toggle - only show for dated product types */}
        {productTypes[productType as keyof typeof productTypes]?.dated && (
          <div className="space-y-3">
            <Label>Year</Label>
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isDated"
                  checked={isDated}
                  onCheckedChange={(checked) => setIsDated(checked as boolean)}
                />
                <label htmlFor="isDated" className="text-sm font-medium">
                  Dated (includes year in product)
                </label>
              </div>
              {isDated && (
                <Select
                  value={String(startYear)}
                  onValueChange={(value) => setStartYear(parseInt(value, 10))}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={String(year)}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {isDated
                ? 'Products will include the selected year in their name and URL.'
                : 'Products will be undated (no year in name or URL).'}
            </p>
          </div>
        )}
      </div>

      {/* Section 2: URL Preview */}
      <div className="space-y-2 border rounded-lg p-4 bg-muted/30">
        <Label>URL Preview</Label>
        <code className="block text-sm bg-background p-3 rounded border font-mono">
          {urlPreview}
        </code>
        <p className="text-xs text-muted-foreground">
          Product slugs will be generated as: {`{template-slug}-{theme}-{device}`}
        </p>
      </div>

      {/* Section 3: Name & Slug */}
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
            placeholder="Template name"
            className={validationErrors['name'] ? 'border-destructive' : ''}
          />
          {validationErrors['name'] && (
            <p className="text-sm text-destructive">{validationErrors['name']}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="slug">URL Slug <span className="text-destructive">*</span></Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="url-slug"
            className={validationErrors['slug'] ? 'border-destructive' : ''}
          />
          {validationErrors['slug'] && (
            <p className="text-sm text-destructive">{validationErrors['slug']}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Same slug is used for all language versions of products.
          </p>
        </div>
      </div>

      {/* Section 4: Per-language SEO & Descriptions */}
      <div className="space-y-2">
        <Label>Per-Language Content</Label>
        <div className="border rounded-lg p-4">
          <TranslationsEditor
            translations={translations}
            onChange={setTranslations}
            showName={false}
            showSlug={false}
            showTitle={true}
            showSeoTitle={true}
            showSeoDescription={true}
            showDescription={true}
            requiredLanguages={[]}
            availableLanguages={
              contentLanguages.length > 0
                ? (contentLanguages as LanguageCode[])
                : (['en', 'nl'] as LanguageCode[])
            }
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Title (H1), SEO fields, and descriptions are per-language. Use {'{{name}}'}, {'{{year}}'}, {'{{theme}}'}, {'{{siteName}}'} or custom variables.
        </p>
      </div>

      {/* Section 4: Tags */}
      <div className="space-y-2">
        <Label>Tags</Label>
        <TagSelector
          selectedTagIds={tagIds}
          onChange={setTagIds}
        />
        <p className="text-xs text-muted-foreground">
          Tags help customers filter products in the shop. All products using this template will inherit these tags.
        </p>
      </div>

      {/* Section 5: Template Variables */}
      <TemplateVariablesEditor
        variables={variables}
        onChange={setVariables}
      />

      {/* Section 6: File Properties */}
      <FilePropertiesSelector
        value={fileProperties}
        onChange={setFileProperties}
      />

      {/* Section 7: Default Price */}
      <div className="space-y-1.5">
        <Label htmlFor="defaultPrice">Default Price (€)</Label>
        <Input
          id="defaultPrice"
          type="number"
          step="0.01"
          min={0}
          value={defaultPrice}
          onChange={(e) => setDefaultPrice(e.target.value)}
          placeholder="0.00"
          className="w-32"
        />
        <p className="text-xs text-muted-foreground">
          Suggested price for new products created from this template.
        </p>
      </div>

      {/* Section 8: Sort Order & Active */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="sortOrder">Sort Order</Label>
          <Input
            id="sortOrder"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
            min={0}
            className="w-32"
          />
        </div>

        <div className="flex items-center gap-3">
          <Checkbox
            id="isActive"
            checked={isActive}
            onCheckedChange={(checked) => setIsActive(checked as boolean)}
          />
          <Label htmlFor="isActive" className="font-normal">
            Active (can be used for new products)
          </Label>
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading
            ? 'Saving...'
            : isEditing
            ? 'Update Template'
            : 'Create Template'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/en/admin/templates')}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
