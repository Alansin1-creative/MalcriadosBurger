import type { SalesReceipt } from '@/lib/receipt/sales-receipt';

export function receiptPdfFilename(orderId: number): string {
  return `malcriados-ticket-${orderId}.pdf`;
}

export async function generateReceiptPdfBlob(
  element: HTMLElement
): Promise<{ blob: Blob; widthMm: number; heightMm: number }> {
  const html2canvas = (await import('html2canvas')).default;
  const { jsPDF } = await import('jspdf');

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#fff8eb',
    useCORS: true,
    logging: false,
  });

  const widthMm = 80;
  const heightMm = (canvas.height * widthMm) / canvas.width;
  const pdf = new jsPDF({
    unit: 'mm',
    format: [widthMm, Math.max(heightMm, 40)],
    orientation: 'portrait',
  });

  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, widthMm, heightMm);
  const blob = pdf.output('blob');

  return { blob, widthMm, heightMm };
}

export async function openPdfForShare(
  blob: Blob,
  filename: string,
  receipt: SalesReceipt
): Promise<'shared' | 'opened' | 'downloaded'> {
  const file = new File([blob], filename, { type: 'application/pdf' });

  if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `Ticket #${receipt.orderId} — ${receipt.restaurantName}`,
        text: `Ticket de venta Malcriados #${receipt.orderId} — ${receipt.total.toFixed(2)} MXN`,
      });
      return 'shared';
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return 'shared';
      }
    }
  }

  const url = URL.createObjectURL(blob);

  try {
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (opened) {
      opened.focus?.();
      window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
      return 'opened';
    }
  } catch {
    // fall through to download
  }

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'downloaded';
}
