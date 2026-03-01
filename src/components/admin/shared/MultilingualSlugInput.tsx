'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

interface MultilingualSlugInputProps {
  label?: string;
  slugEn: string;
  slugNl: string;
  onChangeEn: (value: string) => void;
  onChangeNl: (value: string) => void;
  sourceValueEn?: string;
  sourceValueNl?: string;
  required?: boolean;
  disabled?: boolean;
}

export function MultilingualSlugInput({
  label = 'Slug',
  slugEn,
  slugNl,
  onChangeEn,
  onChangeNl,
  sourceValueEn,
  sourceValueNl,
  required = false,
  disabled = false,
}: MultilingualSlugInputProps) {
  const [isManuallyEditedEn, setIsManuallyEditedEn] = useState(false);
  const [isManuallyEditedNl, setIsManuallyEditedNl] = useState(false);

  // Auto-generate English slug from source value if not manually edited
  useEffect(() => {
    if (sourceValueEn && !isManuallyEditedEn && !disabled) {
      const generatedSlug = generateSlug(sourceValueEn);
      if (generatedSlug !== slugEn) {
        onChangeEn(generatedSlug);
      }
    }
  }, [sourceValueEn, isManuallyEditedEn, disabled, onChangeEn, slugEn]);

  // Auto-generate Dutch slug from source value if not manually edited
  useEffect(() => {
    if (sourceValueNl && !isManuallyEditedNl && !disabled) {
      const generatedSlug = generateSlug(sourceValueNl);
      if (generatedSlug !== slugNl) {
        onChangeNl(generatedSlug);
      }
    }
  }, [sourceValueNl, isManuallyEditedNl, disabled, onChangeNl, slugNl]);

  const handleChangeEn = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsManuallyEditedEn(true);
    const newValue = e.target.value
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
    onChangeEn(newValue);
  };

  const handleChangeNl = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsManuallyEditedNl(true);
    const newValue = e.target.value
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
    onChangeNl(newValue);
  };

  const handleRegenerateEn = () => {
    if (sourceValueEn) {
      setIsManuallyEditedEn(false);
      onChangeEn(generateSlug(sourceValueEn));
    }
  };

  const handleRegenerateNl = () => {
    if (sourceValueNl) {
      setIsManuallyEditedNl(false);
      onChangeNl(generateSlug(sourceValueNl));
    }
  };

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                value={slugEn}
                onChange={handleChangeEn}
                placeholder="english-slug"
                required={required}
                disabled={disabled}
                className="font-mono text-sm pl-10"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                EN
              </span>
            </div>
            {sourceValueEn && !disabled && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleRegenerateEn}
                title="Regenerate from English name"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                value={slugNl}
                onChange={handleChangeNl}
                placeholder="dutch-slug"
                required={required}
                disabled={disabled}
                className="font-mono text-sm pl-10"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                NL
              </span>
            </div>
            {sourceValueNl && !disabled && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleRegenerateNl}
                title="Regenerate from Dutch name"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Used in URLs per language. Only lowercase letters, numbers, and hyphens.
      </p>
    </div>
  );
}
