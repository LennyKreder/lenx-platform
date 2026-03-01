import Link from 'next/link';
import { Plus, Pencil } from 'lucide-react';
import { DeleteButton } from '@/components/admin/discounts/DeleteButton';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default async function DiscountsPage() {
  const discounts = await prisma.discount.findMany({
    include: {
      product: {
        include: {
          translations: { where: { languageCode: 'en' } },
        },
      },
      bundle: {
        include: {
          translations: { where: { languageCode: 'en' } },
        },
      },
    },
    orderBy: [
      { isActive: 'desc' },
      { priority: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  const formatValue = (discount: typeof discounts[0]) => {
    if (discount.type === 'percentage') {
      return `${discount.valuePercent}%`;
    }
    return `€${((discount.valueInCents || 0) / 100).toFixed(2)}`;
  };

  const formatScope = (discount: typeof discounts[0]) => {
    switch (discount.scope) {
      case 'all':
        return 'Everything';
      case 'product':
        return discount.product?.translations[0]?.name || `Product #${discount.productId}`;
      case 'bundle':
        return discount.bundle?.translations[0]?.name || `Bundle #${discount.bundleId}`;
      default:
        return discount.scope;
    }
  };

  const isExpired = (discount: typeof discounts[0]) => {
    if (!discount.endsAt) return false;
    return new Date(discount.endsAt) < new Date();
  };

  const isNotStarted = (discount: typeof discounts[0]) => {
    if (!discount.startsAt) return false;
    return new Date(discount.startsAt) > new Date();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Discounts</h1>
          <p className="text-muted-foreground">
            Manage automatic price reductions for products, bundles, or everything.
          </p>
        </div>
        <Button asChild>
          <Link href="/en/admin/discounts/new">
            <Plus className="h-4 w-4 mr-2" />
            New Discount
          </Link>
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Applies To</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {discounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No discounts yet. Create your first discount to get started.
                </TableCell>
              </TableRow>
            ) : (
              discounts.map((discount) => (
                <TableRow key={discount.id}>
                  <TableCell className="font-medium">
                    <Link href={`/en/admin/discounts/${discount.id}`} className="hover:underline">
                      {discount.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {discount.type === 'percentage' ? 'Percentage' : 'Fixed'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono">
                    {formatValue(discount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {formatScope(discount)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {!discount.isActive ? (
                      <Badge variant="secondary">Inactive</Badge>
                    ) : isExpired(discount) ? (
                      <Badge variant="destructive">Expired</Badge>
                    ) : isNotStarted(discount) ? (
                      <Badge variant="outline">Scheduled</Badge>
                    ) : (
                      <Badge variant="default" className="bg-green-600">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell>{discount.priority}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/en/admin/discounts/${discount.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <DeleteButton
                        id={discount.id}
                        endpoint="discounts"
                        name={discount.name}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
