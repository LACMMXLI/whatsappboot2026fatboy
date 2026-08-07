import { useCallback, useEffect, useMemo, useState } from 'react';
import { ordersApi } from '../../api/orders';
import { getSocket } from '../../lib/socket';
import { OrderCard } from './OrderCard';
import type { Order } from '../../types';

const DELIVERED_LIMIT = 12;

export function KdsScreen() {
  const [orders, setOrders] = useState<Record<string, Order>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await ordersApi.list();
      setOrders(Object.fromEntries(list.map((o) => [o.id, o])));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onOrderUpdated = (order: Order) =>
      setOrders((prev) => ({ ...prev, [order.id]: order }));
    socket.on('order.updated', onOrderUpdated);
    return () => {
      socket.off('order.updated', onOrderUpdated);
    };
  }, []);

  const { confirmed, ready, delivered } = useMemo(() => {
    const all = Object.values(orders);
    const byOldestFirst = (a: Order, b: Order) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    const byNewestFirst = (a: Order, b: Order) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    return {
      confirmed: all
        .filter((o) => o.status === 'CONFIRMED' || o.status === 'SENT_TO_POS')
        .sort(byOldestFirst),
      ready: all.filter((o) => o.status === 'READY').sort(byOldestFirst),
      delivered: all
        .filter((o) => o.status === 'DELIVERED')
        .sort(byNewestFirst)
        .slice(0, DELIVERED_LIMIT),
    };
  }, [orders]);

  const runAction = async (id: string, action: () => Promise<Order>) => {
    setBusyId(id);
    try {
      const updated = await action();
      setOrders((prev) => ({ ...prev, [id]: updated }));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Pedidos</h1>
        <p className="text-sm text-text-secondary">
          Cada vez que un cliente confirma su pedido por WhatsApp, aparece aca en vivo.
        </p>
      </div>

      {loading && <p className="text-sm text-text-muted">Cargando...</p>}

      {!loading && (
        <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-3">
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-status-in-order">
              🟡 Confirmados ({confirmed.length})
            </h2>
            {confirmed.length === 0 && (
              <p className="text-sm text-text-muted">No hay pedidos esperando.</p>
            )}
            {confirmed.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                actionLabel="Marcar listo"
                busy={busyId === order.id}
                onAction={() => runAction(order.id, () => ordersApi.ready(order.id))}
                onCancel={() => runAction(order.id, () => ordersApi.cancel(order.id))}
              />
            ))}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-status-active">
              🟢 Listos ({ready.length})
            </h2>
            {ready.length === 0 && (
              <p className="text-sm text-text-muted">No hay pedidos listos para recoger.</p>
            )}
            {ready.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                actionLabel="Marcar entregado"
                busy={busyId === order.id}
                onAction={() => runAction(order.id, () => ordersApi.deliver(order.id))}
              />
            ))}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
              ⚪ Entregados recientes
            </h2>
            {delivered.length === 0 && (
              <p className="text-sm text-text-muted">Todavia no hay entregas hoy.</p>
            )}
            {delivered.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </section>
        </div>
      )}
    </div>
  );
}
