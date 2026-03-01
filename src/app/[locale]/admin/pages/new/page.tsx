'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

export default function NewContentPagePage() {
  const router = useRouter();

  const [slug, setSlug] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [translations, setTranslations] = useState<Record<string, { title: string; metaDescription: string; content: string }>>({});

  useEffect(() => {
    const initial: Record<string, { title: string; metaDescription: string; content: string }> = {};
    for (const lang of LANGUAGES) {
      initial[lang.code] = { title: '', metaDescription: '', content: '' };
    }
    setTranslations(initial);
  }, []);

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
    if (!slug.trim()) {
      setError('Slug is required');
      return;
    }

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

      const response = await fetch('/api/admin/content-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: slug.trim().toLowerCase().replace(/\s+/g, '-'),
          isPublished,
          translations: translationsToSend,
        }),
      });

      if (response.ok) {
        router.push('/en/admin/pages');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create page');
      }
    } catch {
      setError('Failed to create page');
    } finally {
      setIsSaving(false);
    }
  };

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
            <h2 className="text-2xl font-bold tracking-tight">New Page</h2>
            <p className="text-muted-foreground">Create a new content page.</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Create Page
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
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="my-new-page"
            />
            <p className="text-xs text-muted-foreground">
              URL-safe identifier. Will be accessible at /{'{locale}'}/{slug || 'my-new-page'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="published"
              checked={isPublished}
              onCheckedChange={setIsPublished}
            />
            <Label htmlFor="published">Published</Label>
          </div>
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
                <div className="space-y-2">
                  <Label>Content</Label>
                  <HtmlEditor
                    value={translations[lang.code]?.content || ''}
                    onChange={(val) => updateTranslation(lang.code, 'content', val)}
                    enableHeadings
                    rows={16}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
