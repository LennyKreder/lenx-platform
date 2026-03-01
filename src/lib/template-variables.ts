import { siteConfig } from '@/config/site';

export interface TemplateVariable {
  key: string;
  label: string;
  defaultValue?: string;
}

/**
 * Built-in variables available in all templates:
 * - {{year}} - The product year (e.g., "2026")
 * - {{theme}} - The theme name (e.g., "Soft Rose")
 * - {{language}} - The content language (e.g., "English")
 * - {{name}} - The product/template name (e.g., "Minimalist Planner")
 * - {{siteName}} - The site/brand name (e.g., "Layouts by Lenny")
 */

/**
 * Replaces {{variableName}} placeholders in text with actual values.
 * Explicit templateVariables take priority over built-in product fields.
 */
export function replaceTemplateVariables(
  text: string | null | undefined,
  templateVariables: Record<string, string>,
  builtInVariables?: {
    year?: number | null;
    theme?: string | null;
    language?: string | null;
    name?: string | null;
  }
): string {
  if (!text) return '';

  const allVariables: Record<string, string> = {
    siteName: siteConfig.name,
  };

  if (builtInVariables?.year) {
    allVariables['year'] = builtInVariables.year.toString();
  }
  if (builtInVariables?.theme) {
    allVariables['theme'] = builtInVariables.theme;
  }
  if (builtInVariables?.language) {
    allVariables['language'] = builtInVariables.language;
  }
  if (builtInVariables?.name) {
    allVariables['name'] = builtInVariables.name;
  }

  // Explicit template variables override built-ins
  Object.entries(templateVariables).forEach(([key, value]) => {
    if (value) {
      allVariables[key] = value;
    }
  });

  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return allVariables[key] ?? match;
  });
}

export function isValidVariableKey(key: string): boolean {
  return /^[a-zA-Z_]\w*$/.test(key);
}
