import { useEffect, useState } from 'react';
import { useConversationsStore } from '../../store/conversationsStore';
import { ChatList } from '../chat-list/ChatList';
import { ChatWindow } from '../chat-window/ChatWindow';

export function ChatsView() {
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
    <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[360px_1fr]">
      <aside
        className={`min-h-0 border-r border-panel-border bg-panel md:block ${
          mobileView === 'list' ? 'block' : 'hidden'
        }`}
      >
        <ChatList selectedId={selectedId} onSelect={handleSelect} />
      </aside>

      <main className={`min-h-0 md:block ${mobileView === 'chat' ? 'block' : 'hidden'}`}>
        <ChatWindow conversationId={selectedId} onBack={() => setMobileView('list')} />
      </main>
    </div>
  );
}
