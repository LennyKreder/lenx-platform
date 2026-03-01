import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'published' | 'draft' | 'pending' | 'completed' | 'refunded' | 'cancelled';
  label?: string;
  className?: string;
}

const statusConfig = {
  active: { label: 'Active', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' },
  inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100' },
  published: { label: 'Published', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' },
  draft: { label: 'Draft', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100' },
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' },
  refunded: { label: 'Refunded', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100' },
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {label || config.label}
    </Badge>
  );
}
