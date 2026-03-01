'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Save, Plus, Trash2, GripVertical, ChevronDown, ChevronRight } from 'lucide-react';
import { locales } from '@/lib/i18n';

const LOCALE_NAMES: Record<string, string> = {
  en: 'English',
  nl: 'Dutch',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  it: 'Italian',
};

interface MenuItem {
  label: string;
  labels?: Record<string, string>;
  href: string;
  external?: boolean;
  active?: boolean;
}

interface MenuConfig {
  header: MenuItem[];
  footer: MenuItem[];
}

export default function MenusAdminPage() {
  const [menus, setMenus] = useState<MenuConfig>({ header: [], footer: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [draggedItem, setDraggedItem] = useState<{ section: 'header' | 'footer'; index: number } | null>(null);

  const handleDragStart = (section: 'header' | 'footer', index: number) => {
    setDraggedItem({ section, index });
  };

  const handleDragOver = (e: React.DragEvent, section: 'header' | 'footer', index: number) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.section !== section || draggedItem.index === index) return;

    setMenus((prev) => {
      const items = [...prev[section]];
      const [removed] = items.splice(draggedItem.index, 1);
      items.splice(index, 0, removed);
      return { ...prev, [section]: items };
    });

    // Update expanded items keys to follow the moved item
    setExpandedItems((prev) => {
      const next = new Set<string>();
      for (const key of prev) {
        const [keySection, keyIndex] = key.split('-');
        if (keySection === section) {
          const idx = parseInt(keyIndex, 10);
          if (idx === draggedItem.index) {
            next.add(`${section}-${index}`);
          } else if (draggedItem.index < index) {
            next.add(idx > draggedItem.index && idx <= index ? `${section}-${idx - 1}` : key);
          } else {
            next.add(idx >= index && idx < draggedItem.index ? `${section}-${idx + 1}` : key);
          }
        } else {
          next.add(key);
        }
      }
      return next;
    });

    setDraggedItem({ section, index });
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const toggleExpanded = (key: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  useEffect(() => {
    async function fetchMenus() {
      try {
        const response = await fetch('/api/admin/menus');
        if (response.ok) {
          const data = await response.json();
          setMenus(data);
        }
      } catch {
        setError('Failed to load menus');
      } finally {
        setIsLoading(false);
      }
    }
    fetchMenus();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/admin/menus', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(menus),
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError('Failed to save menus');
      }
    } catch {
      setError('Failed to save menus');
    } finally {
      setIsSaving(false);
    }
  };

  const addItem = (section: 'header' | 'footer') => {
    setMenus((prev) => ({
      ...prev,
      [section]: [...prev[section], { label: '', labels: {}, href: '', active: true }],
    }));
  };

  const removeItem = (section: 'header' | 'footer', index: number) => {
    setMenus((prev) => ({
      ...prev,
      [section]: prev[section].filter((_, i) => i !== index),
    }));
  };

  const updateItem = (section: 'header' | 'footer', index: number, field: keyof MenuItem, value: string | boolean) => {
    setMenus((prev) => ({
      ...prev,
      [section]: prev[section].map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const updateLabel = (section: 'header' | 'footer', index: number, locale: string, value: string) => {
    setMenus((prev) => ({
      ...prev,
      [section]: prev[section].map((item, i) =>
        i === index
          ? { ...item, labels: { ...item.labels, [locale]: value } }
          : item
      ),
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Menu Management</h2>
          <p className="text-muted-foreground">
            Configure the navigation links in the header and footer.
          </p>
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
              Save Menus
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg">
          Menus saved successfully.
        </div>
      )}

      <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
        <p><strong>Tip:</strong> Use relative paths like <code>/shop</code> or <code>/blog</code> for internal links. The locale prefix (e.g., /en) is added automatically. Use full URLs for external links and enable the &quot;External&quot; toggle.</p>
      </div>

      {/* Header Menu */}
      <Card>
        <CardHeader>
          <CardTitle>Header Navigation</CardTitle>
          <CardDescription>
            Links shown in the top navigation bar (desktop).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {menus.header.map((item, index) => {
            const itemKey = `header-${index}`;
            const isExpanded = expandedItems.has(itemKey);
            return (
              <div
                key={index}
                draggable
                onDragStart={() => handleDragStart('header', index)}
                onDragOver={(e) => handleDragOver(e, 'header', index)}
                onDragEnd={handleDragEnd}
                className={`rounded-lg border bg-muted/20 overflow-hidden ${
                  draggedItem?.section === 'header' && draggedItem.index === index ? 'opacity-50 border-primary' : ''
                }`}
              >
                <div className="flex items-center gap-3 p-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 cursor-grab active:cursor-grabbing" />
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Label (English)</Label>
                      <Input
                        value={item.label}
                        onChange={(e) => updateItem('header', index, 'label', e.target.value)}
                        placeholder="Link label"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">URL</Label>
                      <Input
                        value={item.href}
                        onChange={(e) => updateItem('header', index, 'href', e.target.value)}
                        placeholder="/shop or https://..."
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={item.active !== false}
                      onCheckedChange={(checked) => updateItem('header', index, 'active', checked)}
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Active</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={item.external || false}
                      onCheckedChange={(checked) => updateItem('header', index, 'external', checked)}
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">External</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleExpanded(itemKey)}
                    className="shrink-0"
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem('header', index)}
                    className="shrink-0"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                {isExpanded && (
                  <div className="px-3 pb-3 pt-0 border-t bg-muted/10">
                    <p className="text-xs text-muted-foreground mb-2 mt-2">Translations (leave empty to use English)</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                      {locales.filter(l => l !== 'en').map((locale) => (
                        <div key={locale}>
                          <Label className="text-xs">{LOCALE_NAMES[locale]}</Label>
                          <Input
                            value={item.labels?.[locale] || ''}
                            onChange={(e) => updateLabel('header', index, locale, e.target.value)}
                            placeholder={item.label || locale.toUpperCase()}
                            className="h-8 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <Button variant="outline" size="sm" onClick={() => addItem('header')}>
            <Plus className="h-4 w-4" />
            Add Header Link
          </Button>
        </CardContent>
      </Card>

      {/* Footer Menu */}
      <Card>
        <CardHeader>
          <CardTitle>Footer Navigation</CardTitle>
          <CardDescription>
            Links shown in the footer section.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {menus.footer.map((item, index) => {
            const itemKey = `footer-${index}`;
            const isExpanded = expandedItems.has(itemKey);
            return (
              <div
                key={index}
                draggable
                onDragStart={() => handleDragStart('footer', index)}
                onDragOver={(e) => handleDragOver(e, 'footer', index)}
                onDragEnd={handleDragEnd}
                className={`rounded-lg border bg-muted/20 overflow-hidden ${
                  draggedItem?.section === 'footer' && draggedItem.index === index ? 'opacity-50 border-primary' : ''
                }`}
              >
                <div className="flex items-center gap-3 p-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 cursor-grab active:cursor-grabbing" />
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Label (English)</Label>
                      <Input
                        value={item.label}
                        onChange={(e) => updateItem('footer', index, 'label', e.target.value)}
                        placeholder="Link label"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">URL</Label>
                      <Input
                        value={item.href}
                        onChange={(e) => updateItem('footer', index, 'href', e.target.value)}
                        placeholder="/about or https://..."
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={item.active !== false}
                      onCheckedChange={(checked) => updateItem('footer', index, 'active', checked)}
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Active</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={item.external || false}
                      onCheckedChange={(checked) => updateItem('footer', index, 'external', checked)}
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">External</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleExpanded(itemKey)}
                    className="shrink-0"
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem('footer', index)}
                    className="shrink-0"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                {isExpanded && (
                  <div className="px-3 pb-3 pt-0 border-t bg-muted/10">
                    <p className="text-xs text-muted-foreground mb-2 mt-2">Translations (leave empty to use English)</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                      {locales.filter(l => l !== 'en').map((locale) => (
                        <div key={locale}>
                          <Label className="text-xs">{LOCALE_NAMES[locale]}</Label>
                          <Input
                            value={item.labels?.[locale] || ''}
                            onChange={(e) => updateLabel('footer', index, locale, e.target.value)}
                            placeholder={item.label || locale.toUpperCase()}
                            className="h-8 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <Button variant="outline" size="sm" onClick={() => addItem('footer')}>
            <Plus className="h-4 w-4" />
            Add Footer Link
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
