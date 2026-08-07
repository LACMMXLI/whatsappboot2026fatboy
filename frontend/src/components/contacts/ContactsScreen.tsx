import { useCallback, useEffect, useMemo, useState } from 'react';
import { customersApi } from '../../api/customers';
import { useConversationsStore } from '../../store/conversationsStore';
import type { Customer } from '../../types';

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function ContactsScreen({ onOpenConversation }: { onOpenConversation: () => void }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const conversations = useConversationsStore((s) => s.conversations);
  const fetchConversations = useConversationsStore((s) => s.fetchConversations);
  const selectConversation = useConversationsStore((s) => s.selectConversation);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await customersApi.list();
      setCustomers(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const conversationByCustomerId = useMemo(() => {
    const map = new Map<string, string>();
    for (const conversation of Object.values(conversations)) {
      map.set(conversation.customerId, conversation.id);
    }
    return map;
  }, [conversations]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    const list = q
      ? customers.filter(
          (c) => normalize(c.name ?? '').includes(q) || normalize(c.phone).includes(q),
        )
      : customers;
    return [...list].sort((a, b) => a.phone.localeCompare(b.phone));
  }, [customers, query]);

  const handleOpenConversation = async (customerId: string) => {
    let conversationId = conversationByCustomerId.get(customerId);
    if (!conversationId) {
      await fetchConversations();
      conversationId = useConversationsStore.getState().conversations
        ? Object.values(useConversationsStore.getState().conversations).find(
            (c) => c.customerId === customerId,
          )?.id
        : undefined;
    }
    if (!conversationId) return;
    await selectConversation(conversationId);
    onOpenConversation();
  };

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-4 overflow-y-auto p-4">
      <h1 className="text-xl font-bold text-text-primary">Contactos</h1>
      <p className="text-sm text-text-secondary">
        Clientes que te escribieron por WhatsApp. Se crean solos cuando llega su primer mensaje.
      </p>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por nombre o telefono..."
        className="h-12 rounded-xl border border-panel-border bg-panel-elevated px-3 text-base text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
      />

      <div className="overflow-hidden rounded-2xl border border-panel-border bg-panel">
        {loading && <p className="p-4 text-sm text-text-muted">Cargando...</p>}
        {!loading && filtered.length === 0 && (
          <p className="p-4 text-sm text-text-muted">No se encontraron contactos.</p>
        )}
        {filtered.map((customer) => {
          const hasConversation = conversationByCustomerId.has(customer.id);
          return (
            <div
              key={customer.id}
              className="flex flex-wrap items-center gap-3 border-b border-panel-border px-4 py-3 last:border-b-0"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-panel-elevated text-sm font-semibold text-text-primary">
                {(customer.name ?? customer.phone).slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-text-primary">
                  {customer.name ?? 'Sin nombre'}
                </p>
                <p className="truncate text-sm text-text-secondary">
                  {customer.phone} · cliente desde {formatDate(customer.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleOpenConversation(customer.id)}
                disabled={!hasConversation}
                title={hasConversation ? 'Ver conversacion' : 'Todavia no tiene conversacion'}
                className="h-10 rounded-lg bg-panel-elevated px-3 text-sm text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                Ver chat
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
