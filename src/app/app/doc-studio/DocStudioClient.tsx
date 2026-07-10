'use client';

import { useDocStudioState } from './hooks/useDocStudioState';
import { DocStudioShell } from './components/DocStudioShell';
import { DocStudioHeaderStatus } from './components/DocStudioHeaderStatus';
import { DocStudioCatalog } from './components/DocStudioCatalog';
import { DocStudioAppearance } from './components/DocStudioAppearance';
import { DocStudioFields } from './components/DocStudioFields';
import { DocStudioPreview } from './components/DocStudioPreview';

export function DocStudioClient() {
  const state = useDocStudioState();

  return (
    <>
      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
          }

          .doc-studio-no-print {
            display: none !important;
          }

          .doc-studio-shell {
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .doc-studio-print-area {
            position: static !important;
            width: 100% !important;
          }

          .doc-studio-glow {
            display: none !important;
          }

          .doc-studio-page {
            width: auto !important;
            max-width: none !important;
            min-height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .doc-studio-page header,
          .doc-studio-page .break-inside-avoid {
            break-inside: avoid;
          }

          @page {
            size: A4;
            margin: 14mm;
          }
        }
      `}</style>

      <DocStudioShell
        header={<DocStudioHeaderStatus />}
        aside={
          <>
            <DocStudioCatalog state={state} />
            <DocStudioAppearance state={state} />
          </>
        }
        main={<DocStudioFields state={state} />}
        preview={<DocStudioPreview state={state} />}
      />
    </>
  );
}
