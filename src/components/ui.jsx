import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';

export function Button({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  type = 'button',
  ...props
}) {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500',
    secondary: 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-700',
    soft: 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/70',
    danger: 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/70 dark:text-rose-300 dark:hover:bg-rose-900',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
  };
  const sizes = {
    sm: 'min-h-9 px-3 text-xs',
    md: 'min-h-11 px-4 text-sm',
    lg: 'min-h-12 px-5 text-sm',
  };

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = '' }) {
  return <section className={`panel ${className}`}>{children}</section>;
}

export function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="mt-1 text-2xl font-bold tracking-[-0.025em] text-slate-950 dark:text-white sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Field({ label, hint, error, required, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 flex items-center justify-between gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        <span>
          {label}
          {required && <span className="ml-1 text-rose-500">*</span>}
        </span>
        {hint && <span className="text-xs font-normal text-slate-400">{hint}</span>}
      </span>
      {children}
      {error && <span className="mt-1.5 block text-xs font-medium text-rose-600">{error}</span>}
    </label>
  );
}

export function Input({ className = '', ...props }) {
  return <input className={`control ${className}`} {...props} />;
}

function dateTimeParts(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  return match ? { date: `${match[3]}/${match[2]}/${match[1]}`, time: `${match[4]}:${match[5]}` } : { date: '', time: '' };
}

function normalizedLocalDateTime(dateValue, timeValue) {
  const dateMatch = dateValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const timeMatch = timeValue.match(/^(\d{2}):(\d{2})$/);
  if (!dateMatch || !timeMatch) return null;
  const [, day, month, year] = dateMatch;
  const [, hour, minute] = timeMatch;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  if (date.getFullYear() !== Number(year) || date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day) || Number(hour) > 23 || Number(minute) > 59) return null;
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function LocalDateTimeInput({ value, onChange, required = false, dateReadOnly = false, timeInitiallyBlank = false }) {
  const initial = dateTimeParts(value);
  const initialValue = useRef(value);
  const [dateValue, setDateValue] = useState(initial.date);
  const [timeValue, setTimeValue] = useState(timeInitiallyBlank ? '' : initial.time);
  const dateRef = useRef(null);
  const timeRef = useRef(null);
  const { language, t } = useI18n();

  useEffect(() => {
    const next = dateTimeParts(value);
    setDateValue(next.date);
    if (!(timeInitiallyBlank && value === initialValue.current && !timeValue)) setTimeValue(next.time);
  }, [timeInitiallyBlank, value]);

  const commit = (date, time) => {
    if (!date && !time) {
      dateRef.current?.setCustomValidity('');
      timeRef.current?.setCustomValidity('');
      onChange('');
      return;
    }
    const normalized = normalizedLocalDateTime(date, time);
    const complete = date.length === 10 && time.length === 5;
    const message = complete && !normalized ? t('Geçerli bir tarih ve saat girin.', 'Enter a valid date and time.') : '';
    dateRef.current?.setCustomValidity(message);
    timeRef.current?.setCustomValidity(message);
    if (normalized) onChange(normalized);
  };

  const changeDate = (raw) => {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    const formatted = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join('/');
    setDateValue(formatted);
    commit(formatted, timeValue);
  };
  const changeTime = (raw) => {
    setTimeValue(raw);
    commit(dateValue, raw);
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {dateReadOnly
        ? <div className="control flex items-center bg-slate-50 font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300" aria-label={t('Seçilen gün', 'Selected day')}>{dateValue}</div>
        : <Input ref={dateRef} type="text" inputMode="numeric" required={required} pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}" placeholder={t('GG/AA/YYYY', 'DD/MM/YYYY')} value={dateValue} onChange={(event) => changeDate(event.target.value)} aria-label={t('Yayın tarihi', 'Publication date')} />}
      <Input ref={timeRef} type="time" lang={language === 'en' ? 'en-US' : 'tr'} required={required} min="00:00" max="23:59" step="60" value={timeValue} onChange={(event) => changeTime(event.target.value)} aria-label={t('Yayın saati', 'Publication time')} />
    </div>
  );
}

export function Select({ className = '', children, ...props }) {
  return (
    <select className={`control ${className}`} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className = '', ...props }) {
  return <textarea className={`control min-h-28 resize-y ${className}`} {...props} />;
}

export function StatusBadge({ label, tone = 'slate', dot = true }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    indigo: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    rose: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
    sky: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  };
  const dots = {
    slate: 'bg-slate-400',
    indigo: 'bg-indigo-500',
    amber: 'bg-amber-500',
    emerald: 'bg-emerald-500',
    rose: 'bg-rose-500',
    sky: 'bg-sky-500',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dots[tone]}`} />}
      {label}
    </span>
  );
}

export function Progress({ value, label }) {
  const safeValue = Math.max(0, Math.min(100, value || 0));
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
        <span>{label}</span>
        <span>{Math.round(safeValue)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-[width] duration-500"
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}

export function Spinner({ label = 'Yükleniyor' }) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-sm font-medium text-slate-500 dark:text-slate-400">
      <span className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600 dark:border-slate-700 dark:border-t-indigo-400" />
      {label === 'Yükleniyor' ? t('Yükleniyor', 'Loading') : label}
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center dark:border-slate-700 dark:bg-slate-900/70">
      <span className="mb-4 grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-base text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-400">＋</span>
      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">{title}</h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300">
      <p className="font-bold">{t('İşlem tamamlanamadı', 'Operation could not be completed')}</p>
      <p className="mt-1 leading-6">{error?.message || t('Beklenmeyen bir hata oluştu.', 'An unexpected error occurred.')}</p>
      {onRetry && (
        <Button className="mt-3" variant="secondary" size="sm" onClick={onRetry}>
          {t('Tekrar dene', 'Try again')}
        </Button>
      )}
    </div>
  );
}

export function Modal({ open, title, description, children, onClose, size = 'lg' }) {
  const { t } = useI18n();
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  const widths = { md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={onClose}>
      <div
        className={`max-h-[94vh] w-full overflow-y-auto rounded-t-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-[#12161c] sm:rounded-xl ${widths[size]}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 px-6 py-5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:px-7">
          <div>
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">{title}</h2>
            {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
          </div>
          <button
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-lg text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
            onClick={onClose}
            aria-label={t('Pencereyi kapat', 'Close dialog')}
          >
            ×
          </button>
        </div>
        <div className="p-6 sm:p-7">{children}</div>
      </div>
    </div>
  );
}

export function Pagination({ page, totalPages, totalElements, size, onChange, onSizeChange }) {
  const { t } = useI18n();
  if (!totalPages) return null;

  const visiblePages = Array.from(
    new Set([0, totalPages - 1, page - 1, page, page + 1].filter((value) => value >= 0 && value < totalPages)),
  ).sort((a, b) => a - b);

  return (
    <div className="mt-5 flex flex-col gap-4 border-t border-slate-100 pt-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <span>
          {typeof totalElements === 'number'
            ? t(`Toplam ${totalElements} içerik`, `${totalElements} contents in total`)
            : <>{t('Sayfa', 'Page')} <strong className="text-slate-800 dark:text-slate-100">{page + 1}</strong> / {totalPages}</>}
        </span>
        {onSizeChange && (
          <label className="flex items-center gap-2">
            <span>{t('Sayfa başına', 'Per page')}</span>
            <select
              value={size}
              onChange={(event) => onSizeChange(Number(event.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {[10, 20, 50].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => onChange(page - 1)}>
          {t('Önceki', 'Previous')}
        </Button>
        {visiblePages.map((pageNumber, index) => (
          <span key={pageNumber} className="contents">
            {index > 0 && visiblePages[index - 1] + 1 < pageNumber && <span className="px-1 text-slate-400">…</span>}
            <button
              type="button"
              onClick={() => onChange(pageNumber)}
              aria-label={t(`${pageNumber + 1}. sayfaya git`, `Go to page ${pageNumber + 1}`)}
              aria-current={pageNumber === page ? 'page' : undefined}
              className={`h-8 min-w-8 rounded-lg px-2 text-sm font-bold transition ${pageNumber === page ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}
            >
              {pageNumber + 1}
            </button>
          </span>
        ))}
        <Button variant="secondary" size="sm" disabled={page + 1 >= totalPages} onClick={() => onChange(page + 1)}>
          {t('Sonraki', 'Next')}
        </Button>
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, description, confirmLabel = 'Sil', busy, onConfirm, onClose }) {
  const { t } = useI18n();
  return (
    <Modal open={open} title={title} description={description} onClose={onClose} size="md">
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={busy}>{t('Vazgeç', 'Cancel')}</Button>
        <Button variant="danger" onClick={onConfirm} disabled={busy}>{busy ? t('İşleniyor…', 'Processing…') : confirmLabel === 'Sil' ? t('Sil', 'Delete') : confirmLabel}</Button>
      </div>
    </Modal>
  );
}
