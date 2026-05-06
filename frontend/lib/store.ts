import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false,
      login: (user, token) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
          // Write cookie so Next.js middleware can protect routes server-side
          document.cookie = `pitchonix-auth=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
        }
        set({ user, token, isAuthenticated: true });
      },
      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          // Clear auth cookie
          document.cookie = 'pitchonix-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax';
        }
        set({ user: null, token: null, isAuthenticated: false });
      },
      setUser: (user) => set({ user }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'auth-storage',
      // Don't persist the hydration flag itself
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
