'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft, Globe, Layers, Calendar, Clock, Link2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type StepId = 'language' | 'plannerType' | 'weekStart' | 'timeFormat' | 'calendar' | 'result';

const stepIcons: Record<StepId, typeof Globe> = {
  language: Globe,
  plannerType: Layers,
  weekStart: Calendar,
  timeFormat: Clock,
  calendar: Link2,
  result: Check,
};

const stepLabels: Record<StepId, string> = {
  language: 'Language',
  plannerType: 'Type',
  weekStart: 'Week Start',
  timeFormat: 'Time',
  calendar: 'Calendar',
  result: 'Download',
};

interface ProgressIndicatorProps {
  steps: StepId[];
  currentStepIndex: number;
  canGoBack: boolean;
  onBack: () => void;
}

export function ProgressIndicator({
  steps,
  currentStepIndex,
  canGoBack,
  onBack,
}: ProgressIndicatorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          disabled={!canGoBack}
          className={cn(!canGoBack && 'invisible')}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div>

      <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2">
        {steps.map((step, index) => {
          const Icon = stepIcons[step];
          const isComplete = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;

          return (
            <div key={step} className="flex items-center">
              <div
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors',
                  isCurrent && 'bg-primary/10',
                  isComplete && 'text-primary'
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors',
                    isCurrent && 'border-primary bg-primary text-primary-foreground',
                    isComplete && 'border-primary bg-primary/10',
                    !isCurrent && !isComplete && 'border-muted-foreground/30'
                  )}
                >
                  {isComplete ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs font-medium whitespace-nowrap',
                    isCurrent && 'text-primary',
                    !isCurrent && !isComplete && 'text-muted-foreground'
                  )}
                >
                  {stepLabels[step]}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'w-8 h-0.5 mx-1',
                    isComplete ? 'bg-primary' : 'bg-muted-foreground/30'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
