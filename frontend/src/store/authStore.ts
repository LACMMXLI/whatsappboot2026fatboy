import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { login as loginRequest } from '../api/auth';
import { setTokenGetter, onUnauthorized } from '../lib/apiClient';
import { disconnectSocket } from '../lib/socket';
import type { AuthUser } from '../types';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticating: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticating: false,
      error: null,

      login: async (email, password) => {
        set({ isAuthenticating: true, error: null });
        try {
          const { accessToken, user } = await loginRequest(email, password);
          // No conecta el socket aca: lo hace useRealtime (unica fuente de
          // conexion) reaccionando al cambio de `token`, para no abrir dos
          // sockets en paralelo y cortar el primero a mitad de conexion.
          set({ token: accessToken, user, isAuthenticating: false });
        } catch {
          set({
            isAuthenticating: false,
            error: 'No se pudo iniciar sesion. Revisa tu email y contrasena.',
          });
        }
      },

      logout: () => {
        disconnectSocket();
        set({ token: null, user: null });
      },
    }),
    {
      name: 'crm-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
      // La reconexion del socket al recargar la pagina tambien la maneja
      // useRealtime (mismo motivo: una sola fuente de conexion).
    },
  ),
);

setTokenGetter(() => useAuthStore.getState().token);
onUnauthorized(() => useAuthStore.getState().logout());
