'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type WeekStart } from '@/config/languages';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface StepWeekStartProps {
  selected: WeekStart | null;
  onSelect: (weekStart: WeekStart) => void;
}

const options: { id: WeekStart; label: string; description: string; preview: string[] }[] = [
  {
    id: 'monday',
    label: 'Monday',
    description: 'Week starts on Monday (common in Europe)',
    preview: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  },
  {
    id: 'sunday',
    label: 'Sunday',
    description: 'Week starts on Sunday (common in US)',
    preview: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  },
];

export function StepWeekStart({ selected, onSelect }: StepWeekStartProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Choose your week start</h2>
        <p className="text-muted-foreground mt-2">
          This affects how weekly and monthly calendars are displayed.
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
              {/* Preview of week layout */}
              <div className="grid grid-cols-7 gap-1 bg-muted p-2 rounded-lg">
                {option.preview.map((day, i) => (
                  <div
                    key={day}
                    className={cn(
                      'text-center text-xs py-1 rounded',
                      i === 0 && 'bg-primary/20 font-medium'
                    )}
                  >
                    {day}
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
