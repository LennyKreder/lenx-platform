import { MetadataRoute } from 'next';
import { getSiteFromHeaders, getSiteBaseUrl } from '@/lib/site-context';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const site = await getSiteFromHeaders();
  const baseUrl = getSiteBaseUrl(site);

  return {
    rules: [
      {
        userAgent: 'Googlebot',
        allow: ['/', '/api/feed/', '/api/uploads/'],
        disallow: ['/api/', '/admin/', '*/checkout', '*/checkout/*', '*/account', '*/account/*', '*/login', '*/generator'],
      },
      {
        userAgent: 'Googlebot-Image',
        allow: '/',
      },
      {
        userAgent: '*',
        allow: ['/', '/api/uploads/'],
        disallow: ['/api/', '/admin/', '*/checkout', '*/checkout/*', '*/account', '*/account/*', '*/login', '*/generator'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
