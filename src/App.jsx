import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';
import BatchesPage from './pages/BatchesPage';
import ContentsPage from './pages/ContentsPage';
import CalendarPage from './pages/CalendarPage';
import CredentialsPage from './pages/CredentialsPage';
import SettingsPage from './pages/SettingsPage';
import { useI18n } from './i18n';

const routes = {
  batches: {
    label: 'Üretim',
    short: 'Üretim',
    icon: 'sparkles',
    component: BatchesPage,
  },
  contents: {
    label: 'İçerikler',
    short: 'İçerik',
    icon: 'files',
    component: ContentsPage,
  },
  calendar: {
    label: 'Takvim',
    short: 'Takvim',
    icon: 'calendar',
    component: CalendarPage,
  },
  credentials: {
    label: 'Entegrasyonlar',
    short: 'Entegrasyon',
    icon: 'key',
    component: CredentialsPage,
  },
  settings: {
    label: 'Ayarlar',
    short: 'Ayarlar',
    icon: 'settings',
    component: SettingsPage,
  },
};

function NavIcon({ name }) {
  const paths = {
    sparkles: <><path d="m12 3-1.1 3.1a3 3 0 0 1-1.8 1.8L6 9l3.1 1.1a3 3 0 0 1 1.8 1.8L12 15l1.1-3.1a3 3 0 0 1 1.8-1.8L18 9l-3.1-1.1a3 3 0 0 1-1.8-1.8L12 3Z"/><path d="m5 15-.5 1.5L3 17l1.5.5L5 19l.5-1.5L7 17l-1.5-.5L5 15Z"/></>,
    files: <><path d="M7 3h8l3 3v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v4h4M8 11h7M8 15h7"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    key: <><circle cx="8" cy="12" r="4"/><path d="m11 9 8-6M16 6l2 2M14 8l2 2"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
  };
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function currentRoute() {
  const hash = window.location.hash.replace(/^#\/?/, '').split('/')[0].split('?')[0];
  return routes[hash] ? hash : 'batches';
}

function ThemeToggle({ theme, onToggle, compact = false }) {
  const { t } = useI18n();
  const dark = theme === 'dark';

  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-white ${compact ? 'h-9 w-9' : 'min-h-10 w-full px-3 text-xs'}`}
      onClick={onToggle}
      aria-label={dark ? t('Açık moda geç', 'Switch to light mode') : t('Karanlık moda geç', 'Switch to dark mode')}
      aria-pressed={dark}
    >
      <span aria-hidden="true">{dark ? '☀' : '☾'}</span>
      {!compact && <span>{dark ? t('Açık moda geç', 'Switch to light mode') : t('Karanlık moda geç', 'Switch to dark mode')}</span>}
    </button>
  );
}

export default function App() {
  const { language, setLanguage, t } = useI18n();
  const [route, setRoute] = useState(currentRoute);
  const [toast, setToast] = useState(null);
  const publicationAlertSnapshot = useRef(null);
  const generationBatchSnapshot = useRef(null);
  const notifiedGenerationBatches = useRef(new Set());
  const [theme, setTheme] = useState(() => document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  const ActivePage = routes[route].component;

  useEffect(() => {
    const onHashChange = () => setRoute(currentRoute());
    window.addEventListener('hashchange', onHashChange);
    if (!window.location.hash) window.location.hash = '#/batches';
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    const dark = theme === 'dark';
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    localStorage.setItem('social-plan-theme', theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#070b14' : '#0f172a');
  }, [theme]);

  const notify = useCallback((message, type = 'success', options = {}) => {
    setToast({ message, type, ...options, id: Date.now() });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const checkPublicationAlerts = async () => {
      try {
        const [failedPage, reviewPage] = await Promise.all([
          api.listContents({ status: 'FAILED', page: 0, size: 100 }),
          api.listContents({ status: 'REVIEW_REQUIRED', page: 0, size: 100 }),
        ]);
        if (cancelled) return;

        const failed = failedPage?.items || [];
        const reviewRequired = reviewPage?.items || [];
        const alerts = [...failed, ...reviewRequired];
        const nextSnapshot = new Map(alerts.map((item) => [item.id, item.updatedAt]));
        const previousSnapshot = publicationAlertSnapshot.current;

        if (previousSnapshot === null) {
          if (alerts.length > 0) {
            notify(
              t(`${alerts.length} yayın sorunu inceleme bekliyor: ${failed.length} başarısız, ${reviewRequired.length} doğrulanamadı.`, `${alerts.length} publication issues require review: ${failed.length} failed, ${reviewRequired.length} could not be verified.`),
              'error',
              { href: reviewRequired.length > 0 ? '#/contents?status=REVIEW_REQUIRED' : '#/contents?status=FAILED' },
            );
          }
        } else {
          const changed = alerts.filter(
            (item) => previousSnapshot.get(item.id) !== item.updatedAt,
          );
          if (changed.length > 0) {
            const failedCount = changed.filter((item) => item.status === 'FAILED').length;
            const reviewCount = changed.filter((item) => item.status === 'REVIEW_REQUIRED').length;
            notify(
              t(`Yeni yayın sorunu: ${failedCount} başarısız, ${reviewCount} platform doğrulaması bekliyor. İçerikler ekranından kontrol edin.`, `New publication issue: ${failedCount} failed, ${reviewCount} awaiting platform verification. Check the Contents screen.`),
              'error',
              { href: reviewCount > 0 ? '#/contents?status=REVIEW_REQUIRED' : '#/contents?status=FAILED' },
            );
          }
        }
        publicationAlertSnapshot.current = nextSnapshot;
      } catch {
        return;
      }
    };

    checkPublicationAlerts();
    const interval = window.setInterval(checkPublicationAlerts, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [notify, t]);

  useEffect(() => {
    let cancelled = false;

    const checkGenerationBatches = async () => {
      try {
        const page = await api.listBatches({ page: 0, size: 100 });
        if (cancelled) return;
        const batches = page?.items || [];
        const previous = generationBatchSnapshot.current;
        if (previous) {
          batches.forEach((batch) => {
            if (batch.status === 'IN_PROGRESS' && previous.get(batch.id) !== 'IN_PROGRESS') {
              notifiedGenerationBatches.current.delete(batch.id);
            }
            const completedNow = previous.get(batch.id) === 'IN_PROGRESS' && ['COMPLETED', 'FAILED'].includes(batch.status);
            if (!completedNow || notifiedGenerationBatches.current.has(batch.id)) return;
            notifiedGenerationBatches.current.add(batch.id);
            if (batch.status === 'COMPLETED') {
              notify(
                t(`Üretim tamamlandı: ${batch.completedCount} / ${batch.requestedCount} içerik hazır.`, `Generation completed: ${batch.completedCount} / ${batch.requestedCount} contents ready.`),
                'success',
                { href: '#/batches' },
              );
            } else {
              notify(
                t(`Üretim başarısız oldu: ${batch.completedCount} / ${batch.requestedCount} içerik hazır.`, `Generation failed: ${batch.completedCount} / ${batch.requestedCount} contents ready.`),
                'error',
                { href: '#/batches' },
              );
            }
          });
        }
        generationBatchSnapshot.current = new Map(batches.map((batch) => [batch.id, batch.status]));
      } catch {
        return;
      }
    };

    checkGenerationBatches();
    const interval = window.setInterval(checkGenerationBatches, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [notify, t]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 transition-colors dark:bg-[#0b0d10] dark:text-slate-200">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-200 bg-white px-3 py-5 transition-colors dark:border-slate-800 dark:bg-[#101318] lg:flex">
        <nav className="space-y-1">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{t('Çalışma alanı', 'Workspace')}</p>
          {Object.entries(routes).map(([key, item]) => (
            <a
              key={key}
              href={`#/${key}`}
              className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                route === key
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
              }`}
            >
              {route === key && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-blue-600 dark:bg-blue-400" />}
              <span className={route === key ? 'text-blue-600 dark:text-blue-300' : 'text-slate-400'}><NavIcon name={item.icon} /></span>
              {t(item.label, { Üretim: 'Generation', İçerikler: 'Contents', Takvim: 'Calendar', Entegrasyonlar: 'Integrations', Ayarlar: 'Settings' }[item.label])}
            </a>
          ))}
        </nav>

        <div className="mt-auto space-y-3">
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800" aria-label={t('Dil seçimi', 'Language selection')}>
            {[['tr', 'Türkçe'], ['en', 'English']].map(([value, label]) => <button key={value} type="button" onClick={() => setLanguage(value)} className={`rounded-lg px-2 py-2 text-xs font-bold transition ${language === value ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400'}`} aria-pressed={language === value}>{label}</button>)}
          </div>
          <ThemeToggle theme={theme} onToggle={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} />
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur transition-colors dark:border-slate-800 dark:bg-slate-900/90 lg:hidden">
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-2">
            <select value={language} onChange={(event) => setLanguage(event.target.value)} aria-label={t('Dil seçimi', 'Language selection')} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"><option value="tr">TR</option><option value="en">EN</option></select>
            <ThemeToggle compact theme={theme} onToggle={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} />
          </div>
        </div>
      </header>

      <main className="pb-24 lg:ml-60 lg:pb-10">
        <div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-7 lg:px-10 lg:py-10">
          <ActivePage notify={notify} />
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_rgba(15,23,42,0.06)] backdrop-blur transition-colors dark:border-slate-800 dark:bg-slate-900/95 lg:hidden">
        {Object.entries(routes).map(([key, item]) => (
          <a
            key={key}
            href={`#/${key}`}
            className={`flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-bold transition ${route === key ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-400 dark:text-slate-500'}`}
          >
            <span className={`grid h-7 w-9 place-items-center rounded-lg text-sm ${route === key ? 'bg-blue-50 dark:bg-blue-950/50' : ''}`}><NavIcon name={item.icon} /></span>
            {t(item.short, { Üretim: 'Generate', İçerik: 'Content', Takvim: 'Calendar', Entegrasyon: 'Integrations', Ayarlar: 'Settings' }[item.short])}
          </a>
        ))}
      </nav>

      {toast && (() => {
        const className = `fixed right-4 top-20 z-[70] max-w-sm rounded-xl border px-4 py-3 text-left text-sm font-semibold shadow-xl sm:right-7 lg:top-6 ${
            toast.type === 'error'
              ? 'border-rose-100 bg-rose-50 text-rose-700'
              : 'border-emerald-100 bg-white text-slate-800 dark:border-emerald-900 dark:bg-slate-800 dark:text-slate-100'
          } ${toast.href ? 'cursor-pointer transition hover:-translate-y-0.5 hover:border-rose-300' : ''}`;
        const content = <><span className={`mr-2 ${toast.type === 'error' ? 'text-rose-500' : 'text-emerald-500'}`}>{toast.type === 'error' ? '!' : '✓'}</span>{toast.message}{toast.href && <span className="ml-2 whitespace-nowrap underline decoration-current/40 underline-offset-2">{t('İncele →', 'Review →')}</span>}</>;
        return toast.href
          ? <a href={toast.href} className={className} role="status" onClick={() => setToast(null)}>{content}</a>
          : <div className={className} role="status">{content}</div>;
      })()}
    </div>
  );
}
