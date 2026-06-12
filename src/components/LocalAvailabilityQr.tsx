'use client';

import { useEffect, useMemo, useState } from 'react';
import { Copy, Download, Printer, QrCode } from 'lucide-react';
import { getLocalAvailabilityUrl } from '@/lib/site-url';

function qrImageUrl(target: string, size = 280): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=12&data=${encodeURIComponent(target)}`;
}

export function LocalAvailabilityQr() {
  const [localUrl, setLocalUrl] = useState('');
  const [customBase, setCustomBase] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLocalUrl(getLocalAvailabilityUrl());
    const saved = localStorage.getItem('malcriados_site_url');
    if (saved) setCustomBase(saved);
  }, []);

  const displayUrl = useMemo(() => {
    if (customBase.trim()) {
      return getLocalAvailabilityUrl(customBase.trim().replace(/\/$/, ''));
    }
    return localUrl;
  }, [customBase, localUrl]);

  const qrSrc = displayUrl ? qrImageUrl(displayUrl) : '';

  function saveCustomBase(value: string) {
    setCustomBase(value);
    if (value.trim()) {
      localStorage.setItem('malcriados_site_url', value.trim());
    } else {
      localStorage.removeItem('malcriados_site_url');
    }
  }

  async function copyUrl() {
    if (!displayUrl) return;
    await navigator.clipboard.writeText(displayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function printPoster() {
    document.body.classList.add('qr-print-mode');
    window.print();
    window.addEventListener(
      'afterprint',
      () => document.body.classList.remove('qr-print-mode'),
      { once: true }
    );
  }

  return (
    <>
      <section className="food-panel p-5 no-print">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display flex items-center gap-2 text-lg font-bold text-cream">
              <QrCode size={20} className="text-mustard" />
              QR para clientes
            </h2>
            <p className="mt-1 max-w-xl text-sm text-food-muted">
              Imprime este código en el local. Al escanearlo abren la disponibilidad de mesa y
              bancos en tiempo real.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copyUrl} className="btn-food-outline px-3 py-2 text-xs">
              <Copy size={14} className="mr-1 inline" />
              {copied ? 'Copiado' : 'Copiar enlace'}
            </button>
            <a
              href={qrSrc}
              download="malcriados-disponibilidad-qr.png"
              className="btn-food-outline inline-flex items-center px-3 py-2 text-xs">
              <Download size={14} className="mr-1" />
              Descargar QR
            </a>
            <button type="button" onClick={printPoster} className="btn-food px-3 py-2 text-xs">
              <Printer size={14} className="mr-1 inline" />
              Imprimir cartel
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-[auto_1fr] lg:items-start">
          <div className="mx-auto rounded-xl border border-food-border bg-white p-3 lg:mx-0">
            {qrSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrSrc} alt="QR disponibilidad local" width={200} height={200} className="block" />
            ) : (
              <div className="flex h-[200px] w-[200px] items-center justify-center text-food-muted">
                …
              </div>
            )}
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-food-muted">
                Enlace del QR
              </p>
              <p className="mt-1 break-all font-mono text-xs text-mustard-light">{displayUrl}</p>
            </div>

            <div>
              <label htmlFor="site-url" className="text-xs font-semibold uppercase tracking-wide text-food-muted">
                URL pública del negocio (opcional)
              </label>
              <p className="mt-1 text-xs text-food-muted">
                Si usas Fly.io o un dominio, pon aquí la URL que verán los clientes (ej.{' '}
                <span className="text-cream/80">https://malcriadosburger.fly.dev</span>).
              </p>
              <input
                id="site-url"
                type="url"
                value={customBase}
                onChange={(e) => saveCustomBase(e.target.value)}
                placeholder="https://tu-dominio.com"
                className="food-input mt-2 w-full text-sm"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="local-qr-print hidden print:block">
        <div className="local-qr-print-inner">
          <p className="local-qr-print-brand">🍔 Malcriados Burger & Dogos</p>
          <h1 className="local-qr-print-title">¿Hay lugar?</h1>
          <p className="local-qr-print-sub">Escanea para ver mesa y bancos libres</p>
          {qrSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrSrc} alt="" className="local-qr-print-code" width={320} height={320} />
          )}
          <p className="local-qr-print-url">{displayUrl}</p>
          <p className="local-qr-print-foot">1 mesa en salón · 4 bancos en barra</p>
        </div>
      </div>
    </>
  );
}
