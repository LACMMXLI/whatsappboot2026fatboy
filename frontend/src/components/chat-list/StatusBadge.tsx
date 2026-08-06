import type { OperationalStatus } from '../../types';

const STATUS_CONFIG: Record<
  OperationalStatus,
  { label: string; dot: string; pulse?: boolean }
> = {
  ERROR: { label: 'Error', dot: 'bg-status-error', pulse: true },
  RESOLVED: { label: 'Resuelto', dot: 'bg-status-resolved' },
  WAITING: { label: 'Esperando', dot: 'bg-status-waiting', pulse: true },
  IN_ORDER: { label: 'En pedido', dot: 'bg-status-in-order' },
  HUMAN_ATTENTION: { label: 'Atencion humana', dot: 'bg-status-human' },
  NEW: { label: 'Nuevo', dot: 'bg-status-new' },
  ACTIVE: { label: 'Activo', dot: 'bg-status-active' },
};

export function StatusBadge({
  status,
  showLabel = true,
}: {
  status: OperationalStatus;
  showLabel?: boolean;
}) {
  const config = STATUS_CONFIG[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary">
      <span
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${config.dot} ${
          config.pulse ? 'animate-pulse-dot' : ''
        }`}
      />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}
