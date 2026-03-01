'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { devices } from '@/config/devices';

interface DiscountFormProps {
  discount?: {
    id: number;
    name: string;
    description: string | null;
    type: string;
    valueInCents: number | null;
    valuePercent: number | null;
    scope: string;
    productId: number | null;
    bundleId: number | null;
    excludeBundles: boolean;
    excludeAllAccessBundle: boolean;
    excludeProducts: boolean;
    targetYear: number | null;
    targetDevice: string | null;
    targetTemplateId: number | null;
    startsAt: string | null;
    endsAt: string | null;
    isActive: boolean;
    priority: number;
  };
  products: { id: number; name: string }[];
  bundles: { id: number; name: string }[];
  templates: { id: number; name: string }[];
}

export function DiscountForm({
  discount,
  products,
  bundles,
  templates,
}: DiscountFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(discount?.name || '');
  const [description, setDescription] = useState(discount?.description || '');
  const [type, setType] = useState(discount?.type || 'percentage');
  const [valuePercent, setValuePercent] = useState(discount?.valuePercent?.toString() || '');
  const [valueInCents, setValueInCents] = useState(
    discount?.valueInCents ? (discount.valueInCents / 100).toFixed(2) : ''
  );
  const [scope, setScope] = useState(discount?.scope || 'all');
  const [productId, setProductId] = useState(discount?.productId?.toString() || '');
  const [bundleId, setBundleId] = useState(discount?.bundleId?.toString() || '');
  const [startsAt, setStartsAt] = useState(
    discount?.startsAt ? new Date(discount.startsAt).toISOString().slice(0, 16) : ''
  );
  const [endsAt, setEndsAt] = useState(
    discount?.endsAt ? new Date(discount.endsAt).toISOString().slice(0, 16) : ''
  );
  const [isActive, setIsActive] = useState(discount?.isActive ?? true);
  const [priority, setPriority] = useState(discount?.priority?.toString() || '0');
  const [excludeBundles, setExcludeBundles] = useState(discount?.excludeBundles ?? false);
  const [excludeAllAccessBundle, setExcludeAllAccessBundle] = useState(discount?.excludeAllAccessBundle ?? false);
  const [excludeProducts, setExcludeProducts] = useState(discount?.excludeProducts ?? false);
  const [targetYear, setTargetYear] = useState(discount?.targetYear?.toString() || '');
  const [targetDevice, setTargetDevice] = useState(discount?.targetDevice || '');
  const [targetTemplateId, setTargetTemplateId] = useState(discount?.targetTemplateId?.toString() || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const data = {
        name,
        description: description || null,
        type,
        valuePercent: type === 'percentage' ? parseInt(valuePercent, 10) : null,
        valueInCents: type === 'fixed' ? Math.round(parseFloat(valueInCents) * 100) : null,
        scope,
        productId: scope === 'product' ? parseInt(productId, 10) : null,
        bundleId: scope === 'bundle' ? parseInt(bundleId, 10) : null,
        excludeBundles: scope === 'all' ? excludeBundles : false,
        excludeAllAccessBundle: scope === 'all' ? excludeAllAccessBundle : false,
        excludeProducts: scope === 'all' ? excludeProducts : false,
        targetYear: targetYear ? parseInt(targetYear, 10) : null,
        targetDevice: targetDevice || null,
        targetTemplateId: targetTemplateId ? parseInt(targetTemplateId, 10) : null,
        startsAt: startsAt ? new Date(startsAt).toISOString() : null,
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        isActive,
        priority: parseInt(priority, 10),
      };

      const url = discount
        ? `/api/admin/discounts/${discount.id}`
        : '/api/admin/discounts';
      const method = discount ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to save discount');
      }

      router.push('/en/admin/discounts');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Summer Sale"
                required
              />
              <p className="text-xs text-muted-foreground">
                Internal name for this discount (not shown to customers)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Input
                id="priority"
                type="number"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                min="0"
              />
              <p className="text-xs text-muted-foreground">
                Higher priority discounts apply first
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional internal notes about this discount"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Discount Value</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type">Discount Type *</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Fixed Amount (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Value *</Label>
              {type === 'percentage' ? (
                <div className="relative">
                  <Input
                    id="value"
                    type="number"
                    value={valuePercent}
                    onChange={(e) => setValuePercent(e.target.value)}
                    min="1"
                    max="100"
                    placeholder="20"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    %
                  </span>
                </div>
              ) : (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    €
                  </span>
                  <Input
                    id="value"
                    type="number"
                    value={valueInCents}
                    onChange={(e) => setValueInCents(e.target.value)}
                    min="0.01"
                    step="0.01"
                    placeholder="5.00"
                    className="pl-7"
                    required
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Applies To</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="scope">Scope *</Label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Everything (all products & bundles)</SelectItem>
                <SelectItem value="product">Specific Product</SelectItem>
                <SelectItem value="bundle">Specific Bundle</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {scope === 'product' && (
            <div className="space-y-2">
              <Label htmlFor="product">Product *</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {scope === 'bundle' && (
            <div className="space-y-2">
              <Label htmlFor="bundle">Bundle *</Label>
              <Select value={bundleId} onValueChange={setBundleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a bundle" />
                </SelectTrigger>
                <SelectContent>
                  {bundles.map((b) => (
                    <SelectItem key={b.id} value={b.id.toString()}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {scope === 'all' && (
            <div className="space-y-4 pt-4 border-t">
              <p className="text-sm font-medium">Exclusions</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Switch
                    id="excludeProducts"
                    checked={excludeProducts}
                    onCheckedChange={(checked) => {
                      setExcludeProducts(checked);
                      if (checked) {
                        setExcludeBundles(false);
                        setExcludeAllAccessBundle(false);
                      }
                    }}
                    disabled={excludeBundles}
                  />
                  <Label
                    htmlFor="excludeProducts"
                    className={`cursor-pointer ${excludeBundles ? 'text-muted-foreground' : ''}`}
                  >
                    Exclude all products (bundles only)
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    id="excludeBundles"
                    checked={excludeBundles}
                    onCheckedChange={(checked) => {
                      setExcludeBundles(checked);
                      if (checked) {
                        setExcludeAllAccessBundle(false);
                        setExcludeProducts(false);
                      }
                    }}
                    disabled={excludeProducts}
                  />
                  <Label
                    htmlFor="excludeBundles"
                    className={`cursor-pointer ${excludeProducts ? 'text-muted-foreground' : ''}`}
                  >
                    Exclude all bundles (products only)
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    id="excludeAllAccessBundle"
                    checked={excludeAllAccessBundle}
                    onCheckedChange={setExcludeAllAccessBundle}
                    disabled={excludeBundles || excludeProducts}
                  />
                  <Label
                    htmlFor="excludeAllAccessBundle"
                    className={`cursor-pointer ${excludeBundles || excludeProducts ? 'text-muted-foreground' : ''}`}
                  >
                    Exclude all-access bundle only
                  </Label>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4 pt-4 border-t">
            <p className="text-sm font-medium">Product Filters (Optional)</p>
            <p className="text-xs text-muted-foreground">
              Narrow down which products this discount applies to. All filters are combined (AND logic).
            </p>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="targetYear">Year</Label>
                <Input
                  id="targetYear"
                  type="number"
                  value={targetYear}
                  onChange={(e) => setTargetYear(e.target.value)}
                  min="2020"
                  max="2100"
                  placeholder="All years"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetDevice">Device</Label>
                <Select
                  value={targetDevice || '__all__'}
                  onValueChange={(v) => setTargetDevice(v === '__all__' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All devices" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All devices</SelectItem>
                    {Object.entries(devices).map(([id, device]) => (
                      <SelectItem key={id} value={id}>
                        {device.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetTemplate">Template</Label>
                <Select
                  value={targetTemplateId || '__all__'}
                  onValueChange={(v) => setTargetTemplateId(v === '__all__' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All templates" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All templates</SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id.toString()}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Validity Period</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startsAt">Starts At</Label>
              <Input
                id="startsAt"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to start immediately
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="endsAt">Ends At</Label>
              <Input
                id="endsAt"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for no end date
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t">
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Active
            </Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {discount ? 'Update Discount' : 'Create Discount'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/en/admin/discounts')}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
