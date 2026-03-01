'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X } from 'lucide-react';
import { isValidVariableKey, type TemplateVariable } from '@/lib/template-variables';

interface TemplateVariablesEditorProps {
  variables: TemplateVariable[];
  onChange: (variables: TemplateVariable[]) => void;
}

export function TemplateVariablesEditor({ variables, onChange }: TemplateVariablesEditorProps) {
  function addVariable() {
    onChange([...variables, { key: '', label: '', defaultValue: '' }]);
  }

  function removeVariable(index: number) {
    onChange(variables.filter((_, i) => i !== index));
  }

  function updateVariable(index: number, field: keyof TemplateVariable, value: string) {
    const updated = variables.map((v, i) => {
      if (i !== index) return v;
      return { ...v, [field]: value };
    });
    onChange(updated);
  }

  return (
    <div className="space-y-3">
      <Label>Template Variables</Label>
      <p className="text-xs text-muted-foreground">
        Define variables that can be used as {'{{variableName}}'} in the name and description fields.
        Products will get input fields to fill in these values.
      </p>

      {variables.length > 0 && (
        <div className="space-y-3">
          {variables.map((variable, index) => (
            <div key={index} className="flex items-start gap-2 rounded-lg border p-3">
              <div className="flex-1 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Key</label>
                    <Input
                      value={variable.key}
                      onChange={(e) => updateVariable(index, 'key', e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                      placeholder="year"
                      className={variable.key && !isValidVariableKey(variable.key) ? 'border-destructive' : ''}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Label</label>
                    <Input
                      value={variable.label}
                      onChange={(e) => updateVariable(index, 'label', e.target.value)}
                      placeholder="Year"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Default value</label>
                    <Input
                      value={variable.defaultValue || ''}
                      onChange={(e) => updateVariable(index, 'defaultValue', e.target.value)}
                      placeholder="2026"
                    />
                  </div>
                </div>
                {variable.key && (
                  <p className="text-xs text-muted-foreground">
                    Use as: <code className="bg-muted px-1 rounded">{`{{${variable.key}}}`}</code>
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 mt-4"
                onClick={() => removeVariable(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button type="button" variant="outline" size="sm" onClick={addVariable}>
        <Plus className="h-4 w-4 mr-1" />
        Add Variable
      </Button>
    </div>
  );
}
