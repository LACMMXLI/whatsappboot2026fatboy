import type { Product } from '../../types';

export function ProductRow({
  product,
  onEdit,
  onDelete,
}: {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-panel-border px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-base font-semibold text-text-primary">
            {product.name}
          </span>
          {!product.active && (
            <span className="rounded-full bg-status-resolved/20 px-2 py-0.5 text-xs text-status-resolved">
              Inactivo
            </span>
          )}
        </div>
        <p className="truncate text-sm text-text-secondary">
          {product.category ?? 'Sin categoria'}
          {product.aliases.length > 0 && ` · alias: ${product.aliases.join(', ')}`}
        </p>
      </div>
      <span className="text-base font-bold text-brand">${Number(product.price).toFixed(2)}</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="h-10 rounded-lg bg-panel-elevated px-3 text-sm text-text-primary"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="h-10 rounded-lg bg-status-error/20 px-3 text-sm text-status-error"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}
