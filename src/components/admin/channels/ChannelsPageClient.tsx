'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Loader2, ShoppingBag, Radio } from 'lucide-react';

interface Channel {
  id: number;
  siteId: string;
  type: string;
  code: string;
  name: string;
  country: string | null;
  apiClientId: string | null;
  apiClientSecret: string | null;
  isLvb: boolean;
  isActive: boolean;
  _count: { listings: number; syncLogs: number };
}

export function ChannelsPageClient() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCountry, setNewCountry] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/channels');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setChannels(data.channels);
    } catch {
      setError('Failed to load channels');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchChannels(); }, [fetchChannels]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/admin/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'bol',
          name: newName.trim(),
          country: newCountry.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to create');
        return;
      }
      setShowCreate(false);
      setNewName('');
      setNewCountry('');
      await fetchChannels();
    } catch {
      setError('Failed to create channel');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (channel: Channel) => {
    try {
      const res = await fetch(`/api/admin/channels/${channel.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !channel.isActive }),
      });
      if (!res.ok) throw new Error('Failed to update');
      await fetchChannels();
    } catch {
      setError('Failed to update channel');
    }
  };

  const handleDelete = async (channel: Channel) => {
    if (!confirm(`Delete channel "${channel.name}"? This will remove all listings on this channel.`)) return;
    try {
      const res = await fetch(`/api/admin/channels/${channel.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to delete');
        return;
      }
      await fetchChannels();
    } catch {
      setError('Failed to delete channel');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading channels...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>dismiss</button>
        </div>
      )}

      <div className="divide-y rounded-lg border bg-card">
        {channels.map((channel) => (
          <div key={channel.id} className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              {channel.type === 'webshop' ? (
                <ShoppingBag className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Radio className="h-5 w-5 text-muted-foreground" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{channel.name}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {channel.type}
                </span>
                {channel.country && (
                  <span className="text-xs text-muted-foreground">{channel.country}</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {channel._count.listings} listings
                {channel.type === 'bol' && ` \u00b7 ${channel._count.syncLogs} syncs`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={channel.isActive}
                onCheckedChange={() => handleToggleActive(channel)}
              />
              <span className="text-xs text-muted-foreground w-12">
                {channel.isActive ? 'Active' : 'Off'}
              </span>
            </div>

            {channel.type !== 'webshop' && (
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(channel)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {showCreate ? (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <h4 className="font-medium">Add Bol.com Channel</h4>
          <div className="flex gap-3">
            <Input
              placeholder="Channel name (e.g., Bol.com NL)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Input
              placeholder="Country (e.g., NL)"
              value={newCountry}
              onChange={(e) => setNewCountry(e.target.value)}
              className="w-24"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
            </Button>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          Add Channel
        </Button>
      )}
    </div>
  );
}
