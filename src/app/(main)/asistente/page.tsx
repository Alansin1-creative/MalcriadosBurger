'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';

const SUGGESTIONS = [
  '¿Qué debo comprar mañana?',
  '¿Cuál es mi producto más rentable?',
  '¿Por qué bajaron mis ventas?',
  '¿Qué productos están por agotarse?',
  'Pronóstico de demanda esta semana',
  'Dame recomendaciones para aumentar ganancias',
];

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function renderMarkdownLite(text: string) {
  return text.split('\n').map((line, i) => {
    const html = line
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^• /, '• ');
    return (
      <p key={i} className="mb-1" dangerouslySetInnerHTML={{ __html: html }} />
    );
  });
}

export default function AsistentePage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        '¡Qué onda! Soy el asistente de tu fonda. Pregúntame sobre compras, rentabilidad, ventas o inventario.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const userMsg = text.trim();
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: userMsg }]);
    setLoading(true);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: 'assistant', content: data.reply }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col space-y-4 lg:min-h-[calc(100vh-6rem)]">
      <PageHeader
        emoji="🤖"
        title="Asistente de la fonda"
        subtitle="Pregunta en lenguaje natural sobre tu negocio"
      />

      <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            className="rounded-full border border-food-border bg-diner-card px-3 py-1.5 text-xs text-cream/90 hover:border-mustard">
            {s}
          </button>
        ))}
      </div>

      <div className="food-panel flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
                m.role === 'user'
                  ? 'ml-auto bg-ketchup text-cream shadow-md'
                  : 'food-card text-cream/95'
              }`}>
              {m.role === 'assistant' ? renderMarkdownLite(m.content) : m.content}
            </div>
          ))}
          {loading && <p className="text-sm text-food-muted">Revisando la cocina y los números...</p>}
        </div>
        <form
          className="flex gap-2 border-t border-food-border border-dashed p-4"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu pregunta..."
            className="food-input flex-1"
          />
          <button type="submit" disabled={loading} className="btn-food px-4 py-2 text-sm disabled:opacity-50">
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}
