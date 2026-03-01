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
  title: 'Blog Posts - Admin',
};

export const dynamic = 'force-dynamic';

export default async function BlogAdminPage() {
  const siteId = await getAdminSiteId();
  const posts = await prisma.blogPost.findMany({
    where: { siteId },
    orderBy: { createdAt: 'desc' },
    include: {
      translations: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Blog Posts</h2>
          <p className="text-muted-foreground">
            Manage blog posts, news, and info pages.
          </p>
        </div>
        <Link href="/en/admin/blog/new">
          <Button>
            <Plus className="h-4 w-4" />
            New Post
          </Button>
        </Link>
      </div>

      {posts.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title (EN)</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Published</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map((post) => {
                const enTranslation = post.translations.find((t) => t.languageCode === 'en');

                return (
                  <TableRow key={post.id}>
                    <TableCell className="font-medium">
                      {enTranslation?.title || '(No English title)'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{post.slug}</TableCell>
                    <TableCell>
                      {post.isPublished && post.publishedAt && new Date(post.publishedAt) > new Date() ? (
                        <Badge variant="outline" className="border-amber-500 text-amber-600">
                          Scheduled
                        </Badge>
                      ) : (
                        <Badge variant={post.isPublished ? 'default' : 'secondary'}>
                          {post.isPublished ? 'Published' : 'Draft'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {post.publishedAt
                        ? new Date(post.publishedAt).toLocaleDateString('en-GB')
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/en/blog/${post.slug}`} target="_blank">
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/en/admin/blog/${post.slug}`}>
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
          No blog posts yet. Click &quot;New Post&quot; to create your first post.
        </div>
      )}
    </div>
  );
}
