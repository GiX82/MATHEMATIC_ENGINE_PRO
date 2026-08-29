import { Suspense, lazy, useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGalleryStore } from './store/useGalleryStore';
import { useUserStore } from './store/useUserStore';

const GeneratorPage = lazy(() => import('./pages/GeneratorPage'));

function Layout({ children, hideHeader = false }: { children: ReactNode; hideHeader?: boolean }) {
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen bg-me-dark-01 text-me-text">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(31,205,255,0.10),_transparent_28%),radial-gradient(circle_at_80%_0%,_rgba(168,85,247,0.14),_transparent_32%)]" />
      {!hideHeader && (
        <header className="sticky top-0 z-40 border-b border-white/8 bg-[#050a12]/70 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-500/10 text-sm font-semibold text-cyan-200 shadow-[0_0_30px_rgba(34,211,238,0.2)]">
                M
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-[0.35em] text-zinc-500">GiX</p>
                <h1 className="text-base font-semibold tracking-[0.18em] text-white">MATHEMATIC_ENGINE</h1>
              </div>
            </div>

            {/* Desktop nav */}
            <nav className="hidden items-center gap-6 text-sm text-zinc-300 md:flex">
              <Link to="/" className="transition hover:text-cyan-200">{t('home')}</Link>
              <Link to="/generator" className="transition hover:text-cyan-200">{t('studio')}</Link>
              <Link to="/gallery" className="transition hover:text-cyan-200">{t('gallery')}</Link>
              <Link to="/settings" className="transition hover:text-cyan-200">{t('settings')}</Link>
            </nav>

            <div className="flex items-center gap-3">
              <Link to="/generator" className="hidden sm:inline-flex rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-[10px] uppercase tracking-[0.25em] text-cyan-100 shadow-[0_0_25px_rgba(34,211,238,0.12)] transition hover:bg-cyan-500/15">
                {t('studio')}
              </Link>
              {/* Mobile hamburger */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label={t('menu')}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 md:hidden transition hover:border-white/20 hover:text-white"
              >
                <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1H17M1 7H17M1 13H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <nav className="absolute right-0 top-0 h-full w-72 max-w-[85vw] bg-[#0a0f1a]/95 backdrop-blur-xl border-l border-white/8 overflow-y-auto" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
              <span className="text-sm font-semibold text-white">{t('menu')}</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label={t('close')}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-400 transition hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-1 p-4">
              <Link to="/" onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white">{t('home')}</Link>
              <Link to="/generator" onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white">{t('studio')}</Link>
              <Link to="/gallery" onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white">{t('gallery')}</Link>
              <Link to="/settings" onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white">{t('settings')}</Link>
            </div>
          </nav>
        </div>
      )}

      <main className="relative z-10">{children}</main>
    </div>
  );
}

function HomePage() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <section className="ui-panel relative overflow-hidden rounded-[32px] p-4 sm:p-6 lg:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(34,211,238,0.15),_transparent_18%),radial-gradient(circle_at_75%_10%,_rgba(168,85,247,0.16),_transparent_24%),radial-gradient(circle_at_center,_rgba(15,23,42,0.30),_transparent_55%)]" />
        <div className="relative grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="mb-5 inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-500/8 px-3 py-1.5 text-[10px] uppercase tracking-[0.32em] text-cyan-200">
              {t('studio')} {t('hero_subtitle')}
            </div>
            <h2 className="max-w-2xl text-4xl font-black tracking-[-0.06em] text-white sm:text-5xl lg:text-6xl">
              {t('hero_heading')}
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-zinc-300 sm:text-lg">
              {t('hero_description')}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.28em] text-zinc-300">
              {['Collatz', 'Ulam', 'Crystal', '3D'].map((label) => (
                <span key={label} className="rounded-full border border-white/10 bg-white/3 px-3 py-2">
                  {label}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/generator" className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-6 py-3 text-sm font-medium text-slate-950 shadow-[0_0_35px_rgba(34,211,238,0.30)] transition hover:bg-cyan-300">
                {t('create_art')}
              </Link>
              <Link to="/gallery" className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white transition hover:border-cyan-300/30 hover:text-cyan-100">
                {t('explore_gallery')}
              </Link>
            </div>
          </div>

          <div className="relative flex min-h-[440px] items-center justify-center">
            <div className="absolute inset-10 rounded-full bg-cyan-500/10 blur-[120px]" />
            <div className="hero-object relative h-[360px] w-[360px] rounded-[32px] border border-cyan-400/15 bg-[radial-gradient(circle_at_center,_rgba(98,234,255,0.18),_transparent_35%),linear-gradient(135deg,rgba(7,10,18,0.96),rgba(15,22,35,0.94))] shadow-[0_0_80px_rgba(80,190,255,0.16)]">
              <div className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/20 bg-[radial-gradient(circle,_rgba(103,232,249,0.28),_transparent_60%)] blur-sm" />
              <div className="absolute inset-[18%] rounded-[28px] border border-cyan-300/20 bg-[radial-gradient(circle_at_50%_30%,_rgba(152,247,255,0.30),_transparent_35%),linear-gradient(135deg,rgba(16,22,38,0.80),rgba(7,11,22,0.95))]" />
              <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-[45%] border border-cyan-300/40 bg-[radial-gradient(circle_at_center,_rgba(62,224,255,0.16),_transparent_46%)] shadow-[0_0_60px_rgba(34,211,238,0.18)]" />
              <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-300/40 bg-[radial-gradient(circle,_rgba(216,180,254,0.35),_transparent_58%)]" />
              <div className="absolute -left-4 top-16 h-32 w-32 rounded-full border border-cyan-300/25 bg-cyan-500/5 blur-[2px]" />
              <div className="absolute -right-2 bottom-10 h-28 w-28 rounded-full border border-violet-300/25 bg-violet-500/5 blur-[2px]" />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-12 grid gap-5 md:grid-cols-3">
        {[
          { title: 'MATHEMATICS', heading: t('feature_mathematics'), text: t('feature_mathematics_desc'), icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6 text-cyan-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
            </svg>
          ) },
          { title: 'STRUCTURE', heading: t('feature_structure'), text: t('feature_structure_desc'), icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6 text-cyan-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-2.25-1.313M21 7.5v2.25m0-2.25l-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3l2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75l2.25-1.313M12 21.75V19.5m0 2.25l-2.25-1.313m0-16.875L12 2.25l2.25 1.313M21 14.25v2.25l-2.25 1.313m-13.5 0L3 16.5v-2.25" />
            </svg>
          ) },
          { title: 'MATERIAL', heading: t('feature_material'), text: t('feature_material_desc'), icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6 text-cyan-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
            </svg>
          ) },
        ].map(({ title, heading, text, icon }) => (
          <article key={title} className="ui-subpanel rounded-[24px] p-5">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/8">
              {icon}
            </div>
            <p className="text-[10px] uppercase tracking-[0.32em] text-cyan-200">{title}</p>
            <h3 className="mt-3 text-xl font-semibold text-white">{heading}</h3>
            <p className="mt-3 text-sm leading-6 text-zinc-400">{text}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

function GalleryPage() {
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

function SettingsPage() {
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

function NotFoundPage() {
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

function AppRoutes() {
  const location = useLocation();
  const isGenerator = location.pathname === '/generator';
  const { t } = useTranslation();

  return (
    <Layout hideHeader={isGenerator}>
      <Suspense
        fallback={
          <div className="mx-auto max-w-[1500px] px-4 py-20 text-xs uppercase tracking-[0.35em] text-cyan-200">
            {t('loading')}
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/generator" element={<GeneratorPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
