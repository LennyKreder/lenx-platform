import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAdminSiteId } from '@/lib/admin-site';
import { TemplateForm } from '@/components/admin/templates/TemplateForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Edit Template - Admin',
};

interface FilePropertyConfig {
  templateSet?: boolean;
  timeFormat?: boolean;
  weekStart?: boolean;
  calendar?: boolean;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTemplatePage({ params }: PageProps) {
  const { id } = await params;
  const templateId = parseInt(id, 10);

  if (isNaN(templateId)) {
    notFound();
  }

  const siteId = await getAdminSiteId();
  const template = await prisma.productTemplate.findFirst({
    where: { id: templateId, siteId },
    include: {
      translations: true,
      slugs: { where: { isPrimary: true } },
      tags: true,
    },
  });

  if (!template) {
    notFound();
  }

  // Cast fileProperties to the expected type
  const typedTemplate = {
    ...template,
    fileProperties: template.fileProperties as FilePropertyConfig,
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Edit Template</h2>
        <p className="text-muted-foreground">
          Update the template details and file properties.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <TemplateForm template={typedTemplate} />
      </div>
    </div>
  );
}
