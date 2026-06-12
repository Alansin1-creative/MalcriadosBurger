import sharp from 'sharp';
import { createWorker, PSM, type Worker } from 'tesseract.js';

let workerPromise: Promise<Worker> | null = null;

const PSM_MODES = [PSM.AUTO, PSM.SINGLE_COLUMN, PSM.SINGLE_BLOCK] as const;

const RECEIPT_KEYWORD =
  /embotelladora|manzana|soto|squirt|folio|total|producto|precio|cantidad|subtotal|chihuahua|peñafiel|penafiel|dr\.?\s*pepper|agua natural|vidrio|telera|root beer|botellas|plasticos|\$\s*\d{2,}/i;

const SOTO_HINT =
  /embotelladora|manzana\s*soto|soto\s*(elite|de\s*chihuahua)?|folio\s*n\.?\s*\d{3,5}|5236|squirt|peñafiel|penafiel/i;

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker('spa+eng', 1, {
        logger: () => {},
      });
      await worker.setParameters({
        user_defined_dpi: '300',
        preserve_interword_spaces: '1',
      });
      return worker;
    })();
  }
  return workerPromise;
}

/** Valida y ajusta región de recorte para evitar "extract_area: bad extract area". */
function clampExtractRegion(
  imageWidth: number,
  imageHeight: number,
  left: number,
  top: number,
  width: number,
  height: number
): { left: number; top: number; width: number; height: number } | null {
  if (imageWidth < 2 || imageHeight < 2) return null;

  const l = Math.min(Math.max(0, Math.floor(left)), imageWidth - 1);
  const t = Math.min(Math.max(0, Math.floor(top)), imageHeight - 1);
  const maxW = imageWidth - l;
  const maxH = imageHeight - t;
  const w = Math.min(Math.max(1, Math.floor(width)), maxW);
  const h = Math.min(Math.max(1, Math.floor(height)), maxH);

  if (w < 1 || h < 1 || l + w > imageWidth || t + h > imageHeight) return null;

  return { left: l, top: t, width: w, height: h };
}

/** Recorta la zona clara del papel sobre fondos oscuros (foto con manos). */
export async function cropToReceiptRegion(input: Buffer): Promise<{ cropped: Buffer; didCrop: boolean }> {
  let rotatedBuffer: Buffer;
  try {
    rotatedBuffer = await sharp(input).rotate().png().toBuffer();
  } catch {
    return { cropped: input, didCrop: false };
  }

  const meta = await sharp(rotatedBuffer).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (w < 120 || h < 120) {
    return { cropped: rotatedBuffer, didCrop: false };
  }

  const sampleW = 480;
  const { data, info } = await sharp(rotatedBuffer)
    .resize(sampleW, null, { withoutEnlargement: true })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const sw = info.width;
  const sh = info.height;
  if (sw < 8 || sh < 8) {
    return { cropped: rotatedBuffer, didCrop: false };
  }

  let minX = sw;
  let minY = sh;
  let maxX = 0;
  let maxY = 0;
  let brightCount = 0;

  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const v = data[y * sw + x];
      if (v >= 142) {
        brightCount++;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  const totalPixels = sw * sh;
  const brightRatio = brightCount / totalPixels;
  const boxW = maxX - minX;
  const boxH = maxY - minY;

  if (
    brightCount < totalPixels * 0.04 ||
    brightRatio > 0.88 ||
    boxW < sw * 0.12 ||
    boxH < sh * 0.12
  ) {
    return { cropped: rotatedBuffer, didCrop: false };
  }

  const padX = sw * 0.025;
  const padY = sh * 0.025;
  const leftFrac = Math.max(0, (minX - padX) / sw);
  const topFrac = Math.max(0, (minY - padY) / sh);
  const widthFrac = Math.min(1 - leftFrac, (boxW + padX * 2) / sw);
  const heightFrac = Math.min(1 - topFrac, (boxH + padY * 2) / sh);

  if (widthFrac < 0.2 || heightFrac < 0.2) {
    return { cropped: rotatedBuffer, didCrop: false };
  }

  const region = clampExtractRegion(
    w,
    h,
    leftFrac * w,
    topFrac * h,
    widthFrac * w,
    heightFrac * h
  );

  if (!region) {
    return { cropped: rotatedBuffer, didCrop: false };
  }

  try {
    const cropped = await sharp(rotatedBuffer).extract(region).png().toBuffer();
    return { cropped, didCrop: true };
  } catch {
    return { cropped: rotatedBuffer, didCrop: false };
  }
}

async function prepareBase(input: Buffer) {
  const { cropped } = await cropToReceiptRegion(input);
  let meta = await sharp(cropped).metadata();
  let working = cropped;

  if ((meta.width ?? 0) < 8 || (meta.height ?? 0) < 8) {
    working = await sharp(input).rotate().png().toBuffer();
    meta = await sharp(working).metadata();
  }

  const imgW = meta.width ?? 0;
  const minSide = Math.min(imgW, meta.height ?? 0);
  const targetWidth = Math.min(Math.max(imgW, 1200), 4200);

  let pipeline = sharp(working).resize({
    width: targetWidth,
    withoutEnlargement: minSide >= 1400,
  });

  try {
    const resized = await pipeline.toBuffer();
    const resizedMeta = await sharp(resized).metadata();
    if ((resizedMeta.width ?? 0) >= 16 && (resizedMeta.height ?? 0) >= 16) {
      pipeline = sharp(resized).trim({
        threshold: 22,
        background: '#000000',
      });
    } else {
      pipeline = sharp(resized);
    }
  } catch {
    // trim puede fallar si no hay bordes uniformes o el área es inválida
  }

  return pipeline;
}

/** Variantes de preprocesado para fotos con manos, sombra y texto manuscrito. */
export async function preprocessTicketVariants(input: Buffer): Promise<Buffer[]> {
  let base: sharp.Sharp;
  try {
    base = await prepareBase(input);
  } catch {
    base = sharp(input).rotate().resize({ width: 2000, withoutEnlargement: true });
  }

  const stats = await base.clone().grayscale().stats().catch(() => null);
  const mean = stats?.channels[0]?.mean ?? 128;
  const isDarkPhoto = mean < 115;

  const thresholds = [125, 140, 155, 170];

  const makeVariant = (fn: (p: sharp.Sharp) => sharp.Sharp) =>
    fn(base.clone())
      .png()
      .toBuffer()
      .catch(() => null);

  const [standard, flat, highContrast, ...binary] = await Promise.all([
    makeVariant((p) =>
      p
        .grayscale()
        .normalize()
        .gamma(isDarkPhoto ? 1.25 : 1.12)
        .sharpen({ sigma: 1.6, m1: 0.5, m2: 2.2 })
        .linear(isDarkPhoto ? 1.55 : 1.35, isDarkPhoto ? -55 : -40)
    ),
    makeVariant((p) =>
      p.grayscale().flatten({ background: '#f5f5f5' }).normalize().modulate({ brightness: 1.15 }).sharpen()
    ),
    makeVariant((p) =>
      p.grayscale().normalize().clahe({ width: 48, height: 48 }).sharpen({ sigma: 1.2 }).linear(1.2, -25)
    ),
    ...thresholds.map((t) =>
      makeVariant((p) => p.grayscale().normalize().median(3).threshold(t))
    ),
  ]);

  const variants = [standard, flat, highContrast, ...binary].filter(
    (b): b is Buffer => b != null && b.length > 0
  );

  if (variants.length === 0) {
    const fallback = await sharp(input).rotate().grayscale().normalize().png().toBuffer();
    return [fallback];
  }

  if (isDarkPhoto) {
    const inverted = await makeVariant((p) =>
      p.grayscale().negate().normalize().sharpen().threshold(160).negate()
    );
    if (inverted) variants.push(inverted);
  }

  return variants;
}

/** @deprecated use preprocessTicketVariants */
export async function preprocessTicketImage(input: Buffer): Promise<Buffer> {
  const [first] = await preprocessTicketVariants(input);
  return first;
}

function garbageScore(text: string): number {
  const chars = text.replace(/\s/g, '');
  if (!chars.length) return 100;
  const bad = (text.match(/[\[\]{}|\\=@#~^`<>]/g) || []).length;
  const singleLetterWords = (text.match(/\b[a-zA-Z]\b/g) || []).length;
  const badRatio = (bad + singleLetterWords * 0.5) / chars.length;
  return badRatio * 100;
}

function scoreOcrResult(text: string, confidence: number): number {
  if (!text.trim()) return 0;

  const keywordHits = (text.match(new RegExp(RECEIPT_KEYWORD.source, 'gi')) || []).length;
  const digitCount = (text.match(/\d/g) || []).length;
  const wordCount = text.split(/\s+/).filter((w) => w.length > 2).length;
  const garbage = garbageScore(text);

  let score = confidence * 1.5;
  score += keywordHits * 22;
  score += Math.min(digitCount, 80) * 0.6;
  score += Math.min(wordCount, 60) * 0.4;
  score -= garbage * 2.5;

  return score;
}

function linesFromOcrData(data: { text: string; lines?: { text: string }[] }): string {
  if (data.lines?.length) {
    return data.lines
      .map((l) => l.text.trim())
      .filter((l) => l.length > 0)
      .join('\n');
  }
  return data.text.trim();
}

async function recognizeWithPsm(
  worker: Awaited<ReturnType<typeof getWorker>>,
  image: Buffer,
  psm: (typeof PSM_MODES)[number]
): Promise<{ text: string; confidence: number }> {
  await worker.setParameters({
    tessedit_pageseg_mode: psm,
  });
  const { data } = await worker.recognize(image);
  return {
    text: linesFromOcrData(data),
    confidence: data.confidence,
  };
}

export type OcrQuality = 'high' | 'medium' | 'low';

export function classifyOcrQuality(confidence: number, text: string): OcrQuality {
  const keywords = (text.match(new RegExp(RECEIPT_KEYWORD.source, 'gi')) || []).length;
  const garbage = garbageScore(text);
  if (confidence >= 65 && keywords >= 2 && garbage < 12) return 'high';
  if (confidence >= 45 && keywords >= 1 && garbage < 18) return 'medium';
  return 'low';
}

export function looksLikeEmbotelladoraSoto(text: string): boolean {
  return SOTO_HINT.test(text);
}

export function shouldSuggestSotoTemplate(text: string, confidence: number, quality: OcrQuality): boolean {
  if (quality !== 'low' && confidence >= 45) return false;
  return looksLikeEmbotelladoraSoto(text);
}

/** Plantilla editable para notas Embotelladora Soto cuando el OCR falla. */
export const EMBOTELLADORA_SOTO_TEMPLATE = `EMBOTELLADORA SOTO DE CHIHUAHUA, S.A. DE C.V.
FOLIO N. 5236

Dr Pepper Lata / Root Beer AW lata 24 piezas $ 450.00
Agua Natural Pet 600ml 12pz $ 85.00
Agua Natural Pet 1 litro 12pz $ 125.00
Manzana Soto Elite 355 ml Vidrio 24 pz $ 295.00
Squirt Pet 600 ml 12 pz $ 215.00
BOTELLAS $ 5.00
PLASTICOS $ 30.00

TOTAL 2710`;

/** Extrae texto probando varios preprocesados y modos de segmentación. */
export async function extractTextFromImage(imageBuffer: Buffer): Promise<{
  text: string;
  confidence: number;
  quality: OcrQuality;
  didCrop: boolean;
  suggestTemplate: boolean;
}> {
  const { didCrop } = await cropToReceiptRegion(imageBuffer);
  const variants = await preprocessTicketVariants(imageBuffer);
  const worker = await getWorker();

  let best = { text: '', confidence: 0, score: 0 };

  // Paso rápido: una variante + AUTO suele bastar en fotos buenas
  const quick = await recognizeWithPsm(worker, variants[0], PSM.AUTO);
  const quickScore = scoreOcrResult(quick.text, quick.confidence);
  if (quick.confidence >= 68 && quickScore >= 110) {
    const cleaned = cleanOcrText(quick.text);
    const quality = classifyOcrQuality(quick.confidence, cleaned);
    return {
      text: cleaned,
      confidence: quick.confidence,
      quality,
      didCrop,
      suggestTemplate: shouldSuggestSotoTemplate(cleaned, quick.confidence, quality),
    };
  }

  best = { ...quick, score: quickScore };

  for (const image of variants) {
    for (const psm of PSM_MODES) {
      if (image === variants[0] && psm === PSM.AUTO) continue;

      const result = await recognizeWithPsm(worker, image, psm);
      const score = scoreOcrResult(result.text, result.confidence);
      if (score > best.score) {
        best = { ...result, score };
      }
      if (result.confidence >= 72 && score >= 120) {
        const cleaned = cleanOcrText(result.text);
        const quality = classifyOcrQuality(result.confidence, cleaned);
        return {
          text: cleaned,
          confidence: result.confidence,
          quality,
          didCrop,
          suggestTemplate: shouldSuggestSotoTemplate(cleaned, result.confidence, quality),
        };
      }
    }
  }

  const cleaned = cleanOcrText(best.text);
  const quality = classifyOcrQuality(best.confidence, cleaned);
  return {
    text: cleaned,
    confidence: best.confidence,
    quality,
    didCrop,
    suggestTemplate: shouldSuggestSotoTemplate(cleaned, best.confidence, quality),
  };
}

/** Corrige errores típicos OCR en números y marcas conocidas. */
function fixNumericTokens(line: string): string {
  return line
    .replace(/(?<=\d)[Oo](?=\d)/g, '0')
    .replace(/(?<=[\s$])[Oo](?=\d)/g, '0')
    .replace(/(?<=\d)[lI|](?=\d)/g, '1')
    .replace(/(?<=\s)[S$](?=\d{2,})/g, '5')
    .replace(/(\d)[,\.](\d{3})\b/g, '$1$2')
    .replace(/\bManzana\s+Soto\b/gi, 'Manzana Soto')
    .replace(/\bEMBOTELLADORA\b/gi, 'EMBOTELLADORA')
    .replace(/\bT0TAL\b/gi, 'TOTAL')
    .replace(/\bSquirt\b/gi, 'Squirt')
    .replace(/\bDr\.?\s*Pepper\b/gi, 'Dr Pepper');
}

/** Limpia artefactos típicos del OCR en tickets en español. */
export function cleanOcrText(raw: string): string {
  return raw
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .split('\n')
    .map((line) => fixNumericTokens(line).replace(/\$\s+/g, '$').trim())
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 1 && !/^[\W_]+$/.test(line))
    .join('\n');
}
