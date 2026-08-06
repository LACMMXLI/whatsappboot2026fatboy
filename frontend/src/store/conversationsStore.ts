import { create } from 'zustand';
import { conversationsApi } from '../api/conversations';
import { messagesApi } from '../api/messages';
import { ordersApi } from '../api/orders';
import type { Conversation, Message, Order } from '../types';

interface ConversationsState {
  conversations: Record<string, Conversation>;
  messages: Record<string, Message[]>;
  orders: Record<string, Order | null>;
  selectedId: string | null;
  loadingList: boolean;
  loadingConversation: boolean;
  searchQuery: string;

  fetchConversations: () => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  setSearchQuery: (q: string) => void;

  upsertConversation: (conversation: Conversation) => void;
  appendMessage: (conversationId: string, message: Message) => void;
  upsertOrder: (order: Order) => void;

  sendMessage: (conversationId: string, content: string) => Promise<void>;
  toggleBot: (conversationId: string) => Promise<void>;
  takeControl: (conversationId: string, userId: string) => Promise<void>;
  releaseControl: (conversationId: string) => Promise<void>;
  resolve: (conversationId: string) => Promise<void>;
  reopen: (conversationId: string) => Promise<void>;
}

export const useConversationsStore = create<ConversationsState>((set, get) => ({
  conversations: {},
  messages: {},
  orders: {},
  selectedId: null,
  loadingList: false,
  loadingConversation: false,
  searchQuery: '',

  fetchConversations: async () => {
    set({ loadingList: true });
    try {
      const list = await conversationsApi.list();
      set({
        conversations: Object.fromEntries(list.map((c) => [c.id, c])),
        loadingList: false,
      });
    } catch {
      set({ loadingList: false });
    }
  },

  selectConversation: async (id) => {
    set({ selectedId: id, loadingConversation: true });
    try {
      const [detail, order] = await Promise.all([
        conversationsApi.getOne(id),
        ordersApi.getByConversation(id),
      ]);
      const { messages: detailMessages, ...conversation } = detail;
      set((state) => ({
        conversations: { ...state.conversations, [id]: conversation },
        messages: { ...state.messages, [id]: detailMessages },
        orders: { ...state.orders, [id]: order },
        loadingConversation: false,
      }));
    } catch {
      set({ loadingConversation: false });
    }
  },

  setSearchQuery: (q) => set({ searchQuery: q }),

  upsertConversation: (conversation) =>
    set((state) => ({
      conversations: { ...state.conversations, [conversation.id]: conversation },
    })),

  appendMessage: (conversationId, message) =>
    set((state) => {
      const existing = state.messages[conversationId] ?? [];
      if (existing.some((m) => m.id === message.id)) {
        return state;
      }
      return {
        messages: { ...state.messages, [conversationId]: [...existing, message] },
      };
    }),

  upsertOrder: (order) => {
    if (!order.conversationId) return;
    set((state) => ({
      orders: { ...state.orders, [order.conversationId as string]: order },
    }));
  },

  sendMessage: async (conversationId, content) => {
    const message = await messagesApi.send(conversationId, content);
    get().appendMessage(conversationId, message);
  },

  toggleBot: async (conversationId) => {
    const updated = await conversationsApi.toggleBot(conversationId);
    get().upsertConversation(updated);
  },

  takeControl: async (conversationId, userId) => {
    const conversation = get().conversations[conversationId];
    if (conversation?.botEnabled) {
      await conversationsApi.toggleBot(conversationId);
    }
    const updated = await conversationsApi.assign(conversationId, userId);
    get().upsertConversation(updated);
  },

  releaseControl: async (conversationId) => {
    // Sin override: el backend decide si reactiva el bot segun la
    // configuracion del negocio (Business.reactivateBotOnRelease).
    const updated = await conversationsApi.releaseControl(conversationId);
    get().upsertConversation(updated);
  },

  resolve: async (conversationId) => {
    const updated = await conversationsApi.resolve(conversationId);
    get().upsertConversation(updated);
  },

  reopen: async (conversationId) => {
    const updated = await conversationsApi.reopen(conversationId);
    get().upsertConversation(updated);
  },
}));
