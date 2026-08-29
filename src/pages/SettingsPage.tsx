import { useTranslation } from 'react-i18next';
import { useUserStore } from '../store/useUserStore';

export function SettingsPage() {
  const { t } = useTranslation();
  const { premium, devMode, creatorName, togglePremium, setCreatorName, setDevMode } = useUserStore();

  return (
    <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
      <h2 className="text-3xl font-bold text-white">{t('settings')}</h2>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
          <p className="text-sm uppercase tracking-[0.25em] text-zinc-500">{t('profile')}</p>
          <div className="mt-4 space-y-3 text-zinc-300">
            <label className="block text-sm text-zinc-400">
              {t('creator_name')}
              <input
                type="text"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b111d] px-3 py-2 text-white outline-none"
              />
            </label>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
          <p className="text-sm uppercase tracking-[0.25em] text-zinc-500">{t('development')}</p>
          <div className="mt-4 space-y-4 text-zinc-300">
            <label className="flex items-center justify-between gap-4">
              <span>{t('developer_mode')}</span>
              <input type="checkbox" checked={devMode} onChange={(e) => setDevMode(e.target.checked)} className="h-4 w-4 accent-cyan-400" />
            </label>
            <div className="flex items-center justify-between">
              <span>{t('premium')}</span>
              <button type="button" onClick={togglePremium} className="text-cyan-300 underline">
                {premium ? t('premium_active') : t('enable_premium')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
