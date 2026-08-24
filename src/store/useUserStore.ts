import { create } from 'zustand';

interface UserState {
  premium: boolean;
  devMode: boolean;
  creatorName: string;
  togglePremium: () => void;
  setCreatorName: (name: string) => void;
  setDevMode: (value: boolean) => void;
}

export const useUserStore = create<UserState>((set) => ({
  premium: false,
  devMode: false,
  creatorName: 'Astra Nova',
  togglePremium: () => set((state) => ({ premium: !state.premium })),
  setCreatorName: (name) => set({ creatorName: name.trim() || 'Astra Nova' }),
  setDevMode: (value) => set({ devMode: value }),
}));
