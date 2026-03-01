import { TemplateForm } from '@/components/admin/templates/TemplateForm';

export const metadata = {
  title: 'New Template - Admin',
};

export default function NewTemplatePage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Create Product Template</h2>
        <p className="text-muted-foreground">
          Define a new product type with its file variations.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <TemplateForm />
      </div>
    </div>
  );
}
