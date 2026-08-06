export function ResolveButton({
  isResolved,
  onResolve,
  onReopen,
}: {
  isResolved: boolean;
  onResolve: () => void;
  onReopen: () => void;
}) {
  if (isResolved) {
    return (
      <button
        type="button"
        onClick={onReopen}
        className="flex h-12 items-center gap-2 rounded-xl bg-panel-elevated px-4 text-sm font-semibold text-text-secondary"
      >
        ↺ Reabrir
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onResolve}
      className="flex h-12 items-center gap-2 rounded-xl bg-status-active/20 px-4 text-sm font-semibold text-status-active"
    >
      ✔ Marcar como resuelto
    </button>
  );
}
