import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getAdminSiteId } from '@/lib/admin-site';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/admin/templates/[id]/duplicate - Duplicate a template
export async function POST(request: NextRequest, { params }: RouteParams) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const templateId = parseInt(id, 10);

  if (isNaN(templateId)) {
    return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
  }

  const siteId = await getAdminSiteId();

  try {
    // Fetch the template to duplicate with all related data (verify store ownership)
    const original = await prisma.productTemplate.findFirst({
      where: { id: templateId, siteId },
      include: {
        translations: true,
        slugs: { where: { isPrimary: true } },
        tags: true,
      },
    });

    if (!original) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Generate unique slugs by appending "-copy" (or "-copy-2", etc.)
    const generateUniqueSlug = async (baseSlug: string, languageCode: string): Promise<string> => {
      let slug = `${baseSlug}-copy`;
      let counter = 2;

      while (true) {
        const existing = await prisma.slugRoute.findFirst({
          where: { slug, languageCode },
        });
        if (!existing) break;
        slug = `${baseSlug}-copy-${counter}`;
        counter++;
      }

      return slug;
    };

    // Create duplicate in a transaction
    const duplicate = await prisma.$transaction(async (tx) => {
      // Create new template
      const newTemplate = await tx.productTemplate.create({
        data: {
          siteId,
          fileProperties: original.fileProperties as object,
          device: original.device,
          orientation: original.orientation,
          sortOrder: original.sortOrder,
          isActive: false, // Start as inactive
        },
      });

      // Duplicate translations with " (Copy)" appended to name
      for (const trans of original.translations) {
        await tx.productTemplateTranslation.create({
          data: {
            templateId: newTemplate.id,
            languageCode: trans.languageCode,
            name: `${trans.name} (Copy)`,
            description: trans.description,
          },
        });
      }

      // Duplicate slugs with unique values
      for (const slug of original.slugs) {
        const uniqueSlug = await generateUniqueSlug(slug.slug, slug.languageCode);
        await tx.slugRoute.create({
          data: {
            siteId,
            languageCode: slug.languageCode,
            slug: uniqueSlug,
            entityType: 'template',
            templateId: newTemplate.id,
            isPrimary: true,
          },
        });
      }

      // Duplicate tags
      for (const tag of original.tags) {
        await tx.productTemplateTag.create({
          data: {
            templateId: newTemplate.id,
            tagId: tag.tagId,
          },
        });
      }

      // Return the new template with all related data
      return tx.productTemplate.findUnique({
        where: { id: newTemplate.id },
        include: {
          translations: true,
          slugs: { where: { isPrimary: true } },
          tags: true,
        },
      });
    });

    return NextResponse.json(duplicate);
  } catch (error) {
    console.error('Error duplicating template:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate template' },
      { status: 500 }
    );
  }
}
