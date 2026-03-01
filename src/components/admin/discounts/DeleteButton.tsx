'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DeleteButtonProps {
  id: number;
  endpoint: 'discounts' | 'discount-codes';
  name: string;
}

export function DeleteButton({ id, endpoint, name }: DeleteButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/${endpoint}/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json();
        alert(result.error || 'Failed to delete');
        return;
      }

      router.refresh();
    } catch {
      alert('Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleDelete}
      disabled={isDeleting}
      className="text-muted-foreground hover:text-destructive"
    >
      {isDeleting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </Button>
  );
}
