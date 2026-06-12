'use client';

interface OrderLeaveConfirmModalProps {
  open: boolean;
  orderId: number | null;
  onKeep: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export function OrderLeaveConfirmModal({
  open,
  orderId,
  onKeep,
  onDiscard,
  onCancel,
}: OrderLeaveConfirmModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-leave-title">
      <div className="food-panel w-full max-w-md space-y-4 p-6 shadow-2xl">
        <h2 id="order-leave-title" className="font-display text-lg font-bold text-cream">
          ¿Guardar cambios del pedido?
        </h2>
        <p className="text-sm text-food-muted">
          {orderId
            ? `Modificaste el pedido #${orderId}. Los cambios se guardan automáticamente; confirma si deseas mantenerlos o volver al estado anterior.`
            : 'Tienes cambios sin confirmar en este pedido.'}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button type="button" onClick={onKeep} className="btn-food flex-1 py-2 text-sm">
            Mantener cambios
          </button>
          <button type="button" onClick={onDiscard} className="btn-food-outline flex-1 py-2 text-sm">
            Descartar cambios
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2 text-sm text-food-muted hover:text-cream sm:w-auto">
            Seguir editando
          </button>
        </div>
      </div>
    </div>
  );
}
