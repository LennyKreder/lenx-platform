import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { Breadcrumbs } from '@/components/shop/Breadcrumbs';
import { prisma } from '@/lib/prisma';
import { getSiteFromHeaders, getSiteBaseUrl } from '@/lib/site-context';
import { buildAlternates } from '@/lib/seo';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tag?: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const site = await getSiteFromHeaders();
  const baseUrl = getSiteBaseUrl(site);
  const isNL = locale === 'nl';
  const title = 'Blog';
  const ogTitle = `Blog - ${site.name}`;
  const description = isNL
    ? `Laatste nieuws en tips van ${site.name}`
    : `Latest news and tips from ${site.name}`;

  return {
    title,
    description,
    alternates: await buildAlternates(locale, '/blog', { baseUrl, siteId: site.id }),
    openGraph: {
      title: ogTitle,
      description,
      type: 'website',
      url: `${baseUrl}/${locale}/blog`,
      siteName: site.name,
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description,
    },
  };
}

export default async function BlogListPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { tag: tagSlug } = await searchParams;
  const site = await getSiteFromHeaders();
  if (!site.hasBlog) notFound();

  // Resolve tag filter
  let activeTag: { id: number; name: string } | null = null;
  if (tagSlug) {
    const slugRoute = await prisma.slugRoute.findFirst({
      where: { slug: tagSlug, entityType: 'tag', tagId: { not: null } },
      include: {
        tag: { include: { translations: true } },
      },
    });
    if (slugRoute?.tag) {
      const tagTranslation = slugRoute.tag.translations.find((t) => t.languageCode === locale)
        || slugRoute.tag.translations.find((t) => t.languageCode === 'en');
      activeTag = { id: slugRoute.tag.id, name: tagTranslation?.name || '' };
    }
  }

  const posts = await prisma.blogPost.findMany({
    where: {
      siteId: site.id,
      isPublished: true,
      publishedAt: { not: null, lte: new Date() },
      ...(activeTag && { tags: { some: { tagId: activeTag.id } } }),
    },
    orderBy: { publishedAt: 'desc' },
    include: {
      translations: {
        where: { languageCode: locale === 'en' ? 'en' : { in: [locale, 'en'] } },
      },
    },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-12">
        <Breadcrumbs
          locale={locale}
          items={[
            { label: 'Blog' },
          ]}
        />

        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold tracking-tight mb-4">Blog</h1>

          {activeTag && (
            <div className="flex items-center gap-2 mb-8">
              <span className="text-sm text-muted-foreground">
                {locale === 'nl' ? 'Gefilterd op' : 'Filtered by'}:
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm">
                {activeTag.name}
                <Link
                  href={`/${locale}/blog`}
                  className="ml-1 text-muted-foreground hover:text-foreground"
                  aria-label={locale === 'nl' ? 'Filter verwijderen' : 'Clear filter'}
                >
                  &times;
                </Link>
              </span>
            </div>
          )}

          {!activeTag && <div className="mb-8" />}

          {posts.length > 0 ? (
            <div className="space-y-8">
              {posts.map((post) => {
                const translation = post.translations.find((t) => t.languageCode === locale)
                  || post.translations.find((t) => t.languageCode === 'en');
                if (!translation) return null;
                const enTranslation = post.translations.find((t) => t.languageCode === 'en');
                const listImage = translation.featuredImage || enTranslation?.featuredImage || post.featuredImage;

                return (
                  <article key={post.id} className="border-b pb-8 last:border-b-0">
                    <div className="flex gap-6">
                      {listImage && (
                        <div className="hidden sm:block shrink-0 w-48 h-32 rounded-lg overflow-hidden bg-muted">
                          <img
                            src={listImage}
                            alt={translation.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <Link href={`/${locale}/blog/${post.slug}`}>
                          <h2 className="text-xl font-semibold hover:text-primary transition-colors mb-2">
                            {translation.title}
                          </h2>
                        </Link>
                        {post.publishedAt && (
                          <p className="text-sm text-muted-foreground mb-3">
                            {new Date(post.publishedAt).toLocaleDateString(locale === 'nl' ? 'nl-NL' : 'en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                        )}
                        {translation.excerpt && (
                          <div
                            className="text-muted-foreground line-clamp-3 prose prose-sm dark:prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: translation.excerpt }}
                          />
                        )}
                        <Link
                          href={`/${locale}/blog/${post.slug}`}
                          className="text-primary text-sm font-medium hover:underline inline-block mt-3"
                        >
                          {locale === 'nl' ? 'Lees meer' : 'Read more'} &rarr;
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-12">
              {locale === 'nl' ? 'Nog geen berichten.' : 'No posts yet.'}
            </p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
