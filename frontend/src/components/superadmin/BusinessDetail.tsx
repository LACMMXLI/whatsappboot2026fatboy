import { useCallback, useEffect, useState } from 'react';
import { superAdminApi } from '../../api/superadmin';
import { WhatsappConnectionPanel } from './WhatsappConnectionPanel';
import type { QrCode, SuperAdminBusiness, SuperAdminBusinessDetail } from '../../types';

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function BusinessDetail({
  businessId,
  initialQrCode,
  onBack,
}: {
  businessId: string;
  initialQrCode?: QrCode;
  onBack: () => void;
}) {
  const [detail, setDetail] = useState<SuperAdminBusinessDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await superAdminApi.detail(businessId);
      setDetail(data);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleBusinessUpdate = (business: SuperAdminBusiness) => {
    setDetail((prev) => (prev ? { ...prev, ...business } : prev));
  };

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-4 overflow-y-auto p-4">
      <button type="button" onClick={onBack} className="w-fit text-sm text-text-secondary hover:text-text-primary">
        ← Volver a la lista
      </button>

      {loading && <p className="text-sm text-text-muted">Cargando...</p>}

      {!loading && detail && (
        <>
          <div>
            <h1 className="text-xl font-bold text-text-primary">{detail.name}</h1>
            <p className="text-sm text-text-secondary">
              Cliente desde {formatDate(detail.createdAt)} · {detail._count.users} usuario(s) ·{' '}
              {detail._count.conversations} conversacion(es)
            </p>
          </div>

          <WhatsappConnectionPanel
            business={detail}
            initialQrCode={initialQrCode}
            onBusinessUpdate={handleBusinessUpdate}
          />

          <div className="rounded-2xl border border-panel-border bg-panel-elevated p-4">
            <p className="mb-3 text-base font-semibold text-text-primary">Equipo</p>
            <div className="flex flex-col gap-2">
              {detail.users.map((user) => (
                <div key={user.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium text-text-primary">{user.name}</span>{' '}
                    <span className="text-text-muted">({user.email})</span>
                  </div>
                  <span className="text-text-secondary">{user.role}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
