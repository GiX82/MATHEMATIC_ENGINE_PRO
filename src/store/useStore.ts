export { useArtworkStore, type RenderMode } from './useArtworkStore';
export { useUserStore } from './useUserStore';
export { useGalleryStore, type SavedArtwork } from './useGalleryStore';
export { useAudioStore } from './useAudioStore';

import { useArtworkStore } from './useArtworkStore';
import { useUserStore } from './useUserStore';
import { useGalleryStore } from './useGalleryStore';

export function useStore() {
  const artwork = useArtworkStore();
  const user = useUserStore();
  const gallery = useGalleryStore();
  return { ...artwork, ...user, ...gallery };
}
