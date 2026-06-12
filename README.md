# Plan AI — Sistema Inteligente para Restaurantes

Plataforma de gestión para restaurantes con POS, inventario automático, OCR de tickets, control de recetas, métricas y capa de inteligencia artificial (asistente, pronósticos y recomendaciones).

## Funciones

| Módulo | Descripción |
|--------|-------------|
| **POS** | Punto de venta con pedidos, IVA y descuento automático de inventario |
| **Mesas** | Estado del salón (libre, ocupada, reservada, por cobrar) |
| **Inventario** | Ingredientes, mínimos y alertas de stock |
| **Recetas** | Ingredientes por platillo y margen de rentabilidad |
| **OCR** | Lectura de tickets con **Tesseract.js local** (foto/archivo) → inventario |
| **Reportes** | Gráficas de ventas y pronósticos |
| **Asistente IA** | Chat en lenguaje natural sobre operación del negocio |
| **IA predictiva** | Pronósticos de ventas, demanda y consumo de ingredientes |

## Requisitos

- Node.js 18+
- npm

## Inicio rápido

```bash
cd plan-ai
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

> **Nota:** En entornos Cloud Agent, la URL pública del VM suele apuntar al **puerto 3000**. Asegúrate de ejecutar Plan AI en ese puerto (`npm run dev`), no el backend de `tienda-escaneo`.

La base de datos SQLite se crea en `data/plan-ai.db` con datos de demostración en el primer arranque.

## API principal

- `GET /api/health`
- `GET /api/tables` · `PATCH /api/tables`
- `GET /api/products`
- `GET /api/inventory`
- `GET /api/recipes`
- `POST /api/orders` — acciones: `create`, `add_line`, `pay`
- `GET /api/reports`
- `POST /api/ai/chat` — `{ "message": "..." }`
- `GET /api/ai/forecast`
- `GET /api/ai/recommendations`
- `POST /api/ocr/ticket` — multipart `image` (foto) o JSON `{ "text": "...", "apply": true }`

## Asistente IA — ejemplos

- ¿Qué debo comprar mañana?
- ¿Cuál es mi producto más rentable?
- ¿Por qué bajaron mis ventas?
- ¿Qué productos están por agotarse?

## Próximos pasos (producción)

- Autenticación multi-restaurante
- Mejoras OCR (entrenamiento por tipo de ticket, corrección de errores)
- Integración LLM externa (OpenAI) para respuestas más naturales
- API de clima y eventos locales para pronósticos
- Impresión de tickets y cocina (KDS)
