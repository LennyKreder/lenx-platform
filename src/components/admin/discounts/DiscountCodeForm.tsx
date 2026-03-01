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
import { Loader2, RefreshCw } from 'lucide-react';
import { devices } from '@/config/devices';

interface DiscountCodeFormProps {
  discountCode?: {
    id: number;
    code: string;
    name: string;
    description: string | null;
    type: string;
    valueInCents: number | null;
    valuePercent: number | null;
    maxUses: number | null;
    maxUsesPerCustomer: number | null;
    minOrderInCents: number | null;
    excludeBundles: boolean;
    excludeAllAccessBundle: boolean;
    excludeProducts: boolean;
    targetYear: number | null;
    targetDevice: string | null;
    targetTemplateId: number | null;
    startsAt: string | null;
    endsAt: string | null;
    isActive: boolean;
    usedCount: number;
  };
  templates: { id: number; name: string }[];
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function DiscountCodeForm({ discountCode, templates }: DiscountCodeFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState(discountCode?.code || generateCode());
  const [name, setName] = useState(discountCode?.name || '');
  const [description, setDescription] = useState(discountCode?.description || '');
  const [type, setType] = useState(discountCode?.type || 'percentage');
  const [valuePercent, setValuePercent] = useState(discountCode?.valuePercent?.toString() || '');
  const [valueInCents, setValueInCents] = useState(
    discountCode?.valueInCents ? (discountCode.valueInCents / 100).toFixed(2) : ''
  );
  const [maxUses, setMaxUses] = useState(discountCode?.maxUses?.toString() || '');
  const [maxUsesPerCustomer, setMaxUsesPerCustomer] = useState(
    discountCode?.maxUsesPerCustomer?.toString() || ''
  );
  const [minOrderInCents, setMinOrderInCents] = useState(
    discountCode?.minOrderInCents ? (discountCode.minOrderInCents / 100).toFixed(2) : ''
  );
  const [startsAt, setStartsAt] = useState(
    discountCode?.startsAt ? new Date(discountCode.startsAt).toISOString().slice(0, 16) : ''
  );
  const [endsAt, setEndsAt] = useState(
    discountCode?.endsAt ? new Date(discountCode.endsAt).toISOString().slice(0, 16) : ''
  );
  const [isActive, setIsActive] = useState(discountCode?.isActive ?? true);
  const [excludeBundles, setExcludeBundles] = useState(discountCode?.excludeBundles ?? false);
  const [excludeAllAccessBundle, setExcludeAllAccessBundle] = useState(discountCode?.excludeAllAccessBundle ?? false);
  const [excludeProducts, setExcludeProducts] = useState(discountCode?.excludeProducts ?? false);
  const [targetYear, setTargetYear] = useState(discountCode?.targetYear?.toString() || '');
  const [targetDevice, setTargetDevice] = useState(discountCode?.targetDevice || '');
  const [targetTemplateId, setTargetTemplateId] = useState(discountCode?.targetTemplateId?.toString() || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const data = {
        code: code.toUpperCase(),
        name,
        description: description || null,
        type,
        valuePercent: type === 'percentage' ? parseInt(valuePercent, 10) : null,
        valueInCents: type === 'fixed' ? Math.round(parseFloat(valueInCents) * 100) : null,
        maxUses: maxUses ? parseInt(maxUses, 10) : null,
        maxUsesPerCustomer: maxUsesPerCustomer ? parseInt(maxUsesPerCustomer, 10) : null,
        minOrderInCents: minOrderInCents ? Math.round(parseFloat(minOrderInCents) * 100) : null,
        startsAt: startsAt ? new Date(startsAt).toISOString() : null,
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        isActive,
        excludeBundles,
        excludeAllAccessBundle,
        excludeProducts,
        targetYear: targetYear ? parseInt(targetYear, 10) : null,
        targetDevice: targetDevice || null,
        targetTemplateId: targetTemplateId ? parseInt(targetTemplateId, 10) : null,
      };

      const url = discountCode
        ? `/api/admin/discount-codes/${discountCode.id}`
        : '/api/admin/discount-codes';
      const method = discountCode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to save discount code');
      }

      router.push('/en/admin/discount-codes');
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
          <CardTitle>Code Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="code">Code *</Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="SUMMER20"
                  className="uppercase font-mono"
                  required
                  disabled={!!discountCode}
                />
                {!discountCode && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setCode(generateCode())}
                    title="Generate random code"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                The code customers will enter at checkout
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Summer Sale 2024"
                required
              />
              <p className="text-xs text-muted-foreground">
                Internal name for this code
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional internal notes"
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

          <div className="space-y-2">
            <Label htmlFor="minOrder">Minimum Order Value</Label>
            <div className="relative max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                €
              </span>
              <Input
                id="minOrder"
                type="number"
                value={minOrderInCents}
                onChange={(e) => setMinOrderInCents(e.target.value)}
                min="0"
                step="0.01"
                placeholder="0.00"
                className="pl-7"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Leave empty for no minimum
            </p>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <p className="text-sm font-medium">Exclusions</p>
            <p className="text-xs text-muted-foreground">
              Choose which items this code should not apply to
            </p>
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

          <div className="space-y-4 pt-4 border-t">
            <p className="text-sm font-medium">Product Filters (Optional)</p>
            <p className="text-xs text-muted-foreground">
              Narrow down which products this code applies to. All filters are combined (AND logic).
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
          <CardTitle>Usage Limits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="maxUses">Total Uses</Label>
              <Input
                id="maxUses"
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                min="1"
                placeholder="Unlimited"
              />
              <p className="text-xs text-muted-foreground">
                Maximum total times this code can be used
              </p>
              {discountCode && (
                <p className="text-xs text-muted-foreground">
                  Used {discountCode.usedCount} times so far
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxUsesPerCustomer">Uses per Customer</Label>
              <Input
                id="maxUsesPerCustomer"
                type="number"
                value={maxUsesPerCustomer}
                onChange={(e) => setMaxUsesPerCustomer(e.target.value)}
                min="1"
                placeholder="Unlimited"
              />
              <p className="text-xs text-muted-foreground">
                Maximum times each customer can use this code
              </p>
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
          {discountCode ? 'Update Code' : 'Create Code'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/en/admin/discount-codes')}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
