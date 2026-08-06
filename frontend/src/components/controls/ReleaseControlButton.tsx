export function ReleaseControlButton({ onRelease }: { onRelease: () => void }) {
  return (
    <button
      type="button"
      onClick={onRelease}
      className="flex h-12 items-center gap-2 rounded-xl bg-panel-elevated px-4 text-sm font-semibold text-text-primary transition-colors hover:bg-status-active/20 hover:text-status-active"
    >
      🔓 Liberar control
    </button>
  );
}
