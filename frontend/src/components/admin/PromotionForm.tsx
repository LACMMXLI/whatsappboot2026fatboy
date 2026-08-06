import { useState, type FormEvent } from 'react';
import type { Promotion, PromotionInput } from '../../types';

export function PromotionForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Promotion;
  onSubmit: (input: PromotionInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [price, setPrice] = useState(initial?.price ?? '');
  const [active, setActive] = useState(initial?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const priceNumber = Number(price);
    if (!title.trim() || Number.isNaN(priceNumber) || priceNumber <= 0) {
      setError('Titulo y precio (mayor a 0) son obligatorios.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        price: priceNumber,
        active,
      });
    } catch {
      setError('No se pudo guardar la promocion.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-panel-border bg-panel-elevated p-4"
    >
      <label className="flex flex-col gap-1 text-sm text-text-secondary">
        Titulo
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-12 rounded-xl border border-panel-border bg-panel px-3 text-base text-text-primary focus:border-brand focus:outline-none"
          placeholder="Promo del dia"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-text-secondary">
        Descripcion
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="resize-none rounded-xl border border-panel-border bg-panel px-3 py-2 text-base text-text-primary focus:border-brand focus:outline-none"
          placeholder="2 rollos de california"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-text-secondary">
        Precio
        <input
          type="number"
          min="0"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="h-12 rounded-xl border border-panel-border bg-panel px-3 text-base text-text-primary focus:border-brand focus:outline-none"
          placeholder="150"
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-text-secondary">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="h-5 w-5"
        />
        Activa (el bot la sugiere a los clientes)
      </label>

      {error && <p className="text-sm text-status-error">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="h-12 flex-1 rounded-xl bg-brand text-base font-semibold text-white disabled:opacity-60"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-12 rounded-xl bg-panel px-6 text-base text-text-secondary"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
