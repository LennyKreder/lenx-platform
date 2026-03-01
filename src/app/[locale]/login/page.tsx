import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LoginPageClient } from './LoginPageClient';
import { Header } from '@/components/landing/Header';

export const metadata: Metadata = {
  title: 'Login',
  description: 'Sign in to your Layouts by Lenny account.',
  robots: {
    index: false,
    follow: true,
  },
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Suspense
        fallback={
          <div className="container mx-auto px-4 py-16">
            <div className="max-w-md mx-auto">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-32 mb-8" />
                <div className="border rounded-lg p-6 space-y-4">
                  <div className="h-6 bg-muted rounded w-24 mx-auto" />
                  <div className="h-4 bg-muted rounded w-48 mx-auto" />
                  <div className="h-10 bg-muted rounded w-full" />
                  <div className="h-10 bg-muted rounded w-full" />
                </div>
              </div>
            </div>
          </div>
        }
      >
        <LoginPageClient />
      </Suspense>
    </div>
  );
}
