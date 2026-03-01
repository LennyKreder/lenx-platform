'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Plus, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TagTranslation {
  languageCode: string;
  name: string;
}

interface Tag {
  id: number;
  translations: TagTranslation[];
}

interface TagSelectorProps {
  selectedTagIds: number[];
  onChange: (tagIds: number[]) => void;
  disabled?: boolean;
}

function getTagName(tag: Tag, preferredLang: string = 'en'): string {
  const translation = tag.translations.find(t => t.languageCode === preferredLang)
    || tag.translations[0];
  return translation?.name || 'Unnamed';
}

export function TagSelector({ selectedTagIds, onChange, disabled }: TagSelectorProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await fetch('/api/admin/tags');
        if (response.ok) {
          const data = await response.json();
          setTags(data);
        }
      } catch (error) {
        console.error('Failed to fetch tags:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTags();
  }, []);

  const selectedTags = tags.filter(tag => selectedTagIds.includes(tag.id));
  const availableTags = tags.filter(tag => !selectedTagIds.includes(tag.id));

  const handleAddTag = (tagId: number) => {
    onChange([...selectedTagIds, tagId]);
  };

  const handleRemoveTag = (tagId: number) => {
    onChange(selectedTagIds.filter(id => id !== tagId));
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading tags...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Selected Tags */}
      <div className="flex flex-wrap gap-2">
        {selectedTags.length === 0 ? (
          <span className="text-sm text-muted-foreground">No tags selected</span>
        ) : (
          selectedTags.map(tag => (
            <Badge
              key={tag.id}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              {getTagName(tag)}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag.id)}
                  className="ml-1 rounded-full p-0.5 hover:bg-muted"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </Badge>
          ))
        )}
      </div>

      {/* Add Tag Button */}
      {!disabled && availableTags.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add Tag
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {availableTags.map(tag => (
              <DropdownMenuItem
                key={tag.id}
                onClick={() => handleAddTag(tag.id)}
              >
                {getTagName(tag)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {!disabled && tags.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No tags available. Create tags in Settings → Tags.
        </p>
      )}
    </div>
  );
}
