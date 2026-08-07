import { useState } from 'react';
import { useAuthStore } from './store/authStore';
import { LoginScreen } from './components/auth/LoginScreen';
import { ResetPasswordScreen } from './components/auth/ResetPasswordScreen';
import { AppShell } from './components/layout/AppShell';
import { SuperAdminPanel } from './components/superadmin/SuperAdminPanel';

export default function App() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const [mode, setMode] = useState<'crm' | 'superadmin'>('crm');

  // El link del email de "olvide mi contraseña" apunta a esta ruta con
  // ?token=... — se atiende antes que cualquier otra cosa, este logueado o
  // no quien abra el link (nginx sirve index.html para cualquier ruta, ver
  // frontend/nginx.conf).
  const resetPasswordUrl = new URLSearchParams(window.location.search);
  const resetToken = resetPasswordUrl.get('token');
  if (window.location.pathname === '/reset-password' && resetToken) {
    return (
      <ResetPasswordScreen
        token={resetToken}
        onDone={() => {
          window.history.replaceState({}, '', '/');
          window.location.reload();
        }}
      />
    );
  }

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
