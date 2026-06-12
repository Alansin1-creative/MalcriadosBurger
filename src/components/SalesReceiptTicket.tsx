import {
  formatMoney,
  formatReceiptDate,
  type SalesReceipt,
} from '@/lib/receipt/sales-receipt';

interface Props {
  receipt: SalesReceipt;
  id?: string;
  className?: string;
}

/** Contenido del ticket — igual en modal, impresión y PDF. */
export function SalesReceiptTicket({ receipt, id, className = '' }: Props) {
  return (
    <div id={id} className={`receipt-paper w-full max-w-sm rounded-lg p-5 shadow-2xl sm:p-6 ${className}`}>
      <div className="receipt-awning mb-3 h-1.5 rounded-full" />

      <header className="text-center">
        <p className="receipt-title font-display text-lg font-bold text-[#1a120c]">
          {receipt.restaurantName}
        </p>
        <p className="text-xs text-[#5c4033]">{receipt.tagline}</p>
      </header>

      <div className="receipt-meta my-3 border-y border-dashed border-[#5c4033]/40 py-3 text-center text-xs text-[#5c4033]">
        <p className="font-semibold uppercase tracking-wide">Ticket de venta</p>
        <p className="mt-1">Folio #{receipt.orderId}</p>
        <p>{formatReceiptDate(receipt.paidAt)}</p>
        <p className="mt-1">{receipt.tableName ? `Mesa: ${receipt.tableName}` : 'Mostrador'}</p>
      </div>

      <ul className="receipt-lines space-y-2 text-sm text-[#1a120c]">
        {receipt.lines.map((line, i) => (
          <li key={i} className="flex justify-between gap-2">
            <span className="min-w-0">
              {line.quantity}× {line.name}
              {line.quantity > 1 && (
                <span className="block text-[10px] text-[#5c4033]">
                  {formatMoney(line.unitPrice)} c/u
                </span>
              )}
            </span>
            <span className="shrink-0 font-medium">{formatMoney(line.lineTotal)}</span>
          </li>
        ))}
      </ul>

      <div className="receipt-totals mt-4 space-y-1 border-t border-dashed border-[#5c4033]/40 pt-3 text-sm text-[#1a120c]">
        <div className="receipt-total-row font-display flex justify-between text-lg font-bold">
          <span>TOTAL</span>
          <span>{formatMoney(receipt.total)}</span>
        </div>
      </div>

      {/* Pie para pantalla (modal) */}
      <p className="receipt-screen-note no-print mt-4 text-center text-[10px] text-[#5c4033]">
        Inventario actualizado en caja
      </p>

      {/* Pie para PDF / impresión — sustituye los botones */}
      <div className="receipt-print-footer">
        <p className="font-display text-base font-bold text-[#1a120c]">
          ¡Muchas gracias por tu preferencia!
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[#5c4033]">
          Fue un gusto atenderte en Malcriados Burger &amp; Dogos.
        </p>
        <p className="mt-2 text-sm font-semibold text-[#1a120c]">¡Te esperamos de vuelta pronto!</p>
        <p className="mt-3 text-[10px] text-[#5c4033]">🌭 Hamburguesas · Dogos · Tortas · Tacos</p>
      </div>
    </div>
  );
}
