import { useState, type FormEvent } from 'react';
import type { BotIntentType, BotKeywordRule } from '../../types';

const INTENT_OPTIONS: { value: BotIntentType; label: string }[] = [
  { value: 'greeting', label: 'Saludo' },
  { value: 'view_menu', label: 'Ver menu' },
  { value: 'confirm', label: 'Confirmar pedido' },
  { value: 'cancel', label: 'Cancelar' },
  { value: 'talk_to_human', label: 'Hablar con humano' },
];

export function KeywordsEditor({
  rules,
  onCreate,
  onRemove,
}: {
  rules: BotKeywordRule[];
  onCreate: (intent: BotIntentType, phrase: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [intent, setIntent] = useState<BotIntentType>('view_menu');
  const [phrase, setPhrase] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!phrase.trim()) return;
    setSaving(true);
    try {
      await onCreate(intent, phrase.trim());
      setPhrase('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-panel-border bg-panel-elevated p-4">
      <p className="mb-3 text-sm font-semibold text-text-primary">
        Palabras clave propias (ademas de las que el bot ya entiende)
      </p>

      <form onSubmit={handleAdd} className="mb-4 flex flex-wrap gap-2">
        <select
          value={intent}
          onChange={(e) => setIntent(e.target.value as BotIntentType)}
          className="h-11 rounded-lg border border-panel-border bg-panel px-2 text-sm text-text-primary"
        >
          {INTENT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <input
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          placeholder="ej. que tienen"
          className="h-11 flex-1 min-w-[160px] rounded-lg border border-panel-border bg-panel px-3 text-sm text-text-primary focus:border-brand focus:outline-none"
        />
        <button
          type="submit"
          disabled={saving || !phrase.trim()}
          className="h-11 rounded-lg bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40"
        >
          Agregar
        </button>
      </form>

      <div className="flex flex-col gap-3">
        {INTENT_OPTIONS.map((opt) => {
          const items = rules.filter((r) => r.intent === opt.value);
          if (items.length === 0) return null;
          return (
            <div key={opt.value}>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
                {opt.label}
              </p>
              <div className="flex flex-wrap gap-2">
                {items.map((rule) => (
                  <span
                    key={rule.id}
                    className="flex items-center gap-1.5 rounded-full bg-panel px-3 py-1.5 text-sm text-text-primary"
                  >
                    {rule.phrase}
                    <button
                      type="button"
                      onClick={() => onRemove(rule.id)}
                      className="text-text-muted hover:text-status-error"
                      aria-label={`Eliminar "${rule.phrase}"`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>
          );
        })}
        {rules.length === 0 && (
          <p className="text-sm text-text-muted">Todavia no agregaste palabras clave propias.</p>
        )}
      </div>
    </div>
  );
}
