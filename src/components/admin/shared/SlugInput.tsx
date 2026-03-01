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

interface SlugInputProps {
  label?: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  sourceValue?: string; // Value to generate slug from (e.g., name)
  required?: boolean;
  disabled?: boolean;
}

export function SlugInput({
  label = 'Slug',
  name,
  value,
  onChange,
  sourceValue,
  required = false,
  disabled = false,
}: SlugInputProps) {
  const [isManuallyEdited, setIsManuallyEdited] = useState(false);

  // Auto-generate slug from source value if not manually edited
  useEffect(() => {
    if (sourceValue && !isManuallyEdited && !disabled) {
      const generatedSlug = generateSlug(sourceValue);
      if (generatedSlug !== value) {
        onChange(generatedSlug);
      }
    }
  }, [sourceValue, isManuallyEdited, disabled, onChange, value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsManuallyEdited(true);
    // Ensure slug format while typing
    const newValue = e.target.value
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
    onChange(newValue);
  };

  const handleRegenerate = () => {
    if (sourceValue) {
      setIsManuallyEdited(false);
      onChange(generateSlug(sourceValue));
    }
  };

  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <div className="flex gap-2">
        <Input
          id={name}
          name={name}
          value={value}
          onChange={handleChange}
          placeholder="auto-generated-slug"
          required={required}
          disabled={disabled}
          className="font-mono text-sm"
        />
        {sourceValue && !disabled && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleRegenerate}
            title="Regenerate from name"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Used in URLs. Only lowercase letters, numbers, and hyphens.
      </p>
    </div>
  );
}
