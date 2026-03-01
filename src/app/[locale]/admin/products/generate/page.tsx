'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Package, Sparkles } from 'lucide-react';
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

interface Template {
  id: number;
  translations: { languageCode: string; name: string }[];
}

interface GenerateResult {
  theme: string;
  language: string;
  productId?: number;
  filesLinked?: number;
  error?: string;
  skipped?: boolean;
}

interface GenerateResponse {
  success: boolean;
  summary: {
    created: number;
    skipped: number;
    errors: number;
    total: number;
  };
  results: GenerateResult[];
}

const currentYear = new Date().getFullYear();

export default function GenerateProductsPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState<string>('');
  const [year, setYear] = useState(currentYear);
  const [productLanguages, setProductLanguages] = useState<string[]>(['en', 'nl']);
  const [priceInCents, setPriceInCents] = useState(899);
  const [isPublished, setIsPublished] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isDryRun, setIsDryRun] = useState(false);
  const [response, setResponse] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const templatesRes = await fetch('/api/admin/templates');
        if (templatesRes.ok) {
          const data = await templatesRes.json();
          setTemplates(data.templates || data);
        }
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setIsLoadingData(false);
      }
    }
    loadData();
  }, []);

  const handleGenerate = async (dryRun: boolean) => {
    if (!templateId) {
      setError('Please select a template');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse(null);
    setIsDryRun(dryRun);

    try {
      const res = await fetch('/api/admin/products/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: parseInt(templateId, 10),
          year,
          productLanguages,
          priceInCents,
          isPublished,
          dryRun,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate products');
      }

      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const getTemplateName = (template: Template) => {
    return template.translations.find((t) => t.languageCode === 'en')?.name ||
           template.translations[0]?.name ||
           `Template ${template.id}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/en/admin/products">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6" />
            Generate Products
          </h1>
          <p className="text-muted-foreground">
            Automatically create products for all themes
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>
              Set the template and pricing for products
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoadingData ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Template</Label>
                  <Select value={templateId} onValueChange={setTemplateId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={String(template.id)}>
                          {getTemplateName(template)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    type="number"
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value, 10))}
                    min={2020}
                    max={2100}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Product Languages</Label>
                  <Select
                    value={productLanguages.length === 2 ? 'both' : productLanguages[0]}
                    onValueChange={(v) => {
                      if (v === 'both') setProductLanguages(['en', 'nl']);
                      else setProductLanguages([v]);
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
                    Create products for these language versions
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Price (EUR)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={isNaN(priceInCents) ? '' : (priceInCents / 100)}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setPriceInCents(isNaN(val) ? 0 : Math.round(val * 100));
                    }}
                    min={0}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="isPublished">Publish Immediately</Label>
                    <p className="text-sm text-muted-foreground">
                      If enabled, products will be visible in the shop
                    </p>
                  </div>
                  <Switch
                    id="isPublished"
                    checked={isPublished}
                    onCheckedChange={setIsPublished}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>
              Preview or generate the products
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              className="w-full"
              variant="outline"
              onClick={() => handleGenerate(true)}
              disabled={isLoading || !templateId}
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
              disabled={isLoading || !templateId}
            >
              {isLoading && !isDryRun ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Generate Products
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
            <CardDescription>
              Created: {response.summary.created} | Skipped: {response.summary.skipped} | Errors: {response.summary.errors}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {response.results.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-md text-sm flex justify-between items-center ${
                    result.productId
                      ? 'bg-green-50 border border-green-200 text-green-700'
                      : result.skipped
                        ? 'bg-yellow-50 border border-yellow-200 text-yellow-700'
                        : 'bg-red-50 border border-red-200 text-red-700'
                  }`}
                >
                  <span className="font-medium">
                    {result.theme} ({result.language.toUpperCase()})
                  </span>
                  <span>
                    {result.productId
                      ? `Created (ID: ${result.productId}, ${result.filesLinked || 0} files)`
                      : result.error}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
