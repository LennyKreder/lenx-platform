import Link from 'next/link';
import type { Metadata } from 'next';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { getSiteFromHeaders, getSiteBaseUrl } from '@/lib/site-context';
import { notFound } from 'next/navigation';

interface GeneratorPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: GeneratorPageProps): Promise<Metadata> {
  const { locale } = await params;
  const site = await getSiteFromHeaders();
  const isNL = locale === 'nl';

  return {
    title: isNL
      ? `Planner Generator - Binnenkort | ${site.name}`
      : `Planner Generator - Coming Soon | ${site.name}`,
    description: isNL
      ? 'Bouw je eigen digitale planner op maat. Binnenkort beschikbaar!'
      : 'Build your own custom digital planner. Coming soon!',
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default async function GeneratorPage({ params }: GeneratorPageProps) {
  const { locale } = await params;
  const site = await getSiteFromHeaders();
  if (site.siteType !== 'digital') notFound();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-24 flex items-center justify-center">
        <Card className="max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Planner Generator</CardTitle>
            <CardDescription className="text-lg">Coming Soon</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Build your own custom planner with exactly the templates you need.
              Choose your pages, arrange them your way, and generate a unique planner.
            </p>
            <Button asChild variant="outline">
              <Link href={`/${locale}`}>Back to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
