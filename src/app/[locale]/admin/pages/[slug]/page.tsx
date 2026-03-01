'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import { HtmlEditor } from '@/components/admin/shared/HtmlEditor';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'it', label: 'Italiano' },
];

interface Translation {
  languageCode: string;
  title: string;
  metaDescription: string;
  content: string;
}

interface ContentPage {
  id: number;
  slug: string;
  pageType: string;
  isPublished: boolean;
  bannerImage: string | null;
  settings: string | null;
  translations: Translation[];
}

export default function EditContentPagePage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [page, setPage] = useState<ContentPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [isPublished, setIsPublished] = useState(true);
  const [bannerImage, setBannerImage] = useState('');
  const [translations, setTranslations] = useState<Record<string, { title: string; metaDescription: string; content: string }>>({});

  useEffect(() => {
    const initial: Record<string, { title: string; metaDescription: string; content: string }> = {};
    for (const lang of LANGUAGES) {
      initial[lang.code] = { title: '', metaDescription: '', content: '' };
    }
    setTranslations(initial);
  }, []);

  useEffect(() => {
    async function fetchPage() {
      try {
        const response = await fetch(`/api/admin/content-pages/${slug}`);
        if (response.ok) {
          const data = await response.json();
          setPage(data);
          setIsPublished(data.isPublished);
          setBannerImage(data.bannerImage || '');

          setTranslations((prev) => {
            const updated = { ...prev };
            for (const t of data.translations) {
              updated[t.languageCode] = {
                title: t.title || '',
                metaDescription: t.metaDescription || '',
                content: t.content || '',
              };
            }
            return updated;
          });
        } else {
          setError('Page not found');
        }
      } catch {
        setError('Failed to load page');
      } finally {
        setIsLoading(false);
      }
    }

    fetchPage();
  }, [slug]);

  const updateTranslation = (langCode: string, field: 'title' | 'metaDescription' | 'content', value: string) => {
    setTranslations((prev) => ({
      ...prev,
      [langCode]: {
        ...prev[langCode],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const translationsToSend = Object.entries(translations)
        .filter(([, t]) => t.title || t.content)
        .map(([langCode, t]) => ({
          languageCode: langCode,
          title: t.title,
          metaDescription: t.metaDescription,
          content: t.content,
        }));

      const response = await fetch(`/api/admin/content-pages/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isPublished,
          bannerImage: bannerImage || null,
          translations: translationsToSend,
        }),
      });

      if (response.ok) {
        router.push('/en/admin/pages');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save');
      }
    } catch {
      setError('Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const isHomePage = slug === 'home';
  const isContactPage = slug === 'contact';

  const getContactJson = (langCode: string) => {
    try {
      return JSON.parse(translations[langCode]?.content || '{}');
    } catch {
      return {};
    }
  };

  const updateContactField = (langCode: string, field: string, value: string) => {
    const current = getContactJson(langCode);
    const updated = { ...current, [field]: value };
    updateTranslation(langCode, 'content', JSON.stringify(updated, null, 2));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !page) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <Link href="/en/admin/pages">
          <Button variant="outline">Back to Pages</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/en/admin/pages">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight">Edit Page: {slug}</h2>
              {isContactPage && (
                <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-2 py-0.5 rounded">
                  Contact Form
                </span>
              )}
            </div>
            <p className="text-muted-foreground">
              {isContactPage
                ? 'Edit the text content for the contact page. The form itself is automatic.'
                : 'Update the content for this page.'}
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Page Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              id="published"
              checked={isPublished}
              onCheckedChange={setIsPublished}
            />
            <Label htmlFor="published">Published</Label>
          </div>

          {isHomePage && (
            <div className="space-y-2">
              <Label htmlFor="banner-image">Banner URL</Label>
              <Input
                id="banner-image"
                value={bannerImage}
                onChange={(e) => setBannerImage(e.target.value)}
                placeholder="/api/uploads/banners/homepage-banner.jpg"
              />
              <p className="text-xs text-muted-foreground">
                Base banner URL. Variants are auto-loaded using naming convention:<br />
                <code className="text-[10px]">-mobile</code> (mobile),{' '}
                <code className="text-[10px]">-dark</code> (dark mode),{' '}
                <code className="text-[10px]">-nl</code> (language)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="en" className="w-full">
        <TabsList className="flex-wrap">
          {LANGUAGES.map((lang) => (
            <TabsTrigger key={lang.code} value={lang.code}>
              {lang.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {LANGUAGES.map((lang) => (
          <TabsContent key={lang.code} value={lang.code} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{lang.label} Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Page Title</Label>
                  <Input
                    value={translations[lang.code]?.title || ''}
                    onChange={(e) => updateTranslation(lang.code, 'title', e.target.value)}
                    placeholder="Page title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Meta Description</Label>
                  <Input
                    value={translations[lang.code]?.metaDescription || ''}
                    onChange={(e) => updateTranslation(lang.code, 'metaDescription', e.target.value)}
                    placeholder="SEO description"
                  />
                </div>
                                {isContactPage ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Contact page uses structured fields. The contact form is handled separately.
                    </p>
                    <div className="space-y-2">
                      <Label>Heading</Label>
                      <Input
                        value={getContactJson(lang.code).heading || ''}
                        onChange={(e) => updateContactField(lang.code, 'heading', e.target.value)}
                        placeholder="Get in Touch"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Intro Text</Label>
                      <Input
                        value={getContactJson(lang.code).intro || ''}
                        onChange={(e) => updateContactField(lang.code, 'intro', e.target.value)}
                        placeholder="Have a question? We'd love to hear from you."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email Label</Label>
                      <Input
                        value={getContactJson(lang.code).email || ''}
                        onChange={(e) => updateContactField(lang.code, 'email', e.target.value)}
                        placeholder="Email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email Address</Label>
                      <Input
                        value={getContactJson(lang.code).emailAddress || ''}
                        onChange={(e) => updateContactField(lang.code, 'emailAddress', e.target.value)}
                        placeholder="support@layoutsbylenny.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Address</Label>
                      <Input
                        value={getContactJson(lang.code).address || ''}
                        onChange={(e) => updateContactField(lang.code, 'address', e.target.value)}
                        placeholder="Kuifeend 40, 9781 ZJ Bedum, Groningen, Netherlands"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Response Time Note</Label>
                      <Input
                        value={getContactJson(lang.code).responseTime || ''}
                        onChange={(e) => updateContactField(lang.code, 'responseTime', e.target.value)}
                        placeholder="We typically respond within 24-48 hours."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Etsy Section Title</Label>
                      <Input
                        value={getContactJson(lang.code).etsy || ''}
                        onChange={(e) => updateContactField(lang.code, 'etsy', e.target.value)}
                        placeholder="Prefer Etsy?"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Etsy Section Description</Label>
                      <Input
                        value={getContactJson(lang.code).etsyDescription || ''}
                        onChange={(e) => updateContactField(lang.code, 'etsyDescription', e.target.value)}
                        placeholder="You can also reach us through our Etsy shop."
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <HtmlEditor
                      value={translations[lang.code]?.content || ''}
                      onChange={(val) => updateTranslation(lang.code, 'content', val)}
                      enableHeadings
                      rows={16}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
