import { isAdminAuthenticated } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import { ChannelsPageClient } from '@/components/admin/channels/ChannelsPageClient';

export const metadata = {
  title: 'Sales Channels - Admin',
};

export default async function ChannelsPage() {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    redirect('/en/admin/login');
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Sales Channels</h2>
        <p className="text-muted-foreground">
          Manage your sales channels. The webshop channel is auto-created per store.
        </p>
      </div>

      <ChannelsPageClient />
    </div>
  );
}
