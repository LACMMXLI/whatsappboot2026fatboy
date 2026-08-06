import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useRealtime } from '../../hooks/useRealtime';
import { ChatsView } from '../chats/ChatsView';
import { ProductsScreen } from '../admin/ProductsScreen';
import { PromotionsScreen } from '../admin/PromotionsScreen';
import { BotConfigScreen } from '../admin/BotConfigScreen';

type View = 'chats' | 'products' | 'promotions' | 'bot';

const TABS: { key: View; label: string }[] = [
  { key: 'chats', label: 'Chats' },
  { key: 'products', label: 'Menu' },
  { key: 'promotions', label: 'Promociones' },
  { key: 'bot', label: 'Bot' },
];

export function AppShell() {
  useRealtime();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [view, setView] = useState<View>('chats');

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-panel-border bg-panel px-4">
        <div className="flex items-center gap-4">
          <span className="text-base font-bold text-text-primary">CRM WhatsApp</span>
          <nav className="flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setView(tab.key)}
                className={`h-9 rounded-lg px-3 text-sm font-medium transition-colors ${
                  view === tab.key
                    ? 'bg-brand/20 text-brand'
                    : 'text-text-secondary hover:bg-panel-elevated'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-text-secondary sm:inline">{user?.name}</span>
          <button
            type="button"
            onClick={logout}
            className="h-9 rounded-lg bg-panel-elevated px-3 text-sm text-text-secondary"
          >
            Salir
          </button>
        </div>
      </header>

      {view === 'chats' && <ChatsView />}
      {view === 'products' && <ProductsScreen />}
      {view === 'promotions' && <PromotionsScreen />}
      {view === 'bot' && <BotConfigScreen />}
    </div>
  );
}
