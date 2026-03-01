'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { languages, type LanguageId } from '@/config/languages';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface StepLanguageProps {
  selected: LanguageId | null;
  onSelect: (language: LanguageId) => void;
}

export function StepLanguage({ selected, onSelect }: StepLanguageProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Choose your language</h2>
        <p className="text-muted-foreground mt-2">
          All dates, days, and months will be in your selected language.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Object.values(languages).map((lang) => (
          <Card
            key={lang.id}
            className={cn(
              'cursor-pointer transition-all hover:shadow-md hover:border-primary',
              selected === lang.id && 'border-primary ring-2 ring-primary'
            )}
            onClick={() => onSelect(lang.id as LanguageId)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{lang.flag}</span>
                  <CardTitle className="text-lg">{lang.name}</CardTitle>
                </div>
                {selected === lang.id && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>{lang.nativeName}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
