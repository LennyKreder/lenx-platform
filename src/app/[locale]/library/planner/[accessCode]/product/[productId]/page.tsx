import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { getAccessibleProductsByCode } from '@/lib/customer-access';
import { replaceTemplateVariables } from '@/lib/template-variables';
import { ProductWizard } from '@/components/library/products/ProductWizard';
import type { DeviceId, Orientation } from '@/config/devices';

interface PageProps {
  params: Promise<{ locale: string; accessCode: string; productId: string }>;
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
  const templateTranslation = product.template?.translations.find((t) => t.languageCode === locale);
  const rawName = translation?.name || templateTranslation?.name || 'Product';
  const productVars = (product.templateVariables || {}) as Record<string, string>;
  const builtIn = { year: product.year, theme: product.theme, language: product.contentLanguage };
  const productName = replaceTemplateVariables(rawName, productVars, builtIn);

  return {
    title: `${productName} - Download`,
    description: `Download your ${productName} files`,
  };
}

export default async function ProductWizardPage({ params }: PageProps) {
  const { locale, accessCode, productId } = await params;
  const isNL = locale === 'nl';

  // Get all accessible products for this access code
  const accessibleProducts = await getAccessibleProductsByCode(accessCode);

  // Find the specific product
  const productIdNum = parseInt(productId, 10);
  const product = accessibleProducts.find((p) => p.id === productIdNum);

  if (!product) {
    // User doesn't have access to this product
    notFound();
  }

  // Get device/orientation from the product's template
  const fullProduct = await prisma.product.findUnique({
    where: { id: productIdNum },
    include: { template: true },
  });

  const device = (fullProduct?.template?.device as DeviceId) || null;
  const orientation = (fullProduct?.template?.orientation as Orientation) || null;

  return (
    <ProductWizard
      product={product}
      locale={locale}
      device={device}
      orientation={orientation}
      authMode="accessCode"
      accessCode={accessCode}
      backUrl={`/${locale}/library/planner/${accessCode}/products`}
      backLabel={isNL ? 'Terug naar mijn producten' : 'Back to My Products'}
      trackWizardSession={true}
      containerClassName="container py-8"
    />
  );
}
