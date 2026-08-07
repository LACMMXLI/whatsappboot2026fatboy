import { useCallback, useEffect, useState } from 'react';
import { botFlowsApi } from '../../api/botFlows';
import type { BotFlow, BotFlowInput, BotFlowOption } from '../../types';

/** Un paso en edicion dentro del builder (antes de guardar). */
interface DraftStep {
  message: string;
  options: BotFlowOption[];
}

function emptyDraft(): { name: string; triggers: string; steps: DraftStep[] } {
  return {
    name: '',
    triggers: '',
    steps: [{ message: '', options: [] }],
  };
}

export function BotFlowsEditor() {
  const [flows, setFlows] = useState<BotFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setFlows(await botFlowsApi.list());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startNew = () => {
    setDraft(emptyDraft());
    setEditingId('new');
  };

  const startEdit = (flow: BotFlow) => {
    setDraft({
      name: flow.name,
      triggers: flow.triggers.join(', '),
      steps: flow.steps
        .sort((a, b) => a.order - b.order)
        .map((s) => ({ message: s.message, options: s.options })),
    });
    setEditingId(flow.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(emptyDraft());
  };

  const handleSave = async () => {
    const triggers = draft.triggers
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const steps = draft.steps.filter((s) => s.message.trim());
    if (!draft.name.trim() || triggers.length === 0 || steps.length === 0) return;

    const input: BotFlowInput = { name: draft.name.trim(), triggers, steps };
    setSaving(true);
    try {
      if (editingId === 'new') {
        const created = await botFlowsApi.create(input);
        setFlows((prev) => [...prev, created]);
      } else if (editingId) {
        const updated = await botFlowsApi.update(editingId, input);
        setFlows((prev) => prev.map((f) => (f.id === editingId ? updated : f)));
      }
      cancelEdit();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await botFlowsApi.remove(id);
    setFlows((prev) => prev.filter((f) => f.id !== id));
    if (editingId === id) cancelEdit();
  };

  const handleToggleActive = async (flow: BotFlow) => {
    const updated = await botFlowsApi.toggleActive(flow.id, !flow.active);
    setFlows((prev) => prev.map((f) => (f.id === flow.id ? updated : f)));
  };

  // --- Edicion de pasos dentro del draft ---

  const updateStep = (index: number, patch: Partial<DraftStep>) => {
    setDraft((d) => ({
      ...d,
      steps: d.steps.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));
  };

  const addStep = () => {
    setDraft((d) => ({ ...d, steps: [...d.steps, { message: '', options: [] }] }));
  };

  const removeStep = (index: number) => {
    setDraft((d) => ({ ...d, steps: d.steps.filter((_, i) => i !== index) }));
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    setDraft((d) => {
      const target = index + direction;
      if (target < 0 || target >= d.steps.length) return d;
      const steps = [...d.steps];
      [steps[index], steps[target]] = [steps[target], steps[index]];
      return { ...d, steps };
    });
  };

  const addOption = (stepIndex: number) => {
    updateStep(stepIndex, {
      options: [...draft.steps[stepIndex].options, { label: '', gotoStep: null }],
    });
  };

  const updateOption = (stepIndex: number, optIndex: number, patch: Partial<BotFlowOption>) => {
    const options = draft.steps[stepIndex].options.map((o, i) =>
      i === optIndex ? { ...o, ...patch } : o,
    );
    updateStep(stepIndex, { options });
  };

  const removeOption = (stepIndex: number, optIndex: number) => {
    updateStep(stepIndex, {
      options: draft.steps[stepIndex].options.filter((_, i) => i !== optIndex),
    });
  };

  if (loading) {
    return <p className="text-sm text-text-muted">Cargando flujos...</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-secondary">
        Un flujo se activa cuando el cliente escribe una de sus frases disparadoras (ej.
        "horarios"), y solo si no esta en medio de armar un pedido. El bot manda el mensaje del
        primer paso; si ese paso tiene opciones, la respuesta del cliente decide a que paso saltar.
      </p>

      {editingId === null && (
        <button
          type="button"
          onClick={startNew}
          className="self-start rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white"
        >
          + Nuevo flujo
        </button>
      )}

      {editingId !== null && (
        <div className="flex flex-col gap-3 rounded-2xl border border-panel-border bg-panel-elevated p-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Nombre del flujo
            </label>
            <input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="ej. Horarios"
              className="h-11 rounded-lg border border-panel-border bg-panel px-3 text-sm text-text-primary focus:border-brand focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Frases disparadoras (separadas por coma)
            </label>
            <input
              value={draft.triggers}
              onChange={(e) => setDraft((d) => ({ ...d, triggers: e.target.value }))}
              placeholder="ej. horarios, a que hora abren"
              className="h-11 rounded-lg border border-panel-border bg-panel px-3 text-sm text-text-primary focus:border-brand focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Pasos</p>
            {draft.steps.map((step, stepIndex) => (
              <div
                key={stepIndex}
                className="flex flex-col gap-2 rounded-xl border border-panel-border bg-panel p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-muted">Paso {stepIndex}</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveStep(stepIndex, -1)}
                      disabled={stepIndex === 0}
                      className="text-text-muted hover:text-text-primary disabled:opacity-30"
                      aria-label="Mover paso arriba"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveStep(stepIndex, 1)}
                      disabled={stepIndex === draft.steps.length - 1}
                      className="text-text-muted hover:text-text-primary disabled:opacity-30"
                      aria-label="Mover paso abajo"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeStep(stepIndex)}
                      disabled={draft.steps.length === 1}
                      className="text-text-muted hover:text-status-error disabled:opacity-30"
                      aria-label="Eliminar paso"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <textarea
                  value={step.message}
                  onChange={(e) => updateStep(stepIndex, { message: e.target.value })}
                  placeholder="Mensaje que manda el bot en este paso"
                  rows={2}
                  className="rounded-lg border border-panel-border bg-panel-elevated px-3 py-2 text-sm text-text-primary focus:border-brand focus:outline-none"
                />

                <div className="flex flex-col gap-1.5">
                  {step.options.map((opt, optIndex) => (
                    <div key={optIndex} className="flex flex-wrap items-center gap-2">
                      <input
                        value={opt.label}
                        onChange={(e) => updateOption(stepIndex, optIndex, { label: e.target.value })}
                        placeholder="Texto de la opcion"
                        className="h-9 flex-1 min-w-[140px] rounded-lg border border-panel-border bg-panel-elevated px-2 text-sm text-text-primary focus:border-brand focus:outline-none"
                      />
                      <select
                        value={opt.gotoStep ?? 'end'}
                        onChange={(e) =>
                          updateOption(stepIndex, optIndex, {
                            gotoStep: e.target.value === 'end' ? null : Number(e.target.value),
                          })
                        }
                        className="h-9 rounded-lg border border-panel-border bg-panel-elevated px-2 text-sm text-text-primary"
                      >
                        <option value="end">Terminar flujo</option>
                        {draft.steps.map((_, i) => (
                          <option key={i} value={i}>
                            Ir a paso {i}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeOption(stepIndex, optIndex)}
                        className="text-text-muted hover:text-status-error"
                        aria-label="Eliminar opcion"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addOption(stepIndex)}
                    className="self-start text-xs font-semibold text-brand hover:underline"
                  >
                    + Agregar opcion
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addStep}
              className="self-start rounded-lg border border-dashed border-panel-border px-3 py-1.5 text-sm text-text-secondary hover:border-brand hover:text-brand"
            >
              + Agregar paso
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              Guardar flujo
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-lg border border-panel-border px-4 py-2 text-sm text-text-secondary"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {flows.length === 0 && (
          <p className="text-sm text-text-muted">Todavia no creaste ningun flujo.</p>
        )}
        {flows.map((flow) => (
          <div
            key={flow.id}
            className="flex items-center justify-between rounded-xl border border-panel-border bg-panel p-3"
          >
            <div>
              <p className="text-sm font-semibold text-text-primary">{flow.name}</p>
              <p className="text-xs text-text-muted">
                {flow.triggers.join(', ')} · {flow.steps.length} paso
                {flow.steps.length === 1 ? '' : 's'} · {flow.active ? 'Activo' : 'Pausado'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleToggleActive(flow)}
                className="rounded-lg border border-panel-border px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary"
              >
                {flow.active ? 'Pausar' : 'Activar'}
              </button>
              <button
                type="button"
                onClick={() => startEdit(flow)}
                className="rounded-lg border border-panel-border px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => handleDelete(flow.id)}
                className="rounded-lg border border-panel-border px-3 py-1.5 text-xs text-status-error hover:opacity-80"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
