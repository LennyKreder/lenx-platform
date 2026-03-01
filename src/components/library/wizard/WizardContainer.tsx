'use client';

import { useState, useCallback } from 'react';
import { usePurchase } from '@/contexts/PurchaseContext';
import { languages, type LanguageId, type WeekStart, type TimeFormat, type CalendarIntegration } from '@/config/languages';
import { type PlannerTypeId } from '@/config/planner-types';
import { ProgressIndicator } from './ProgressIndicator';
import { StepLanguage } from './StepLanguage';
import { StepPlannerType } from './StepPlannerType';
import { StepWeekStart } from './StepWeekStart';
import { StepTimeFormat } from './StepTimeFormat';
import { StepCalendar } from './StepCalendar';
import { StepResult } from './StepResult';

export interface WizardState {
  language: LanguageId | null;
  plannerType: PlannerTypeId | null;
  weekStart: WeekStart | null;
  timeFormat: TimeFormat | null;
  calendar: CalendarIntegration | null;
}

type StepId = 'language' | 'plannerType' | 'weekStart' | 'timeFormat' | 'calendar' | 'result';

function getSteps(selectedLanguage: LanguageId | null): StepId[] {
  const steps: StepId[] = ['language', 'plannerType'];

  if (selectedLanguage) {
    const lang = languages[selectedLanguage];
    if (lang?.hasWeekStartOption) {
      steps.push('weekStart');
    }
    if (lang?.hasTimeFormatOption) {
      steps.push('timeFormat');
    }
  }

  steps.push('calendar', 'result');
  return steps;
}

export function WizardContainer() {
  const purchase = usePurchase();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [state, setState] = useState<WizardState>({
    language: null,
    plannerType: null,
    weekStart: null,
    timeFormat: null,
    calendar: null,
  });

  const steps = getSteps(state.language);
  const currentStep = steps[currentStepIndex];

  const goToNextStep = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  }, [currentStepIndex, steps.length]);

  const goToPreviousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  }, [currentStepIndex]);

  const updateState = useCallback(<K extends keyof WizardState>(key: K, value: WizardState[K]) => {
    setState((prev) => {
      const newState = { ...prev, [key]: value };

      // If changing language, reset language-dependent options
      if (key === 'language' && value !== prev.language) {
        const lang = value ? languages[value as LanguageId] : null;
        if (lang && !lang.hasWeekStartOption) {
          newState.weekStart = lang.defaultWeekStart;
        } else {
          newState.weekStart = null;
        }
        if (lang && !lang.hasTimeFormatOption) {
          newState.timeFormat = lang.defaultTimeFormat;
        } else {
          newState.timeFormat = null;
        }
      }

      return newState;
    });
  }, []);

  const handleSelect = useCallback(<K extends keyof WizardState>(key: K, value: WizardState[K]) => {
    updateState(key, value);
    // Small delay to show selection before advancing
    setTimeout(goToNextStep, 150);
  }, [updateState, goToNextStep]);

  const renderStep = () => {
    switch (currentStep) {
      case 'language':
        return (
          <StepLanguage
            selected={state.language}
            onSelect={(value) => handleSelect('language', value)}
          />
        );
      case 'plannerType':
        return (
          <StepPlannerType
            selected={state.plannerType}
            onSelect={(value) => handleSelect('plannerType', value)}
          />
        );
      case 'weekStart':
        return (
          <StepWeekStart
            selected={state.weekStart}
            onSelect={(value) => handleSelect('weekStart', value)}
          />
        );
      case 'timeFormat':
        return (
          <StepTimeFormat
            selected={state.timeFormat}
            onSelect={(value) => handleSelect('timeFormat', value)}
          />
        );
      case 'calendar':
        return (
          <StepCalendar
            selected={state.calendar}
            onSelect={(value) => handleSelect('calendar', value)}
          />
        );
      case 'result':
        return (
          <StepResult
            state={state}
            theme={purchase.theme}
            accessCode={purchase.code}
            device={purchase.device}
            orientation={purchase.orientation}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="container py-8 max-w-3xl">
      <ProgressIndicator
        steps={steps}
        currentStepIndex={currentStepIndex}
        canGoBack={currentStepIndex > 0}
        onBack={goToPreviousStep}
      />
      <div className="mt-8">
        {renderStep()}
      </div>
    </div>
  );
}
