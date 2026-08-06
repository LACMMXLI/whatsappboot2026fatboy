export function TakeControlButton({
  isMine,
  onTakeControl,
}: {
  isMine: boolean;
  onTakeControl: () => void;
}) {
  if (isMine) {
    return (
      <span className="flex h-12 items-center gap-2 rounded-xl bg-status-human/20 px-4 text-sm font-semibold text-status-human">
        🙋 En atencion humana (tu)
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onTakeControl}
      className="flex h-12 items-center gap-2 rounded-xl bg-panel-elevated px-4 text-sm font-semibold text-text-primary transition-colors hover:bg-status-human/20 hover:text-status-human"
    >
      🙋 Tomar control
    </button>
  );
}
