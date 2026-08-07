import { useCallback, useEffect, useState } from 'react';
import { botConfigApi } from '../../api/botConfig';
import type { BotIntentType, BotKeywordRule, BotTemplate, BotTemplateKey } from '../../types';
import { TemplateEditor } from './TemplateEditor';
import { KeywordsEditor } from './KeywordsEditor';
import { BotFlowsEditor } from './BotFlowsEditor';

type Tab = 'messages' | 'keywords' | 'flows';

const TABS: { key: Tab; label: string }[] = [
  { key: 'messages', label: 'Mensajes' },
  { key: 'keywords', label: 'Palabras clave' },
  { key: 'flows', label: 'Flujos' },
];

export function BotConfigScreen() {
  const [tab, setTab] = useState<Tab>('messages');
  const [templates, setTemplates] = useState<BotTemplate[]>([]);
  const [keywords, setKeywords] = useState<BotKeywordRule[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, k] = await Promise.all([
        botConfigApi.listTemplates(),
        botConfigApi.listKeywords(),
      ]);
      setTemplates(t);
      setKeywords(k);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveTemplate = async (key: BotTemplateKey, content: string) => {
    const updated = await botConfigApi.updateTemplate(key, content);
    setTemplates((prev) => prev.map((t) => (t.key === key ? updated : t)));
  };

  const handleResetTemplate = async (key: BotTemplateKey) => {
    const updated = await botConfigApi.resetTemplate(key);
    setTemplates((prev) => prev.map((t) => (t.key === key ? updated : t)));
  };

  const handleCreateKeyword = async (intent: BotIntentType, phrase: string) => {
    const created = await botConfigApi.createKeyword(intent, phrase);
    setKeywords((prev) => [...prev, created]);
  };

  const handleRemoveKeyword = async (id: string) => {
    await botConfigApi.removeKeyword(id);
    setKeywords((prev) => prev.filter((k) => k.id !== id));
  };

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-4 overflow-y-auto p-4">
      <h1 className="text-xl font-bold text-text-primary">Configuracion del bot</h1>
      <p className="text-sm text-text-secondary">
        El menu, las promociones y el resumen del pedido siempre se arman con los datos reales
        del negocio — no son editables aca. Lo que si podes personalizar son estos mensajes
        cortos, tus propias palabras clave, y flujos propios (horarios, ubicacion, FAQs) que no
        interrumpen a un cliente que esta armando un pedido.
      </p>

      <div className="flex gap-1 border-b border-panel-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm font-semibold transition-colors ${
              tab === t.key
                ? 'border-b-2 border-brand text-brand'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-text-muted">Cargando...</p>}

      {!loading && tab === 'messages' && (
        <div className="flex flex-col gap-3">
          {templates.map((template) => (
            <TemplateEditor
              key={template.key}
              template={template}
              onSave={(content) => handleSaveTemplate(template.key, content)}
              onReset={() => handleResetTemplate(template.key)}
            />
          ))}
        </div>
      )}

      {!loading && tab === 'keywords' && (
        <KeywordsEditor
          rules={keywords}
          onCreate={handleCreateKeyword}
          onRemove={handleRemoveKeyword}
        />
      )}

      {!loading && tab === 'flows' && <BotFlowsEditor />}
    </div>
  );
}
