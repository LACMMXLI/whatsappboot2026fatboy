import { formatRelativeTime } from '../../lib/time';
import type { Order } from '../../types';

export function OrderCard({
  order,
  actionLabel,
  onAction,
  onCancel,
  busy,
}: {
  order: Order;
  actionLabel?: string;
  onAction?: () => void;
  onCancel?: () => void;
  busy?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-panel-border bg-panel-elevated p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-text-primary">
            {order.customer?.name ?? order.customer?.phone ?? 'Cliente'}
          </p>
          <p className="text-xs text-text-muted">{formatRelativeTime(order.createdAt)}</p>
        </div>
        <span className="shrink-0 text-base font-bold text-brand">
          ${Number(order.total).toFixed(2)}
        </span>
      </div>

      <ul className="flex flex-col gap-0.5">
        {order.items.map((item) => (
          <li key={item.id} className="text-sm text-text-secondary">
            {item.quantity}x {item.nameSnapshot}
          </li>
        ))}
      </ul>

      {(onAction || onCancel) && (
        <div className="mt-1 flex gap-2">
          {onAction && actionLabel && (
            <button
              type="button"
              onClick={onAction}
              disabled={busy}
              className="h-11 flex-1 rounded-xl bg-brand text-sm font-semibold text-white disabled:opacity-40"
            >
              {actionLabel}
            </button>
          )}
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="h-11 rounded-xl bg-status-error/20 px-3 text-sm text-status-error disabled:opacity-40"
            >
              Cancelar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
