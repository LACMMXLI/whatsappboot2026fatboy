import type { Order, OrderStatus } from '../../types';

const STATUS_LABEL: Record<OrderStatus, string> = {
  DRAFT: 'Borrador',
  CONFIRMED: 'Confirmado',
  SENT_TO_POS: 'Enviado a cocina',
  READY: 'Listo',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  DRAFT: 'bg-status-in-order/20 text-status-in-order',
  CONFIRMED: 'bg-status-new/20 text-status-new',
  SENT_TO_POS: 'bg-status-human/20 text-status-human',
  READY: 'bg-status-active/20 text-status-active',
  DELIVERED: 'bg-status-resolved/20 text-status-resolved',
  CANCELLED: 'bg-status-error/20 text-status-error',
};

export function OrderPanel({ order }: { order: Order | null }) {
  if (!order) return null;

  return (
    <div className="border-b border-panel-border bg-panel-elevated px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-text-primary">🧾 Pedido</span>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLOR[order.status]}`}
        >
          {STATUS_LABEL[order.status]}
        </span>
      </div>

      <ul className="mt-2 space-y-1">
        {order.items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between text-sm text-text-secondary"
          >
            <span>
              {item.quantity}x {item.nameSnapshot}
            </span>
            <span>${Number(item.subtotal).toFixed(2)}</span>
          </li>
        ))}
        {order.items.length === 0 && (
          <li className="text-sm text-text-muted">Sin productos todavia</li>
        )}
      </ul>

      <div className="mt-2 flex items-center justify-between border-t border-panel-border pt-2">
        <span className="text-sm font-semibold text-text-primary">Total</span>
        <span className="text-base font-bold text-brand">
          ${Number(order.total).toFixed(2)}
        </span>
      </div>
    </div>
  );
}
