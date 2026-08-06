import { useState, type FormEvent } from 'react';
import { useAuthStore } from '../../store/authStore';

export function LoginScreen() {
  const login = useAuthStore((s) => s.login);
  const isAuthenticating = useAuthStore((s) => s.isAuthenticating);
  const error = useAuthStore((s) => s.error);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    login(email, password);
  };

  return (
    <div className="flex h-full items-center justify-center bg-app-bg px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-panel-border bg-panel p-6"
      >
        <h1 className="mb-1 text-2xl font-bold text-text-primary">CRM WhatsApp</h1>
        <p className="mb-6 text-sm text-text-secondary">
          Inicia sesion para atender tus conversaciones.
        </p>

        <label className="mb-1 block text-sm font-medium text-text-secondary">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mb-4 h-14 w-full rounded-xl border border-panel-border bg-panel-elevated px-4 text-base text-text-primary focus:border-brand focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-text-secondary">
          Contrasena
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mb-4 h-14 w-full rounded-xl border border-panel-border bg-panel-elevated px-4 text-base text-text-primary focus:border-brand focus:outline-none"
        />

        {error && <p className="mb-4 text-sm text-status-error">{error}</p>}

        <button
          type="submit"
          disabled={isAuthenticating}
          className="h-14 w-full rounded-xl bg-brand text-base font-semibold text-white transition-opacity disabled:opacity-60"
        >
          {isAuthenticating ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}
