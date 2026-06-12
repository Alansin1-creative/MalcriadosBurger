'use client';

import { useState } from 'react';
import { Printer, Share2, X } from 'lucide-react';
import { SalesReceiptTicket } from '@/components/SalesReceiptTicket';
import {
  generateReceiptPdfBlob,
  openPdfForShare,
  receiptPdfFilename,
} from '@/lib/receipt/export-receipt-pdf';
import type { SalesReceipt } from '@/lib/receipt/sales-receipt';

interface Props {
  receipt: SalesReceipt;
  onClose: () => void;
}

function setExportMode(on: boolean) {
  const el = document.getElementById('sales-receipt-print');
  document.body.classList.toggle('receipt-print-mode', on);
  el?.classList.toggle('receipt-exporting', on);
}

export function PaymentReceiptModal({ receipt, onClose }: Props) {
  const [busy, setBusy] = useState(false);
  const [shareHint, setShareHint] = useState<string | null>(null);

  async function handleSharePdf() {
    const el = document.getElementById('sales-receipt-print');
    if (!el || busy) return;

    setBusy(true);
    setShareHint(null);
    setExportMode(true);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    try {
      const { blob } = await generateReceiptPdfBlob(el);
      const filename = receiptPdfFilename(receipt.orderId);
      const result = await openPdfForShare(blob, filename, receipt);

      if (result === 'shared') {
        setShareHint('Listo — elige WhatsApp, correo u otra app para enviar el ticket.');
      } else if (result === 'opened') {
        setShareHint('PDF abierto. Usa Compartir del navegador para enviarlo.');
      } else {
        setShareHint('PDF descargado. Ábrelo desde Archivos para compartir.');
      }
    } catch {
      setShareHint('No se pudo generar el PDF. Intenta de nuevo.');
    } finally {
      setExportMode(false);
      setBusy(false);
    }
  }

  function handlePrint() {
    if (busy) return;
    setExportMode(true);

    const cleanup = () => {
      setExportMode(false);
    };

    window.addEventListener('afterprint', cleanup, { once: true });
    window.print();
    window.setTimeout(cleanup, 1500);
  }

  return (
    <div className="receipt-overlay fixed inset-0 z-[60] flex items-end justify-center bg-black/80 p-3 sm:items-center sm:p-6">
      <div className="w-full max-w-sm">
        <SalesReceiptTicket receipt={receipt} id="sales-receipt-print" />

        {shareHint && (
          <p className="no-print mt-3 rounded-lg border border-mustard/40 bg-mustard/10 px-3 py-2 text-xs text-mustard-light">
            {shareHint}
          </p>
        )}

        <div className="no-print mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handleSharePdf}
            disabled={busy}
            className="btn-food inline-flex flex-1 items-center justify-center gap-2 py-2.5 text-sm disabled:opacity-50">
            <Share2 size={18} />
            {busy ? 'Generando PDF…' : 'Imprimir ticket (PDF)'}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={busy}
              className="btn-food-outline inline-flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-sm disabled:opacity-50 sm:flex-none">
              <Printer size={18} />
              Impresora
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-food-outline inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm">
              <X size={18} />
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
