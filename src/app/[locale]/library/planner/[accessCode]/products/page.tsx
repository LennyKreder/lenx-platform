import { Metadata } from 'next';
import { getAccessibleProductsByCode } from '@/lib/customer-access';
import { LibraryProductsPage } from '@/components/library/products/LibraryProductsPage';

interface PageProps {
  params: Promise<{ locale: string; accessCode: string }>;
}

export const metadata: Metadata = {
  title: 'My Products',
  description: 'Browse and download your digital products',
};

export default async function ProductsPage({ params }: PageProps) {
  const { locale, accessCode } = await params;
  const isNL = locale === 'nl';

  const products = await getAccessibleProductsByCode(accessCode);

  return (
    <div className="container py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {isNL ? 'Mijn producten' : 'My Products'}
        </h1>
        <p className="text-muted-foreground">
          {isNL
            ? 'Bekijk je producten en selecteer er een om de bestanden te downloaden.'
            : 'Browse your products and select one to download the files you need.'}
        </p>
      </div>

      {/* Products Page with filters and grid */}
      <LibraryProductsPage
        products={products}
        locale={locale}
        accessCode={accessCode}
      />
    </div>
  );
}
