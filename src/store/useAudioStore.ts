import { create } from 'zustand';

type AudioPlaybackState = 'stopped' | 'playing' | 'paused';

interface AudioState {
  engineId: string;
  playbackState: AudioPlaybackState;
  isPremium: boolean;
  setEngineId: (id: string) => void;
  setPlaybackState: (state: AudioPlaybackState) => void;
}

export const useAudioStore = create<AudioState>((set) => ({
  engineId: 'generative-melody',
  playbackState: 'stopped',
  isPremium: false,
  setEngineId: (id) => set({ engineId: id }),
  setPlaybackState: (state) => set({ playbackState: state }),
}));
