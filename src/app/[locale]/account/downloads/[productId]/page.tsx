import Link from 'next/link';
import { Metadata } from 'next';
import { ShieldX } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getCustomerSession } from '@/lib/customer-session';
import { getAccessibleProductsByCustomer } from '@/lib/customer-access';
import { replaceTemplateVariables } from '@/lib/template-variables';
import { ProductWizard } from '@/components/library/products/ProductWizard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { DeviceId, Orientation } from '@/config/devices';

interface PageProps {
  params: Promise<{ locale: string; productId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { productId, locale } = await params;

  const product = await prisma.product.findUnique({
    where: { id: parseInt(productId, 10) },
    include: {
      template: {
        include: { translations: true },
      },
      translations: true,
    },
  });

  if (!product) {
    return { title: 'Product Not Found' };
  }

  const translation = product.translations.find((t) => t.languageCode === locale);
  const templateTranslation = product.template?.translations.find(
    (t) => t.languageCode === locale
  );
  const rawName = translation?.name || templateTranslation?.name || 'Product';
  const productVars = (product.templateVariables || {}) as Record<string, string>;
  const builtIn = { year: product.year, theme: product.theme, language: product.contentLanguage };
  const productName = replaceTemplateVariables(rawName, productVars, builtIn);

  return {
    title: `${productName} - Download`,
    description: `Download your ${productName} files`,
  };
}

export default async function ProductDownloadPage({ params }: PageProps) {
  const { locale, productId } = await params;
  const session = await getCustomerSession();

  if (!session) {
    return null; // Layout will redirect
  }

  // Get all accessible products for this customer
  const accessibleProducts = await getAccessibleProductsByCustomer(
    session.customerId
  );

  // Find the specific product
  const productIdNum = parseInt(productId, 10);
  const product = accessibleProducts.find((p) => p.id === productIdNum);

  const isNL = locale === 'nl';

  if (!product) {
    // User doesn't have access to this product
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ShieldX className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            {isNL ? 'Geen toegang' : 'No Access'}
          </h2>
          <p className="text-muted-foreground text-center mb-4">
            {isNL
              ? 'Je hebt geen toegang tot dit product. Controleer of je bent ingelogd met het juiste account.'
              : "You don't have access to this product. Make sure you're logged in with the correct account."}
          </p>
          <div className="flex gap-4">
            <Button asChild>
              <Link href={`/${locale}/account/downloads`}>
                {isNL ? 'Naar mijn downloads' : 'Go to My Downloads'}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/${locale}/shop`}>
                {isNL ? 'Bekijk producten' : 'Browse Products'}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get device/orientation from the product's template
  const fullProduct = await prisma.product.findUnique({
    where: { id: productIdNum },
    include: { template: true },
  });

  const device = (fullProduct?.template?.device as DeviceId) || null;
  const orientation =
    (fullProduct?.template?.orientation as Orientation) || null;

  return (
    <ProductWizard
      product={product}
      locale={locale}
      device={device}
      orientation={orientation}
      authMode="session"
      backUrl={`/${locale}/account/downloads`}
      backLabel={isNL ? 'Terug naar downloads' : 'Back to Downloads'}
    />
  );
}
