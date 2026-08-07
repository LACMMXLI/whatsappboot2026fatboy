import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useRealtime } from '../../hooks/useRealtime';
import { ChatsView } from '../chats/ChatsView';
import { ProductsScreen } from '../admin/ProductsScreen';
import { PromotionsScreen } from '../admin/PromotionsScreen';
import { BotConfigScreen } from '../admin/BotConfigScreen';
import { BusinessSettingsScreen } from '../admin/BusinessSettingsScreen';
import { ContactsScreen } from '../contacts/ContactsScreen';
import { KdsScreen } from '../kds/KdsScreen';

type View = 'chats' | 'products' | 'promotions' | 'bot' | 'business' | 'contacts' | 'kds';

const NAV_ITEMS: { key: View; label: string; icon: string }[] = [
  { key: 'chats', label: 'Chats', icon: '💬' },
  { key: 'contacts', label: 'Contactos', icon: '👥' },
  { key: 'kds', label: 'Pedidos', icon: '🧾' },
  { key: 'products', label: 'Menu', icon: '🍔' },
  { key: 'promotions', label: 'Promociones', icon: '🎉' },
  { key: 'bot', label: 'Bot', icon: '🤖' },
  { key: 'business', label: 'Negocio', icon: '🏪' },
];

export function AppShell() {
  useRealtime();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [view, setView] = useState<View>('chats');

  return (
    <div className="flex h-full">
      <nav className="flex w-16 shrink-0 flex-col items-center gap-1 border-r border-panel-border bg-panel py-3">
        <span className="mb-2 text-2xl" title="CRM WhatsApp">
          🟢
        </span>

        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            title={item.label}
            aria-label={item.label}
            onClick={() => setView(item.key)}
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl transition-colors ${
              view === item.key
                ? 'bg-brand/20 text-brand'
                : 'text-text-secondary hover:bg-panel-elevated'
            }`}
          >
            {item.icon}
          </button>
        ))}

        <div className="mt-auto flex flex-col items-center gap-1">
          <span
            title={user?.name}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-panel-elevated text-sm font-semibold text-text-primary"
          >
            {user?.name?.slice(0, 1).toUpperCase() ?? '?'}
          </span>
          <button
            type="button"
            title="Salir"
            aria-label="Salir"
            onClick={logout}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-xl text-text-secondary hover:bg-panel-elevated"
          >
            🚪
          </button>
        </div>
      </nav>

      <div className="flex min-h-0 flex-1 flex-col">
        {view === 'chats' && <ChatsView />}
        {view === 'contacts' && <ContactsScreen onOpenConversation={() => setView('chats')} />}
        {view === 'kds' && <KdsScreen />}
        {view === 'products' && <ProductsScreen />}
        {view === 'promotions' && <PromotionsScreen />}
        {view === 'bot' && <BotConfigScreen />}
        {view === 'business' && <BusinessSettingsScreen />}
      </div>
    </div>
  );
}
