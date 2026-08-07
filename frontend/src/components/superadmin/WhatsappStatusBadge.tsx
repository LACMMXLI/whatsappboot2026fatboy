import type { WhatsappConnectionStatus } from '../../types';

const CONFIG: Record<WhatsappConnectionStatus, { label: string; dot: string; pulse?: boolean }> = {
  PENDING: { label: 'Sin conectar', dot: 'bg-text-muted' },
  CONNECTING: { label: 'Conectando (esperando QR)', dot: 'bg-status-new', pulse: true },
  CONNECTED: { label: 'Conectado', dot: 'bg-status-active' },
  DISCONNECTED: { label: 'Desconectado', dot: 'bg-status-waiting' },
  ERROR: { label: 'Error', dot: 'bg-status-error', pulse: true },
};

export function WhatsappStatusBadge({ status }: { status: WhatsappConnectionStatus }) {
  const config = CONFIG[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary">
      <span
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${config.dot} ${
          config.pulse ? 'animate-pulse-dot' : ''
        }`}
      />
      {config.label}
    </span>
  );
}
