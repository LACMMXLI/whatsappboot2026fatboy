import { useState, type FormEvent } from 'react';
import { forgotPassword } from '../../api/auth';

interface ForgotPasswordScreenProps {
  onBackToLogin: () => void;
}

/**
 * El backend siempre responde el mismo mensaje generico (exista o no el
 * email) para no revelar que cuentas estan registradas — por eso este
 * formulario nunca muestra "ese email no existe", solo confirma el envio.
 */
export function ForgotPasswordScreen({ onBackToLogin }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch {
      setError('No se pudo procesar la solicitud. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full items-center justify-center bg-app-bg px-4">
      <div className="w-full max-w-sm rounded-2xl border border-panel-border bg-panel p-6">
        <h1 className="mb-1 text-2xl font-bold text-text-primary">
          Recuperar contraseña
        </h1>

        {sent ? (
          <>
            <p className="mb-6 text-sm text-text-secondary">
              Si <strong>{email}</strong> esta registrado, vas a recibir un email con un
              enlace para elegir una nueva contraseña. Revisa tambien spam/promociones.
            </p>
            <button
              type="button"
              onClick={onBackToLogin}
              className="h-14 w-full rounded-xl bg-brand text-base font-semibold text-white"
            >
              Volver a iniciar sesion
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="mb-6 text-sm text-text-secondary">
              Escribe tu email y te mandamos un enlace para restablecerla.
            </p>

            <label className="mb-1 block text-sm font-medium text-text-secondary">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="mb-4 h-14 w-full rounded-xl border border-panel-border bg-panel-elevated px-4 text-base text-text-primary focus:border-brand focus:outline-none"
            />

            {error && <p className="mb-4 text-sm text-status-error">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mb-3 h-14 w-full rounded-xl bg-brand text-base font-semibold text-white transition-opacity disabled:opacity-60"
            >
              {isSubmitting ? 'Enviando...' : 'Enviar enlace'}
            </button>

            <button
              type="button"
              onClick={onBackToLogin}
              className="h-12 w-full rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary"
            >
              Volver a iniciar sesion
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
