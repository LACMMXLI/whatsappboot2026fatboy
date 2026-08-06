import type { Message } from '../../types';
import { formatTime } from '../../lib/time';

export function MessageBubble({ message }: { message: Message }) {
  if (message.senderType === 'SYSTEM') {
    return (
      <div className="my-2 flex justify-center">
        <span className="rounded-full bg-panel-elevated px-3 py-1 text-xs text-text-muted">
          {message.content}
        </span>
      </div>
    );
  }

  const isCustomer = message.senderType === 'CUSTOMER';
  const label =
    message.senderType === 'BOT'
      ? 'Bot'
      : message.senderType === 'AGENT'
        ? (message.senderNameSnapshot ?? 'Agente')
        : message.senderType === 'INTEGRATION'
          ? 'Integracion'
          : null;

  const bubbleColor = isCustomer
    ? 'bg-bubble-in'
    : message.senderType === 'BOT'
      ? 'bg-bubble-bot'
      : message.senderType === 'INTEGRATION'
        ? 'bg-panel-elevated border border-status-human/40'
        : 'bg-bubble-out';

  return (
    <div className={`flex ${isCustomer ? 'justify-start' : 'justify-end'} px-2 py-1`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed text-text-primary ${bubbleColor}`}
      >
        {label && (
          <p className="mb-0.5 text-xs font-semibold text-text-secondary">{label}</p>
        )}
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <p className="mt-1 text-right text-[11px] text-text-muted">
          {formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
