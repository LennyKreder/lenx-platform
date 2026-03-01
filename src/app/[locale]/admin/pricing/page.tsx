'use client';

import { useState, useEffect } from 'react';
import { Loader2, DollarSign, AlertCircle, CheckCircle2, Package, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface Product {
  id: number;
  name: string;
  priceInCents: number;
  currency: string;
  year: number | null;
  theme: string | null;
  contentLanguage: string | null;
}

interface Bundle {
  id: number;
  name: string;
  fixedPriceInCents: number | null;
  discountPercent: number | null;
  currency: string;
  contentLanguage: string | null;
  isAllAccess: boolean;
}

type EntityType = 'products' | 'bundles';
type Scope = 'all' | 'individual';
type Operation = 'set' | 'increase_percent' | 'decrease_percent' | 'increase_amount' | 'decrease_amount' | 'set_discount';

export default function PricingPage() {
  const [entityType, setEntityType] = useState<EntityType>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Form state
  const [scope, setScope] = useState<Scope>('all');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [operation, setOperation] = useState<Operation>('set');
  const [value, setValue] = useState<string>('');
  const [excludeAllAccess, setExcludeAllAccess] = useState(false);

  // Result message
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, [entityType]);

  // Reset selection when switching entity type
  useEffect(() => {
    setSelectedIds([]);
    setScope('all');
    setValue('');
    setOperation('set');
    setMessage(null);
    setExcludeAllAccess(false);
  }, [entityType]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/pricing?type=${entityType}`);
      if (response.ok) {
        const data = await response.json();
        if (entityType === 'bundles') {
          setBundles(data.bundles || []);
        } else {
          setProducts(data.products || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (cents: number | null, currency: string) => {
    if (cents === null) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(cents / 100);
  };

  const getCurrentItems = () => {
    return entityType === 'bundles' ? bundles : products;
  };

  const getFilteredItems = () => {
    let items = getCurrentItems();
    if (scope === 'individual' && selectedIds.length > 0) {
      return items.filter((item) => selectedIds.includes(item.id));
    }
    // Exclude all access bundle when checkbox is checked
    if (entityType === 'bundles' && scope === 'all' && excludeAllAccess) {
      items = (items as Bundle[]).filter((b) => !b.isAllAccess);
    }
    return items;
  };

  const calculateNewPrice = (currentPrice: number | null): number | null => {
    const numValue = parseFloat(value) || 0;
    const current = currentPrice || 0;

    if (operation === 'set_discount') {
      return null; // Discount doesn't have a fixed price
    }

    switch (operation) {
      case 'set':
        return Math.round(numValue * 100);
      case 'increase_percent':
        return Math.round(current * (1 + numValue / 100));
      case 'decrease_percent':
        return Math.round(current * (1 - numValue / 100));
      case 'increase_amount':
        return current + Math.round(numValue * 100);
      case 'decrease_amount':
        return current - Math.round(numValue * 100);
      default:
        return current;
    }
  };

  const handleApply = async () => {
    if (!value || parseFloat(value) < 0) {
      setMessage({ type: 'error', text: 'Please enter a valid value' });
      return;
    }

    const filteredItems = getFilteredItems();
    if (filteredItems.length === 0) {
      setMessage({ type: 'error', text: `No ${entityType} selected` });
      return;
    }

    setIsUpdating(true);
    setMessage(null);

    try {
      let apiValue: number;
      if (operation === 'set' || operation === 'increase_amount' || operation === 'decrease_amount') {
        apiValue = Math.round(parseFloat(value) * 100); // Convert to cents
      } else {
        apiValue = parseFloat(value); // Percentage
      }

      // When excluding all access, use individual scope with filtered IDs
      const effectiveScope = (entityType === 'bundles' && scope === 'all' && excludeAllAccess) ? 'individual' : scope;
      const effectiveIds = effectiveScope === 'individual'
        ? (scope === 'individual' ? selectedIds : filteredItems.map(item => item.id))
        : undefined;

      const response = await fetch('/api/admin/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: entityType,
          scope: effectiveScope,
          ids: effectiveIds,
          operation,
          value: apiValue,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: result.message });
        await fetchData();
        setSelectedIds([]);
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to update prices' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update prices' });
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAllVisible = () => {
    const visibleIds = getFilteredItems().map((item) => item.id);
    setSelectedIds(visibleIds);
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const filteredItems = getFilteredItems();
  const hasValue = value !== '' && parseFloat(value) >= 0;

  const getOperations = (): { value: Operation; label: string }[] => {
    if (entityType === 'bundles') {
      return [
        { value: 'set', label: 'Set Fixed Price' },
        { value: 'set_discount', label: 'Set Discount %' },
        { value: 'increase_percent', label: 'Increase by %' },
        { value: 'decrease_percent', label: 'Decrease by %' },
        { value: 'increase_amount', label: 'Increase by Amount' },
        { value: 'decrease_amount', label: 'Decrease by Amount' },
      ];
    }
    return [
      { value: 'set', label: 'Set Fixed Price' },
      { value: 'increase_percent', label: 'Increase by %' },
      { value: 'decrease_percent', label: 'Decrease by %' },
      { value: 'increase_amount', label: 'Increase by Amount' },
      { value: 'decrease_amount', label: 'Decrease by Amount' },
    ];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Quick Price Update</h2>
        <p className="text-muted-foreground">
          Update prices for products or bundles individually or all at once.
        </p>
      </div>

      <Tabs value={entityType} onValueChange={(v) => setEntityType(v as EntityType)}>
        <TabsList>
          <TabsTrigger value="products" className="gap-2">
            <Package className="h-4 w-4" />
            Products ({products.length})
          </TabsTrigger>
          <TabsTrigger value="bundles" className="gap-2">
            <Layers className="h-4 w-4" />
            Bundles ({bundles.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={entityType} className="mt-6">
          {message && (
            <div
              className={cn(
                'flex items-center gap-3 p-4 rounded-lg border mb-6',
                message.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-green-50 border-green-200 text-green-800'
              )}
            >
              {message.type === 'error' ? (
                <AlertCircle className="h-5 w-5 shrink-0" />
              ) : (
                <CheckCircle2 className="h-5 w-5 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Settings Card */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Price Settings
                </CardTitle>
                <CardDescription>
                  Configure scope and price adjustment for {entityType}.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Scope</Label>
                  <Select value={scope} onValueChange={(v) => setScope(v as Scope)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        All {entityType === 'bundles' ? 'Bundles' : 'Products'} ({getCurrentItems().length})
                      </SelectItem>
                      <SelectItem value="individual">
                        Individual {entityType === 'bundles' ? 'Bundles' : 'Products'}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {entityType === 'bundles' && scope === 'all' && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="exclude-all-access"
                      checked={excludeAllAccess}
                      onCheckedChange={(checked) => setExcludeAllAccess(checked === true)}
                    />
                    <label
                      htmlFor="exclude-all-access"
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      Exclude All Access bundle
                    </label>
                  </div>
                )}

                {scope === 'individual' && (
                  <div className="space-y-2">
                    <Label>Selected</Label>
                    <p className="text-sm text-muted-foreground">
                      {selectedIds.length} {entityType === 'bundles' ? 'bundle' : 'product'}(s) selected
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={selectAllVisible}>
                        Select All
                      </Button>
                      <Button variant="outline" size="sm" onClick={clearSelection}>
                        Clear
                      </Button>
                    </div>
                  </div>
                )}

                <div className="border-t pt-4 space-y-2">
                  <Label>Operation</Label>
                  <Select value={operation} onValueChange={(v) => setOperation(v as Operation)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getOperations().map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>
                    {operation === 'set'
                      ? 'New Price (EUR)'
                      : operation === 'set_discount'
                      ? 'Discount Percentage (%)'
                      : operation.includes('percent')
                      ? 'Percentage (%)'
                      : 'Amount (EUR)'}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max={operation === 'set_discount' ? '100' : undefined}
                    step={operation.includes('percent') || operation === 'set_discount' ? '1' : '0.01'}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={
                      operation === 'set_discount'
                        ? 'e.g. 20'
                        : operation.includes('percent')
                        ? 'e.g. 10'
                        : 'e.g. 5.99'
                    }
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handleApply}
                  disabled={isUpdating || !hasValue || filteredItems.length === 0}
                >
                  {isUpdating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Apply to {filteredItems.length} {entityType === 'bundles' ? 'Bundle' : 'Product'}(s)
                </Button>
              </CardContent>
            </Card>

            {/* Preview Card */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Preview</CardTitle>
                <CardDescription>
                  See how prices will change before applying.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-[500px] overflow-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {scope === 'individual' && <TableHead className="w-10"></TableHead>}
                        <TableHead>{entityType === 'bundles' ? 'Bundle' : 'Product'}</TableHead>
                        <TableHead className="text-right">Current</TableHead>
                        {hasValue && <TableHead className="text-right">New</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entityType === 'bundles'
                        ? (filteredItems as Bundle[]).map((bundle) => {
                            const newPrice =
                              hasValue && operation !== 'set_discount'
                                ? calculateNewPrice(bundle.fixedPriceInCents)
                                : null;
                            const newDiscount =
                              hasValue && operation === 'set_discount' ? parseFloat(value) : null;
                            const priceChanged =
                              newPrice !== null && newPrice !== bundle.fixedPriceInCents;
                            const discountChanged =
                              newDiscount !== null && newDiscount !== bundle.discountPercent;

                            return (
                              <TableRow
                                key={bundle.id}
                                className={scope === 'individual' ? 'cursor-pointer' : ''}
                                onClick={
                                  scope === 'individual' ? () => toggleSelection(bundle.id) : undefined
                                }
                              >
                                {scope === 'individual' && (
                                  <TableCell>
                                    <input
                                      type="checkbox"
                                      checked={selectedIds.includes(bundle.id)}
                                      onChange={() => toggleSelection(bundle.id)}
                                      className="h-4 w-4"
                                    />
                                  </TableCell>
                                )}
                                <TableCell>
                                  <div className="font-medium">{bundle.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {bundle.isAllAccess ? 'All Access' : ''}{' '}
                                    {bundle.contentLanguage?.toUpperCase() || 'All'}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  {bundle.fixedPriceInCents
                                    ? formatPrice(bundle.fixedPriceInCents, bundle.currency)
                                    : bundle.discountPercent
                                    ? `${bundle.discountPercent}% off`
                                    : '—'}
                                </TableCell>
                                {hasValue && (
                                  <TableCell className="text-right">
                                    {operation === 'set_discount' ? (
                                      <span
                                        className={discountChanged ? 'text-blue-600 font-medium' : ''}
                                      >
                                        {newDiscount}% off
                                      </span>
                                    ) : (
                                      <span
                                        className={
                                          priceChanged
                                            ? newPrice! > (bundle.fixedPriceInCents || 0)
                                              ? 'text-green-600 font-medium'
                                              : 'text-red-600 font-medium'
                                            : ''
                                        }
                                      >
                                        {formatPrice(Math.max(0, newPrice!), bundle.currency)}
                                      </span>
                                    )}
                                  </TableCell>
                                )}
                              </TableRow>
                            );
                          })
                        : (filteredItems as Product[]).map((product) => {
                            const newPrice = hasValue ? calculateNewPrice(product.priceInCents) : null;
                            const priceChanged =
                              newPrice !== null && newPrice !== product.priceInCents;

                            return (
                              <TableRow
                                key={product.id}
                                className={scope === 'individual' ? 'cursor-pointer' : ''}
                                onClick={
                                  scope === 'individual' ? () => toggleSelection(product.id) : undefined
                                }
                              >
                                {scope === 'individual' && (
                                  <TableCell>
                                    <input
                                      type="checkbox"
                                      checked={selectedIds.includes(product.id)}
                                      onChange={() => toggleSelection(product.id)}
                                      className="h-4 w-4"
                                    />
                                  </TableCell>
                                )}
                                <TableCell>
                                  <div className="font-medium">{product.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {[product.year, product.theme, product.contentLanguage]
                                      .filter(Boolean)
                                      .join(' / ')}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatPrice(product.priceInCents, product.currency)}
                                </TableCell>
                                {hasValue && (
                                  <TableCell className="text-right">
                                    <span
                                      className={
                                        priceChanged
                                          ? newPrice! > product.priceInCents
                                            ? 'text-green-600 font-medium'
                                            : 'text-red-600 font-medium'
                                          : ''
                                      }
                                    >
                                      {formatPrice(Math.max(0, newPrice!), product.currency)}
                                    </span>
                                  </TableCell>
                                )}
                              </TableRow>
                            );
                          })}
                      {filteredItems.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={scope === 'individual' ? 4 : 3}
                            className="text-center py-8 text-muted-foreground"
                          >
                            No {entityType} to display.
                            {scope === 'individual' &&
                              selectedIds.length === 0 &&
                              ` Select ${entityType} from the list.`}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
