'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface MultilingualInputProps {
  label: string;
  nameEn: string;
  nameNl: string;
  valueEn: string;
  valueNl: string;
  onChangeEn: (value: string) => void;
  onChangeNl: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}

export function MultilingualInput({
  label,
  nameEn,
  nameNl,
  valueEn,
  valueNl,
  onChangeEn,
  onChangeNl,
  required = false,
  placeholder,
}: MultilingualInputProps) {
  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide bg-muted px-2 py-0.5 rounded">
              EN
            </span>
          </div>
          <Input
            name={nameEn}
            value={valueEn}
            onChange={(e) => onChangeEn(e.target.value)}
            placeholder={placeholder ? `${placeholder} (English)` : 'English'}
            required={required}
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide bg-muted px-2 py-0.5 rounded">
              NL
            </span>
          </div>
          <Input
            name={nameNl}
            value={valueNl}
            onChange={(e) => onChangeNl(e.target.value)}
            placeholder={placeholder ? `${placeholder} (Dutch)` : 'Dutch'}
            required={required}
          />
        </div>
      </div>
    </div>
  );
}
