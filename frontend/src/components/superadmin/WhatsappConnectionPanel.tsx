import { useCallback, useEffect, useRef, useState } from 'react';
import { superAdminApi } from '../../api/superadmin';
import { WhatsappStatusBadge } from './WhatsappStatusBadge';
import type { QrCode, SuperAdminBusiness } from '../../types';

const POLL_MS = 3000;

function qrImageSrc(qr: QrCode): string | null {
  if (!qr.base64) return null;
  return qr.base64.startsWith('data:') ? qr.base64 : `data:image/png;base64,${qr.base64}`;
}

export function WhatsappConnectionPanel({
  business,
  initialQrCode,
  onBusinessUpdate,
}: {
  business: SuperAdminBusiness;
  initialQrCode?: QrCode;
  onBusinessUpdate: (business: SuperAdminBusiness) => void;
}) {
  const [qrCode, setQrCode] = useState<QrCode | undefined>(initialQrCode);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const startPolling = useCallback(
    (businessId: string) => {
      stopPolling();
      pollRef.current = setInterval(async () => {
        try {
          const updated = await superAdminApi.refreshStatus(businessId);
          onBusinessUpdate(updated);
          if (updated.whatsappConnectionStatus === 'CONNECTED' || updated.whatsappConnectionStatus === 'ERROR') {
            stopPolling();
            if (updated.whatsappConnectionStatus === 'CONNECTED') {
              setQrCode(undefined);
            }
          }
        } catch {
          // silencioso: se reintenta en el proximo tick
        }
      }, POLL_MS);
    },
    [onBusinessUpdate, stopPolling],
  );

  // Arranca el polling solo mientras estamos esperando que escaneen el QR.
  useEffect(() => {
    if (business.whatsappConnectionStatus === 'CONNECTING') {
      startPolling(business.id);
    } else {
      stopPolling();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business.id, business.whatsappConnectionStatus]);

  const runAction = async (action: string, fn: () => Promise<{ qrCode?: QrCode } | SuperAdminBusiness>) => {
    setBusy(action);
    setError(null);
    try {
      const result = await fn();
      if ('qrCode' in result && result.qrCode) {
        setQrCode(result.qrCode);
      }
      if ('whatsappConnectionStatus' in result) {
        onBusinessUpdate(result);
      } else {
        // provision/qr no devuelven el business actualizado directo: lo pedimos.
        const updated = await superAdminApi.refreshStatus(business.id).catch(() => null);
        if (updated) onBusinessUpdate(updated);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'La operacion fallo.');
    } finally {
      setBusy(null);
    }
  };

  const status = business.whatsappConnectionStatus;
  const qrSrc = qrCode ? qrImageSrc(qrCode) : null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-panel-border bg-panel-elevated p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-base font-semibold text-text-primary">WhatsApp</p>
          <WhatsappStatusBadge status={status} />
        </div>
        {business.whatsappInstanceId && (
          <span className="text-xs text-text-muted">Instancia: {business.whatsappInstanceId}</span>
        )}
      </div>

      {status === 'ERROR' && business.whatsappConnectionError && (
        <p className="rounded-xl bg-status-error/10 p-3 text-sm text-status-error">
          {business.whatsappConnectionError}
        </p>
      )}
      {error && <p className="text-sm text-status-error">{error}</p>}

      {qrSrc && (
        <div className="flex flex-col items-center gap-2 rounded-xl bg-panel p-4">
          <img src={qrSrc} alt="Codigo QR de WhatsApp" className="h-56 w-56 rounded-lg bg-white p-2" />
          <p className="text-sm text-text-secondary">
            Escanealo desde WhatsApp del negocio: Ajustes → Dispositivos vinculados → Vincular un dispositivo.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(status === 'PENDING' || status === 'ERROR') && (
          <button
            type="button"
            onClick={() => runAction('provision', () => superAdminApi.provisionWhatsapp(business.id))}
            disabled={busy !== null}
            className="h-11 rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40"
          >
            {busy === 'provision' ? 'Conectando...' : status === 'ERROR' ? 'Reintentar conexion' : 'Conectar WhatsApp'}
          </button>
        )}
        {(status === 'CONNECTING' || status === 'DISCONNECTED') && (
          <button
            type="button"
            onClick={() => runAction('qr', () => superAdminApi.regenerateQr(business.id))}
            disabled={busy !== null}
            className="h-11 rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40"
          >
            {busy === 'qr' ? 'Generando...' : 'Generar QR nuevo'}
          </button>
        )}
        {status === 'CONNECTED' && (
          <button
            type="button"
            onClick={() => runAction('disconnect', () => superAdminApi.disconnect(business.id))}
            disabled={busy !== null}
            className="h-11 rounded-xl bg-status-error/20 px-4 text-sm text-status-error disabled:opacity-40"
          >
            {busy === 'disconnect' ? 'Desconectando...' : 'Desconectar'}
          </button>
        )}
        {business.whatsappInstanceId && (
          <button
            type="button"
            onClick={() => runAction('restart', () => superAdminApi.restart(business.id))}
            disabled={busy !== null}
            className="h-11 rounded-xl bg-panel px-4 text-sm text-text-secondary disabled:opacity-40"
          >
            {busy === 'restart' ? 'Reiniciando...' : 'Reiniciar instancia'}
          </button>
        )}
        {business.whatsappInstanceId && (
          <button
            type="button"
            onClick={() => {
              if (!confirm('Esto elimina la instancia de WhatsApp por completo. Vas a tener que conectarla de nuevo (nuevo QR). ¿Continuar?')) return;
              runAction('delete', () => superAdminApi.deleteInstance(business.id));
            }}
            disabled={busy !== null}
            className="h-11 rounded-xl bg-status-error/20 px-4 text-sm text-status-error disabled:opacity-40"
          >
            {busy === 'delete' ? 'Eliminando...' : 'Eliminar instancia'}
          </button>
        )}
      </div>
    </div>
  );
}
