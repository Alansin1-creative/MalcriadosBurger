import { NextResponse } from 'next/server';
import { ensureInitialized } from '@/lib/init';
import { parseTicketText, applyTicketToInventory } from '@/lib/ocr/ticket-parser';
import { cleanOcrText, extractTextFromImage, EMBOTELLADORA_SOTO_TEMPLATE } from '@/lib/ocr/image-ocr';

export const runtime = 'nodejs';
export const maxDuration = 120;

const SAMPLE_TICKET = `PROVEEDOR: Mercado Central
Tomate 5 kg $140
Cebolla 3 kg $66
Lechuga 2 kg $70
Queso Oaxaca 2 kg $240
TOTAL $516`;

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

export async function GET() {
  return NextResponse.json({
    sample: SAMPLE_TICKET,
    distributorTemplate: EMBOTELLADORA_SOTO_TEMPLATE,
    hint: 'Sube una foto del ticket o envía POST multipart con campo "image"',
    ocrEngine: 'tesseract.js (local)',
  });
}

async function processText(
  text: string,
  apply: boolean,
  ocrMeta?: {
    confidence: number;
    quality?: string;
    didCrop?: boolean;
    suggestTemplate?: boolean;
  }
) {
  const cleaned = cleanOcrText(text);
  const parsed = parseTicketText(cleaned);

  const matchedCount = parsed.lines.length;
  const inventoryCount = parsed.lines.filter((l) => l.ingredientId).length;

  if (!apply) {
    let message = 'Texto extraído. Revisa y confirma para actualizar inventario.';
    if (ocrMeta?.suggestTemplate) {
      message =
        'Parece una nota de Embotelladora Soto, pero la foto no se leyó bien (manos, fondo oscuro o letra manuscrita). Pulsa «Plantilla Soto», agrega cantidad y subtotal al final de cada producto comprado, y confirma.';
    } else if (ocrMeta?.quality === 'low') {
      message =
        'Lectura de baja calidad. Extiende el ticket sobre una mesa, sin manos en la foto, y vuelve a escanear — o usa la plantilla y escribe cantidad + subtotal a mano.';
    } else if (matchedCount === 0) {
      message =
        'OCR completado pero no se detectaron líneas de compra. Edita el texto manualmente (cantidad y subtotal al final de cada producto) o vuelve a fotografiar con buena luz.';
    } else if (inventoryCount === 0) {
      message = `${matchedCount} línea(s) detectadas. No coinciden con ingredientes del restaurante; se guardarán como compra al confirmar.`;
    }

    return NextResponse.json({
      ok: true,
      ocrText: cleaned,
      parsed,
      confidence: ocrMeta?.confidence,
      quality: ocrMeta?.quality,
      didCrop: ocrMeta?.didCrop,
      suggestTemplate: ocrMeta?.suggestTemplate ? 'embotelladora-soto' : undefined,
      message,
    });
  }

  const ticketId = applyTicketToInventory(parsed, cleaned);
  return NextResponse.json({
    ok: true,
    ticketId,
    ocrText: cleaned,
    parsed,
    confidence: ocrMeta?.confidence,
    message:
      matchedCount === 0
        ? 'Ticket guardado sin líneas interpretadas. Revisa el texto OCR.'
        : `Ticket procesado: ${matchedCount} línea(s), ${inventoryCount} vinculada(s) a inventario.`,
  });
}

export async function POST(request: Request) {
  ensureInitialized();
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const file = form.get('image');
    const apply = form.get('apply') === 'true';
    const manualText = form.get('text');

    if (manualText && typeof manualText === 'string' && manualText.trim()) {
      return processText(manualText, apply);
    }

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { ok: false, message: 'Imagen requerida (campo "image")' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { ok: false, message: 'Imagen demasiado grande (máx. 12 MB)' },
        { status: 400 }
      );
    }

    try {
      const { text, confidence, quality, didCrop, suggestTemplate } =
        await extractTextFromImage(buffer);
      if (!text.trim()) {
        return NextResponse.json(
          {
            ok: false,
            message:
              'No se detectó texto en la imagen. Pon el ticket plano, con buena luz y que llene casi toda la foto (sin manos ni fondo oscuro).',
          },
          { status: 422 }
        );
      }
      return processText(text, apply, { confidence, quality, didCrop, suggestTemplate });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error en OCR';
      return NextResponse.json({ ok: false, message: `OCR falló: ${message}` }, { status: 500 });
    }
  }

  const body = await request.json();
  const text = body.text as string;
  const apply = body.apply !== false;

  if (!text?.trim()) {
    return NextResponse.json(
      { ok: false, message: 'Texto del ticket o imagen requerido' },
      { status: 400 }
    );
  }

  return processText(text, apply);
}
