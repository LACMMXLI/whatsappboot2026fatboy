import { useState, type FormEvent } from 'react';
import type { CreateBusinessInput } from '../../types';

export function CreateBusinessForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (input: CreateBusinessInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [businessName, setBusinessName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !adminName.trim() || !adminEmail.trim() || adminPassword.length < 8) {
      setError('Completa todos los campos (la contraseña necesita al menos 8 caracteres).');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        businessName: businessName.trim(),
        adminName: adminName.trim(),
        adminEmail: adminEmail.trim(),
        adminPassword,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el negocio.');
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-panel-border bg-panel-elevated p-4"
    >
      <p className="text-base font-semibold text-text-primary">Nuevo negocio (cliente)</p>

      <label className="flex flex-col gap-1 text-sm text-text-secondary">
        Nombre del negocio
        <input
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          className="h-12 rounded-xl border border-panel-border bg-panel px-3 text-base text-text-primary focus:border-brand focus:outline-none"
          placeholder="Sushi Roll Express"
        />
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Nombre del administrador
          <input
            value={adminName}
            onChange={(e) => setAdminName(e.target.value)}
            className="h-12 rounded-xl border border-panel-border bg-panel px-3 text-base text-text-primary focus:border-brand focus:outline-none"
            placeholder="Juan Perez"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Email del administrador
          <input
            type="email"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            className="h-12 rounded-xl border border-panel-border bg-panel px-3 text-base text-text-primary focus:border-brand focus:outline-none"
            placeholder="owner@sushiroll.com"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm text-text-secondary">
        Contraseña inicial
        <input
          type="text"
          value={adminPassword}
          onChange={(e) => setAdminPassword(e.target.value)}
          className="h-12 rounded-xl border border-panel-border bg-panel px-3 text-base text-text-primary focus:border-brand focus:outline-none"
          placeholder="minimo 8 caracteres"
        />
      </label>

      {error && <p className="text-sm text-status-error">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="h-12 flex-1 rounded-xl bg-brand text-base font-semibold text-white disabled:opacity-60"
        >
          {saving ? 'Creando y conectando WhatsApp...' : 'Crear negocio'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="h-12 rounded-xl bg-panel px-6 text-base text-text-secondary"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
