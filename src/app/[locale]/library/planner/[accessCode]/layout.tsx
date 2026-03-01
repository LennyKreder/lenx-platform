import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PurchaseProvider, type AccessCodeData } from '@/contexts/PurchaseContext';
import { isValidDownloadCode, normalizeDownloadCode } from '@/lib/download-code';
import type { ThemeId } from '@/config/themes';
import type { LanguageId } from '@/config/languages';
import type { DeviceId, Orientation } from '@/config/devices';
import { LibraryHeader } from '@/components/library/LibraryHeader';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string; accessCode: string }>;
}

export default async function AccessCodeLayout({ children, params }: LayoutProps) {
  const { locale, accessCode } = await params;
  const normalizedCode = normalizeDownloadCode(accessCode);

  if (!isValidDownloadCode(normalizedCode)) {
    redirect(`/${locale}/library/planner`);
  }

  // Try to find the code in Product or Bundle tables
  const [product, bundle] = await Promise.all([
    prisma.product.findUnique({
      where: { downloadCode: normalizedCode },
      include: { template: true },
    }),
    prisma.bundle.findUnique({
      where: { downloadCode: normalizedCode },
    }),
  ]);

  // Determine which source was found and build access data
  let accessCodeData: AccessCodeData;

  if (product) {
    // Product downloadCode found
    if (!product.isPublished) {
      redirect(`/${locale}/library/planner?error=unavailable`);
    }

    // Get device/orientation from template, with defaults
    const templateDevice = product.template?.device || 'ipad';
    const templateOrientation = product.template?.orientation || 'landscape';

    accessCodeData = {
      code: product.downloadCode,
      productType: 'planner',
      theme: (product.theme || 'all') as ThemeId | 'all',
      language: (product.contentLanguage || 'all') as LanguageId | 'all',
      device: templateDevice as DeviceId,
      orientation: templateOrientation as Orientation,
      email: null,
      createdAt: product.createdAt.toISOString(),
      expiresAt: null,
    };
  } else if (bundle) {
    // Bundle downloadCode found
    if (!bundle.isPublished) {
      redirect(`/${locale}/library/planner?error=unavailable`);
    }

    // Bundles with isAllAccess grant access to all themes/languages
    // Use default device/orientation for bundles (tablet/landscape is most common)
    accessCodeData = {
      code: bundle.downloadCode,
      productType: 'planner',
      theme: bundle.isAllAccess ? 'all' : 'all', // Bundles typically give all themes
      language: 'all', // Bundles typically give all languages
      device: 'ipad' as DeviceId, // Default device for bundles
      orientation: 'landscape' as Orientation, // Default orientation for bundles
      email: null,
      createdAt: bundle.createdAt.toISOString(),
      expiresAt: null,
    };
  } else {
    // No matching code found
    notFound();
  }

  return (
    <PurchaseProvider purchase={accessCodeData}>
      <div className="min-h-screen flex flex-col">
        <LibraryHeader productType="planner" />
        <main className="flex-1">{children}</main>
      </div>
    </PurchaseProvider>
  );
}
