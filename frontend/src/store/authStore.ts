import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { login as loginRequest } from '../api/auth';
import { setTokenGetter, onUnauthorized } from '../lib/apiClient';
import { connectSocket, disconnectSocket } from '../lib/socket';
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
          set({ token: accessToken, user, isAuthenticating: false });
          connectSocket(accessToken);
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
      onRehydrateStorage: () => (state) => {
        // Al recargar la pagina con sesion guardada, reconecta el socket.
        if (state?.token) {
          connectSocket(state.token);
        }
      },
    },
  ),
);

setTokenGetter(() => useAuthStore.getState().token);
onUnauthorized(() => useAuthStore.getState().logout());
