import { redirect } from 'next/navigation';
import { getSiteFromHeaders } from '@/lib/site-context';

export const dynamic = 'force-dynamic';

export default async function RootPage() {
  const site = await getSiteFromHeaders();
  redirect(`/${site.defaultLocale}`);
}
