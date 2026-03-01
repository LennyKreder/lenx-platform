'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface OrphanCounts {
  slugs: {
    bundles: number;
    products: number;
    categories: number;
    templates: number;
  };
  translations: {
    bundles: number;
    products: number;
    categories: number;
    templates: number;
  };
  bundleItems: number;
  customerAccess: {
    products: number;
    bundles: number;
  };
}

interface CleanupResult {
  success: boolean;
  operation: string;
  results: Record<string, number>;
  totalDeleted: number;
}

export default function CleanupPage() {
  const [counts, setCounts] = useState<OrphanCounts | null>(null);
  const [totalOrphans, setTotalOrphans] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<CleanupResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchCounts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/cleanup');
      if (!res.ok) throw new Error('Failed to fetch counts');
      const data = await res.json();
      setCounts(data.counts);
      setTotalOrphans(data.totalOrphans);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts();
  }, []);

  const runCleanup = async (operation: string) => {
    setIsRunning(operation);
    setError(null);
    setLastResult(null);
    try {
      const res = await fetch('/api/admin/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation }),
      });
      if (!res.ok) throw new Error('Cleanup failed');
      const result = await res.json();
      setLastResult(result);
      // Refresh counts after cleanup
      await fetchCounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cleanup failed');
    } finally {
      setIsRunning(null);
    }
  };

  const CleanupButton = ({
    operation,
    label,
    count,
    variant = 'outline',
  }: {
    operation: string;
    label: string;
    count: number;
    variant?: 'outline' | 'destructive';
  }) => (
    <Button
      variant={variant}
      onClick={() => runCleanup(operation)}
      disabled={isRunning !== null || count === 0}
      className="w-full justify-between"
    >
      <span className="flex items-center gap-2">
        {isRunning === operation ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
        {label}
      </span>
      <span className={`px-2 py-0.5 rounded text-xs ${count > 0 ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground'}`}>
        {count}
      </span>
    </Button>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/en/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trash2 className="h-6 w-6" />
            Database Cleanup
          </h1>
          <p className="text-muted-foreground">
            Remove orphaned records from the database
          </p>
        </div>
        <Button variant="outline" onClick={fetchCounts} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      {lastResult && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md text-green-700">
          <p className="font-medium">Cleanup completed</p>
          <p className="text-sm">Deleted {lastResult.totalDeleted} orphaned records</p>
          {Object.entries(lastResult.results).length > 0 && (
            <ul className="text-sm mt-2 space-y-1">
              {Object.entries(lastResult.results).map(([key, value]) => (
                value > 0 && <li key={key}>{key}: {value} deleted</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Orphaned Slugs */}
        <Card>
          <CardHeader>
            <CardTitle>Orphaned Slugs</CardTitle>
            <CardDescription>
              URL slugs pointing to deleted entities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : counts ? (
              <>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>Bundle slugs:</span>
                    <span className="font-medium">{counts.slugs.bundles}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>Product slugs:</span>
                    <span className="font-medium">{counts.slugs.products}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>Category slugs:</span>
                    <span className="font-medium">{counts.slugs.categories}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>Template slugs:</span>
                    <span className="font-medium">{counts.slugs.templates}</span>
                  </div>
                </div>
                <CleanupButton
                  operation="orphaned-slugs"
                  label="Clean orphaned slugs"
                  count={counts.slugs.bundles + counts.slugs.products + counts.slugs.categories + counts.slugs.templates}
                />
              </>
            ) : null}
          </CardContent>
        </Card>

        {/* Orphaned Translations */}
        <Card>
          <CardHeader>
            <CardTitle>Orphaned Translations</CardTitle>
            <CardDescription>
              Translations for deleted entities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : counts ? (
              <>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>Bundle:</span>
                    <span className="font-medium">{counts.translations.bundles}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>Product:</span>
                    <span className="font-medium">{counts.translations.products}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>Category:</span>
                    <span className="font-medium">{counts.translations.categories}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>Template:</span>
                    <span className="font-medium">{counts.translations.templates}</span>
                  </div>
                </div>
                <CleanupButton
                  operation="orphaned-translations"
                  label="Clean orphaned translations"
                  count={counts.translations.bundles + counts.translations.products + counts.translations.categories + counts.translations.templates}
                />
              </>
            ) : null}
          </CardContent>
        </Card>

        {/* Bundle Items */}
        <Card>
          <CardHeader>
            <CardTitle>Orphaned Bundle Items</CardTitle>
            <CardDescription>
              Bundle items pointing to deleted products
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : counts ? (
              <>
                <div className="flex justify-between p-2 bg-muted rounded text-sm">
                  <span>Orphaned items:</span>
                  <span className="font-medium">{counts.bundleItems}</span>
                </div>
                <CleanupButton
                  operation="orphaned-bundle-items"
                  label="Clean orphaned bundle items"
                  count={counts.bundleItems}
                />
              </>
            ) : null}
          </CardContent>
        </Card>

        {/* Customer Access */}
        <Card>
          <CardHeader>
            <CardTitle>Orphaned Customer Access</CardTitle>
            <CardDescription>
              Access records for deleted products/bundles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : counts ? (
              <>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>Product access:</span>
                    <span className="font-medium">{counts.customerAccess.products}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>Bundle access:</span>
                    <span className="font-medium">{counts.customerAccess.bundles}</span>
                  </div>
                </div>
                <CleanupButton
                  operation="orphaned-access"
                  label="Clean orphaned access"
                  count={counts.customerAccess.products + counts.customerAccess.bundles}
                />
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Clean All */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-700">Clean All Orphans</CardTitle>
          <CardDescription>
            Run all cleanup operations at once
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => runCleanup('all')}
            disabled={isRunning !== null || totalOrphans === 0}
            className="w-full"
          >
            {isRunning === 'all' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Clean all orphaned records ({totalOrphans} total)
          </Button>
        </CardContent>
      </Card>

    </div>
  );
}
