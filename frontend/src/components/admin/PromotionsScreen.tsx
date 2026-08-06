import { useCallback, useEffect, useState } from 'react';
import { promotionsApi } from '../../api/promotions';
import type { Promotion, PromotionInput } from '../../types';
import { PromotionRow } from './PromotionRow';
import { PromotionForm } from './PromotionForm';

export function PromotionsScreen() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Promotion | 'new' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await promotionsApi.list();
      setPromotions(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (input: PromotionInput) => {
    if (editing && editing !== 'new') {
      await promotionsApi.update(editing.id, input);
    } else {
      await promotionsApi.create(input);
    }
    setEditing(null);
    await load();
  };

  const handleDelete = async (promotion: Promotion) => {
    if (!confirm(`¿Eliminar "${promotion.title}"?`)) return;
    await promotionsApi.remove(promotion.id);
    await load();
  };

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-4 overflow-y-auto p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Promociones</h1>
        {editing === null && (
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="h-12 rounded-xl bg-brand px-5 text-base font-semibold text-white"
          >
            + Nueva promocion
          </button>
        )}
      </div>

      <p className="text-sm text-text-secondary">
        Las promociones activas se le sugieren automaticamente al cliente durante la
        conversacion con el bot.
      </p>

      {editing !== null && (
        <PromotionForm
          initial={editing === 'new' ? undefined : editing}
          onSubmit={handleSubmit}
          onCancel={() => setEditing(null)}
        />
      )}

      <div className="overflow-hidden rounded-2xl border border-panel-border bg-panel">
        {loading && <p className="p-4 text-sm text-text-muted">Cargando...</p>}
        {!loading && promotions.length === 0 && (
          <p className="p-4 text-sm text-text-muted">
            Todavia no hay promociones. Cargalas con el formulario.
          </p>
        )}
        {promotions.map((promotion) => (
          <PromotionRow
            key={promotion.id}
            promotion={promotion}
            onEdit={() => setEditing(promotion)}
            onDelete={() => handleDelete(promotion)}
          />
        ))}
      </div>
    </div>
  );
}
