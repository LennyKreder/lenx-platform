'use client';

import { Label } from '@/components/ui/label';

interface FilePropertyConfig {
  templateSet?: boolean;
  timeFormat?: boolean;
  weekStart?: boolean;
  calendar?: boolean;
}

interface FilePropertiesSelectorProps {
  value: FilePropertyConfig;
  onChange: (value: FilePropertyConfig) => void;
}

const filePropertyOptions = [
  {
    key: 'templateSet' as const,
    label: 'Template Set',
    description: 'Full, Focus, or Minimal variants',
  },
  {
    key: 'timeFormat' as const,
    label: 'Time Format',
    description: '24-hour or AM/PM format',
  },
  {
    key: 'weekStart' as const,
    label: 'Week Start Day',
    description: 'Monday or Sunday start',
  },
  {
    key: 'calendar' as const,
    label: 'Calendar Integration',
    description: 'None, Google, or Apple calendar links',
  },
];

export function FilePropertiesSelector({
  value,
  onChange,
}: FilePropertiesSelectorProps) {
  const handleToggle = (key: keyof FilePropertyConfig) => {
    onChange({
      ...value,
      [key]: !value[key],
    });
  };

  const enabledCount = Object.values(value).filter(Boolean).length;

  return (
    <div className="space-y-3">
      <div>
        <Label>File Properties</Label>
        <p className="text-sm text-muted-foreground mt-1">
          Select which file variations this product type has. Products without
          variations (like stickers) don&apos;t need any properties selected.
        </p>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        {filePropertyOptions.map((option) => (
          <div key={option.key} className="flex items-start gap-3">
            <input
              type="checkbox"
              id={option.key}
              checked={value[option.key] || false}
              onChange={() => handleToggle(option.key)}
              className="mt-1 h-4 w-4 rounded border-gray-300"
            />
            <div className="flex-1">
              <label
                htmlFor={option.key}
                className="font-medium text-sm cursor-pointer"
              >
                {option.label}
              </label>
              <p className="text-xs text-muted-foreground">{option.description}</p>
            </div>
          </div>
        ))}

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            {enabledCount === 0 ? (
              <span>No file variations - products will have a single file</span>
            ) : enabledCount === 4 ? (
              <span>
                <strong>36 file variations</strong> per product (3 × 2 × 2 × 3)
              </span>
            ) : (
              <span>
                {enabledCount} propert{enabledCount === 1 ? 'y' : 'ies'} selected
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
