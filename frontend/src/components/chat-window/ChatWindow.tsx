import { useEffect, useRef } from 'react';
import { useConversationsStore } from '../../store/conversationsStore';
import { useAuthStore } from '../../store/authStore';
import { StatusBadge } from '../chat-list/StatusBadge';
import { OrderPanel } from '../order-panel/OrderPanel';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { EmptyState } from './EmptyState';
import { BotToggle } from '../controls/BotToggle';
import { TakeControlButton } from '../controls/TakeControlButton';
import { ReleaseControlButton } from '../controls/ReleaseControlButton';
import { ResolveButton } from '../controls/ResolveButton';

export function ChatWindow({
  conversationId,
  onBack,
}: {
  conversationId: string | null;
  onBack?: () => void;
}) {
  const conversation = useConversationsStore((s) =>
    conversationId ? s.conversations[conversationId] : undefined,
  );
  const messages = useConversationsStore((s) =>
    conversationId ? (s.messages[conversationId] ?? []) : [],
  );
  const order = useConversationsStore((s) =>
    conversationId ? (s.orders[conversationId] ?? null) : null,
  );
  const sendMessage = useConversationsStore((s) => s.sendMessage);
  const toggleBot = useConversationsStore((s) => s.toggleBot);
  const takeControl = useConversationsStore((s) => s.takeControl);
  const releaseControl = useConversationsStore((s) => s.releaseControl);
  const resolve = useConversationsStore((s) => s.resolve);
  const reopen = useConversationsStore((s) => s.reopen);
  const currentUser = useAuthStore((s) => s.user);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, conversationId]);

  if (!conversationId || !conversation) {
    return (
      <div className="flex h-full flex-col bg-app-bg">
        <EmptyState />
      </div>
    );
  }

  const displayName = conversation.customer.name || conversation.customer.phone;
  const isResolved = Boolean(conversation.resolvedAt);
  const isMineInControl =
    !conversation.botEnabled && conversation.assignedUserId === currentUser?.id;
  // Solo tiene sentido liberar el control cuando alguien lo tiene: hay un
  // agente asignado o el bot esta desactivado (atencion humana).
  const isUnderHumanControl = Boolean(conversation.assignedUserId) || !conversation.botEnabled;

  return (
    <div className="flex h-full flex-col bg-app-bg">
      <header className="border-b border-panel-border bg-panel px-4 py-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-panel-elevated text-xl md:hidden"
              aria-label="Volver a la lista"
            >
              ←
            </button>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold text-text-primary">{displayName}</p>
            <p className="text-sm text-text-secondary">{conversation.customer.phone}</p>
          </div>
          <StatusBadge status={conversation.operationalStatus} />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <BotToggle enabled={conversation.botEnabled} onToggle={() => toggleBot(conversation.id)} />
          <TakeControlButton
            isMine={isMineInControl}
            onTakeControl={() => {
              if (currentUser) takeControl(conversation.id, currentUser.id);
            }}
          />
          {isUnderHumanControl && (
            <ReleaseControlButton onRelease={() => releaseControl(conversation.id)} />
          )}
          <ResolveButton
            isResolved={isResolved}
            onResolve={() => resolve(conversation.id)}
            onReopen={() => reopen(conversation.id)}
          />
        </div>
      </header>

      <OrderPanel order={order} />

      <div className="flex-1 overflow-y-auto py-2">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        <div ref={bottomRef} />
      </div>

      <ChatInput onSend={(content) => sendMessage(conversation.id, content)} />
    </div>
  );
}
