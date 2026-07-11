'use client';

import { useDocStudioState } from './hooks/useDocStudioState';
import { DocStudioShell } from './components/DocStudioShell';
import { DocStudioInstrumentShell } from './components/DocStudioInstrumentShell';
import { DocStudioHeaderStatus } from './components/DocStudioHeaderStatus';
import { DocStudioCatalog } from './components/DocStudioCatalog';
import { DocStudioAppearance } from './components/DocStudioAppearance';
import { DocStudioFields } from './components/DocStudioFields';
import { DocStudioPreview } from './components/DocStudioPreview';

export function DocStudioClient() {
  const state = useDocStudioState();
  const isInstrument = state.selectedTemplate?.mode === 'instrument';

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

          /* Modo Instrumento — a folha usa cor sólida (não variáveis com alfa,
             que somem em alguns motores de impressão) e força 2 colunas nos
             roteiros de observação. Não afeta o preview de documentos. */
          .doc-instrument-line {
            border-bottom: 1px solid #000 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .doc-instrument-checkbox {
            border: 1px solid #000 !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .doc-instrument-checklist--2col {
            column-count: 2 !important;
            -webkit-column-count: 2 !important;
            column-gap: 24px !important;
          }

          .doc-instrument-checklist--1col {
            column-count: 1 !important;
          }

          .doc-instrument-checklist-item {
            break-inside: avoid !important;
            -webkit-column-break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .doc-instrument-freespace {
            height: 60mm !important;
          }

          @page {
            size: A4;
            margin: 14mm;
          }
        }
      `}</style>

      {isInstrument ? (
        <DocStudioInstrumentShell
          header={<DocStudioHeaderStatus />}
          aside={
            <>
              <DocStudioCatalog state={state} />
              <DocStudioAppearance state={state} />
            </>
          }
          bar={<DocStudioFields state={state} />}
          sheet={<DocStudioPreview state={state} />}
        />
      ) : (
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
      )}
    </>
  );
}
