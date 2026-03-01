import { redirect } from 'next/navigation';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { AdminSidebar } from '@/components/admin/layout/AdminSidebar';
import { AdminHeader } from '@/components/admin/layout/AdminHeader';
import { AdminLayoutProvider } from '@/components/admin/layout/AdminLayoutProvider';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function AdminLayout({ children, params }: LayoutProps) {
  const { locale } = await params;
  const isAuthenticated = await isAdminAuthenticated();

  if (!isAuthenticated) {
    redirect(`/${locale}/library/admin-login`);
  }

  return (
    <AdminLayoutProvider>
      <div className="flex h-screen overflow-hidden">
        <AdminSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <AdminHeader />
          <main className="flex-1 overflow-y-auto bg-muted/10 p-6">
            {children}
          </main>
        </div>
      </div>
    </AdminLayoutProvider>
  );
}
