import { useState, type FormEvent } from 'react';
import { resetPassword } from '../../api/auth';
import { ApiError } from '../../lib/apiClient';

interface ResetPasswordScreenProps {
  token: string;
  onDone: () => void;
}

/** Pantalla que abre el link del email (`/reset-password?token=...`). */
export function ResetPasswordScreen({ token, onDone }: ResetPasswordScreenProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(token, newPassword);
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'El enlace es invalido o ya vencio. Solicita uno nuevo.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full items-center justify-center bg-app-bg px-4">
      <div className="w-full max-w-sm rounded-2xl border border-panel-border bg-panel p-6">
        <h1 className="mb-1 text-2xl font-bold text-text-primary">
          Elegir nueva contraseña
        </h1>

        {success ? (
          <>
            <p className="mb-6 text-sm text-text-secondary">
              Tu contraseña se actualizo correctamente. Ya podes iniciar sesion.
            </p>
            <button
              type="button"
              onClick={onDone}
              className="h-14 w-full rounded-xl bg-brand text-base font-semibold text-white"
            >
              Ir a iniciar sesion
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              Nueva contraseña
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoFocus
              className="mb-4 h-14 w-full rounded-xl border border-panel-border bg-panel-elevated px-4 text-base text-text-primary focus:border-brand focus:outline-none"
            />

            <label className="mb-1 block text-sm font-medium text-text-secondary">
              Confirmar contraseña
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="mb-4 h-14 w-full rounded-xl border border-panel-border bg-panel-elevated px-4 text-base text-text-primary focus:border-brand focus:outline-none"
            />

            {error && <p className="mb-4 text-sm text-status-error">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="h-14 w-full rounded-xl bg-brand text-base font-semibold text-white transition-opacity disabled:opacity-60"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar nueva contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
