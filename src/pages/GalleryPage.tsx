import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGalleryStore } from '../store/useGalleryStore';

export function GalleryPage() {
  const { t } = useTranslation();
  const items = useGalleryStore((s) => s.gallery);
  const loadGallery = useGalleryStore((s) => s.loadGallery);

  useEffect(() => { loadGallery(); }, [loadGallery]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
      <h2 className="text-3xl font-bold text-white">{t('gallery')}</h2>
      <p className="mt-3 text-zinc-400">{t('gallery_description')}</p>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {items.length === 0 ? (
          <div className="col-span-full rounded-[24px] border border-dashed border-white/10 bg-white/5 p-8 text-center text-zinc-400">
            {t('no_saved_artworks')}
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="overflow-hidden rounded-[24px] border border-white/10 bg-white/5">
              <img src={item.preview.startsWith('data:image/') ? item.preview : ''} alt={`Opera ${item.seed}`} className="h-52 w-full object-cover" />
              <div className="space-y-2 p-4">
                <p className="text-sm text-zinc-300">Seed {item.seed}</p>
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>{item.palette}</span>
                  <span>{item.mode === '2d' ? '2D' : '3D'}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
