'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Store, ExternalLink, Loader2 } from 'lucide-react';

interface Channel {
  id: number;
  type: string;
  code: string;
  name: string;
  country: string | null;
}

interface Listing {
  id: number;
  productId: number;
  channelId: number;
  priceInCents: number;
  compareAtPriceInCents: number | null;
  currency: string;
  isPublished: boolean;
  isFeatured: boolean;
  externalId: string | null;
  deliveryCode: string | null;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  isActive: boolean;
  channel: Channel;
}

interface ProductListingsSectionProps {
  productId: number;
}

export function ProductListingsSection({ productId }: ProductListingsSectionProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [availableChannels, setAvailableChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/products/${productId}/listings`);
      if (!res.ok) throw new Error('Failed to fetch listings');
      const data = await res.json();
      setListings(data.listings);
      setAvailableChannels(data.availableChannels);
    } catch {
      setError('Failed to load listings');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handlePriceChange = async (listing: Listing, newPrice: string) => {
    const cents = Math.round(parseFloat(newPrice) * 100);
    if (isNaN(cents)) return;

    setSaving(listing.id);
    try {
      const res = await fetch(`/api/admin/products/${productId}/listings/${listing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceInCents: cents }),
      });
      if (!res.ok) throw new Error('Failed to update');
      const updated = await res.json();
      setListings((prev) => prev.map((l) => (l.id === listing.id ? updated : l)));
    } catch {
      setError('Failed to update price');
    } finally {
      setSaving(null);
    }
  };

  const handleTogglePublished = async (listing: Listing) => {
    setSaving(listing.id);
    try {
      const res = await fetch(`/api/admin/products/${productId}/listings/${listing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !listing.isPublished }),
      });
      if (!res.ok) throw new Error('Failed to update');
      const updated = await res.json();
      setListings((prev) => prev.map((l) => (l.id === listing.id ? updated : l)));
    } catch {
      setError('Failed to update listing');
    } finally {
      setSaving(null);
    }
  };

  const handleAddListing = async (channelId: number) => {
    setSaving(-1);
    try {
      const res = await fetch(`/api/admin/products/${productId}/listings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId }),
      });
      if (!res.ok) throw new Error('Failed to create listing');
      await fetchListings();
    } catch {
      setError('Failed to add listing');
    } finally {
      setSaving(null);
    }
  };

  const handleDeleteListing = async (listing: Listing) => {
    if (!confirm(`Remove listing from ${listing.channel.name}?`)) return;

    setSaving(listing.id);
    try {
      const res = await fetch(`/api/admin/products/${productId}/listings/${listing.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to delete');
        return;
      }
      await fetchListings();
    } catch {
      setError('Failed to delete listing');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading listings...
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Store className="h-5 w-5" />
          <h3 className="font-semibold">Sales Channel Listings</h3>
        </div>
        {availableChannels.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              id="add-channel"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  handleAddListing(parseInt(e.target.value, 10));
                  e.target.value = '';
                }
              }}
              disabled={saving !== null}
            >
              <option value="" disabled>Add to channel...</option>
              {availableChannels.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.name}{ch.country ? ` (${ch.country})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>dismiss</button>
        </div>
      )}

      {listings.length === 0 ? (
        <p className="text-sm text-muted-foreground">No listings yet. Add this product to a sales channel.</p>
      ) : (
        <div className="divide-y rounded-md border">
          {listings.map((listing) => (
            <div key={listing.id} className="flex items-center gap-4 p-3">
              {/* Channel info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{listing.channel.name}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {listing.channel.type}
                  </span>
                  {listing.channel.country && (
                    <span className="text-xs text-muted-foreground">{listing.channel.country}</span>
                  )}
                </div>
                {listing.externalId && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <ExternalLink className="h-3 w-3" />
                    {listing.externalId}
                  </div>
                )}
                {listing.lastSyncError && (
                  <p className="text-xs text-destructive mt-0.5">{listing.lastSyncError}</p>
                )}
              </div>

              {/* Price */}
              <div className="w-28">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={(listing.priceInCents / 100).toFixed(2)}
                  onBlur={(e) => handlePriceChange(listing, e.target.value)}
                  className="h-8 text-sm"
                  disabled={saving === listing.id}
                />
              </div>

              {/* Published toggle */}
              <div className="flex items-center gap-2">
                <Switch
                  checked={listing.isPublished}
                  onCheckedChange={() => handleTogglePublished(listing)}
                  disabled={saving === listing.id}
                />
                <span className="text-xs text-muted-foreground w-16">
                  {listing.isPublished ? 'Published' : 'Draft'}
                </span>
              </div>

              {/* Delete (not for webshop) */}
              {listing.channel.type !== 'webshop' ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDeleteListing(listing)}
                  disabled={saving === listing.id}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : (
                <div className="w-8" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
