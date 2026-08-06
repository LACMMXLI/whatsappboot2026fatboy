import { useMemo } from 'react';
import { useConversationsStore } from '../../store/conversationsStore';
import { ChatItem } from './ChatItem';
import { SearchBar } from './SearchBar';

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function ChatList({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const conversations = useConversationsStore((s) => s.conversations);
  const searchQuery = useConversationsStore((s) => s.searchQuery);
  const setSearchQuery = useConversationsStore((s) => s.setSearchQuery);
  const loadingList = useConversationsStore((s) => s.loadingList);

  const list = useMemo(() => {
    const all = Object.values(conversations);
    const query = normalize(searchQuery.trim());
    const filtered = query
      ? all.filter((c) => {
          const name = c.customer.name ?? '';
          return (
            normalize(name).includes(query) || normalize(c.customer.phone).includes(query)
          );
        })
      : all;
    return filtered.sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [conversations, searchQuery]);

  return (
    <div className="flex h-full flex-col">
      <SearchBar value={searchQuery} onChange={setSearchQuery} />
      <div className="flex-1 overflow-y-auto">
        {loadingList && (
          <p className="p-4 text-sm text-text-muted">Cargando conversaciones...</p>
        )}
        {!loadingList && list.length === 0 && (
          <p className="p-4 text-sm text-text-muted">No hay conversaciones.</p>
        )}
        {list.map((conversation) => (
          <ChatItem
            key={conversation.id}
            conversation={conversation}
            isSelected={conversation.id === selectedId}
            onSelect={() => onSelect(conversation.id)}
          />
        ))}
      </div>
    </div>
  );
}
