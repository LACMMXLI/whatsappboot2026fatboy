import { useState } from 'react';
import { useAuthStore } from './store/authStore';
import { LoginScreen } from './components/auth/LoginScreen';
import { AppShell } from './components/layout/AppShell';
import { SuperAdminPanel } from './components/superadmin/SuperAdminPanel';

export default function App() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const [mode, setMode] = useState<'crm' | 'superadmin'>('crm');

  if (!token) {
    return <LoginScreen />;
  }

  if (mode === 'superadmin' && user?.isSuperAdmin) {
    return <SuperAdminPanel onExit={() => setMode('crm')} />;
  }

  return (
    <AppShell onOpenSuperAdmin={user?.isSuperAdmin ? () => setMode('superadmin') : undefined} />
  );
}
