import { useState, type FormEvent } from 'react';
import type { Product, ProductInput } from '../../types';

export function ProductForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Product;
  onSubmit: (input: ProductInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [price, setPrice] = useState(initial?.price ?? '');
  const [aliases, setAliases] = useState(initial?.aliases.join(', ') ?? '');
  const [active, setActive] = useState(initial?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const priceNumber = Number(price);
    if (!name.trim() || Number.isNaN(priceNumber) || priceNumber <= 0) {
      setError('Nombre y precio (mayor a 0) son obligatorios.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        category: category.trim() || undefined,
        price: priceNumber,
        aliases: aliases
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
        active,
      });
    } catch {
      setError('No se pudo guardar el producto.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-panel-border bg-panel-elevated p-4"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Nombre
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12 rounded-xl border border-panel-border bg-panel px-3 text-base text-text-primary focus:border-brand focus:outline-none"
            placeholder="Rollo California"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Categoria
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-12 rounded-xl border border-panel-border bg-panel px-3 text-base text-text-primary focus:border-brand focus:outline-none"
            placeholder="Sushi"
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
            placeholder="100"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Alias (separados por coma)
          <input
            value={aliases}
            onChange={(e) => setAliases(e.target.value)}
            className="h-12 rounded-xl border border-panel-border bg-panel px-3 text-base text-text-primary focus:border-brand focus:outline-none"
            placeholder="california, rollo california"
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-text-secondary">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="h-5 w-5"
        />
        Activo (visible para el bot y en el menu)
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
