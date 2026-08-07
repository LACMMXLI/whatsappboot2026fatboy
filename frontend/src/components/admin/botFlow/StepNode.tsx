import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { optionHandleId, type LocalFlowOption, type StepNodeType } from './flowGraphUtils';

/** Callbacks estables inyectados por FlowCanvas en `data` de cada nodo.
 *  Todo el estado real vive en FlowCanvas (nodes es un componente
 *  controlado) -- este nodo nunca muta estado por su cuenta. */
export interface StepNodeCallbacks {
  onChangeMessage: (id: string, message: string) => void;
  onAddOption: (id: string) => void;
  onChangeOption: (id: string, index: number, patch: Partial<LocalFlowOption>) => void;
  onRemoveOption: (id: string, index: number) => void;
  onDeleteStep: (id: string) => void;
}

type Props = NodeProps<StepNodeType> & { data: StepNodeType['data'] & StepNodeCallbacks };

export const StepNode = memo(function StepNode({ id, data }: Props) {
  const {
    message,
    options,
    isInitial,
    onChangeMessage,
    onAddOption,
    onChangeOption,
    onRemoveOption,
    onDeleteStep,
  } = data;

  return (
    <div className="w-72 rounded-xl border border-panel-border bg-panel-elevated shadow-lg">
      <Handle
        type="target"
        id="in"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-panel-elevated !bg-brand"
      />

      <div className="flex items-center justify-between gap-2 border-b border-panel-border px-3 py-2">
        {isInitial ? (
          <span className="rounded-full bg-brand/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">
            Paso inicial
          </span>
        ) : (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
            Paso
          </span>
        )}
        {!isInitial && (
          <button
            type="button"
            onClick={() => onDeleteStep(id)}
            className="text-text-muted hover:text-status-error"
            aria-label="Eliminar paso"
            title="Eliminar paso"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2 p-3">
        <textarea
          value={message}
          onChange={(e) => onChangeMessage(id, e.target.value)}
          placeholder="Mensaje que manda el bot en este paso"
          rows={3}
          className="nodrag nowheel w-full resize-none rounded-lg border border-panel-border bg-panel px-2 py-1.5 text-sm text-text-primary focus:border-brand focus:outline-none"
        />

        <div className="flex flex-col gap-1.5">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input
                value={opt.label}
                onChange={(e) => onChangeOption(id, i, { label: e.target.value })}
                placeholder="Texto de la opcion"
                className="nodrag h-8 flex-1 rounded-lg border border-panel-border bg-panel px-2 text-xs text-text-primary focus:border-brand focus:outline-none"
              />
              <span
                className={`whitespace-nowrap text-[10px] ${
                  opt.gotoNodeId ? 'text-brand' : 'text-text-muted'
                }`}
              >
                {opt.gotoNodeId ? 'conectado' : 'fin del flujo'}
              </span>
              <button
                type="button"
                onClick={() => onRemoveOption(id, i)}
                className="text-text-muted hover:text-status-error"
                aria-label="Eliminar opcion"
                title="Eliminar opcion"
              >
                ✕
              </button>
              <Handle
                type="source"
                id={optionHandleId(i)}
                position={Position.Right}
                style={{ position: 'relative', transform: 'none', top: 0, right: 0 }}
                className={`!static !h-2.5 !w-2.5 !border-2 !border-panel-elevated ${
                  opt.gotoNodeId ? '!bg-brand' : '!bg-text-muted'
                }`}
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onAddOption(id)}
          className="self-start text-xs font-semibold text-brand hover:underline"
        >
          + Agregar opcion
        </button>
      </div>
    </div>
  );
});
