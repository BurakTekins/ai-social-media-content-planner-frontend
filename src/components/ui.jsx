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
    primary: 'border border-blue-700 bg-blue-700 text-white shadow-sm hover:border-blue-800 hover:bg-blue-800 dark:border-blue-500 dark:bg-blue-600 dark:hover:border-blue-400 dark:hover:bg-blue-500',
    secondary: 'border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-white',
    soft: 'border border-blue-100 bg-blue-50 text-blue-700 hover:border-blue-200 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:border-blue-800 dark:hover:bg-blue-950',
    danger: 'border border-rose-200 bg-white text-rose-700 hover:border-rose-300 hover:bg-rose-50 dark:border-rose-900 dark:bg-slate-900 dark:text-rose-300 dark:hover:border-rose-800 dark:hover:bg-rose-950/50',
    ghost: 'border border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
  };
  const sizes = {
    sm: 'min-h-9 px-3 text-xs',
    md: 'min-h-10 px-4 text-sm',
    lg: 'min-h-11 px-5 text-sm',
  };

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-[10px] font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:ring-offset-2 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-offset-slate-950 ${variants[variant]} ${sizes[size]} ${className}`}
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
    <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="mt-1.5 text-[1.75rem] font-bold tracking-[-0.035em] text-slate-950 dark:text-white sm:text-[2rem]">{title}</h1>
        {description && <p className="mt-2.5 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Field({ label, hint, error, required, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 flex items-start justify-between gap-3 text-[13px] font-semibold text-slate-700 dark:text-slate-200">
        <span>
          {label}
          {required && <span className="ml-1 text-rose-500">*</span>}
        </span>
        {hint && <span className="text-right text-xs font-normal leading-5 text-slate-400 dark:text-slate-500">{hint}</span>}
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
  return match
    ? { day: match[3], month: match[2], year: match[1], date: `${match[3]}/${match[2]}/${match[1]}`, time: `${match[4]}:${match[5]}` }
    : { day: '', month: '', year: '', date: '', time: '' };
}

function normalizedLocalDateTime(dateValue, timeValue, minYear, maxYear) {
  const dateMatch = dateValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const timeMatch = timeValue.match(/^(\d{2}):(\d{2})$/);
  if (!dateMatch || !timeMatch) return null;
  const [, day, month, year] = dateMatch;
  const [, hour, minute] = timeMatch;
  if ((minYear !== null && Number(year) < minYear) || (maxYear !== null && Number(year) > maxYear)) return null;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  if (date.getFullYear() !== Number(year) || date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day) || Number(hour) > 23 || Number(minute) > 59) return null;
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function LocalDateTimeInput({ value, onChange, required = false, dateReadOnly = false, timeInitiallyBlank = false, maxYearsAhead = null }) {
  const initial = dateTimeParts(value);
  const initialValue = useRef(value);
  const [dayValue, setDayValue] = useState(initial.day);
  const [monthValue, setMonthValue] = useState(initial.month);
  const [yearValue, setYearValue] = useState(initial.year);
  const [timeValue, setTimeValue] = useState(timeInitiallyBlank ? '' : initial.time);
  const dateRef = useRef(null);
  const timeRef = useRef(null);
  const { language, t } = useI18n();
  const minYear = maxYearsAhead === null ? null : new Date().getFullYear();
  const maxYear = minYear === null ? null : minYear + maxYearsAhead;

  useEffect(() => {
    const next = dateTimeParts(value);
    setDayValue(next.day);
    setMonthValue(next.month);
    setYearValue(next.year);
    if (!(timeInitiallyBlank && value === initialValue.current && !timeValue)) setTimeValue(next.time);
  }, [timeInitiallyBlank, value]);

  const commit = (day, month, year, time) => {
    if (!day && !month && !year && !time) {
      dateRef.current?.setCustomValidity('');
      timeRef.current?.setCustomValidity('');
      onChange('');
      return;
    }
    const date = `${day}/${month}/${year}`;
    const dateMatch = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    const enteredYear = dateMatch ? Number(dateMatch[3]) : null;
    const yearOutOfRange = enteredYear !== null && (
      (minYear !== null && enteredYear < minYear)
      || (maxYear !== null && enteredYear > maxYear)
    );
    const normalized = normalizedLocalDateTime(date, time, minYear, maxYear);
    const complete = day.length === 2 && month.length === 2 && year.length === 4 && time.length === 5;
    const message = complete && yearOutOfRange
      ? t(`Yıl ${minYear} ile ${maxYear} arasında olmalıdır.`, `Year must be between ${minYear} and ${maxYear}.`)
      : complete && !normalized
        ? t('Geçerli bir tarih ve saat girin.', 'Enter a valid date and time.')
        : '';
    dateRef.current?.setCustomValidity(message);
    timeRef.current?.setCustomValidity(message);
    if (normalized) onChange(normalized);
  };

  const changeDay = (raw) => {
    const next = raw.replace(/\D/g, '').slice(0, 2);
    setDayValue(next);
    commit(next, monthValue, yearValue, timeValue);
  };
  const changeMonth = (raw) => {
    const next = raw.replace(/\D/g, '').slice(0, 2);
    setMonthValue(next);
    commit(dayValue, next, yearValue, timeValue);
  };
  const changeYear = (raw) => {
    const next = raw.replace(/\D/g, '').slice(0, 4);
    setYearValue(next);
    commit(dayValue, monthValue, next, timeValue);
  };
  const changeTime = (raw) => {
    setTimeValue(raw);
    commit(dayValue, monthValue, yearValue, raw);
  };
  const dateValue = [dayValue, monthValue, yearValue].filter(Boolean).join('/');
  const datePartsRequired = required || Boolean(dayValue || monthValue || yearValue || timeValue);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {dateReadOnly
        ? <div className="control flex items-center bg-slate-50 font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300" aria-label={t('Seçilen gün', 'Selected day')}>{dateValue}</div>
        : <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.45fr)] gap-2" aria-label={t('Yayın tarihi', 'Publication date')}>
          <Input ref={dateRef} className="px-2 text-center" type="text" inputMode="numeric" required={datePartsRequired} pattern="[0-9]{2}" maxLength={2} placeholder={t('GG', 'DD')} value={dayValue} onChange={(event) => changeDay(event.target.value)} aria-label={t('Gün', 'Day')} />
          <Input className="px-2 text-center" type="text" inputMode="numeric" required={datePartsRequired} pattern="[0-9]{2}" maxLength={2} placeholder={t('AA', 'MM')} value={monthValue} onChange={(event) => changeMonth(event.target.value)} aria-label={t('Ay', 'Month')} />
          <Input className="px-2 text-center" type="text" inputMode="numeric" required={datePartsRequired} pattern="[0-9]{4}" maxLength={4} placeholder="YYYY" value={yearValue} onChange={(event) => changeYear(event.target.value)} aria-label={t('Yıl', 'Year')} />
        </div>}
      <Input ref={timeRef} type="time" lang={language === 'en' ? 'en-US' : 'tr'} required={datePartsRequired} min="00:00" max="23:59" step="60" value={timeValue} onChange={(event) => changeTime(event.target.value)} aria-label={t('Yayın saati', 'Publication time')} />
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
    slate: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300',
    indigo: 'border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300',
    amber: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300',
    rose: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300',
    sky: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/60 dark:text-sky-300',
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
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold leading-none ${tones[tone]}`}>
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
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-blue-600 transition-[width] duration-500 dark:bg-blue-500"
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}

export function Spinner({ label = 'Yükleniyor' }) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-sm font-medium text-slate-500 dark:text-slate-400" role="status">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600 dark:border-slate-700 dark:border-t-blue-400" aria-hidden="true" />
      {label === 'Yükleniyor' ? t('Yükleniyor', 'Loading') : label}
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900/50">
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  const { t } = useI18n();
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50/70 px-5 py-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300" role="alert">
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-6" onMouseDown={onClose}>
      <div
        className={`max-h-[94vh] w-full overflow-y-auto rounded-t-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-[#11151b] sm:rounded-2xl ${widths[size]}`}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 px-6 py-5 backdrop-blur-md dark:border-slate-800 dark:bg-[#11151b]/95 sm:px-7">
          <div>
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">{title}</h2>
            {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
          </div>
          <button
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-lg text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-white"
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
    <div className="mt-6 flex flex-col gap-4 border-t border-slate-100 pt-5 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
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
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
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
              className={`h-8 min-w-8 rounded-lg border px-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 ${pageNumber === page ? 'border-blue-700 bg-blue-700 text-white dark:border-blue-500 dark:bg-blue-600' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-700'}`}
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
