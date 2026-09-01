import type { ReactNode } from 'react';
import { LegalDocumentShell, LegalSection } from '@/components/legal/LegalDocument.client';
import type { LegalDocumentKind } from '@/components/legal/legal-document-types';

export type { LegalDocumentKind } from '@/components/legal/legal-document-types';
export { LegalSection };

export function LegalDocument({
  kind,
  title,
  lastUpdated,
  notice,
  children,
}: {
  kind: LegalDocumentKind;
  title: string;
  lastUpdated: string;
  notice?: ReactNode;
  children: ReactNode;
}) {
  return (
    <LegalDocumentShell kind={kind} title={title} lastUpdated={lastUpdated} notice={notice}>
      {children}
    </LegalDocumentShell>
  );
}
