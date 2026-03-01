'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/admin/shared/DataTable';
import { StatusBadge } from '@/components/admin/shared/StatusBadge';
import { InlineConfirm } from '@/components/admin/shared/ConfirmDialog';
import { Pencil, Trash2, FileBox, Copy } from 'lucide-react';

interface FilePropertyConfig {
  templateSet?: boolean;
  timeFormat?: boolean;
  weekStart?: boolean;
  calendar?: boolean;
}

interface SlugRoute {
  languageCode: string;
  slug: string;
}

interface TemplateTranslation {
  languageCode: string;
  name: string;
  description?: string | null;
}

interface Template {
  id: number;
  fileProperties: FilePropertyConfig;
  sortOrder: number;
  isActive: boolean;
  translations: TemplateTranslation[];
  slugs: SlugRoute[];
  _count?: { products: number };
}

interface TemplateTableProps {
  templates: Template[];
}

// Helper to get translation for a specific language
function getTranslation(
  translations: TemplateTranslation[],
  langCode: string
): string {
  const t = translations.find((tr) => tr.languageCode === langCode);
  return t?.name || translations[0]?.name || '-';
}

// Helper to get slug for a specific language
function getSlug(slugs: SlugRoute[], langCode: string): string {
  const s = slugs.find((sl) => sl.languageCode === langCode);
  return s?.slug || slugs[0]?.slug || '-';
}

function getFileVariantCount(props: FilePropertyConfig): number {
  const templateSets = props.templateSet ? 3 : 1;
  const timeFormats = props.timeFormat ? 2 : 1;
  const weekStarts = props.weekStart ? 2 : 1;
  const calendars = props.calendar ? 3 : 1;
  return templateSets * timeFormats * weekStarts * calendars;
}

export function TemplateTable({ templates: initialTemplates }: TemplateTableProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [duplicating, setDuplicating] = useState<number | null>(null);

  const handleDuplicate = async (id: number) => {
    setDuplicating(id);
    try {
      const response = await fetch(`/api/admin/templates/${id}/duplicate`, {
        method: 'POST',
      });

      if (response.ok) {
        const newTemplate = await response.json();
        router.push(`/en/admin/templates/${newTemplate.id}`);
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to duplicate template');
      }
    } finally {
      setDuplicating(null);
    }
  };

  const handleDelete = async (id: number) => {
    const response = await fetch(`/api/admin/templates/${id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      router.refresh();
    } else {
      const data = await response.json();
      alert(data.error || 'Failed to delete template');
    }
  };

  const columns: Column<Template>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (template) => (
        <Link
          href={`/en/admin/templates/${template.id}`}
          className="font-medium hover:underline flex items-center gap-2"
        >
          <FileBox className="h-4 w-4 text-muted-foreground" />
          {getTranslation(template.translations, 'en')}
        </Link>
      ),
    },
    {
      key: 'variants',
      header: 'File Variants',
      cell: (template) => {
        const count = getFileVariantCount(template.fileProperties);
        return (
          <span className="text-muted-foreground">
            {count === 1 ? 'Single file' : `${count} variants`}
          </span>
        );
      },
      className: 'text-center',
    },
    {
      key: 'products',
      header: 'Products',
      cell: (template) => (
        <span className="text-muted-foreground">
          {template._count?.products ?? 0}
        </span>
      ),
      className: 'text-center',
    },
    {
      key: 'status',
      header: 'Status',
      cell: (template) => (
        <StatusBadge status={template.isActive ? 'active' : 'inactive'} />
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (template) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => handleDuplicate(template.id)}
            disabled={duplicating === template.id}
            title="Duplicate template"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Link href={`/en/admin/templates/${template.id}`}>
            <Button variant="ghost" size="icon-sm" title="Edit template">
              <Pencil className="h-4 w-4" />
            </Button>
          </Link>
          <InlineConfirm onConfirm={() => handleDelete(template.id)}>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:text-destructive"
              title="Delete template"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </InlineConfirm>
        </div>
      ),
      className: 'w-32',
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={templates}
      keyField="id"
      emptyMessage="No templates yet. Create your first product template to get started."
    />
  );
}
