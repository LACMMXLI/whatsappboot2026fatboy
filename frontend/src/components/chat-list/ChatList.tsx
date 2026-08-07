import { useMemo, useState } from 'react';
import { useConversationsStore } from '../../store/conversationsStore';
import { ChatItem } from './ChatItem';
import { SearchBar } from './SearchBar';
import type { OperationalStatus } from '../../types';

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

type StatusFilter = 'ALL' | OperationalStatus;

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'ALL', label: 'Todos' },
  { key: 'HUMAN_ATTENTION', label: '🟣 Con humano' },
  { key: 'WAITING', label: '🔴 Esperando' },
  { key: 'NEW', label: '🔵 Nuevo' },
  { key: 'IN_ORDER', label: '🟡 En pedido' },
];

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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const allConversations = useMemo(() => Object.values(conversations), [conversations]);

  const counts = useMemo(() => {
    const map: Partial<Record<OperationalStatus, number>> = {};
    for (const c of allConversations) {
      map[c.operationalStatus] = (map[c.operationalStatus] ?? 0) + 1;
    }
    return map;
  }, [allConversations]);

  const list = useMemo(() => {
    const query = normalize(searchQuery.trim());
    const filtered = allConversations.filter((c) => {
      if (statusFilter !== 'ALL' && c.operationalStatus !== statusFilter) return false;
      if (!query) return true;
      const name = c.customer.name ?? '';
      return normalize(name).includes(query) || normalize(c.customer.phone).includes(query);
    });
    return filtered.sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [allConversations, searchQuery, statusFilter]);

  return (
    <div className="flex h-full flex-col">
      <SearchBar value={searchQuery} onChange={setSearchQuery} />

      <div className="flex gap-1.5 overflow-x-auto border-b border-panel-border px-3 py-2">
        {FILTERS.map((filter) => {
          const count = filter.key === 'ALL' ? allConversations.length : counts[filter.key] ?? 0;
          if (filter.key !== 'ALL' && count === 0) return null;
          return (
            <button
              key={filter.key}
              type="button"
              onClick={() => setStatusFilter(filter.key)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === filter.key
                  ? 'bg-brand/20 text-brand'
                  : 'bg-panel-elevated text-text-secondary'
              }`}
            >
              {filter.label} {count > 0 && `(${count})`}
            </button>
          );
        })}
      </div>

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
