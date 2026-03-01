'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { generateSlug } from '@/lib/slug-utils';
import { HtmlEditor } from './HtmlEditor';

// Supported languages
export const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

export interface Translation {
  languageCode: string;
  name: string;
  slug: string;
  title?: string;
  shortDescription?: string;
  seoTitle?: string;
  seoDescription?: string;
  description?: string;
}

interface TranslationsEditorProps {
  translations: Translation[];
  onChange: (translations: Translation[]) => void;
  showName?: boolean;
  showSlug?: boolean;
  showDescription?: boolean;
  showTitle?: boolean;
  showShortDescription?: boolean;
  showSeoTitle?: boolean;
  showSeoDescription?: boolean;
  requiredLanguages?: LanguageCode[];
  availableLanguages?: LanguageCode[];
  errors?: Record<string, string>;
}

export function TranslationsEditor({
  translations,
  onChange,
  showName = true,
  showSlug = true,
  showDescription = false,
  showTitle = false,
  showShortDescription = false,
  showSeoTitle = false,
  showSeoDescription = false,
  requiredLanguages = ['en', 'nl'],
  availableLanguages,
  errors = {},
}: TranslationsEditorProps) {
  // Filter languages to show - if availableLanguages is provided, use it; otherwise show all
  const languagesToShow = availableLanguages
    ? LANGUAGES.filter((lang) => availableLanguages.includes(lang.code))
    : LANGUAGES;

  // Initialize activeTab to first available language
  const defaultTab = languagesToShow[0]?.code || requiredLanguages[0] || 'en';
  const [activeTab, setActiveTab] = useState<string>(defaultTab);

  // Update activeTab when availableLanguages changes and current tab is no longer available
  useEffect(() => {
    const isCurrentTabAvailable = languagesToShow.some((lang) => lang.code === activeTab);
    if (!isCurrentTabAvailable && languagesToShow.length > 0) {
      setActiveTab(languagesToShow[0].code);
    }
  }, [availableLanguages, activeTab, languagesToShow]);

  const getTranslation = (langCode: string): Translation => {
    return (
      translations.find((t) => t.languageCode === langCode) || {
        languageCode: langCode,
        name: '',
        slug: '',
        title: '',
        shortDescription: '',
        seoTitle: '',
        seoDescription: '',
        description: '',
      }
    );
  };

  const updateTranslation = (langCode: string, field: keyof Translation, value: string) => {
    const existing = translations.find((t) => t.languageCode === langCode);
    const updated: Translation = existing
      ? { ...existing, [field]: value }
      : { languageCode: langCode, name: '', slug: '', title: '', shortDescription: '', seoTitle: '', seoDescription: '', description: '', [field]: value };

    // Auto-generate slug from name if slug is empty or matches old auto-generated slug
    if (field === 'name' && existing) {
      const oldAutoSlug = generateSlug(existing.name);
      if (!existing.slug || existing.slug === oldAutoSlug) {
        updated.slug = generateSlug(value);
      }
    }

    const newTranslations = existing
      ? translations.map((t) => (t.languageCode === langCode ? updated : t))
      : [...translations, updated];

    onChange(newTranslations);
  };

  const isRequired = (langCode: string) => requiredLanguages.includes(langCode as LanguageCode);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="mb-4">
        {languagesToShow.map((lang) => {
          const t = getTranslation(lang.code);
          const hasContent = (showName && t.name) || (showSlug && t.slug) || (showTitle && t.title) || (showDescription && t.description);
          const isReq = isRequired(lang.code);
          const hasError = errors[`${lang.code}.name`] || errors[`${lang.code}.slug`];

          return (
            <TabsTrigger
              key={lang.code}
              value={lang.code}
              className={`relative ${hasError ? 'text-destructive' : ''}`}
            >
              <span className="mr-1">{lang.flag}</span>
              {lang.code.toUpperCase()}
              {isReq && !hasContent && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full" />
              )}
              {hasContent && !isReq && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>

      {languagesToShow.map((lang) => {
        const t = getTranslation(lang.code);
        const isReq = isRequired(lang.code);

        return (
          <TabsContent key={lang.code} value={lang.code} className="space-y-4">
            {showName && (
              <div>
                <Label htmlFor={`name-${lang.code}`}>
                  Name {isReq && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id={`name-${lang.code}`}
                  value={t.name}
                  onChange={(e) => updateTranslation(lang.code, 'name', e.target.value)}
                  placeholder={`Name in ${lang.name}`}
                  className={errors[`${lang.code}.name`] ? 'border-destructive' : ''}
                />
                {errors[`${lang.code}.name`] && (
                  <p className="text-sm text-destructive mt-1">{errors[`${lang.code}.name`]}</p>
                )}
              </div>
            )}

            {showTitle && (
              <div>
                <Label htmlFor={`title-${lang.code}`}>Title (H1)</Label>
                <Input
                  id={`title-${lang.code}`}
                  value={t.title || ''}
                  onChange={(e) => updateTranslation(lang.code, 'title', e.target.value)}
                  placeholder={`Page heading in ${lang.name}`}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Displayed as the main heading on the page.
                </p>
              </div>
            )}

            {showShortDescription && (
              <div>
                <Label htmlFor={`shortDescription-${lang.code}`}>Short Description</Label>
                <Input
                  id={`shortDescription-${lang.code}`}
                  value={t.shortDescription || ''}
                  onChange={(e) => updateTranslation(lang.code, 'shortDescription', e.target.value)}
                  placeholder={`Short description for cards in ${lang.name}`}
                  maxLength={200}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Brief description shown on cards. Max 200 characters.
                </p>
              </div>
            )}

            {showSeoTitle && (
              <div>
                <Label htmlFor={`seoTitle-${lang.code}`}>SEO Title</Label>
                <Input
                  id={`seoTitle-${lang.code}`}
                  value={t.seoTitle || ''}
                  onChange={(e) => updateTranslation(lang.code, 'seoTitle', e.target.value)}
                  placeholder={`Meta title for ${lang.name}`}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Used in browser tab and search results. Aim for 50-60 characters.
                </p>
              </div>
            )}

            {showSeoDescription && (
              <div>
                <Label htmlFor={`seoDescription-${lang.code}`}>SEO Description</Label>
                <textarea
                  id={`seoDescription-${lang.code}`}
                  value={t.seoDescription || ''}
                  onChange={(e) => updateTranslation(lang.code, 'seoDescription', e.target.value)}
                  placeholder={`Meta description for ${lang.name}`}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-md text-sm resize-y"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Used in search engine results. Aim for 150-160 characters.
                </p>
              </div>
            )}

            {showSlug && (
              <div>
                <Label htmlFor={`slug-${lang.code}`}>
                  URL Slug {isReq && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id={`slug-${lang.code}`}
                  value={t.slug}
                  onChange={(e) => updateTranslation(lang.code, 'slug', e.target.value)}
                  placeholder={`url-slug-in-${lang.code}`}
                  className={errors[`${lang.code}.slug`] ? 'border-destructive' : ''}
                />
                {errors[`${lang.code}.slug`] && (
                  <p className="text-sm text-destructive mt-1">{errors[`${lang.code}.slug`]}</p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  URL: /{lang.code}/shop/{t.slug || '...'}
                </p>
              </div>
            )}

            {showDescription && (
              <div>
                <Label htmlFor={`description-${lang.code}`}>Description (HTML)</Label>
                <HtmlEditor
                  id={`description-${lang.code}`}
                  value={t.description || ''}
                  onChange={(value) => updateTranslation(lang.code, 'description', value)}
                  placeholder={`Description in ${lang.name}`}
                  rows={6}
                />
              </div>
            )}

            {!isReq && (
              <p className="text-sm text-muted-foreground">
                Optional: Leave empty to use English as fallback.
              </p>
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
