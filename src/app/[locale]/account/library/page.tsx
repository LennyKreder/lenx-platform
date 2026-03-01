import Link from 'next/link';
import { Download, ChevronRight, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getCustomerSession } from '@/lib/customer-session';
import { prisma } from '@/lib/prisma';
import { themes } from '@/config/themes';
import { replaceTemplateVariables } from '@/lib/template-variables';

export const dynamic = 'force-dynamic';

interface LibraryPageProps {
  params: Promise<{ locale: string }>;
}

export default async function LibraryPage({ params }: LibraryPageProps) {
  const { locale } = await params;
  const session = await getCustomerSession();

  if (!session) {
    return null; // Layout will redirect
  }

  // Get all customer access records with full product/bundle details
  const accessRecords = await prisma.customerAccess.findMany({
    where: { customerId: session.customerId },
    include: {
      product: {
        include: {
          translations: {
            where: { languageCode: locale },
            take: 1,
          },
          template: {
            include: {
              translations: {
                where: { languageCode: locale },
                take: 1,
              },
            },
          },
        },
      },
      bundle: {
        include: {
          translations: {
            where: { languageCode: locale },
            take: 1,
          },
        },
      },
    },
    orderBy: { grantedAt: 'desc' },
  });

  const isNL = locale === 'nl';

  // Separate products and bundles
  const products = accessRecords
    .filter((access) => access.product)
    .map((access) => {
      const product = access.product!;
      const translation = product.translations[0];
      const templateTranslation = product.template?.translations[0];
      const themeConfig = product.theme
        ? themes[product.theme as keyof typeof themes]
        : null;

      const productVars = (product.templateVariables || {}) as Record<string, string>;
      const builtIn = { year: product.year, theme: product.theme, language: product.contentLanguage };
      const rawName = translation?.name || templateTranslation?.name || 'Product';

      return {
        id: product.id,
        name: replaceTemplateVariables(rawName, productVars, builtIn),
        downloadCode: product.downloadCode,
        year: product.year,
        theme: product.theme,
        themeConfig,
        contentLanguage: product.contentLanguage,
        grantedAt: access.grantedAt,
        images: product.images as string[],
      };
    });

  const bundles = accessRecords
    .filter((access) => access.bundle)
    .map((access) => {
      const bundle = access.bundle!;
      const translation = bundle.translations[0];

      return {
        id: bundle.id,
        name: translation?.name || 'Bundle',
        downloadCode: bundle.downloadCode,
        isAllAccess: bundle.isAllAccess,
        grantedAt: access.grantedAt,
        images: bundle.images as string[],
      };
    });

  const languageLabels: Record<string, string> = {
    en: 'English',
    nl: 'Nederlands',
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">
          {isNL ? 'Mijn downloads' : 'My Downloads'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isNL
            ? 'Alle producten die je hebt gekocht zijn hier beschikbaar.'
            : 'All products you have purchased are available here.'}
        </p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
          <HelpCircle className="h-4 w-4" />
          <span>
            {isNL ? 'Hulp nodig bij het importeren?' : 'Need help importing?'}
          </span>
          <Link
            href={`/${locale}/how-to-import`}
            className="text-primary hover:underline"
          >
            {isNL ? 'Bekijk onze handleiding' : 'View our guide'}
          </Link>
        </div>
      </div>

      {products.length === 0 && bundles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Download className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              {isNL
                ? 'Je hebt nog geen producten gekocht.'
                : "You haven't purchased any products yet."}
            </p>
            <Button asChild className="mt-4">
              <Link href={`/${locale}/shop`}>
                {isNL ? 'Bekijk onze producten' : 'Browse our products'}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Bundles Section */}
          {bundles.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">
                {isNL ? 'Bundels' : 'Bundles'}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {bundles.map((bundle) => (
                  <Card key={bundle.id} className="overflow-hidden">
                    {bundle.images.length > 0 && (
                      <div className="aspect-[4/3] bg-muted">
                        <img
                          src={bundle.images[0]}
                          alt={bundle.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2">{bundle.name}</h3>
                      {bundle.isAllAccess && (
                        <Badge variant="secondary" className="mb-3">
                          {isNL ? 'Volledige toegang' : 'All Access'}
                        </Badge>
                      )}
                      <Button asChild className="w-full" size="sm">
                        <Link href={`/${locale}/library/planner/${bundle.downloadCode}`}>
                          {isNL ? 'Openen' : 'Open'}
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Products Section */}
          {products.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">
                {isNL ? 'Producten' : 'Products'}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => (
                  <Card key={product.id} className="overflow-hidden">
                    {product.images.length > 0 && (
                      <div className="aspect-[4/3] bg-muted">
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2">{product.name}</h3>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {product.year && (
                          <Badge variant="outline" className="text-xs">
                            {product.year}
                          </Badge>
                        )}
                        {product.themeConfig && (
                          <Badge variant="outline" className="text-xs">
                            <span
                              className="w-2 h-2 rounded-full mr-1"
                              style={{
                                backgroundColor: product.themeConfig.previewColor,
                              }}
                            />
                            {product.themeConfig.name}
                          </Badge>
                        )}
                        {product.contentLanguage && (
                          <Badge variant="outline" className="text-xs">
                            {languageLabels[product.contentLanguage] || product.contentLanguage}
                          </Badge>
                        )}
                      </div>
                      <Button asChild className="w-full" size="sm">
                        <Link href={`/${locale}/library/planner/${product.downloadCode}`}>
                          {isNL ? 'Downloaden' : 'Download'}
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
