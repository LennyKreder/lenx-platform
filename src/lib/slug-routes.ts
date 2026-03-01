import 'server-only';
import { prisma } from '@/lib/prisma';

export type EntityType = 'category' | 'template' | 'product' | 'tag' | 'bundle';

export interface SlugRouteData {
  languageCode: string;
  slug: string;
}

/**
 * Generate a URL-safe slug from text
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-word chars except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Check if a slug is available for a given language
 */
export async function isSlugAvailable(
  languageCode: string,
  slug: string,
  excludeRouteId?: number
): Promise<boolean> {
  const existing = await prisma.slugRoute.findFirst({
    where: {
      languageCode,
      slug,
      ...(excludeRouteId && { id: { not: excludeRouteId } }),
    },
  });
  return !existing;
}

/**
 * Resolve a slug to its target entity
 * Returns the entity details or redirect information
 */
export async function resolveSlug(
  languageCode: string,
  slug: string,
  siteId?: string
): Promise<{
  type: 'entity' | 'redirect' | 'not_found';
  entityType?: EntityType;
  entityId?: number;
  redirectSlug?: string;
}> {
  if (siteId) {
    const route = await prisma.slugRoute.findUnique({
      where: {
        siteId_languageCode_slug: { siteId, languageCode, slug },
      },
      include: {
        redirectTo: true,
      },
    });

    if (!route) return { type: 'not_found' };

    if (route.redirectToId && route.redirectTo) {
      return { type: 'redirect', redirectSlug: route.redirectTo.slug };
    }

    const entityId = route.templateId || route.productId || route.tagId || route.bundleId;
    return { type: 'entity', entityType: route.entityType as EntityType, entityId: entityId ?? undefined };
  }

  // Fallback: find by languageCode + slug without store filtering
  const route = await prisma.slugRoute.findFirst({
    where: { languageCode, slug },
    include: {
      redirectTo: true,
    },
  });

  if (!route) {
    return { type: 'not_found' };
  }

  // If this is a redirect, return the target slug
  if (route.redirectToId && route.redirectTo) {
    return {
      type: 'redirect',
      redirectSlug: route.redirectTo.slug,
    };
  }

  // Return the entity info
  const entityId =
    route.templateId ||
    route.productId ||
    route.tagId ||
    route.bundleId;

  return {
    type: 'entity',
    entityType: route.entityType as EntityType,
    entityId: entityId ?? undefined,
  };
}

/**
 * Get the primary slug for an entity in a specific language
 */
export async function getPrimarySlug(
  entityType: EntityType,
  entityId: number,
  languageCode: string
): Promise<string | null> {
  const entityField = getEntityField(entityType);

  const route = await prisma.slugRoute.findFirst({
    where: {
      entityType,
      [entityField]: entityId,
      languageCode,
      isPrimary: true,
    },
  });

  return route?.slug ?? null;
}

/**
 * Get all slugs for an entity across all languages
 */
export async function getEntitySlugs(
  entityType: EntityType,
  entityId: number
): Promise<SlugRouteData[]> {
  const entityField = getEntityField(entityType);

  const routes = await prisma.slugRoute.findMany({
    where: {
      entityType,
      [entityField]: entityId,
      isPrimary: true,
    },
    select: {
      languageCode: true,
      slug: true,
    },
  });

  return routes;
}

/**
 * Create or update slugs for an entity
 * Handles setting primary slugs and creating redirects for old slugs
 */
export async function upsertEntitySlugs(
  entityType: EntityType,
  entityId: number,
  slugs: SlugRouteData[],
  siteId?: string
): Promise<void> {
  const entityField = getEntityField(entityType);

  await prisma.$transaction(async (tx) => {
    for (const { languageCode, slug } of slugs) {
      // Check if a slug with this exact value already exists for this language
      const existingSlug = await tx.slugRoute.findFirst({
        where: {
          languageCode, slug,
          ...(siteId && { siteId }),
        },
      });

      // If slug exists and points to a different entity, throw error
      if (existingSlug && existingSlug[entityField as keyof typeof existingSlug] !== entityId) {
        throw new Error(`Slug "${slug}" is already in use for language "${languageCode}"`);
      }

      // Get current primary slug for this entity+language
      const currentPrimary = await tx.slugRoute.findFirst({
        where: {
          entityType,
          [entityField]: entityId,
          languageCode,
          isPrimary: true,
        },
      });

      // If there's a current primary and it's different from the new slug
      if (currentPrimary && currentPrimary.slug !== slug) {
        // Mark old primary as non-primary (it becomes a redirect)
        await tx.slugRoute.update({
          where: { id: currentPrimary.id },
          data: { isPrimary: false },
        });
      }

      // Upsert the new slug as primary
      if (existingSlug) {
        // Update existing
        await tx.slugRoute.update({
          where: { id: existingSlug.id },
          data: {
            isPrimary: true,
            redirectToId: null,
          },
        });
      } else {
        // Create new
        await tx.slugRoute.create({
          data: {
            ...(siteId && { siteId }),
            languageCode,
            slug,
            entityType,
            [entityField]: entityId,
            isPrimary: true,
          } as Parameters<typeof tx.slugRoute.create>[0]['data'],
        });
      }

      // Update old slugs to redirect to new primary
      if (currentPrimary && currentPrimary.slug !== slug) {
        const newPrimary = await tx.slugRoute.findFirst({
          where: {
            languageCode, slug,
            ...(siteId && { siteId }),
          },
        });

        if (newPrimary) {
          await tx.slugRoute.update({
            where: { id: currentPrimary.id },
            data: { redirectToId: newPrimary.id },
          });
        }
      }
    }
  });
}

/**
 * Delete all slugs for an entity
 * Called automatically via Prisma cascade when entity is deleted
 */
export async function deleteEntitySlugs(
  entityType: EntityType,
  entityId: number
): Promise<void> {
  const entityField = getEntityField(entityType);

  await prisma.slugRoute.deleteMany({
    where: {
      entityType,
      [entityField]: entityId,
    },
  });
}

/**
 * Get the entity ID field name for a given entity type
 */
function getEntityField(entityType: EntityType): string {
  switch (entityType) {
    case 'category':
      return 'categoryId';
    case 'template':
      return 'templateId';
    case 'product':
      return 'productId';
    case 'tag':
      return 'tagId';
    case 'bundle':
      return 'bundleId';
  }
}
