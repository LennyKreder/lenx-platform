import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCustomerSession } from '@/lib/customer-session';
import { AccountNav } from '@/components/account/AccountNav';
import { Header } from '@/components/landing/Header';

export const metadata: Metadata = {
  title: 'My Account',
  robots: {
    index: false,
    follow: false,
  },
};

interface AccountLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function AccountLayout({
  children,
  params,
}: AccountLayoutProps) {
  const { locale } = await params;
  const session = await getCustomerSession();

  if (!session) {
    redirect(`/${locale}/login`);
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
          {/* Sidebar Navigation */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <AccountNav locale={locale} />
            </div>
          </aside>

          {/* Main Content */}
          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}
