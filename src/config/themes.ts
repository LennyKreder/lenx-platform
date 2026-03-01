export type ThemeCategory = 'tablet' | 'e_ink' | 'filofax' | 'bundle';

export interface ThemeConfig {
  id: string;
  name: string;
  names: Record<string, string>;
  mode: 'light' | 'dark';
  category: ThemeCategory;
  shortCode: string;
  description: string;
  previewColor: string;
}

export const themes: Record<string, ThemeConfig> = {
  'brown': {
    id: 'brown',
    name: 'Brown',
    names: { en: 'Brown', nl: 'Brown', de: 'Brown', fr: 'Brown', es: 'Brown', it: 'Brown' },
    mode: 'light',
    category: 'tablet',
    shortCode: 'brown',
    description: 'Classic warm brown tones',
    previewColor: '#8B3A3A',
  },

  'dark_mode_blue': {
    id: 'dark_mode_blue',
    name: 'Dark Blue',
    names: { en: 'Dark Blue', nl: 'Dark Blue', de: 'Dark Blue', fr: 'Dark Blue', es: 'Dark Blue', it: 'Dark Blue' },
    mode: 'dark',
    category: 'tablet',
    shortCode: 'dm_blue',
    description: 'Deep blue dark mode',
    previewColor: '#335281',
  },

  'dark_mode_brown': {
    id: 'dark_mode_brown',
    name: 'Dark Brown',
    names: { en: 'Dark Brown', nl: 'Dark Brown', de: 'Dark Brown', fr: 'Dark Brown', es: 'Dark Brown', it: 'Dark Brown' },
    mode: 'dark',
    category: 'tablet',
    shortCode: 'dm_brown',
    description: 'Rich brown dark mode',
    previewColor: '#734c22',
  },

  'dark_mode_essential': {
    id: 'dark_mode_essential',
    name: 'Dark Essential',
    names: { en: 'Dark Essential', nl: 'Dark Essential', de: 'Dark Essential', fr: 'Dark Essential', es: 'Dark Essential', it: 'Dark Essential' },
    mode: 'dark',
    category: 'tablet',
    shortCode: 'dm_ess',
    description: 'Minimalist black & white dark mode',
    previewColor: '#333333',
  },

  'dark_mode_terminal': {
    id: 'dark_mode_terminal',
    name: 'Dark Terminal',
    names: { en: 'Dark Terminal', nl: 'Dark Terminal', de: 'Dark Terminal', fr: 'Dark Terminal', es: 'Dark Terminal', it: 'Dark Terminal' },
    mode: 'dark',
    category: 'tablet',
    shortCode: 'dm_term',
    description: 'Developer-inspired dark mode',
    previewColor: '#E8925A',
  },

  'dark_mode_olive': {
    id: 'dark_mode_olive',
    name: 'Dark Olive',
    names: { en: 'Dark Olive', nl: 'Dark Olive', de: 'Dark Olive', fr: 'Dark Olive', es: 'Dark Olive', it: 'Dark Olive' },
    mode: 'dark',
    category: 'tablet',
    shortCode: 'dm_olive',
    description: 'Earthy olive dark mode',
    previewColor: '#5c6a32',
  },

  'dark_mode_purple': {
    id: 'dark_mode_purple',
    name: 'Dark Purple',
    names: { en: 'Dark Purple', nl: 'Dark Purple', de: 'Dark Purple', fr: 'Dark Purple', es: 'Dark Purple', it: 'Dark Purple' },
    mode: 'dark',
    category: 'tablet',
    shortCode: 'dm_purple',
    description: 'Deep purple dark mode',
    previewColor: '#4a2b6d',
  },

  'dark_mode_rose': {
    id: 'dark_mode_rose',
    name: 'Dark Rose',
    names: { en: 'Dark Rose', nl: 'Dark Rose', de: 'Dark Rose', fr: 'Dark Rose', es: 'Dark Rose', it: 'Dark Rose' },
    mode: 'dark',
    category: 'tablet',
    shortCode: 'dm_rose',
    description: 'Elegant rose dark mode',
    previewColor: '#986a6a',
  },

  'earth_natural': {
    id: 'earth_natural',
    name: 'Earth Natural',
    names: { en: 'Earth Natural', nl: 'Earth Natural', de: 'Earth Natural', fr: 'Earth Natural', es: 'Earth Natural', it: 'Earth Natural' },
    mode: 'light',
    category: 'tablet',
    shortCode: 'earth',
    description: 'Warm, organic tones',
    previewColor: '#5F6F52',
  },

  'grey_neutral': {
    id: 'grey_neutral',
    name: 'Grey Neutral',
    names: { en: 'Grey Neutral', nl: 'Grey Neutral', de: 'Grey Neutral', fr: 'Grey Neutral', es: 'Grey Neutral', it: 'Grey Neutral' },
    mode: 'light',
    category: 'tablet',
    shortCode: 'grey',
    description: 'Clean neutral grey aesthetic',
    previewColor: '#4A4A4A',
  },

  'navy_professional': {
    id: 'navy_professional',
    name: 'Navy',
    names: { en: 'Navy', nl: 'Navy', de: 'Navy', fr: 'Navy', es: 'Navy', it: 'Navy' },
    mode: 'light',
    category: 'tablet',
    shortCode: 'navy',
    description: 'Clean, business-like',
    previewColor: '#1E3A5F',
  },

  'patina_blue': {
    id: 'patina_blue',
    name: 'Patina Blue',
    names: { en: 'Patina Blue', nl: 'Patina Blue', de: 'Patina Blue', fr: 'Patina Blue', es: 'Patina Blue', it: 'Patina Blue' },
    mode: 'light',
    category: 'tablet',
    shortCode: 'patina',
    description: 'Vintage blue-green patina',
    previewColor: '#4A7FB5',
  },

  'pink': {
    id: 'pink',
    name: 'Pink',
    names: { en: 'Pink', nl: 'Pink', de: 'Pink', fr: 'Pink', es: 'Pink', it: 'Pink' },
    mode: 'light',
    category: 'tablet',
    shortCode: 'pink',
    description: 'Bright pink aesthetic',
    previewColor: '#D64A8C',
  },

  'purple': {
    id: 'purple',
    name: 'Purple',
    names: { en: 'Purple', nl: 'Purple', de: 'Purple', fr: 'Purple', es: 'Purple', it: 'Purple' },
    mode: 'light',
    category: 'tablet',
    shortCode: 'purple',
    description: 'Vibrant purple theme',
    previewColor: '#9567E4',
  },

  'royal_blue': {
    id: 'royal_blue',
    name: 'Royal Blue',
    names: { en: 'Royal Blue', nl: 'Royal Blue', de: 'Royal Blue', fr: 'Royal Blue', es: 'Royal Blue', it: 'Royal Blue' },
    mode: 'light',
    category: 'tablet',
    shortCode: 'royal',
    description: 'Classic royal blue theme',
    previewColor: '#2952a3',
  },

  'soft_pastel': {
    id: 'soft_pastel',
    name: 'Soft Pastel',
    names: { en: 'Soft Pastel', nl: 'Soft Pastel', de: 'Soft Pastel', fr: 'Soft Pastel', es: 'Soft Pastel', it: 'Soft Pastel' },
    mode: 'light',
    category: 'tablet',
    shortCode: 'pastel',
    description: 'Gentle pastel colors',
    previewColor: '#aa89ed',
  },

  'soft_rose': {
    id: 'soft_rose',
    name: 'Soft Rose',
    names: { en: 'Soft Rose', nl: 'Soft Rose', de: 'Soft Rose', fr: 'Soft Rose', es: 'Soft Rose', it: 'Soft Rose' },
    mode: 'light',
    category: 'tablet',
    shortCode: 'rose',
    description: 'Gentle pink aesthetic',
    previewColor: '#C08B8B',
  },

  'premium_gold': {
    id: 'premium_gold',
    name: 'Premium Gold',
    names: { en: 'Premium Gold', nl: 'Premium Gold', de: 'Premium Gold', fr: 'Premium Gold', es: 'Premium Gold', it: 'Premium Gold' },
    mode: 'light',
    category: 'bundle',
    shortCode: 'gold',
    description: 'Luxurious gold theme for premium bundles',
    previewColor: '#B8860B',
  },

  'e_ink_vivid': {
    id: 'e_ink_vivid',
    name: 'E-Ink Vivid',
    names: { en: 'E-Ink Vivid', nl: 'E-Ink Vivid', de: 'E-Ink Vivid', fr: 'E-Ink Vivid', es: 'E-Ink Vivid', it: 'E-Ink Vivid' },
    mode: 'light',
    category: 'e_ink',
    shortCode: 'ei_vivid',
    description: 'High-contrast multicolor for e-ink',
    previewColor: '#9F554C',
  },

  'e_ink_crimson': {
    id: 'e_ink_crimson',
    name: 'E-Ink Crimson',
    names: { en: 'E-Ink Crimson', nl: 'E-Ink Crimson', de: 'E-Ink Crimson', fr: 'E-Ink Crimson', es: 'E-Ink Crimson', it: 'E-Ink Crimson' },
    mode: 'light',
    category: 'e_ink',
    shortCode: 'ei_crimson',
    description: 'Bold red tones for e-ink',
    previewColor: '#894540',
  },

  'e_ink_cobalt': {
    id: 'e_ink_cobalt',
    name: 'E-Ink Cobalt',
    names: { en: 'E-Ink Cobalt', nl: 'E-Ink Cobalt', de: 'E-Ink Cobalt', fr: 'E-Ink Cobalt', es: 'E-Ink Cobalt', it: 'E-Ink Cobalt' },
    mode: 'light',
    category: 'e_ink',
    shortCode: 'ei_cobalt',
    description: 'Deep blue tones for e-ink',
    previewColor: '#3D5375',
  },

  'e_ink_jade': {
    id: 'e_ink_jade',
    name: 'E-Ink Jade',
    names: { en: 'E-Ink Jade', nl: 'E-Ink Jade', de: 'E-Ink Jade', fr: 'E-Ink Jade', es: 'E-Ink Jade', it: 'E-Ink Jade' },
    mode: 'light',
    category: 'e_ink',
    shortCode: 'ei_jade',
    description: 'Rich green tones for e-ink',
    previewColor: '#445E3F',
  },
};

export const themesByLanguage: Record<string, string[]> = {
  en: Object.keys(themes),
  nl: Object.keys(themes),
};

export type ThemeId = keyof typeof themes;
export type Theme = ThemeConfig;

// Get short code for a theme (used in filenames)
export function getThemeShortCode(themeId: string): string {
  return themes[themeId]?.shortCode || themeId;
}

// Get translated theme name for a given locale
export function getThemeName(themeId: string, locale: string): string {
  const theme = themes[themeId];
  if (!theme) return themeId;
  return theme.names[locale] || theme.names['en'] || theme.name;
}

// Get theme IDs by category
export function getThemesByCategory(category: ThemeCategory): string[] {
  return Object.keys(themes).filter((id) => themes[id].category === category);
}

// Get all non-bundle theme IDs (for product generation)
export function getAllProductThemes(): string[] {
  return Object.keys(themes).filter((id) => themes[id].category !== 'bundle');
}
