import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { Breadcrumbs } from '@/components/shop/Breadcrumbs';
import { prisma } from '@/lib/prisma';
import { getSiteFromHeaders, getSiteBaseUrl } from '@/lib/site-context';
import { buildAlternates } from '@/lib/seo';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { WidgetRenderer } from '@/components/widgets/WidgetRenderer';

export const dynamic = 'force-dynamic';

const WRITERS: Record<string, { name: string; href: string }> = {
  lenny: { name: 'Lenny', href: '/blog/meet-lenny' },
  rodin: { name: 'Rodin', href: '/blog/meet-rodin' },
};

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { locale, slug } = await params;
  const site = await getSiteFromHeaders();
  const baseUrl = getSiteBaseUrl(site);

  const post = await prisma.blogPost.findFirst({
    where: { siteId: site.id, slug },
    include: {
      translations: {
        where: { languageCode: { in: [locale, 'en'] } },
      },
    },
  });

  if (!post) return { title: 'Not Found' };

  const translation = post.translations.find((t) => t.languageCode === locale) || post.translations.find((t) => t.languageCode === 'en');
  const title = translation?.title || 'Blog';
  const ogTitle = `${title} - ${site.name}`;
  const description = translation?.metaDescription || translation?.title || '';
  const enTranslation = post.translations.find((t) => t.languageCode === 'en');
  const ogImage = translation?.featuredImage || enTranslation?.featuredImage || post.featuredImage;

  return {
    title,
    description,
    alternates: await buildAlternates(locale, `/blog/${slug}`, { baseUrl, siteId: site.id }),
    openGraph: {
      title: ogTitle,
      description,
      type: 'article',
      url: `${baseUrl}/${locale}/blog/${slug}`,
      siteName: site.name,
      ...(post.publishedAt && { publishedTime: post.publishedAt.toISOString() }),
      ...(ogImage && { images: [{ url: ogImage, alt: translation?.title || '' }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description,
      ...(ogImage && { images: [ogImage] }),
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { locale, slug } = await params;
  const site = await getSiteFromHeaders();
  if (!site.hasBlog) notFound();
  const baseUrl = getSiteBaseUrl(site);

  const post = await prisma.blogPost.findFirst({
    where: { siteId: site.id, slug },
    include: {
      translations: true,
      tags: {
        include: {
          tag: {
            include: {
              translations: true,
              slugs: { where: { isPrimary: true } },
            },
          },
        },
      },
    },
  });

  if (!post || !post.isPublished || !post.publishedAt || new Date(post.publishedAt) > new Date()) {
    notFound();
  }

  // Try locale, fallback to English
  let translation = post.translations.find((t) => t.languageCode === locale);
  if (!translation) {
    translation = post.translations.find((t) => t.languageCode === 'en');
  }

  if (!translation) {
    notFound();
  }

  // Resolve featured image: locale → EN → legacy post-level
  const enTranslation = post.translations.find((t) => t.languageCode === 'en');
  const featuredImage = translation.featuredImage || enTranslation?.featuredImage || post.featuredImage;

  // BlogPosting JSON-LD
  const blogJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: translation.title,
    ...(featuredImage && { image: featuredImage }),
    ...(post.publishedAt && { datePublished: post.publishedAt.toISOString() }),
    dateModified: post.updatedAt.toISOString(),
    author: {
      '@type': 'Person',
      name: WRITERS[post.writer]?.name || 'Lenny',
      url: `${baseUrl}/${locale}${WRITERS[post.writer]?.href || '/blog/meet-lenny'}`,
    },
    publisher: {
      '@type': 'Organization',
      name: site.name,
      url: baseUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${baseUrl}/${locale}/blog/${slug}`,
    },
  };

  return (
    <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }}
    />
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-12">
        <Breadcrumbs
          locale={locale}
          items={[
            { label: 'Blog', href: `/${locale}/blog` },
            { label: translation.title },
          ]}
        />

        <article className="max-w-3xl mx-auto">
          {featuredImage && (
            <div className="w-full rounded-lg overflow-hidden bg-muted mb-8">
              <img
                src={featuredImage}
                alt={translation.title}
                className="w-full h-auto"
              />
            </div>
          )}

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            {translation.title}
          </h1>

          {post.publishedAt && (
            <p className="text-sm text-muted-foreground mb-8">
              {locale === 'nl' ? 'Geschreven door' : 'Written by'}{' '}
              <Link
                href={`/${locale}${WRITERS[post.writer]?.href || '/blog/meet-lenny'}`}
                className="text-primary hover:underline"
              >
                {WRITERS[post.writer]?.name || 'Lenny'}
              </Link>
              {' · '}
              {new Date(post.publishedAt).toLocaleDateString(locale === 'nl' ? 'nl-NL' : 'en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          )}

          <WidgetRenderer
            html={translation.content}
            locale={locale}
            className="prose prose-neutral dark:prose-invert max-w-none"
          />

          {post.tags.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {post.tags.map((bt) => {
                const tagTranslation = bt.tag.translations.find((t) => t.languageCode === locale)
                  || bt.tag.translations.find((t) => t.languageCode === 'en');
                const tagSlug = bt.tag.slugs.find((s) => s.languageCode === locale)?.slug
                  || bt.tag.slugs[0]?.slug;
                if (!tagTranslation || !tagSlug) return null;
                return (
                  <Link
                    key={bt.tagId}
                    href={`/${locale}/blog?tag=${tagSlug}`}
                    className="inline-flex items-center rounded-full border px-3 py-1 text-sm text-muted-foreground hover:bg-muted transition-colors"
                  >
                    {tagTranslation.name}
                  </Link>
                );
              })}
            </div>
          )}

          <div className="mt-12 pt-8 border-t">
            <Link
              href={`/${locale}/blog`}
              className="text-primary hover:underline"
            >
              &larr; {locale === 'nl' ? 'Terug naar blog' : 'Back to blog'}
            </Link>
          </div>
        </article>
      </main>
      <Footer />
    </div>
    </>
  );
}
