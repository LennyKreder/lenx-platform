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

export default async function DiscountCodesPage() {
  const codes = await prisma.discountCode.findMany({
    orderBy: [
      { isActive: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  const formatValue = (code: typeof codes[0]) => {
    if (code.type === 'percentage') {
      return `${code.valuePercent}%`;
    }
    return `€${((code.valueInCents || 0) / 100).toFixed(2)}`;
  };

  const isExpired = (code: typeof codes[0]) => {
    if (!code.endsAt) return false;
    return new Date(code.endsAt) < new Date();
  };

  const isNotStarted = (code: typeof codes[0]) => {
    if (!code.startsAt) return false;
    return new Date(code.startsAt) > new Date();
  };

  const isMaxedOut = (code: typeof codes[0]) => {
    if (!code.maxUses) return false;
    return code.usedCount >= code.maxUses;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Discount Codes</h1>
          <p className="text-muted-foreground">
            Manage redeemable discount codes that customers can enter at checkout.
          </p>
        </div>
        <Button asChild>
          <Link href="/en/admin/discount-codes/new">
            <Plus className="h-4 w-4 mr-2" />
            New Code
          </Link>
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {codes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No discount codes yet. Create your first code to get started.
                </TableCell>
              </TableRow>
            ) : (
              codes.map((code) => (
                <TableRow key={code.id}>
                  <TableCell>
                    <Link href={`/en/admin/discount-codes/${code.id}`} className="hover:underline">
                      <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                        {code.code}
                      </code>
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/en/admin/discount-codes/${code.id}`} className="hover:underline">
                      {code.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {code.type === 'percentage' ? 'Percentage' : 'Fixed'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono">
                    {formatValue(code)}
                  </TableCell>
                  <TableCell>
                    {code.maxUses ? (
                      <span className={code.usedCount >= code.maxUses ? 'text-destructive' : ''}>
                        {code.usedCount} / {code.maxUses}
                      </span>
                    ) : (
                      <span>{code.usedCount} / ∞</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {!code.isActive ? (
                      <Badge variant="secondary">Inactive</Badge>
                    ) : isExpired(code) ? (
                      <Badge variant="destructive">Expired</Badge>
                    ) : isMaxedOut(code) ? (
                      <Badge variant="destructive">Maxed Out</Badge>
                    ) : isNotStarted(code) ? (
                      <Badge variant="outline">Scheduled</Badge>
                    ) : (
                      <Badge variant="default" className="bg-green-600">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/en/admin/discount-codes/${code.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <DeleteButton
                        id={code.id}
                        endpoint="discount-codes"
                        name={code.name}
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
