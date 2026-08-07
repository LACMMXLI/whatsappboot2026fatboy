import { useCallback, useEffect, useRef, useState } from 'react';
import { botFlowsApi } from '../../api/botFlows';
import type { BotFlow, BotFlowInput, BotFlowStep } from '../../types';
import { FlowCanvas, type FlowCanvasHandle } from './botFlow/FlowCanvas';

type InitialStep = Pick<BotFlowStep, 'order' | 'message' | 'options' | 'positionX' | 'positionY'>;

function emptyInitialSteps(): InitialStep[] {
  return [{ order: 0, message: '', options: [], positionX: null, positionY: null }];
}

export function BotFlowsEditor() {
  const [flows, setFlows] = useState<BotFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [name, setName] = useState('');
  const [triggers, setTriggers] = useState('');
  const [initialSteps, setInitialSteps] = useState<InitialStep[]>(emptyInitialSteps());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const canvasRef = useRef<FlowCanvasHandle>(null);

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
    setName('');
    setTriggers('');
    setInitialSteps(emptyInitialSteps());
    setFormError(null);
    setEditingId('new');
  };

  const startEdit = (flow: BotFlow) => {
    setName(flow.name);
    setTriggers(flow.triggers.join(', '));
    setInitialSteps(
      [...flow.steps]
        .sort((a, b) => a.order - b.order)
        .map((s) => ({
          order: s.order,
          message: s.message,
          options: s.options,
          positionX: s.positionX,
          positionY: s.positionY,
        })),
    );
    setFormError(null);
    setEditingId(flow.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormError(null);
  };

  const handleSave = async () => {
    const triggerList = triggers
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (!name.trim()) {
      setFormError('Falta el nombre del flujo.');
      return;
    }
    if (triggerList.length === 0) {
      setFormError('Agrega al menos una frase disparadora.');
      return;
    }
    const steps = canvasRef.current?.getSteps();
    if (!steps) return; // FlowCanvas ya muestra su propio error de validacion

    const input: BotFlowInput = { name: name.trim(), triggers: triggerList, steps };
    setSaving(true);
    setFormError(null);
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

  if (loading) {
    return <p className="text-sm text-text-muted">Cargando flujos...</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-secondary">
        Un flujo se activa cuando el cliente escribe una de sus frases disparadoras (ej.
        "horarios"), y solo si no esta en medio de armar un pedido. Arrastra desde una opcion
        hasta otro paso para conectarlos; una opcion sin conectar termina el flujo ahi.
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
          <div className="flex flex-wrap gap-3">
            <div className="flex min-w-[200px] flex-1 flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Nombre del flujo
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ej. Horarios"
                className="h-11 rounded-lg border border-panel-border bg-panel px-3 text-sm text-text-primary focus:border-brand focus:outline-none"
              />
            </div>

            <div className="flex min-w-[240px] flex-[2] flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Frases disparadoras (separadas por coma)
              </label>
              <input
                value={triggers}
                onChange={(e) => setTriggers(e.target.value)}
                placeholder="ej. horarios, a que hora abren"
                className="h-11 rounded-lg border border-panel-border bg-panel px-3 text-sm text-text-primary focus:border-brand focus:outline-none"
              />
            </div>
          </div>

          <FlowCanvas key={editingId} ref={canvasRef} initialSteps={initialSteps} />

          {formError && <p className="text-xs text-status-error">{formError}</p>}

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
