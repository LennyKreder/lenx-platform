'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type CalendarIntegration } from '@/config/languages';
import { cn } from '@/lib/utils';
import { Check, Calendar, CalendarDays, CalendarOff } from 'lucide-react';

interface StepCalendarProps {
  selected: CalendarIntegration | null;
  onSelect: (calendar: CalendarIntegration) => void;
}

const options: { id: CalendarIntegration; label: string; description: string; icon: typeof Calendar }[] = [
  {
    id: 'none',
    label: 'No Integration',
    description: 'Standard planner without calendar links. Perfect if you prefer to keep your planner standalone.',
    icon: CalendarOff,
  },
  {
    id: 'google',
    label: 'Google Calendar',
    description: 'Includes quick-add links to create events in Google Calendar directly from your planner.',
    icon: Calendar,
  },
  {
    id: 'apple',
    label: 'Apple Calendar',
    description: 'Includes quick-add links to create events in Apple Calendar directly from your planner.',
    icon: CalendarDays,
  },
];

export function StepCalendar({ selected, onSelect }: StepCalendarProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Calendar integration</h2>
        <p className="text-muted-foreground mt-2">
          Add quick links to create calendar events? This adds buttons to easily add events from your planner.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {options.map((option) => {
          const Icon = option.icon;
          return (
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
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-lg">{option.label}</CardTitle>
                  </div>
                  {selected === option.id && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
