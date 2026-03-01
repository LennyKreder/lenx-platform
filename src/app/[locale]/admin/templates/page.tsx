import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getAdminSiteId } from '@/lib/admin-site';
import { Button } from '@/components/ui/button';
import { TemplateTable } from '@/components/admin/templates/TemplateTable';
import { Plus } from 'lucide-react';

export const metadata = {
  title: 'Product Templates - Admin',
};

export const dynamic = 'force-dynamic';

interface FilePropertyConfig {
  templateSet?: boolean;
  timeFormat?: boolean;
  weekStart?: boolean;
  calendar?: boolean;
}

export default async function TemplatesPage() {
  const siteId = await getAdminSiteId();
  const templates = await prisma.productTemplate.findMany({
    where: { siteId },
    orderBy: [{ sortOrder: 'asc' }],
    include: {
      translations: true,
      slugs: { where: { isPrimary: true } },
      _count: { select: { products: true } },
    },
  });

  // Cast fileProperties to the expected type
  const typedTemplates = templates.map((t) => ({
    ...t,
    fileProperties: t.fileProperties as FilePropertyConfig,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Product Templates</h2>
          <p className="text-muted-foreground">
            Templates define product types and their file variations.
          </p>
        </div>
        <Link href="/en/admin/templates/new">
          <Button>
            <Plus className="h-4 w-4" />
            New Template
          </Button>
        </Link>
      </div>

      <TemplateTable templates={typedTemplates} />
    </div>
  );
}
