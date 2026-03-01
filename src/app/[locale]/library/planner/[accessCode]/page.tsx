import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ locale: string; accessCode: string }>;
}

export const metadata = {
  title: 'Your Planners',
  description: 'Access and download your digital planners',
};

export default async function HubPage({ params }: PageProps) {
  const { locale, accessCode } = await params;

  // Redirect to products browse page
  redirect(`/${locale}/library/planner/${accessCode}/products`);
}
