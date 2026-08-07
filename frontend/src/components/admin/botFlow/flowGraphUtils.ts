import type { Edge, Node } from '@xyflow/react';
import type { BotFlowInput, BotFlowStep } from '../../../types';

/** Opcion de un paso, en el modelo local del editor: en vez de `gotoStep`
 *  (numero, formato de guardado del API) usa `gotoNodeId` (id de nodo local
 *  de React Flow), valido tanto para pasos ya guardados como para pasos
 *  nuevos todavia sin numero de orden asignado. Se traduce a `gotoStep`
 *  numerico recien al guardar, ver `buildSavePayload`. */
export interface LocalFlowOption {
  label: string;
  gotoNodeId: string | null;
}

export interface StepNodeData extends Record<string, unknown> {
  message: string;
  options: LocalFlowOption[];
  /** El paso con order 0 original: dispara el flujo, no se puede borrar. */
  isInitial: boolean;
}

export type StepNodeType = Node<StepNodeData, 'stepNode'>;

const COL_W = 260;
const ROW_H = 170;

/** Handle de salida de la opcion N de un paso: "opt-0", "opt-1", etc. */
export function optionHandleId(index: number): string {
  return `opt-${index}`;
}

export function parseOptionHandle(handle: string | null | undefined): number | null {
  if (!handle) return null;
  const match = /^opt-(\d+)$/.exec(handle);
  return match ? Number(match[1]) : null;
}

/**
 * Convierte los steps tal como vienen del API (o el placeholder de un flujo
 * nuevo) en nodos de React Flow. `makeId` genera ids locales estables para
 * la sesion de edicion -- no tienen por que coincidir con `order`.
 */
export function buildNodesFromSteps(
  steps: Pick<BotFlowStep, 'order' | 'message' | 'options' | 'positionX' | 'positionY'>[],
  makeId: () => string,
): StepNodeType[] {
  const sorted = [...steps].sort((a, b) => a.order - b.order);
  const localIds = sorted.map(() => makeId());
  const idByOrder = new Map<number, string>();
  sorted.forEach((step, i) => idByOrder.set(step.order, localIds[i]));

  // Si NINGUN paso tiene posicion guardada (flujo creado con el editor
  // lineal anterior, o recien creado), se calcula un layout automatico
  // legible. Si al menos uno tiene posicion, se respetan las que haya
  // (0,0 incluido) y los pocos que falten quedan en el origen.
  const needsAutoLayout = sorted.every(
    (s) => s.positionX == null || s.positionY == null,
  );
  const autoPositions = needsAutoLayout
    ? computeAutoLayout(sorted, idByOrder, localIds)
    : null;

  return sorted.map((step, i) => {
    const id = localIds[i];
    const options: LocalFlowOption[] = (
      (step.options as { label: string; gotoStep: number | null }[]) ?? []
    ).map((opt) => ({
      label: opt.label,
      gotoNodeId: opt.gotoStep != null ? idByOrder.get(opt.gotoStep) ?? null : null,
    }));
    const position =
      step.positionX != null && step.positionY != null
        ? { x: step.positionX, y: step.positionY }
        : autoPositions?.get(id) ?? { x: 0, y: 0 };

    return {
      id,
      type: 'stepNode',
      position,
      data: { message: step.message, options, isInitial: step.order === 0 },
    };
  });
}

/** Layout en capas (BFS desde el paso inicial): cada nivel de profundidad es
 *  una fila, los hermanos de un mismo nivel se reparten en columnas. Pasos
 *  no alcanzables desde el inicial (no deberia pasar en un flujo sano, pero
 *  puede quedar huerfano mientras se edita) se ponen aparte a la derecha. */
function computeAutoLayout(
  sortedSteps: { order: number; options: unknown }[],
  idByOrder: Map<number, string>,
  localIds: string[],
): Map<string, { x: number; y: number }> {
  const adjacency = new Map<string, string[]>();
  sortedSteps.forEach((step, i) => {
    const id = localIds[i];
    const options = (step.options as { gotoStep: number | null }[]) ?? [];
    const targets = options
      .map((o) => (o.gotoStep != null ? idByOrder.get(o.gotoStep) : null))
      .filter((v): v is string => !!v);
    adjacency.set(id, targets);
  });

  const initialIndex = sortedSteps.findIndex((s) => s.order === 0);
  const initialId = localIds[initialIndex >= 0 ? initialIndex : 0];

  const depth = new Map<string, number>();
  const queue: string[] = [initialId];
  depth.set(initialId, 0);
  while (queue.length > 0) {
    const current = queue.shift() as string;
    const d = depth.get(current) ?? 0;
    for (const next of adjacency.get(current) ?? []) {
      if (!depth.has(next)) {
        depth.set(next, d + 1);
        queue.push(next);
      }
    }
  }

  const maxDepth = Math.max(0, ...Array.from(depth.values()));
  const countByDepth = new Map<number, number>();
  const positions = new Map<string, { x: number; y: number }>();
  let orphanIndex = 0;

  for (const id of localIds) {
    const d = depth.get(id);
    if (d !== undefined) {
      const col = countByDepth.get(d) ?? 0;
      countByDepth.set(d, col + 1);
      positions.set(id, { x: col * COL_W, y: d * ROW_H });
    } else {
      positions.set(id, { x: (maxDepth + 2) * COL_W, y: orphanIndex * ROW_H });
      orphanIndex += 1;
    }
  }
  return positions;
}

/** Los edges NUNCA se guardan aparte: se recalculan de `gotoNodeId` en cada
 *  render. Asi no hay dos modelos (edges + gotoStep) que puedan
 *  desincronizarse -- gotoStep/gotoNodeId es la unica fuente de verdad. */
export function deriveEdges(nodes: StepNodeType[]): Edge[] {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges: Edge[] = [];
  for (const node of nodes) {
    node.data.options.forEach((opt, i) => {
      if (opt.gotoNodeId && nodeIds.has(opt.gotoNodeId)) {
        edges.push({
          id: `e-${node.id}-${i}-${opt.gotoNodeId}`,
          source: node.id,
          sourceHandle: optionHandleId(i),
          target: opt.gotoNodeId,
          targetHandle: 'in',
          label: opt.label || undefined,
          type: 'smoothstep',
          style: { stroke: 'var(--color-brand)' },
          labelStyle: { fill: 'var(--color-text-primary)', fontSize: 11 },
          labelBgStyle: { fill: 'var(--color-panel-elevated)' },
        });
      }
    });
  }
  return edges;
}

export type SavePayloadResult =
  | { ok: true; steps: BotFlowInput['steps'] }
  | { ok: false; error: string };

/**
 * Reindexa los nodos actuales a un rango contiguo 0..N-1 (el paso inicial
 * siempre primero) y remapea `gotoNodeId` -> `gotoStep` numerico. Se corre
 * SIEMPRE antes de guardar -- es el unico lugar donde el modelo local
 * (ids de string) vuelve al contrato del API (order numerico), sin dejar
 * huecos ni referencias colgando.
 */
export function buildSavePayload(nodes: StepNodeType[]): SavePayloadResult {
  if (nodes.length === 0) {
    return { ok: false, error: 'El flujo necesita al menos un paso.' };
  }
  const initial = nodes.find((n) => n.data.isInitial);
  if (!initial) {
    return { ok: false, error: 'Falta el paso inicial.' };
  }
  for (const node of nodes) {
    if (!node.data.message.trim()) {
      return { ok: false, error: 'Todos los pasos necesitan un mensaje.' };
    }
  }

  const ordered = [initial, ...nodes.filter((n) => n.id !== initial.id)];
  const orderByNodeId = new Map(ordered.map((n, i) => [n.id, i]));

  const steps = ordered.map((node) => ({
    message: node.data.message.trim(),
    // Opciones totalmente vacias (sin texto Y sin conexion) se descartan:
    // ademas de ser ruido, un label vacio "matchea" cualquier respuesta del
    // cliente en el motor (normalizeText(x).includes('') es siempre true),
    // asi que dejarlas pasar podria romper el resto de las opciones del paso.
    options: node.data.options
      .filter((o) => o.label.trim().length > 0 || o.gotoNodeId !== null)
      .map((o) => ({
        label: o.label.trim(),
        gotoStep: o.gotoNodeId != null ? orderByNodeId.get(o.gotoNodeId) ?? null : null,
      })),
    positionX: node.position.x,
    positionY: node.position.y,
  }));

  return { ok: true, steps };
}
