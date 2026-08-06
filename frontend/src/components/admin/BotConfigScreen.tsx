import { useCallback, useEffect, useState } from 'react';
import { botConfigApi } from '../../api/botConfig';
import type { BotIntentType, BotKeywordRule, BotTemplate, BotTemplateKey } from '../../types';
import { TemplateEditor } from './TemplateEditor';
import { KeywordsEditor } from './KeywordsEditor';

export function BotConfigScreen() {
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
        cortos y agregar tus propias palabras clave.
      </p>

      {loading && <p className="text-sm text-text-muted">Cargando...</p>}

      {!loading && (
        <>
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

          <KeywordsEditor
            rules={keywords}
            onCreate={handleCreateKeyword}
            onRemove={handleRemoveKeyword}
          />
        </>
      )}
    </div>
  );
}
