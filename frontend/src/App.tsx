import { useAuthStore } from './store/authStore';
import { LoginScreen } from './components/auth/LoginScreen';
import { AppShell } from './components/layout/AppShell';

export default function App() {
  const token = useAuthStore((s) => s.token);
  return token ? <AppShell /> : <LoginScreen />;
}
