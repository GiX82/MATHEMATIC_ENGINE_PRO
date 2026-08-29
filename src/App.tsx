import { Suspense, lazy, useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HomePage } from './pages/HomePage';
import { GalleryPage } from './pages/GalleryPage';
import { SettingsPage } from './pages/SettingsPage';
import { NotFoundPage } from './pages/NotFoundPage';

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
