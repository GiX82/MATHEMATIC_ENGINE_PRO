import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
  premium: boolean;
  devMode: boolean;
  creatorName: string;
  togglePremium: () => void;
  setCreatorName: (name: string) => void;
  setDevMode: (value: boolean) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      premium: false,
      devMode: false,
      creatorName: 'Astra Nova',
      togglePremium: () => set((state) => ({ premium: !state.premium })),
      setCreatorName: (name) => set({ creatorName: name.trim() || 'Astra Nova' }),
      setDevMode: (value) => set({ devMode: value }),
    }),
    { name: 'mathematic-engine-user' },
  ),
);
