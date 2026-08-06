import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useConversationsStore } from '../store/conversationsStore';
import { connectSocket, disconnectSocket } from '../lib/socket';
import type { Conversation, Message, Order } from '../types';

/**
 * Conecta los eventos de WebSocket del backend (`conversation.new`,
 * `conversation.updated`, `message.new`, `order.updated`) con el store.
 * `conversation.new` y `conversation.updated` se tratan igual: upsert por id.
 */
export function useRealtime(): void {
  const token = useAuthStore((s) => s.token);
  const upsertConversation = useConversationsStore((s) => s.upsertConversation);
  const appendMessage = useConversationsStore((s) => s.appendMessage);
  const upsertOrder = useConversationsStore((s) => s.upsertOrder);

  useEffect(() => {
    if (!token) return;
    const socket = connectSocket(token);

    const onConversationUpsert = (conversation: Conversation) =>
      upsertConversation(conversation);
    const onMessageNew = (message: Message) =>
      appendMessage(message.conversationId, message);
    const onOrderUpdated = (order: Order) => upsertOrder(order);

    socket.on('conversation.new', onConversationUpsert);
    socket.on('conversation.updated', onConversationUpsert);
    socket.on('message.new', onMessageNew);
    socket.on('order.updated', onOrderUpdated);

    return () => {
      socket.off('conversation.new', onConversationUpsert);
      socket.off('conversation.updated', onConversationUpsert);
      socket.off('message.new', onMessageNew);
      socket.off('order.updated', onOrderUpdated);
      // Unica fuente de conexion del socket: cierra al desmontar o cuando
      // cambia el token (logout, o antes de reconectar con uno nuevo).
      disconnectSocket();
    };
  }, [token, upsertConversation, appendMessage, upsertOrder]);
}
