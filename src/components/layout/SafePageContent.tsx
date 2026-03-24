import type { ReactNode } from 'react';
import PageErrorBoundary from '@/components/PageErrorBoundary';

interface SafePageContentProps {
  children: ReactNode;
}

export default function SafePageContent({ children }: SafePageContentProps) {
  return (
    <PageErrorBoundary title="A page update broke the current screen.">
      {children}
    </PageErrorBoundary>
  );
}
