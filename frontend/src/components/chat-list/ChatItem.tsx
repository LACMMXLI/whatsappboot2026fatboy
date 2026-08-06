import type { Conversation } from '../../types';
import { formatRelativeTime } from '../../lib/time';
import { StatusBadge } from './StatusBadge';

export function ChatItem({
  conversation,
  isSelected,
  onSelect,
}: {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const displayName = conversation.customer.name || conversation.customer.phone;
  const initial = displayName.trim().charAt(0).toUpperCase() || '?';
  const preview = conversation.lastMessagePreview
    ? `${conversation.lastMessageDirection === 'OUT' ? 'Tu: ' : ''}${conversation.lastMessagePreview}`
    : 'Sin mensajes todavia';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 border-b border-panel-border px-4 py-3.5 text-left transition-colors ${
        isSelected ? 'bg-panel-elevated' : 'hover:bg-panel-elevated/60'
      }`}
      style={{ minHeight: '76px' }}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand/20 text-lg font-semibold text-brand">
        {initial}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-base font-semibold text-text-primary">
            {displayName}
          </span>
          <span className="shrink-0 text-xs text-text-muted">
            {formatRelativeTime(conversation.lastMessageAt)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <span className="truncate text-sm text-text-secondary">{preview}</span>
          {conversation.unreadCount > 0 && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-bold text-white">
              {conversation.unreadCount}
            </span>
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <StatusBadge status={conversation.operationalStatus} />
          <span
            className="text-xs"
            title={conversation.botEnabled ? 'Bot activo' : 'Bot desactivado'}
          >
            {conversation.botEnabled ? '🤖' : '🚫'}
          </span>
        </div>
      </div>
    </button>
  );
}
