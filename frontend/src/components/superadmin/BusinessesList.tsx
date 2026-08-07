import { WhatsappStatusBadge } from './WhatsappStatusBadge';
import type { SuperAdminBusiness } from '../../types';

export function BusinessesList({
  businesses,
  onSelect,
}: {
  businesses: SuperAdminBusiness[];
  onSelect: (id: string) => void;
}) {
  if (businesses.length === 0) {
    return (
      <p className="rounded-2xl border border-panel-border bg-panel p-4 text-sm text-text-muted">
        Todavia no hay negocios cargados. Creá el primero con el botón de arriba.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-panel-border bg-panel">
      {businesses.map((business) => (
        <button
          key={business.id}
          type="button"
          onClick={() => onSelect(business.id)}
          className="flex w-full flex-wrap items-center gap-3 border-b border-panel-border px-4 py-3 text-left last:border-b-0 hover:bg-panel-elevated"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-text-primary">{business.name}</p>
            <p className="text-sm text-text-secondary">
              {business._count.users} usuario(s) · {business._count.conversations} conversacion(es)
            </p>
          </div>
          <WhatsappStatusBadge status={business.whatsappConnectionStatus} />
        </button>
      ))}
    </div>
  );
}
