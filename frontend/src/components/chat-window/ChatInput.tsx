import { useState, type KeyboardEvent } from 'react';

export function ChatInput({
  onSend,
  disabled,
}: {
  onSend: (content: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState('');

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-end gap-2 border-t border-panel-border bg-panel p-3">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Escribe una respuesta..."
        rows={1}
        className="max-h-32 min-h-14 flex-1 resize-none rounded-2xl border border-panel-border bg-panel-elevated px-4 py-3.5 text-base text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
      />
      <button
        type="button"
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand text-2xl text-white transition-opacity disabled:opacity-40"
        aria-label="Enviar mensaje"
      >
        ➤
      </button>
    </div>
  );
}
