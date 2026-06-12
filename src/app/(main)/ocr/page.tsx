'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, ClipboardPaste, FileImage, ScanLine } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';

interface ParsedTicket {
  supplier: string;
  lines: { itemName: string; quantity: number; unit: string; lineTotal: number }[];
  total: number;
  skippedLines?: string[];
}

export default function OcrPage() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedTicket | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [quality, setQuality] = useState<string | null>(null);
  const [suggestTemplate, setSuggestTemplate] = useState(false);
  const [didCrop, setDidCrop] = useState(false);
  const [distributorTemplate, setDistributorTemplate] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/ocr/ticket')
      .then((r) => r.json())
      .then((d) => {
        setText(d.sample);
        if (d.distributorTemplate) setDistributorTemplate(d.distributorTemplate);
      });
  }, []);

  function onFileSelect(file: File | null) {
    if (!file) return;
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setParsed(null);
    setConfidence(null);
    setQuality(null);
    setSuggestTemplate(false);
    setDidCrop(false);
  }

  async function runOcr(apply: boolean) {
    setLoading(true);
    setResult(null);
    try {
      let res: Response;

      if (selectedFile) {
        const form = new FormData();
        form.append('image', selectedFile);
        form.append('apply', String(apply));
        res = await fetch('/api/ocr/ticket', { method: 'POST', body: form });
      } else {
        res = await fetch('/api/ocr/ticket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, apply }),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        setResult(data.message || 'Error al procesar');
        return;
      }

      if (data.ocrText) setText(data.ocrText);
      if (data.confidence != null) setConfidence(data.confidence);
      if (data.quality) setQuality(data.quality);
      setSuggestTemplate(data.suggestTemplate === 'embotelladora-soto');
      setDidCrop(Boolean(data.didCrop));
      setResult(data.message);
      setParsed(data.parsed);
    } finally {
      setLoading(false);
    }
  }

  function useDistributorTemplate() {
    setText(distributorTemplate);
    setResult(
      'Plantilla cargada. Al final de cada producto que compraste, escribe cantidad y subtotal (ej. «... $ 85.00 2 170»), luego Analizar.'
    );
    setParsed(null);
    setConfidence(null);
    setQuality(null);
    setSuggestTemplate(false);
    setDidCrop(false);
  }

  const lowQuality = quality === 'low' || (confidence != null && confidence < 45);
  const showTemplateCta = suggestTemplate || (lowQuality && !!distributorTemplate);

  return (
    <div className="space-y-6">
      <PageHeader
        emoji="🧾"
        title="Tickets de compra"
        subtitle="Fotografía el ticket del proveedor y actualiza la despensa"
      />

      <div className="food-note food-panel p-4 text-sm">
        <p className="font-medium text-mustard-light">Para que el OCR lea bien (como Embotelladora Soto)</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-food-muted">
          <li>Ticket <strong className="text-cream">plano en mesa</strong>, sin sostenerlo con la mano.</li>
          <li>Que el papel ocupe <strong className="text-cream">casi toda la foto</strong>, sin fondo negro alrededor.</li>
          <li>Luz uniforme, sin flash directo; enfoque nítido en cantidades y subtotales escritos a mano.</li>
          <li>Si sale texto basura (~40% confianza), usa la <strong className="text-cream">plantilla</strong> y corrige a mano.</li>
        </ul>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="food-panel space-y-4 p-5">
          <h2 className="font-display font-semibold text-cream">1. Capturar ticket</h2>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="btn-food inline-flex items-center gap-2 px-4 py-2.5 text-sm">
              <Camera size={18} />
              Tomar foto
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="btn-food-outline inline-flex items-center gap-2 px-4 py-2.5 text-sm">
              <FileImage size={18} />
              Subir imagen
            </button>
            {distributorTemplate && (
              <button
                type="button"
                onClick={useDistributorTemplate}
                className="btn-food-outline inline-flex items-center gap-2 px-4 py-2.5 text-sm">
                <ClipboardPaste size={18} />
                Plantilla Soto
              </button>
            )}
          </div>

          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => onFileSelect(e.target.files?.[0] ?? null)}
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            className="hidden"
            onChange={(e) => onFileSelect(e.target.files?.[0] ?? null)}
          />

          {preview ? (
            <div className="overflow-hidden rounded-lg border border-food-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Vista previa del ticket" className="max-h-80 w-full bg-diner-bg object-contain" />
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-food-border text-sm text-food-muted">
              Sin imagen seleccionada
            </div>
          )}

          {selectedFile && <p className="text-xs text-food-muted">{selectedFile.name}</p>}
        </section>

        <section className="food-panel space-y-4 p-5">
          <h2 className="font-display font-semibold text-cream">2. Texto detectado</h2>
          {confidence != null && (
            <p
              className={`text-xs font-medium ${lowQuality ? 'text-ketchup' : 'text-mustard'}`}>
              Confianza OCR: {confidence.toFixed(1)}%
              {quality ? ` · calidad ${quality}` : ''}
              {didCrop ? ' · recorte automático del ticket' : ''}
              {lowQuality && ' — revisa o usa plantilla'}
            </p>
          )}
          {showTemplateCta && distributorTemplate && (
            <div className="rounded-lg border border-mustard/60 bg-mustard/15 px-3 py-3 text-sm text-cream">
              <p className="font-medium text-mustard-light">
                {suggestTemplate
                  ? 'Detectamos Embotelladora Soto, pero el texto salió ilegible.'
                  : 'La lectura automática no fue confiable.'}
              </p>
              <p className="mt-1 text-xs text-food-muted">
                Tesseract no lee bien fotos con manos y números escritos a mano. Usa la plantilla con
                los productos del catálogo y solo anota lo que compraste.
              </p>
              <button
                type="button"
                onClick={useDistributorTemplate}
                className="btn-food mt-3 inline-flex items-center gap-2 px-4 py-2 text-xs">
                <ClipboardPaste size={16} />
                Cargar plantilla Soto
              </button>
            </div>
          )}
          {lowQuality && !showTemplateCta && (
            <div className="rounded-lg border border-ketchup/50 bg-ketchup/15 px-3 py-2 text-xs text-cream">
              La foto incluye mucho fondo o texto manuscrito difícil. Tesseract no lee bien así.
              Vuelve a tomar la foto con el ticket plano o edita el cuadro de abajo.
            </div>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={14}
            className="food-input w-full font-mono text-sm"
            placeholder="El texto aparecerá aquí tras escanear..."
          />
        </section>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => runOcr(false)}
          disabled={loading || (!selectedFile && !text.trim())}
          className="btn-food-outline inline-flex items-center gap-2 px-5 py-2.5 text-sm disabled:opacity-50">
          <ScanLine size={18} />
          {loading ? 'Leyendo (30–60 s, varios intentos)...' : selectedFile ? 'Escanear imagen' : 'Analizar texto'}
        </button>
        <button
          onClick={() => runOcr(true)}
          disabled={loading || !text.trim()}
          className="btn-food px-5 py-2.5 text-sm disabled:opacity-50">
          Confirmar y actualizar despensa
        </button>
      </div>

      {result && (
        <div
          className={`rounded-lg border p-4 text-sm ${
            result.includes('Error') || result.includes('fall') || lowQuality
              ? 'border-ketchup/50 bg-ketchup/20 text-cream'
              : 'food-alert'
          }`}>
          {result}
        </div>
      )}

      {parsed && (
        <div className="food-panel space-y-4 p-5">
          <div>
            <h3 className="font-display font-semibold text-cream">
              Líneas detectadas — {parsed.supplier}
            </h3>
            {parsed.lines.length === 0 ? (
              <p className="mt-2 text-sm text-food-muted">
                No se interpretaron compras. Edita el cuadro de texto y agrega al final de cada producto la
                cantidad y el subtotal manuscritos.
              </p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {parsed.lines.map((line, i) => (
                  <li key={i} className="flex justify-between gap-2 text-cream/90">
                    <span>
                      {line.itemName} — {line.quantity} {line.unit}
                    </span>
                    <span className="food-price shrink-0">${line.lineTotal.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-right font-display font-medium text-mustard">
              Total: ${parsed.total.toFixed(2)}
            </p>
          </div>
          {!!parsed.skippedLines?.length && (
            <div className="border-t border-food-border border-dashed pt-3 text-xs text-food-muted">
              <p className="font-medium text-cream/80">Otras líneas leídas (sin interpretar como compra)</p>
              <ul className="mt-1 max-h-32 space-y-0.5 overflow-y-auto">
                {parsed.skippedLines.slice(0, 12).map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
