import { useCallback, useEffect, useState } from 'react';
import { businessApi } from '../../api/business';
import type { Business } from '../../types';

export function BusinessSettingsScreen() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [pickupAddress, setPickupAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [togglingBot, setTogglingBot] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await businessApi.me();
      setBusiness(data);
      setPickupAddress(data.pickupAddress ?? '');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = business !== null && pickupAddress !== (business.pickupAddress ?? '');

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await businessApi.updateSettings({
        pickupAddress: pickupAddress.trim() || undefined,
      });
      setBusiness(updated);
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBot = async () => {
    if (!business) return;
    setTogglingBot(true);
    try {
      const updated = await businessApi.updateSettings({ botEnabled: !business.botEnabled });
      setBusiness(updated);
    } finally {
      setTogglingBot(false);
    }
  };

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-4 overflow-y-auto p-4">
      <h1 className="text-xl font-bold text-text-primary">Negocio</h1>

      {loading && <p className="text-sm text-text-muted">Cargando...</p>}

      {!loading && business && (
        <>
          <div
            className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${
              business.botEnabled
                ? 'border-panel-border bg-panel-elevated'
                : 'border-status-error/40 bg-status-error/10'
            }`}
          >
            <div>
              <p className="text-base font-semibold text-text-primary">
                {business.botEnabled ? '🤖 Bot activo' : '🚫 Bot desactivado'}
              </p>
              <p className="text-sm text-text-secondary">
                {business.botEnabled
                  ? 'El bot responde automaticamente en todos los chats.'
                  : 'El bot no responde en NINGUN chat, aunque este activado dentro de cada conversacion. Los mensajes te van a llegar igual, pero solo un agente puede contestar.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleBot}
              disabled={togglingBot}
              className={`h-12 shrink-0 rounded-xl px-5 text-base font-semibold disabled:opacity-40 ${
                business.botEnabled
                  ? 'bg-status-error/20 text-status-error'
                  : 'bg-brand text-white'
              }`}
            >
              {togglingBot
                ? 'Guardando...'
                : business.botEnabled
                  ? 'Apagar el bot'
                  : 'Encender el bot'}
            </button>
          </div>

          <p className="text-sm text-text-secondary">
            Solo manejamos servicio de recoleccion (pickup): el bot le muestra esta direccion al
            cliente cuando confirma su pedido.
          </p>

          <div className="flex flex-col gap-3 rounded-2xl border border-panel-border bg-panel-elevated p-4">
            <label className="flex flex-col gap-1 text-sm text-text-secondary">
              Direccion de recoleccion
              <textarea
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                rows={2}
                className="resize-none rounded-xl border border-panel-border bg-panel px-3 py-2 text-base text-text-primary focus:border-brand focus:outline-none"
                placeholder="Av. Reforma 123, local 4"
              />
            </label>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={!dirty || saving}
                className="h-12 rounded-xl bg-brand px-5 text-base font-semibold text-white disabled:opacity-40"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              {savedAt && !dirty && (
                <span className="text-sm text-status-active">Guardado.</span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
