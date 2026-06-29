import { create } from "zustand"

interface User {
  name?: string | null
  email?: string | null
  image?: string | null
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isInitialized: boolean
  setAuth: (user: User | null) => void
  setInitialized: () => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isInitialized: false,
  setAuth: (user) => set({ user, isAuthenticated: !!user }),
  setInitialized: () => set({ isInitialized: true }),
  logout: () => set({ user: null, isAuthenticated: false }),
}))
