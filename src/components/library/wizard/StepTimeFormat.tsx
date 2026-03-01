'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type TimeFormat } from '@/config/languages';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface StepTimeFormatProps {
  selected: TimeFormat | null;
  onSelect: (timeFormat: TimeFormat) => void;
}

const options: { id: TimeFormat; label: string; description: string; examples: string[] }[] = [
  {
    id: '24h',
    label: '24-Hour',
    description: 'Military/European time format',
    examples: ['08:00', '12:00', '18:00', '22:00'],
  },
  {
    id: 'ampm',
    label: 'AM/PM',
    description: '12-hour clock format',
    examples: ['8:00 AM', '12:00 PM', '6:00 PM', '10:00 PM'],
  },
];

export function StepTimeFormat({ selected, onSelect }: StepTimeFormatProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Choose your time format</h2>
        <p className="text-muted-foreground mt-2">
          This affects how times are displayed in daily and hourly views.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {options.map((option) => (
          <Card
            key={option.id}
            className={cn(
              'cursor-pointer transition-all hover:shadow-md hover:border-primary',
              selected === option.id && 'border-primary ring-2 ring-primary'
            )}
            onClick={() => onSelect(option.id)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">{option.label}</CardTitle>
                {selected === option.id && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{option.description}</p>
              {/* Preview of time format */}
              <div className="bg-muted p-3 rounded-lg space-y-1">
                {option.examples.map((time) => (
                  <div key={time} className="text-sm font-mono flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary/50" />
                    {time}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
