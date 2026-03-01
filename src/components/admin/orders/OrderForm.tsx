'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { Plus, Trash2, Search } from 'lucide-react';
import { themes } from '@/config/themes';

interface SlugRoute {
  languageCode: string;
  slug: string;
}

interface ProductTemplateTranslation {
  languageCode: string;
  name: string;
}

interface BundleTranslation {
  languageCode: string;
  name: string;
}

interface ProductTranslation {
  languageCode: string;
  name: string | null;
}

interface Product {
  id: number;
  year: number | null;
  theme: string | null;
  contentLanguage: string | null;
  priceInCents: number;
  slugs: SlugRoute[];
  translations: ProductTranslation[];
  template: { translations: ProductTemplateTranslation[] } | null;
}

interface Bundle {
  id: number;
  fixedPriceInCents: number | null;
  isAllAccess: boolean;
  slugs: SlugRoute[];
  translations: BundleTranslation[];
}

interface OrderItem {
  type: 'product' | 'bundle';
  id: number;
  name: string;
  priceInCents: number;
  quantity: number;
}

interface OrderFormProps {
  products: Product[];
  bundles: Bundle[];
}

// Helper functions
function getTemplateName(translations: ProductTemplateTranslation[]): string {
  return translations.find(t => t.languageCode === 'en')?.name || translations[0]?.name || 'Unnamed';
}

function getProductName(product: Product): string {
  if (product.template) {
    return getTemplateName(product.template.translations);
  }
  return product.translations.find(t => t.languageCode === 'en')?.name || 'Standalone Product';
}

function getBundleName(translations: BundleTranslation[]): string {
  return translations.find(t => t.languageCode === 'en')?.name || translations[0]?.name || 'Unnamed';
}

export function OrderForm({ products, bundles }: OrderFormProps) {
  const router = useRouter();

  const [formData, setFormData] = useState({
    customerEmail: '',
    externalId: '',
    currency: 'EUR',
    notes: '',
    sendConfirmationEmail: false,
    emailLocale: 'en' as 'en' | 'nl',
  });

  const [items, setItems] = useState<OrderItem[]>([]);
  const [selectedType, setSelectedType] = useState<'product' | 'bundle'>('product');
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter products/bundles based on search query
  const filteredProducts = products.filter((product) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const productName = getProductName(product).toLowerCase();
    const themeData = product.theme ? themes[product.theme as keyof typeof themes] : null;
    const themeName = themeData?.name.toLowerCase() || '';
    const year = product.year?.toString() || '';
    const lang = product.contentLanguage?.toLowerCase() || '';
    return productName.includes(query) || themeName.includes(query) || year.includes(query) || lang.includes(query);
  });

  const filteredBundles = bundles.filter((bundle) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const bundleName = getBundleName(bundle.translations).toLowerCase();
    return bundleName.includes(query);
  });

  const addItem = () => {
    if (!selectedId) return;

    const id = parseInt(selectedId, 10);

    if (selectedType === 'product') {
      const product = products.find((p) => p.id === id);
      if (!product) return;

      // Check if already added
      if (items.some((i) => i.type === 'product' && i.id === id)) return;

      const themeData = product.theme
        ? themes[product.theme as keyof typeof themes]
        : null;

      const productName = getProductName(product);

      setItems((prev) => [
        ...prev,
        {
          type: 'product',
          id: product.id,
          name: `${productName}${product.year ? ` ${product.year}` : ''}${
            themeData ? ` - ${themeData.name}` : ''
          }${product.contentLanguage ? ` (${product.contentLanguage.toUpperCase()})` : ''}${!product.template ? ' (Standalone)' : ''}`,
          priceInCents: product.priceInCents,
          quantity: 1,
        },
      ]);
    } else {
      const bundle = bundles.find((b) => b.id === id);
      if (!bundle) return;

      // Check if already added
      if (items.some((i) => i.type === 'bundle' && i.id === id)) return;

      const bundleName = getBundleName(bundle.translations);

      setItems((prev) => [
        ...prev,
        {
          type: 'bundle',
          id: bundle.id,
          name: `${bundleName}${bundle.isAllAccess ? ' (All Access)' : ''}`,
          priceInCents: bundle.fixedPriceInCents || 0,
          quantity: 1,
        },
      ]);
    }

    setSelectedId('');
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItemPrice = (index: number, priceInCents: number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, priceInCents } : item))
    );
  };

  const subtotal = items.reduce((sum, item) => sum + item.priceInCents * item.quantity, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const payload = {
        customerEmail: formData.customerEmail,
        source: 'admin',
        externalId: formData.externalId || null,
        currency: formData.currency,
        status: 'completed',
        notes: formData.notes || null,
        grantAccess: true,
        sendConfirmationEmail: formData.sendConfirmationEmail,
        emailLocale: formData.emailLocale,
        subtotalInCents: subtotal,
        totalInCents: subtotal,
        items: items.map((item) => ({
          productId: item.type === 'product' ? item.id : undefined,
          bundleId: item.type === 'bundle' ? item.id : undefined,
          quantity: item.quantity,
          priceInCents: item.priceInCents,
        })),
      };

      const response = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create order');
      }

      router.push('/en/admin/orders');
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
        <div className="rounded-lg bg-destructive/10 p-4 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Customer Email */}
        <div className="space-y-1.5">
          <Label htmlFor="customerEmail">Customer Email *</Label>
          <Input
            id="customerEmail"
            type="email"
            value={formData.customerEmail}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, customerEmail: e.target.value }))
            }
            required
          />
        </div>

        {/* External ID */}
        <div className="space-y-1.5">
          <Label htmlFor="externalId">External Order ID / Reference</Label>
          <Input
            id="externalId"
            value={formData.externalId}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, externalId: e.target.value }))
            }
            placeholder="Optional reference number"
          />
        </div>
      </div>

      {/* Order Items */}
      <div className="space-y-4">
        <Label>Order Items</Label>

        {/* Search and add item form */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={`Search ${selectedType}s...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select
              value={selectedType}
              onValueChange={(v) => {
                setSelectedType(v as 'product' | 'bundle');
                setSelectedId('');
                setSearchQuery('');
              }}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="product">Product</SelectItem>
                <SelectItem value="bundle">Bundle</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={`Select a ${selectedType}...`} />
              </SelectTrigger>
              <SelectContent>
                {selectedType === 'product'
                  ? filteredProducts.length === 0 ? (
                      <div className="py-2 px-2 text-sm text-muted-foreground text-center">
                        No products found
                      </div>
                    ) : filteredProducts.map((product) => {
                      const themeData = product.theme
                        ? themes[product.theme as keyof typeof themes]
                        : null;
                      const productName = getProductName(product);
                      return (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          {productName}
                          {product.year && ` ${product.year}`}
                          {themeData && ` - ${themeData.name}`}
                          {product.contentLanguage && ` (${product.contentLanguage.toUpperCase()})`}
                          {!product.template && ' (Standalone)'}
                        </SelectItem>
                      );
                    })
                  : filteredBundles.length === 0 ? (
                      <div className="py-2 px-2 text-sm text-muted-foreground text-center">
                        No bundles found
                      </div>
                    ) : filteredBundles.map((bundle) => {
                      const bundleName = getBundleName(bundle.translations);
                      return (
                        <SelectItem key={bundle.id} value={bundle.id.toString()}>
                          {bundleName}
                          {bundle.isAllAccess && ' (All Access)'}
                        </SelectItem>
                      );
                    })}
              </SelectContent>
            </Select>

            <Button type="button" variant="outline" onClick={addItem} disabled={!selectedId}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Items list */}
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg">
            No items added. Add products or bundles above.
          </p>
        ) : (
          <div className="border rounded-lg divide-y">
            {items.map((item, index) => (
              <div key={`${item.type}-${item.id}`} className="flex items-center gap-4 p-3">
                <div className="flex-1">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-xs text-muted-foreground ml-2 capitalize">
                    ({item.type})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-24"
                    defaultValue={(item.priceInCents / 100).toFixed(2)}
                    onBlur={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        updateItemPrice(index, Math.round(value * 100));
                      }
                    }}
                    placeholder="0.00"
                  />
                  <span className="text-muted-foreground">{formData.currency}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => removeItem(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="flex items-center justify-between p-3 bg-muted/50">
              <span className="font-medium">Total</span>
              <span className="font-bold">
                {formData.currency} {(subtotal / 100).toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
          placeholder="Internal notes about this order..."
          className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      {/* Send Confirmation Email */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="sendConfirmationEmail"
            checked={formData.sendConfirmationEmail}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, sendConfirmationEmail: e.target.checked }))
            }
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label htmlFor="sendConfirmationEmail" className="font-normal">
            Send order confirmation email to customer
          </Label>
        </div>

        {formData.sendConfirmationEmail && (
          <div className="ml-7 flex items-center gap-4">
            <Label className="text-sm text-muted-foreground">Email language:</Label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="emailLocale"
                  value="en"
                  checked={formData.emailLocale === 'en'}
                  onChange={() => setFormData((prev) => ({ ...prev, emailLocale: 'en' }))}
                  className="h-4 w-4"
                />
                <span className="text-sm">English</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="emailLocale"
                  value="nl"
                  checked={formData.emailLocale === 'nl'}
                  onChange={() => setFormData((prev) => ({ ...prev, emailLocale: 'nl' }))}
                  className="h-4 w-4"
                />
                <span className="text-sm">Nederlands</span>
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={isLoading || items.length === 0}>
          {isLoading ? 'Creating...' : 'Create Order'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/en/admin/orders')}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
