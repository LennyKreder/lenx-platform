'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, ChevronUp, ChevronDown, Globe, ExternalLink } from 'lucide-react';

export interface MenuItemData {
  label: string;
  labels?: Record<string, string>;
  href: string;
  external?: boolean;
  active?: boolean;
}

interface MenuEditorProps {
  title: string;
  items: MenuItemData[];
  onChange: (items: MenuItemData[]) => void;
}

export function MenuEditor({ title, items, onChange }: MenuEditorProps) {
  const updateItem = (index: number, updates: Partial<MenuItemData>) => {
    const next = [...items];
    next[index] = { ...next[index], ...updates };
    onChange(next);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const addItem = () => {
    onChange([...items, { label: '', href: '/', active: true }]);
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= items.length) return;
    const next = [...items];
    [next[index], next[newIndex]] = [next[newIndex], next[index]];
    onChange(next);
  };

  const updateLabel = (index: number, locale: string, value: string) => {
    const item = items[index];
    const labels = { ...(item.labels || {}) };
    if (value) {
      labels[locale] = value;
    } else {
      delete labels[locale];
    }
    updateItem(index, { labels: Object.keys(labels).length > 0 ? labels : undefined });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">{title}</h4>
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No menu items. Click &quot;Add&quot; to create one.
        </p>
      )}

      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="rounded-lg border bg-card p-3 space-y-2">
            <div className="flex items-center gap-2">
              {/* Reorder buttons */}
              <div className="flex flex-col">
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  onClick={() => moveItem(index, -1)}
                  disabled={index === 0}
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  onClick={() => moveItem(index, 1)}
                  disabled={index === items.length - 1}
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>

              {/* Label */}
              <Input
                placeholder="Label"
                value={item.label}
                onChange={(e) => updateItem(index, { label: e.target.value })}
                className="flex-1"
              />

              {/* Href */}
              <Input
                placeholder="/path or https://..."
                value={item.href}
                onChange={(e) => updateItem(index, { href: e.target.value })}
                className="flex-1"
              />

              {/* External toggle */}
              <div className="flex items-center gap-1" title="External link">
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
                <Switch
                  checked={item.external || false}
                  onCheckedChange={(checked) => updateItem(index, { external: checked })}
                />
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-1" title="Active">
                <Switch
                  checked={item.active !== false}
                  onCheckedChange={(checked) => updateItem(index, { active: checked })}
                />
              </div>

              {/* Remove */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => removeItem(index)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>

            {/* Multilingual labels */}
            <div className="flex items-center gap-2 pl-7">
              <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
              <Label className="text-xs text-muted-foreground shrink-0">NL:</Label>
              <Input
                placeholder="Dutch label"
                value={item.labels?.nl || ''}
                onChange={(e) => updateLabel(index, 'nl', e.target.value)}
                className="h-7 text-xs"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
