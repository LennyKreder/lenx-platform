import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getAdminSiteId } from '@/lib/admin-site';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, ExternalLink } from 'lucide-react';

export const metadata = {
  title: 'Content Pages - Admin',
};

export const dynamic = 'force-dynamic';

export default async function ContentPagesAdminPage() {
  const siteId = await getAdminSiteId();
  const pages = await prisma.contentPage.findMany({
    where: { siteId },
    orderBy: { slug: 'asc' },
    include: {
      translations: true,
    },
  });

  // If no pages exist yet, show option to initialize them
  const defaultPages = ['home', 'about', 'contact', 'terms', 'how-to-import'];
  const existingSlugs = pages.map((p) => p.slug);
  const missingPages = defaultPages.filter((slug) => !existingSlugs.includes(slug));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Content Pages</h2>
          <p className="text-muted-foreground">
            Manage content pages like Home, About, Contact, Terms, and more.
          </p>
        </div>
        <Link href="/en/admin/pages/new">
          <Button>
            <Plus className="h-4 w-4" />
            New Page
          </Button>
        </Link>
      </div>

      {missingPages.length > 0 && (
        <div className="rounded-lg border border-dashed p-4 bg-muted/50">
          <p className="text-sm text-muted-foreground mb-2">
            Missing default pages: {missingPages.join(', ')}
          </p>
          <Link href="/en/admin/pages/initialize">
            <Button variant="outline" size="sm">
              Initialize Default Pages
            </Button>
          </Link>
        </div>
      )}

      {pages.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Slug</TableHead>
                <TableHead>Title (EN)</TableHead>
                <TableHead>Title (NL)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.map((page) => {
                const enTranslation = page.translations.find((t) => t.languageCode === 'en');
                const nlTranslation = page.translations.find((t) => t.languageCode === 'nl');

                return (
                  <TableRow key={page.id}>
                    <TableCell className="font-mono text-sm">{page.slug}</TableCell>
                    <TableCell>{enTranslation?.title || '—'}</TableCell>
                    <TableCell>{nlTranslation?.title || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={page.isPublished ? 'default' : 'secondary'}>
                        {page.isPublished ? 'Published' : 'Draft'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/en/${page.slug}`} target="_blank">
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/en/admin/pages/${page.slug}`}>
                          <Button variant="ghost" size="sm">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          No content pages found. Click "Initialize Default Pages" to create the standard pages.
        </div>
      )}
    </div>
  );
}
