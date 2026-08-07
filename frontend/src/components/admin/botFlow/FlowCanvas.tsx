import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type NodeRemoveChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { StepNode, type StepNodeCallbacks } from './StepNode';
import {
  buildNodesFromSteps,
  buildSavePayload,
  deriveEdges,
  parseOptionHandle,
  type LocalFlowOption,
  type StepNodeType,
} from './flowGraphUtils';
import type { BotFlowInput, BotFlowStep } from '../../../types';

const nodeTypes = { stepNode: StepNode };

export interface FlowCanvasHandle {
  /** Reindexa, valida y devuelve el payload listo para el API. `null` si
   *  hay un error de validacion (queda expuesto via el mensaje en pantalla). */
  getSteps: () => BotFlowInput['steps'] | null;
}

interface Props {
  /** Pasos iniciales (de un flujo existente, o un placeholder de 1 paso
   *  para un flujo nuevo). Solo se lee al montar -- para editar OTRO
   *  flujo, remontar el componente con un `key` distinto. */
  initialSteps: Pick<BotFlowStep, 'order' | 'message' | 'options' | 'positionX' | 'positionY'>[];
}

export const FlowCanvas = forwardRef<FlowCanvasHandle, Props>(function FlowCanvas(
  { initialSteps },
  ref,
) {
  const nextIdRef = useRef(0);
  const makeId = useCallback(() => {
    nextIdRef.current += 1;
    return `n${nextIdRef.current}`;
  }, []);

  const [nodes, setNodes] = useState<StepNodeType[]>(() =>
    buildNodesFromSteps(initialSteps, makeId),
  );
  const [error, setError] = useState<string | null>(null);

  const edges = useMemo(() => deriveEdges(nodes), [nodes]);

  // --- Ediciones locales de un paso (no afectan a otros nodos) ---

  const onChangeMessage = useCallback((id: string, message: string) => {
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, message } } : n)));
  }, []);

  const onAddOption = useCallback((id: string) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, options: [...n.data.options, { label: '', gotoNodeId: null }] } }
          : n,
      ),
    );
  }, []);

  const onChangeOption = useCallback(
    (id: string, index: number, patch: Partial<LocalFlowOption>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? {
                ...n,
                data: {
                  ...n.data,
                  options: n.data.options.map((o, i) => (i === index ? { ...o, ...patch } : o)),
                },
              }
            : n,
        ),
      );
    },
    [],
  );

  const onRemoveOption = useCallback((id: string, index: number) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, options: n.data.options.filter((_, i) => i !== index) } }
          : n,
      ),
    );
  }, []);

  // --- Borrado de un paso: protegido si es el inicial, y limpia de
  // inmediato cualquier opcion de OTRO paso que apuntara a este. ---

  const deleteStep = useCallback((id: string) => {
    setNodes((nds) => {
      const target = nds.find((n) => n.id === id);
      if (!target || target.data.isInitial) return nds;
      return nds
        .filter((n) => n.id !== id)
        .map((n) => ({
          ...n,
          data: {
            ...n.data,
            options: n.data.options.map((o) =>
              o.gotoNodeId === id ? { ...o, gotoNodeId: null } : o,
            ),
          },
        }));
    });
  }, []);

  const onAddStep = useCallback(() => {
    setNodes((nds) => {
      const maxY = nds.reduce((m, n) => Math.max(m, n.position.y), -170);
      return [
        ...nds,
        {
          id: makeId(),
          type: 'stepNode' as const,
          position: { x: 0, y: maxY + 170 },
          data: { message: '', options: [], isInitial: false },
        },
      ];
    });
  }, [makeId]);

  // --- Wiring de React Flow (componente controlado: nodes/edges son
  // siempre derivados de nuestro propio estado, nunca del interno de RF) ---

  const onNodesChange = useCallback(
    (changes: NodeChange<StepNodeType>[]) => {
      const removals = changes.filter(
        (c): c is NodeRemoveChange => c.type === 'remove',
      );
      const rest = changes.filter((c) => c.type !== 'remove');
      if (rest.length > 0) {
        setNodes((nds) => applyNodeChanges(rest, nds));
      }
      // El borrado de nodos SIEMPRE pasa por deleteStep (proteccion del
      // paso inicial + limpieza de referencias huerfanas), sea que lo haya
      // disparado el boton del nodo o la tecla Supr sobre uno seleccionado.
      for (const removal of removals) {
        deleteStep(removal.id);
      }
    },
    [deleteStep],
  );

  const onConnect = useCallback((connection: Connection) => {
    const { source, sourceHandle, target } = connection;
    if (!source || !sourceHandle || !target) return;
    const optIndex = parseOptionHandle(sourceHandle);
    if (optIndex === null) return;
    // Sobreescribe gotoNodeId de esa opcion: como solo guardamos UN valor
    // por opcion, esto ya reemplaza cualquier conexion anterior sin dejar
    // un edge viejo colgando (los edges se derivan de este mismo campo).
    setNodes((nds) =>
      nds.map((n) =>
        n.id === source
          ? {
              ...n,
              data: {
                ...n.data,
                options: n.data.options.map((o, i) =>
                  i === optIndex ? { ...o, gotoNodeId: target } : o,
                ),
              },
            }
          : n,
      ),
    );
  }, []);

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      for (const change of changes) {
        if (change.type !== 'remove') continue;
        const edge = edges.find((e) => e.id === change.id);
        if (!edge) continue;
        const optIndex = parseOptionHandle(edge.sourceHandle);
        if (optIndex === null) continue;
        setNodes((nds) =>
          nds.map((n) =>
            n.id === edge.source
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    options: n.data.options.map((o, i) =>
                      i === optIndex ? { ...o, gotoNodeId: null } : o,
                    ),
                  },
                }
              : n,
          ),
        );
      }
    },
    [edges],
  );

  useImperativeHandle(
    ref,
    () => ({
      getSteps: () => {
        const result = buildSavePayload(nodes);
        if (!result.ok) {
          setError(result.error);
          return null;
        }
        setError(null);
        return result.steps;
      },
    }),
    [nodes],
  );

  // Los callbacks se inyectan en `data` de cada nodo aca (no dentro de
  // StepNode) porque este es un flow CONTROLADO: el estado real vive en
  // `nodes` de este componente, no en el store interno de React Flow.
  const callbacks: StepNodeCallbacks = useMemo(
    () => ({ onChangeMessage, onAddOption, onChangeOption, onRemoveOption, onDeleteStep: deleteStep }),
    [onChangeMessage, onAddOption, onChangeOption, onRemoveOption, deleteStep],
  );

  const nodesWithCallbacks = useMemo(
    () => nodes.map((n) => ({ ...n, data: { ...n.data, ...callbacks } })),
    [nodes, callbacks],
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Pasos</p>
        <button
          type="button"
          onClick={onAddStep}
          className="rounded-lg border border-dashed border-panel-border px-3 py-1.5 text-xs text-text-secondary hover:border-brand hover:text-brand"
        >
          + Agregar paso
        </button>
      </div>

      {error && <p className="text-xs text-status-error">{error}</p>}

      <div className="h-[480px] overflow-hidden rounded-xl border border-panel-border bg-panel">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodesWithCallbacks}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            deleteKeyCode={['Backspace', 'Delete']}
            defaultEdgeOptions={{ type: 'smoothstep' }}
          >
            <Background color="var(--color-panel-border)" gap={20} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>
  );
});
