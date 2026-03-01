'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { generateSlug } from '@/lib/slug-utils';

interface TagTranslation {
  languageCode: string;
  name: string;
}

interface SlugRoute {
  languageCode: string;
  slug: string;
}

interface Tag {
  id: number;
  translations: TagTranslation[];
  slugs: SlugRoute[];
  _count?: { products: number };
}

interface TranslationInput {
  languageCode: string;
  name: string;
  slug: string;
}

// Helper functions
function getTranslation(translations: TagTranslation[], langCode: string): string {
  return translations.find(t => t.languageCode === langCode)?.name || '';
}

function getSlug(slugs: SlugRoute[], langCode: string): string {
  return slugs.find(s => s.languageCode === langCode)?.slug || '';
}

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const [formData, setFormData] = useState({
    nameEn: '',
    nameNl: '',
    slugEn: '',
    slugNl: '',
  });

  const fetchTags = async () => {
    const response = await fetch('/api/admin/tags');
    if (response.ok) {
      const data = await response.json();
      setTags(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const resetForm = () => {
    setFormData({ nameEn: '', nameNl: '', slugEn: '', slugNl: '' });
    setEditingId(null);
    setIsAdding(false);
  };

  const handleSave = async () => {
    const translations: TranslationInput[] = [];

    if (formData.nameEn) {
      translations.push({
        languageCode: 'en',
        name: formData.nameEn,
        slug: formData.slugEn || generateSlug(formData.nameEn),
      });
    }

    if (formData.nameNl) {
      translations.push({
        languageCode: 'nl',
        name: formData.nameNl,
        slug: formData.slugNl || generateSlug(formData.nameNl),
      });
    }

    if (translations.length === 0) {
      alert('At least one translation is required');
      return;
    }

    const url = editingId
      ? `/api/admin/tags/${editingId}`
      : '/api/admin/tags';
    const method = editingId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ translations }),
    });

    if (response.ok) {
      await fetchTags();
      resetForm();
    } else {
      const data = await response.json();
      alert(data.error || 'Failed to save tag');
    }
  };

  const handleEdit = (tag: Tag) => {
    setEditingId(tag.id);
    setFormData({
      nameEn: getTranslation(tag.translations, 'en'),
      nameNl: getTranslation(tag.translations, 'nl'),
      slugEn: getSlug(tag.slugs, 'en'),
      slugNl: getSlug(tag.slugs, 'nl'),
    });
    setIsAdding(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this tag?')) return;

    const response = await fetch(`/api/admin/tags/${id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      setTags((prev) => prev.filter((t) => t.id !== id));
    } else {
      const data = await response.json();
      alert(data.error || 'Failed to delete tag');
    }
  };

  const startAdding = () => {
    resetForm();
    setIsAdding(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tags</h2>
          <p className="text-muted-foreground">
            Manage tags for filtering products in the shop.
          </p>
        </div>
        <Button onClick={startAdding} disabled={isAdding}>
          <Plus className="h-4 w-4" />
          New Tag
        </Button>
      </div>

      <div className="rounded-lg border">
        <div className="grid grid-cols-[1fr,150px,100px,80px] gap-4 p-3 border-b bg-muted/50 text-sm font-medium">
          <div>Name</div>
          <div>Slug</div>
          <div className="text-center">Products</div>
          <div></div>
        </div>

        {/* Add new tag row */}
        {isAdding && (
          <div className="grid grid-cols-[1fr,150px,100px,80px] gap-4 p-3 border-b bg-muted/20">
            <Input
              value={formData.nameEn}
              onChange={(e) => {
                const name = e.target.value;
                setFormData((prev) => ({
                  ...prev,
                  nameEn: name,
                  slugEn: prev.slugEn || generateSlug(name),
                }));
              }}
              placeholder="Tag name"
              autoFocus
            />
            <Input
              value={formData.slugEn}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, slugEn: e.target.value }))
              }
              placeholder="slug"
              className="font-mono text-xs"
            />
            <div></div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" onClick={handleSave}>
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Existing tags */}
        {tags.length === 0 && !isAdding ? (
          <div className="p-8 text-center text-muted-foreground">
            No tags yet. Click &quot;New Tag&quot; to create one.
          </div>
        ) : (
          tags.map((tag) => (
            <div
              key={tag.id}
              className="grid grid-cols-[1fr,150px,100px,80px] gap-4 p-3 border-b last:border-0"
            >
              {editingId === tag.id ? (
                <>
                  <Input
                    value={formData.nameEn}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, nameEn: e.target.value }))
                    }
                    autoFocus
                  />
                  <Input
                    value={formData.slugEn}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, slugEn: e.target.value }))
                    }
                    className="font-mono text-xs"
                  />
                  <div></div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={handleSave}>
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={resetForm}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="font-medium">{getTranslation(tag.translations, 'en') || '-'}</div>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {getSlug(tag.slugs, 'en') || '-'}
                  </code>
                  <div className="text-center text-muted-foreground">
                    {tag._count?.products ?? 0}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleEdit(tag)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(tag.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
