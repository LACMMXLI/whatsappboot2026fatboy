import { useState } from 'react';
import type { BotTemplate } from '../../types';

const LABELS: Record<BotTemplate['key'], string> = {
  GREETING: 'Saludo',
  CANCEL: 'Cancelar pedido',
  HUMAN_HANDOFF: 'Derivar a humano',
  FALLBACK: 'No entendi el mensaje',
};

export function TemplateEditor({
  template,
  onSave,
  onReset,
}: {
  template: BotTemplate;
  onSave: (content: string) => Promise<void>;
  onReset: () => Promise<void>;
}) {
  const [content, setContent] = useState(template.content);
  const [saving, setSaving] = useState(false);
  const dirty = content !== template.content;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(content);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      await onReset();
      setContent(template.defaultContent);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-panel-border bg-panel-elevated p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-text-primary">{LABELS[template.key]}</span>
        {template.isCustom && (
          <span className="rounded-full bg-status-new/20 px-2 py-0.5 text-xs text-status-new">
            Personalizado
          </span>
        )}
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={2}
        className="w-full resize-none rounded-xl border border-panel-border bg-panel px-3 py-2 text-base text-text-primary focus:border-brand focus:outline-none"
      />
      <p className="mt-1 text-xs text-text-muted">
        Podes usar <code>{'{businessName}'}</code> y se reemplaza por el nombre de tu negocio.
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saving}
          className="h-10 rounded-lg bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40"
        >
          Guardar
        </button>
        {template.isCustom && (
          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            className="h-10 rounded-lg bg-panel px-4 text-sm text-text-secondary"
          >
            Restaurar por defecto
          </button>
        )}
      </div>
    </div>
  );
}
