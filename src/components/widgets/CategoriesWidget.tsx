'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { productTypes, getProductTypeName } from '@/config/product-types';
import { BookOpen, FileText, Notebook, LayoutTemplate } from 'lucide-react';

interface CategoriesWidgetProps {
  locale: string;
  title?: string;
}

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  planner: BookOpen,
  printable: FileText,
  notebook: Notebook,
  template: LayoutTemplate,
};

export function CategoriesWidget({ locale, title }: CategoriesWidgetProps) {
  const isNL = locale === 'nl';
  const categories = Object.entries(productTypes);

  return (
    <div className="my-8">
      {title !== '' && (
        <h2 className="text-xl font-semibold mb-4">
          {title || (isNL ? 'Categorieën' : 'Categories')}
        </h2>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map(([id, config]) => {
          const Icon = categoryIcons[id] || BookOpen;
          const name = getProductTypeName(id, locale);
          const href = config.dated
            ? `/${locale}/shop/${config.urlSegment}`
            : `/${locale}/shop/${config.urlSegment}`;

          return (
            <Link key={id} href={href}>
              <Card className="h-full hover:shadow-lg transition-shadow group cursor-pointer">
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold group-hover:text-primary transition-colors">
                    {name}
                  </h3>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
