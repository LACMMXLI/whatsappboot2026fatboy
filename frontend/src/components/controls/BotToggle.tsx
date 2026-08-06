export function BotToggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex h-12 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors ${
        enabled
          ? 'bg-brand/20 text-brand'
          : 'bg-panel-elevated text-text-secondary'
      }`}
    >
      <span className="text-lg">{enabled ? '🤖' : '🚫'}</span>
      {enabled ? 'Bot activo' : 'Bot desactivado'}
    </button>
  );
}
