import { useCallback, useEffect, useState } from 'react';
import { superAdminApi } from '../../api/superadmin';
import { BusinessesList } from './BusinessesList';
import { CreateBusinessForm } from './CreateBusinessForm';
import { BusinessDetail } from './BusinessDetail';
import type { CreateBusinessInput, QrCode, SuperAdminBusiness } from '../../types';

type View =
  | { name: 'list' }
  | { name: 'create' }
  | { name: 'detail'; businessId: string; qrCode?: QrCode };

export function SuperAdminPanel({ onExit }: { onExit: () => void }) {
  const [businesses, setBusinesses] = useState<SuperAdminBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>({ name: 'list' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await superAdminApi.list();
      setBusinesses(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (input: CreateBusinessInput) => {
    const result = await superAdminApi.create(input);
    await load();
    setView({ name: 'detail', businessId: result.business.id, qrCode: result.qrCode });
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-panel-border bg-panel px-4">
        <span className="text-base font-bold text-text-primary">🛡️ Panel Superadmin</span>
        <button
          type="button"
          onClick={onExit}
          className="h-9 rounded-lg bg-panel-elevated px-3 text-sm text-text-secondary"
        >
          Volver al CRM
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {view.name === 'detail' && (
          <BusinessDetail
            businessId={view.businessId}
            initialQrCode={view.qrCode}
            onBack={() => {
              load();
              setView({ name: 'list' });
            }}
          />
        )}

        {view.name !== 'detail' && (
          <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-text-primary">Negocios</h1>
                <p className="text-sm text-text-secondary">
                  Todos los clientes de la plataforma. Cada uno tiene su propio numero de WhatsApp.
                </p>
              </div>
              {view.name === 'list' && (
                <button
                  type="button"
                  onClick={() => setView({ name: 'create' })}
                  className="h-12 shrink-0 rounded-xl bg-brand px-5 text-base font-semibold text-white"
                >
                  + Nuevo negocio
                </button>
              )}
            </div>

            {view.name === 'create' && (
              <CreateBusinessForm onSubmit={handleCreate} onCancel={() => setView({ name: 'list' })} />
            )}

            {loading && <p className="text-sm text-text-muted">Cargando...</p>}
            {!loading && (
              <BusinessesList
                businesses={businesses}
                onSelect={(id) => setView({ name: 'detail', businessId: id })}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
