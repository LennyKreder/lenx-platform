import { LibraryEntryPage } from '@/components/library/LibraryEntryPage';

export const metadata = {
  title: 'Planner Library',
  description: 'Access and download your digital planners',
};

export default function PlannerEntryPage() {
  return <LibraryEntryPage productType="planner" />;
}
