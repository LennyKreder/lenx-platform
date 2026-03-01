'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Crown, Loader2, Package, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface GenerateResult {
  theme?: string;
  name?: string;
  bundleId?: number;
  error?: string;
  skipped?: boolean;
}

interface GenerateResponse {
  success: boolean;
  bundleId?: number;
  message?: string;
  summary?: {
    created: number;
    skipped: number;
    errors: number;
    total: number;
  };
  results?: GenerateResult[];
}

const currentYear = new Date().getFullYear();

type GenerationType = 'theme-bundles' | 'all-access';

export default function GenerateThemeBundlesPage() {
  const [generationType, setGenerationType] = useState<GenerationType>('theme-bundles');
  const [firstYear, setFirstYear] = useState(currentYear);
  const [secondYear, setSecondYear] = useState(currentYear + 1);
  const [languages, setLanguages] = useState<string[]>(['en', 'nl']);
  const [pricingType, setPricingType] = useState<'fixed' | 'discount'>('fixed');
  const [fixedPrice, setFixedPrice] = useState(16.99);
  const [allAccessPrice, setAllAccessPrice] = useState(49.99);
  const [discountPercent, setDiscountPercent] = useState(20);
  const [isPublished, setIsPublished] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDryRun, setIsDryRun] = useState(false);
  const [response, setResponse] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (dryRun: boolean) => {
    setIsLoading(true);
    setError(null);
    setResponse(null);
    setIsDryRun(dryRun);

    try {
      const endpoint = generationType === 'all-access'
        ? '/api/admin/bundles/generate-all-access'
        : '/api/admin/bundles/generate-theme-bundles';

      const bodyData = generationType === 'all-access'
        ? {
            fixedPrice: allAccessPrice,
            isPublished,
            dryRun,
          }
        : {
            firstYear,
            secondYear,
            languages,
            pricingType,
            fixedPrice,
            discountPercent,
            isPublished,
            dryRun,
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate bundles');
      }

      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/en/admin/bundles">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6" />
            Generate Theme Bundles
          </h1>
          <p className="text-muted-foreground">
            Automatically create bundles for each theme spanning two years
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>
              Set the type and pricing for the generated bundles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Bundle Type</Label>
              <Select value={generationType} onValueChange={(v) => setGenerationType(v as GenerationType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="theme-bundles">
                    <span className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Theme Bundles (per theme)
                    </span>
                  </SelectItem>
                  <SelectItem value="all-access">
                    <span className="flex items-center gap-2">
                      <Crown className="h-4 w-4" />
                      All Access Bundle
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {generationType === 'all-access'
                  ? 'Creates a single bundle granting access to all published products'
                  : 'Creates one bundle per theme spanning two years'}
              </p>
            </div>

            {generationType === 'theme-bundles' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstYear">First Year</Label>
                    <Input
                      id="firstYear"
                      type="number"
                      value={firstYear}
                      onChange={(e) => setFirstYear(parseInt(e.target.value, 10))}
                      min={2020}
                      max={2100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondYear">Second Year</Label>
                    <Input
                      id="secondYear"
                      type="number"
                      value={secondYear}
                      onChange={(e) => setSecondYear(parseInt(e.target.value, 10))}
                      min={2020}
                      max={2100}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Product Languages</Label>
                  <Select
                    value={languages.length === 2 ? 'both' : languages[0]}
                    onValueChange={(v) => {
                      if (v === 'both') setLanguages(['en', 'nl']);
                      else setLanguages([v]);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">Both (EN + NL)</SelectItem>
                      <SelectItem value="en">English only</SelectItem>
                      <SelectItem value="nl">Dutch only</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Which product language versions to include in each bundle
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Pricing Type</Label>
                  <Select value={pricingType} onValueChange={(v) => setPricingType(v as 'fixed' | 'discount')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed Price</SelectItem>
                      <SelectItem value="discount">Discount Percent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {pricingType === 'fixed' ? (
                  <div className="space-y-2">
                    <Label htmlFor="fixedPrice">Fixed Price (EUR)</Label>
                    <Input
                      id="fixedPrice"
                      type="number"
                      step="0.01"
                      value={fixedPrice}
                      onChange={(e) => setFixedPrice(parseFloat(e.target.value))}
                      min={0}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="discountPercent">Discount Percent</Label>
                    <Input
                      id="discountPercent"
                      type="number"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(parseInt(e.target.value, 10))}
                      min={0}
                      max={100}
                    />
                  </div>
                )}
              </>
            )}

            {generationType === 'all-access' && (
              <div className="space-y-2">
                <Label htmlFor="allAccessPrice">Price (EUR)</Label>
                <Input
                  id="allAccessPrice"
                  type="number"
                  step="0.01"
                  value={allAccessPrice}
                  onChange={(e) => setAllAccessPrice(parseFloat(e.target.value))}
                  min={0}
                />
                <p className="text-xs text-muted-foreground">
                  Fixed price for the All Access bundle
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isPublished">Publish Immediately</Label>
                <p className="text-sm text-muted-foreground">
                  If enabled, bundles will be visible in the shop
                </p>
              </div>
              <Switch
                id="isPublished"
                checked={isPublished}
                onCheckedChange={setIsPublished}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>
              Preview or generate the bundles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              className="w-full"
              variant="outline"
              onClick={() => handleGenerate(true)}
              disabled={isLoading}
            >
              {isLoading && isDryRun ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Package className="mr-2 h-4 w-4" />
              )}
              Preview (Dry Run)
            </Button>

            <Button
              className="w-full"
              onClick={() => handleGenerate(false)}
              disabled={isLoading}
            >
              {isLoading && !isDryRun ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Generate Bundles
            </Button>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {error}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {response && (
        <Card>
          <CardHeader>
            <CardTitle>
              {isDryRun ? 'Preview Results' : 'Generation Results'}
            </CardTitle>
            {response.summary ? (
              <CardDescription>
                Created: {response.summary.created} | Skipped: {response.summary.skipped} | Errors: {response.summary.errors}
              </CardDescription>
            ) : response.message ? (
              <CardDescription>{response.message}</CardDescription>
            ) : null}
          </CardHeader>
          <CardContent>
            {response.results ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {response.results.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-md text-sm flex justify-between items-center ${
                      result.bundleId
                        ? 'bg-green-50 border border-green-200 text-green-700'
                        : result.skipped
                          ? 'bg-yellow-50 border border-yellow-200 text-yellow-700'
                          : 'bg-red-50 border border-red-200 text-red-700'
                    }`}
                  >
                    <span className="font-medium">{result.theme || result.name}</span>
                    <span>
                      {result.bundleId
                        ? `Created (ID: ${result.bundleId})`
                        : result.error}
                    </span>
                  </div>
                ))}
              </div>
            ) : response.bundleId ? (
              <div className="p-3 rounded-md text-sm bg-green-50 border border-green-200 text-green-700">
                <span className="font-medium">All Access Bundle</span>
                <span className="ml-2">Created (ID: {response.bundleId})</span>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
