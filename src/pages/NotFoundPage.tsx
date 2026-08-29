import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-5xl px-4 py-32 text-center">
      <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">404</p>
      <h2 className="mt-4 text-3xl font-bold text-white">{t('page_not_found')}</h2>
      <p className="mt-3 text-zinc-400">{t('page_not_found_desc')}</p>
      <Link to="/" className="mt-7 inline-flex rounded-full border border-cyan-400/20 bg-cyan-500/10 px-5 py-2.5 text-sm text-cyan-200 transition hover:bg-cyan-500/15">
        {t('back_home')}
      </Link>
    </div>
  );
}
