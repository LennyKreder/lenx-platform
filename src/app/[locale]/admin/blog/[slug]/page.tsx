'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Loader2, Save, Trash2, Upload, X } from 'lucide-react';
import Link from 'next/link';
import { HtmlEditor } from '@/components/admin/shared/HtmlEditor';
import { TagSelector } from '@/components/admin/shared/TagSelector';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'it', label: 'Italiano' },
];

interface BlogTranslation {
  languageCode: string;
  title: string;
  metaDescription: string;
  excerpt: string;
  content: string;
  featuredImage: string | null;
}

interface BlogPost {
  id: number;
  slug: string;
  writer: string;
  isPublished: boolean;
  featuredImage: string | null;
  publishedAt: string | null;
  translations: BlogTranslation[];
  tags: { tagId: number }[];
}

type TranslationState = { title: string; metaDescription: string; excerpt: string; content: string; featuredImage: string };

export default function EditBlogPostPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [post, setPost] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadingLang, setUploadingLang] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Form state
  const [writer, setWriter] = useState('lenny');
  const [isPublished, setIsPublished] = useState(false);
  const [publishedAt, setPublishedAt] = useState('');
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [translations, setTranslations] = useState<Record<string, TranslationState>>({});

  useEffect(() => {
    const initial: Record<string, TranslationState> = {};
    for (const lang of LANGUAGES) {
      initial[lang.code] = { title: '', metaDescription: '', excerpt: '', content: '', featuredImage: '' };
    }
    setTranslations(initial);
  }, []);

  useEffect(() => {
    async function fetchPost() {
      try {
        const response = await fetch(`/api/admin/blog/${slug}`);
        if (response.ok) {
          const data = await response.json();
          setPost(data);
          setWriter(data.writer || 'lenny');
          setIsPublished(data.isPublished);
          setTagIds(data.tags?.map((t: { tagId: number }) => t.tagId) || []);
          if (data.publishedAt) {
            // Convert to datetime-local format (YYYY-MM-DDTHH:mm)
            const d = new Date(data.publishedAt);
            setPublishedAt(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + 'T' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'));
          }

          setTranslations((prev) => {
            const updated = { ...prev };
            for (const t of data.translations) {
              updated[t.languageCode] = {
                title: t.title || '',
                metaDescription: t.metaDescription || '',
                excerpt: t.excerpt || '',
                content: t.content || '',
                featuredImage: t.featuredImage || '',
              };
            }
            return updated;
          });
        } else {
          setError('Post not found');
        }
      } catch {
        setError('Failed to load post');
      } finally {
        setIsLoading(false);
      }
    }

    fetchPost();
  }, [slug]);

  const updateTranslation = (langCode: string, field: keyof TranslationState, value: string) => {
    setTranslations((prev) => ({
      ...prev,
      [langCode]: {
        ...prev[langCode],
        [field]: value,
      },
    }));
  };

  const handlePublishedToggle = (checked: boolean) => {
    setIsPublished(checked);
    if (checked && !publishedAt) {
      const now = new Date();
      setPublishedAt(now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0') + 'T' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0'));
    }
  };

  const handleImageUpload = async (langCode: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLang(langCode);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('slug', slug);
      formData.append('lang', langCode);

      const response = await fetch('/api/admin/blog/image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to upload image');
      } else {
        updateTranslation(langCode, 'featuredImage', data.url);
      }
    } catch {
      setError('Failed to upload image');
    } finally {
      setUploadingLang(null);
      const ref = fileInputRefs.current[langCode];
      if (ref) ref.value = '';
    }
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
          excerpt: t.excerpt,
          content: t.content,
          featuredImage: t.featuredImage || null,
        }));

      const response = await fetch(`/api/admin/blog/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          writer,
          isPublished,
          publishedAt: publishedAt ? new Date(publishedAt).toISOString() : null,
          translations: translationsToSend,
          tagIds,
        }),
      });

      if (response.ok) {
        router.push('/en/admin/blog');
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

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post? This cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/blog/${slug}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/en/admin/blog');
      } else {
        setError('Failed to delete post');
      }
    } catch {
      setError('Failed to delete post');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !post) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <Link href="/en/admin/blog">
          <Button variant="outline">Back to Blog</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/en/admin/blog">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Edit Post: {slug}</h2>
            <p className="text-muted-foreground">
              Update the blog post content.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete
          </Button>
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
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Post Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="writer">Writer</Label>
            <Select value={writer} onValueChange={setWriter}>
              <SelectTrigger id="writer" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lenny">Lenny</SelectItem>
                <SelectItem value="rodin">Rodin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="published"
              checked={isPublished}
              onCheckedChange={handlePublishedToggle}
            />
            <Label htmlFor="published">Published</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="published-at">Publication Date</Label>
            <Input
              id="published-at"
              type="datetime-local"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {publishedAt && new Date(publishedAt) > new Date()
                ? 'This post is scheduled for future publication.'
                : 'When this post was or will be published.'}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <TagSelector selectedTagIds={tagIds} onChange={setTagIds} />
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

        {LANGUAGES.map((lang) => {
          const isUploading = uploadingLang === lang.code;
          const image = translations[lang.code]?.featuredImage || '';

          return (
            <TabsContent key={lang.code} value={lang.code} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{lang.label} Content</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Featured Image</Label>
                    {image && (
                      <div className="relative inline-block">
                        <img
                          src={image}
                          alt="Featured"
                          className="max-h-40 rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => updateTranslation(lang.code, 'featuredImage', '')}
                          className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input
                        value={image}
                        onChange={(e) => updateTranslation(lang.code, 'featuredImage', e.target.value)}
                        placeholder="https://... or upload"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRefs.current[lang.code]?.click()}
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        Upload
                      </Button>
                    </div>
                    <input
                      ref={(el) => { fileInputRefs.current[lang.code] = el; }}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={(e) => handleImageUpload(lang.code, e)}
                      className="hidden"
                      disabled={isUploading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter a URL or upload an image. Leave empty to use the English image as fallback.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={translations[lang.code]?.title || ''}
                      onChange={(e) => updateTranslation(lang.code, 'title', e.target.value)}
                      placeholder="Post title"
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
                    <Label>Excerpt</Label>
                    <HtmlEditor
                      value={translations[lang.code]?.excerpt || ''}
                      onChange={(val) => updateTranslation(lang.code, 'excerpt', val)}
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <HtmlEditor
                      value={translations[lang.code]?.content || ''}
                      onChange={(val) => updateTranslation(lang.code, 'content', val)}
                      enableHeadings
                      rows={20}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
