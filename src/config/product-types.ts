/**
 * Product type configuration for categorizing products in the shop.
 *
 * Each product type determines:
 * - URL routing (planners vs notebooks)
 * - Whether products require a year (dated vs undated)
 * - Display names in different languages
 */

export interface ProductTypeConfig {
  id: string;
  name: string;
  names: Record<string, string>;
  dated: boolean;
  urlSegment: string;
}

export const productTypes = {
  planner: {
    id: 'planner',
    name: 'Planner',
    names: {
      en: 'Planner',
      nl: 'Planner',
    },
    dated: true,
    urlSegment: 'planners',
  },
  printable: {
    id: 'printable',
    name: 'Printable',
    names: {
      en: 'Printable',
      nl: 'Printbaar',
    },
    dated: true,
    urlSegment: 'printables',
  },
  notebook: {
    id: 'notebook',
    name: 'Notebook',
    names: {
      en: 'Notebook',
      nl: 'Notitieboek',
    },
    dated: false,
    urlSegment: 'notebooks',
  },
  template: {
    id: 'template',
    name: 'Template',
    names: {
      en: 'Template',
      nl: 'Sjabloon',
    },
    dated: false,
    urlSegment: 'templates',
  },
} as const;

export type ProductTypeId = keyof typeof productTypes;

/**
 * Get translated product type name for a given locale
 */
export function getProductTypeName(typeId: string, locale: string): string {
  const type = productTypes[typeId as ProductTypeId];
  if (!type) return typeId;
  return type.names[locale as keyof typeof type.names] || type.name;
}

/**
 * Check if a product type is dated (requires year)
 */
export function isProductTypeDated(typeId: string): boolean {
  const type = productTypes[typeId as ProductTypeId];
  return type?.dated ?? false;
}

/**
 * Get URL segment for a product type
 */
export function getProductTypeUrlSegment(typeId: string): string {
  const type = productTypes[typeId as ProductTypeId];
  return type?.urlSegment || typeId;
}

/**
 * Get product type ID from URL segment
 */
export function getProductTypeFromUrlSegment(segment: string): ProductTypeId | null {
  const entry = Object.entries(productTypes).find(([, type]) => type.urlSegment === segment);
  return entry ? (entry[0] as ProductTypeId) : null;
}
