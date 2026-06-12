import { findIngredientByName, addStockFromPurchase } from '../services/inventory';
import { getDb } from '../db';

export interface ParsedTicketLine {
  itemName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  lineTotal: number;
  ingredientId?: number;
}

export interface ParsedTicket {
  supplier: string;
  lines: ParsedTicketLine[];
  total: number;
  /** Líneas detectadas que no se pudieron interpretar como compra */
  skippedLines: string[];
}

const LINE_PATTERNS = [
  /^(.+?)\s+(\d+(?:\.\d+)?)\s*(kg|g|l|ml|pz|pza|pzas|und|un|caja)?\s*(?:x|@)?\s*\$?\s*(\d+(?:\.\d+)?)/i,
  /^(.+?)\s+\$?\s*(\d+(?:\.\d+)?)\s*(?:x|@)\s*(\d+(?:\.\d+)?)/i,
  /^(.+?)\s+(\d+(?:\.\d+)?)\s*$/i,
];

function parseNumber(raw: string): number {
  return parseFloat(raw.replace(/,/g, '').replace(/\s/g, ''));
}

function extractSupplier(lines: string[]): string {
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes('proveedor') || lower.includes('razón social') || lower.includes('razon social')) {
      const part = line.split(/[:]/).pop()?.trim();
      if (part && part.length > 2) return part;
    }
    if (
      /embotelladora|distribuidor|abarrotes|carnicer[ií]a|s\.?\s*a\.?\s*de\s*c\.?\s*v\.?/i.test(line) &&
      line.length > 12 &&
      !lower.includes('producto')
    ) {
      return line.trim();
    }
  }
  return 'Proveedor desconocido';
}

function extractTotal(lines: string[]): number {
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const lower = line.toLowerCase();
    if (!lower.includes('total') || lower.includes('subtotal')) continue;
    const nums = [...line.matchAll(/\d{2,6}(?:\.\d{2})?/g)];
    if (nums.length) {
      return parseNumber(nums[nums.length - 1][0]);
    }
  }
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 5); i--) {
    const m = lines[i].match(/^TOTAL\s*\$?\s*([\d,\.]+)/i);
    if (m) return parseNumber(m[1]);
    const lone = lines[i].match(/^(\d{3,6})$/);
    if (lone && lines[i - 1]?.toLowerCase().includes('total')) {
      return parseNumber(lone[1]);
    }
  }
  return 0;
}

/**
 * Filas de tabla con cantidad y subtotal manuscritos al final
 * (ej. nota de Embotelladora Soto: "... $ 295.00 7 2065").
 */
function parseDistributorTableRow(line: string): ParsedTicketLine | null {
  const lower = line.toLowerCase();
  if (lower.includes('total') || lower.includes('producto') || lower.includes('precio')) return null;
  if (lower.includes('folio') || lower.includes('rfc') || /^sr\.?\s/i.test(line)) return null;
  if (line.length < 8) return null;
  // Fila del catálogo impreso sin cantidad/subtotal manuscritos
  if (/\$\s*[\d,\.]+\.?\d*\s*$/.test(line.trim())) return null;

  const numberMatches = [...line.matchAll(/\b(\d{1,6}(?:\.\d{1,2})?)\b/g)];
  if (numberMatches.length < 2) return null;

  const subtotalMatch = numberMatches[numberMatches.length - 1];
  const qtyMatch = numberMatches[numberMatches.length - 2];

  const subtotal = parseNumber(subtotalMatch[1]);
  const qty = parseNumber(qtyMatch[1]);

  if (!Number.isFinite(qty) || !Number.isFinite(subtotal) || qty <= 0) return null;
  if (qty > 500 || subtotal > 500_000) return null;

  // Debe parecer compra real: subtotal >> cantidad (evita confundir 355 ml / 24 pz con qty/subtotal)
  if (subtotal < qty * 15) return null;
  if (subtotal < 40) return null;

  let name = line.slice(0, qtyMatch.index!).trim();
  name = name.replace(/\$\s*[\d,\.]+\.?\d*\s*$/, '').trim();
  name = name.replace(/\s+\d+\s*$/, '').trim();

  if (name.length < 4 || !/[a-záéíóúñ]/i.test(name)) return null;

  const unit = /\b(caja|paquete|pz|pzas|ml|l)\b/i.test(line) ? 'caja' : 'pz';

  return {
    itemName: name,
    quantity: qty,
    unit,
    unitCost: subtotal / qty,
    lineTotal: subtotal,
  };
}

function parseClassicLine(line: string): ParsedTicketLine | null {
  // Notas de distribuidor: fila con precio impreso pero sin cantidad/subtotal manuscritos
  if (/\$/.test(line) && !/\$\s*[\d,.]+\s+\d{1,4}\s+\d{2,6}/.test(line)) return null;

  const numericTokens = (line.match(/\d+(?:\.\d+)?/g) || []).length;
  if (numericTokens >= 3 && /ml|vidrio|pet|lts?|pzas?/i.test(line)) return null;

  for (const pattern of LINE_PATTERNS) {
    const m = line.match(pattern);
    if (!m) continue;
    if (pattern === LINE_PATTERNS[1]) {
      return {
        itemName: m[1].trim(),
        quantity: parseFloat(m[2]),
        unit: 'pz',
        unitCost: parseFloat(m[3]),
        lineTotal: parseFloat(m[2]) * parseFloat(m[3]),
      };
    }
    if (pattern === LINE_PATTERNS[0]) {
      const qty = parseFloat(m[2]);
      const cost = parseFloat(m[4]);
      return {
        itemName: m[1].trim(),
        quantity: qty,
        unit: (m[3] || 'pz').toLowerCase(),
        unitCost: cost / qty,
        lineTotal: cost,
      };
    }
    return {
      itemName: m[1].trim(),
      quantity: parseFloat(m[2]),
      unit: 'pz',
      unitCost: 0,
      lineTotal: 0,
    };
  }
  return null;
}

export function parseTicketText(rawText: string): ParsedTicket {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const supplier = extractSupplier(lines);
  const parsed: ParsedTicketLine[] = [];
  const skippedLines: string[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes('proveedor') || lower.includes('razón social') || lower.includes('razon social')) {
      continue;
    }
    if (lower.includes('total') && /\d/.test(line)) {
      continue;
    }

    const matched =
      parseDistributorTableRow(line) ?? parseClassicLine(line);

    if (matched) {
      const key = `${matched.itemName}-${matched.quantity}-${matched.lineTotal}`;
      if (!seen.has(key)) {
        seen.add(key);
        const ing = findIngredientByName(matched.itemName);
        if (ing) matched.ingredientId = ing.id;
        parsed.push(matched);
      }
    } else if (
      line.length > 6 &&
      line !== supplier &&
      /[a-záéíóúñ]/i.test(line) &&
      !/^(av\.|telefono|tel\.|chihuahua|folio)/i.test(line)
    ) {
      skippedLines.push(line);
    }
  }

  let total = extractTotal(lines);
  if (!total) {
    total = parsed.reduce((s, l) => s + l.lineTotal, 0);
  }

  return { supplier, lines: parsed, total, skippedLines };
}

export function applyTicketToInventory(ticket: ParsedTicket, rawText: string) {
  const db = getDb();
  const result = db
    .prepare('INSERT INTO purchase_tickets (supplier, raw_text, total) VALUES (?, ?, ?)')
    .run(ticket.supplier, rawText, ticket.total);
  const ticketId = Number(result.lastInsertRowid);

  const insertLine = db.prepare(
    `INSERT INTO purchase_lines (ticket_id, ingredient_id, item_name, quantity, unit, unit_cost, line_total)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  for (const line of ticket.lines) {
    insertLine.run(
      ticketId,
      line.ingredientId ?? null,
      line.itemName,
      line.quantity,
      line.unit,
      line.unitCost,
      line.lineTotal
    );
    if (line.ingredientId) {
      addStockFromPurchase(line.ingredientId, line.quantity, line.unitCost || undefined);
    }
  }

  return ticketId;
}
