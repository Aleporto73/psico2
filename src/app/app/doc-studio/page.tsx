'use client';

// Doc Studio — page (Bloco 3: orquestrador enxuto).
// Estado e lógica vivem em ./hooks/useDocStudioState + ./lib/*. Aqui só montamos
// os componentes. Refino visual/impressão premium é do Bloco 5.

import { useDocStudioState } from './hooks/useDocStudioState';
import { DocStudioShell } from './components/DocStudioShell';
import { DocStudioHeaderStatus } from './components/DocStudioHeaderStatus';
import { DocStudioCatalog } from './components/DocStudioCatalog';
import { DocStudioAppearance } from './components/DocStudioAppearance';
import { DocStudioFields } from './components/DocStudioFields';
import { DocStudioPreview } from './components/DocStudioPreview';

export default function DocStudioPage() {
  const state = useDocStudioState();

  return (
    <>
      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
          }

          /* Esconde tudo que não é a folha: cabeçalho da tela, catálogo,
             aparência e campos guiados. Só a área de preview permanece. */
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

          /* Halo decorativo atrás da folha não deve aparecer impresso. */
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
            /* Preserva a cor de fundo sutil da Finalidade na impressão. */
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          /* Evita cortar cabeçalho, metadados, finalidade, seções e
             assinatura no meio, entre uma página impressa e outra. */
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
