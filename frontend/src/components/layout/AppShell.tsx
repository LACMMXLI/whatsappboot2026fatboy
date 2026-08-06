import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useConversationsStore } from '../../store/conversationsStore';
import { useRealtime } from '../../hooks/useRealtime';
import { ChatList } from '../chat-list/ChatList';
import { ChatWindow } from '../chat-window/ChatWindow';

export function AppShell() {
  useRealtime();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const fetchConversations = useConversationsStore((s) => s.fetchConversations);
  const selectConversation = useConversationsStore((s) => s.selectConversation);
  const selectedId = useConversationsStore((s) => s.selectedId);

  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleSelect = (id: string) => {
    selectConversation(id);
    setMobileView('chat');
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-panel-border bg-panel px-4">
        <span className="text-base font-bold text-text-primary">CRM WhatsApp</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-secondary">{user?.name}</span>
          <button
            type="button"
            onClick={logout}
            className="h-9 rounded-lg bg-panel-elevated px-3 text-sm text-text-secondary"
          >
            Salir
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[360px_1fr]">
        <aside
          className={`min-h-0 border-r border-panel-border bg-panel md:block ${
            mobileView === 'list' ? 'block' : 'hidden'
          }`}
        >
          <ChatList selectedId={selectedId} onSelect={handleSelect} />
        </aside>

        <main
          className={`min-h-0 md:block ${mobileView === 'chat' ? 'block' : 'hidden'}`}
        >
          <ChatWindow
            conversationId={selectedId}
            onBack={() => setMobileView('list')}
          />
        </main>
      </div>
    </div>
  );
}
