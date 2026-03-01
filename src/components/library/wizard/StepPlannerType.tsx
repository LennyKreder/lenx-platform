'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { plannerTypes, type PlannerTypeId } from '@/config/planner-types';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface StepPlannerTypeProps {
  selected: PlannerTypeId | null;
  onSelect: (type: PlannerTypeId) => void;
}

export function StepPlannerType({ selected, onSelect }: StepPlannerTypeProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Choose your planner type</h2>
        <p className="text-muted-foreground mt-2">
          Select the level of detail that works best for you.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {Object.values(plannerTypes).map((type) => (
          <Card
            key={type.id}
            className={cn(
              'cursor-pointer transition-all hover:shadow-md hover:border-primary',
              selected === type.id && 'border-primary ring-2 ring-primary'
            )}
            onClick={() => onSelect(type.id as PlannerTypeId)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{type.name}</CardTitle>
                  {'shortDescription' in type && (
                    <p className="text-sm text-muted-foreground mt-1">{type.shortDescription}</p>
                  )}
                  <Badge variant="secondary" className="mt-2">{type.templateCount} templates</Badge>
                </div>
                {selected === type.id && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-3">{type.description}</CardDescription>
              <div className="flex flex-wrap gap-2">
                {type.categories.map((category) => (
                  <Badge key={category} variant="outline" className="text-xs">
                    {category}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
