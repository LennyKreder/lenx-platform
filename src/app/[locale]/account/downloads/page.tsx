import { Metadata } from 'next';
import Link from 'next/link';
import { Download, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getCustomerSession } from '@/lib/customer-session';
import { getAccessibleProductsByCustomer } from '@/lib/customer-access';
import { themes } from '@/config/themes';

interface DownloadsPageProps {
  params: Promise<{ locale: string }>;
}

export const metadata: Metadata = {
  title: 'My Downloads',
  description: 'Download your purchased products',
};

export default async function DownloadsPage({ params }: DownloadsPageProps) {
  const { locale } = await params;
  const session = await getCustomerSession();

  if (!session) {
    return null; // Layout will redirect
  }

  // Get all products the customer has access to
  const products = await getAccessibleProductsByCustomer(session.customerId);

  const isNL = locale === 'nl';

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
            ? 'Selecteer een product om je bestanden te downloaden.'
            : 'Select a product to download your files.'}
        </p>
      </div>

      {products.length === 0 ? (
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const translation = product.translations.find(
              (t) => t.languageCode === locale
            );
            const productName =
              translation?.name || product.templateName || 'Product';
            const themeConfig = product.theme
              ? themes[product.theme as keyof typeof themes]
              : null;

            return (
              <Card key={product.id} className="overflow-hidden">
                {product.images.length > 0 && (
                  <div className="aspect-[4/3] bg-muted">
                    <img
                      src={product.images[0]}
                      alt={productName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2">{productName}</h3>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {product.year && (
                      <Badge variant="outline" className="text-xs">
                        {product.year}
                      </Badge>
                    )}
                    {themeConfig && (
                      <Badge variant="outline" className="text-xs">
                        <span
                          className="w-2 h-2 rounded-full mr-1"
                          style={{
                            backgroundColor: themeConfig.previewColor,
                          }}
                        />
                        {themeConfig.name}
                      </Badge>
                    )}
                    {product.contentLanguage && (
                      <Badge variant="outline" className="text-xs">
                        {languageLabels[product.contentLanguage] || product.contentLanguage}
                      </Badge>
                    )}
                  </div>
                  <Button asChild className="w-full" size="sm">
                    <Link href={`/${locale}/account/downloads/${product.id}`}>
                      {isNL ? 'Downloaden' : 'Download'}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
