import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import {
  CONTENT_STATUS_META,
  CONTENT_TYPE_LABELS,
  PLATFORM_LABELS,
  formatDate,
  formatDateTime,
  toDateTimeLocal,
  toIsoFromLocal,
  truncate,
} from '../constants';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LocalDateTimeInput,
  Modal,
  PageHeader,
  Select,
  Spinner,
  StatusBadge,
} from '../components/ui';
import { getLocale, useI18n } from '../i18n';

const SCHEDULABLE_STATUSES = new Set(['DRAFT', 'SCHEDULED', 'FAILED']);
const formatMonth = (value) => new Intl.DateTimeFormat(getLocale(), { month: 'long', year: 'numeric' }).format(value);
const formatDay = (value) => new Intl.DateTimeFormat(getLocale(), { weekday: 'short', day: 'numeric', month: 'short' }).format(value);
const formatTime = (value) => new Intl.DateTimeFormat(getLocale(), { hour: '2-digit', minute: '2-digit' }).format(value);
const weekDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function calendarDays(month) {
  const first = startOfMonth(month);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function dateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function sameDay(left, right) {
  return dateKey(left) === dateKey(right);
}

function ScheduleEditor({ content, initialDay, notify, onSaved }) {
  const droppedOnDay = Boolean(initialDay && !content.scheduledAt);
  const baseDate = content.scheduledAt ? new Date(content.scheduledAt) : initialDay || new Date(Date.now() + 15 * 60 * 1000);
  if (!content.scheduledAt && initialDay) {
    baseDate.setHours(10, 0, 0, 0);
    if (baseDate <= new Date()) baseDate.setTime(Date.now() + 15 * 60 * 1000);
  }
  const [value, setValue] = useState(toDateTimeLocal(baseDate));
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const scheduledIso = toIsoFromLocal(value);
    if (!scheduledIso || new Date(scheduledIso) <= new Date()) {
      notify('Geçerli ve gelecekte bir tarih ve saat girin.', 'error');
      return;
    }
    setBusy(true);
    try {
      const updated = await api.scheduleContent(content.id, scheduledIso);
      notify(content.status === 'FAILED' ? 'İçerik yeniden yayın kuyruğuna alındı.' : 'Takvim güncellendi.');
      onSaved(updated);
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
        {content.title && <h3 className="mb-2 text-sm font-bold text-slate-950 dark:text-white">{content.title}</h3>}
        <div className="flex flex-wrap items-center gap-2"><StatusBadge label={PLATFORM_LABELS[content.platform]} tone="slate" dot={false} /><StatusBadge label={CONTENT_TYPE_LABELS[content.contentType]} tone="slate" dot={false} /></div>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{truncate(content.text, 180)}</p>
        {content.failureReason && <p className="mt-3 rounded-lg border border-rose-100 bg-rose-50 p-3 text-xs leading-5 text-rose-700 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300">{content.failureReason}</p>}
      </div>
      <Field label={droppedOnDay ? 'Yayın saati' : 'Yayın tarihi ve saati'} hint={droppedOnDay ? 'Seçilen gün değiştirilemez' : 'Gelecekte bir zaman seçin'} required>
        <LocalDateTimeInput value={value} required maxYearsAhead={5} dateReadOnly={droppedOnDay} timeInitiallyBlank={droppedOnDay} onChange={setValue} />
      </Field>
      <div className="flex justify-end border-t border-slate-100 pt-5 dark:border-slate-800"><Button type="submit" disabled={busy}>{busy ? 'Kaydediliyor…' : content.status === 'FAILED' ? 'Yeniden dene' : content.status === 'SCHEDULED' ? 'Yeniden planla' : 'Takvime ekle'}</Button></div>
    </form>
  );
}

function DayPlanner({ day, drafts, notify, onSaved }) {
  const [draftId, setDraftId] = useState('');
  const draft = drafts.find((item) => String(item.id) === draftId);

  if (!drafts.length) {
    return <EmptyState title="Planlanabilecek taslak yok" description="Yeni bir içerik ürettiğinizde taslaklar burada seçilebilir." />;
  }

  return (
    <div className="space-y-6">
      <Field label="Yayınlanacak taslak" required>
        <Select value={draftId} required onChange={(event) => setDraftId(event.target.value)}>
          <option value="">Taslak seçin</option>
          {drafts.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title || truncate(item.text, 48)} · {PLATFORM_LABELS[item.platform]} · {CONTENT_TYPE_LABELS[item.contentType]}
            </option>
          ))}
        </Select>
      </Field>
      {draft && <ScheduleEditor key={draft.id} content={draft} initialDay={day} notify={notify} onSaved={onSaved} />}
    </div>
  );
}

function DayOverview({ events, onOpenDetails, onPlanNew, canPlan }) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {!events.length && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-5 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
            Bu güne planlanmış yayın yok.
          </div>
        )}
        {events.map((event) => {
          const meta = CONTENT_STATUS_META[event.status] || CONTENT_STATUS_META.DEFAULT;
          return (
            <button key={event.id} type="button" onClick={() => onOpenDetails(event)} className="group w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-slate-700 dark:hover:bg-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge label={meta.label} tone={meta.tone} />
                  <span className="text-xs font-bold text-slate-500">{PLATFORM_LABELS[event.platform]} · {CONTENT_TYPE_LABELS[event.contentType]}</span>
                </div>
                <span className="text-xs font-bold text-slate-500">{formatTime(new Date(event.scheduledAt))}</span>
              </div>
              {event.title && <h3 className="mt-3 text-sm font-bold text-slate-950 dark:text-white">{event.title}</h3>}
              <p className={`${event.title ? 'mt-1' : 'mt-3'} text-sm leading-6 text-slate-600 dark:text-slate-300`}>{truncate(event.text, 150)}</p>
              <p className="mt-3 text-xs font-semibold text-blue-600 transition group-hover:translate-x-0.5 dark:text-blue-400">Ayrıntıları görüntüle →</p>
            </button>
          );
        })}
      </div>
      {canPlan && (
        <div className="flex justify-end border-t border-slate-100 pt-5 dark:border-slate-800">
          <Button onClick={onPlanNew}>＋ Yeni yayın planla</Button>
        </div>
      )}
    </div>
  );
}

export default function CalendarPage({ notify }) {
  const { locale, t } = useI18n();
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [platforms, setPlatforms] = useState([]);
  const [filters, setFilters] = useState({ status: '', platform: '' });
  const [events, setEvents] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [draggedDraftId, setDraggedDraftId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [dayPlannerDay, setDayPlannerDay] = useState(null);
  const [dayOverviewDay, setDayOverviewDay] = useState(null);

  const range = useMemo(() => ({ from: month.toISOString(), to: addMonths(month, 1).toISOString() }), [month]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [calendarItems, draftPage] = await Promise.all([
        api.getCalendar({ ...range, ...filters }),
        api.listContents({ status: 'DRAFT', platform: filters.platform, page: 0, size: 100 }),
      ]);
      setEvents(calendarItems);
      setDrafts(draftPage.items || []);
      setError(null);
    } catch (loadError) {
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, [filters, range]);

  useEffect(() => { api.getPlatforms().then(setPlatforms).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);

  const days = useMemo(() => calendarDays(month), [month]);
  const eventsByDay = useMemo(() => events.reduce((result, event) => {
    const key = dateKey(event.scheduledAt);
    result[key] = [...(result[key] || []), event];
    return result;
  }, {}), [events]);

  const sortedEvents = useMemo(() => [...events].sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)), [events]);

  const openEvent = (event, day = null) => {
    if (!SCHEDULABLE_STATUSES.has(event.status)) {
      window.location.hash = `#/contents?contentId=${encodeURIComponent(event.id)}`;
      return;
    }
    setSelected(event);
    setSelectedDay(day);
  };

  const openContentDetails = (event) => {
    window.location.hash = `#/contents?contentId=${encodeURIComponent(event.id)}`;
  };

  const changed = () => {
    setSelected(null);
    setSelectedDay(null);
    load();
  };

  const startDraftDrag = (event, draft) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', draft.id);
    setDraggedDraftId(draft.id);
  };

  const finishDraftDrag = () => {
    setDraggedDraftId(null);
    setDropTarget(null);
  };

  const allowDraftDrop = (event, day) => {
    if (!draggedDraftId || dateKey(day) < dateKey(new Date())) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropTarget(dateKey(day));
  };

  const dropDraft = (event, day) => {
    event.preventDefault();
    const draftId = event.dataTransfer.getData('text/plain') || draggedDraftId;
    const draft = drafts.find((item) => String(item.id) === String(draftId));
    finishDraftDrag();
    if (!draft) return;
    if (dateKey(day) < dateKey(new Date())) {
      notify('Geçmiş bir güne yayın planlanamaz.', 'error');
      return;
    }
    setSelected(draft);
    setSelectedDay(new Date(day));
  };

  const cancel = async () => {
    setCancelBusy(true);
    try {
      await api.cancelSchedule(selected.id);
      notify('Yayın planı iptal edildi; içerik taslağa döndü.');
      changed();
    } catch (cancelError) {
      notify(cancelError.message, 'error');
    } finally {
      setCancelBusy(false);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Yayın planı" title="İçerik takvimi" description="Taslakları yayın sırasına alın; planlanmış içerikleri taşıyın, iptal edin veya başarısız yayınları yeniden deneyin." />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="min-w-0 overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-slate-200/80 bg-slate-50/40 p-4 dark:border-slate-800 dark:bg-slate-900/30 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <Button className="border-0 shadow-none" variant="ghost" size="sm" aria-label={t('Önceki ay', 'Previous month')} onClick={() => setMonth(addMonths(month, -1))}>←</Button>
                <Button className="border-x border-y-0 border-slate-200 shadow-none dark:border-slate-700" variant="ghost" size="sm" onClick={() => setMonth(startOfMonth(new Date()))}>Bugün</Button>
                <Button className="border-0 shadow-none" variant="ghost" size="sm" aria-label={t('Sonraki ay', 'Next month')} onClick={() => setMonth(addMonths(month, 1))}>→</Button>
              </div>
              <h2 className="ml-1 text-lg font-bold capitalize tracking-tight text-slate-950 dark:text-white sm:ml-2">{formatMonth(month)}</h2>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:w-[360px]">
              <Select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
                <option value="">Tüm durumlar</option>
                <option value="SCHEDULED">Planlandı</option><option value="PUBLISHED">Yayınlandı</option><option value="FAILED">Başarısız</option>
              </Select>
              <Select value={filters.platform} onChange={(event) => setFilters((current) => ({ ...current, platform: event.target.value }))}>
                <option value="">Tüm platformlar</option>
                {platforms.map((item) => <option key={item.platform} value={item.platform}>{PLATFORM_LABELS[item.platform]}</option>)}
              </Select>
            </div>
          </div>

          {loading && <Spinner label="Takvim yükleniyor" />}
          {!loading && error && <div className="p-5"><ErrorState error={error} onRetry={load} /></div>}
          {!loading && !error && (
            <>
              <div className="hidden grid-cols-7 border-b border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/50 md:grid">{weekDays.map((day) => <div key={day} className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{day}</div>)}</div>
              <div className="hidden grid-cols-7 bg-slate-200/80 dark:bg-slate-800 md:grid md:gap-px">
                {days.map((day) => {
                  const dayEvents = eventsByDay[dateKey(day)] || [];
                  const inMonth = day.getMonth() === month.getMonth();
                  const today = sameDay(day, new Date());
                  const past = dateKey(day) < dateKey(new Date());
                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => setDayOverviewDay(new Date(day))}
                      onDragOver={(event) => allowDraftDrop(event, day)}
                      onDragEnter={(event) => allowDraftDrop(event, day)}
                      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDropTarget(null); }}
                      onDrop={(event) => dropDraft(event, day)}
                      className={`min-h-32 cursor-pointer p-2.5 transition-colors ${inMonth ? 'bg-white dark:bg-[#12161c]' : 'bg-slate-50 dark:bg-slate-950/50'} ${past ? 'opacity-55 hover:opacity-75' : 'hover:bg-slate-50 dark:hover:bg-slate-900'} ${dropTarget === dateKey(day) ? 'relative z-[1] bg-blue-50 opacity-100 ring-2 ring-inset ring-blue-500 dark:bg-blue-950/40' : ''}`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className={`grid h-7 min-w-7 place-items-center rounded-full px-1 text-xs font-semibold ${today ? 'bg-blue-600 text-white shadow-sm' : inMonth ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-600'}`}>{day.getDate()}</span>
                      </div>
                      <div className="space-y-1.5">
                        {dayEvents.slice(0, 3).map((event) => {
                          const meta = CONTENT_STATUS_META[event.status] || CONTENT_STATUS_META.DEFAULT;
                          return <button key={event.id} onClick={(clickEvent) => { clickEvent.stopPropagation(); openEvent(event, day); }} className={`block w-full truncate rounded-md border-l-2 px-2 py-1.5 text-left text-[10px] font-semibold transition hover:brightness-95 ${meta.calendarClassName}`}>{formatTime(new Date(event.scheduledAt))} · {event.title || PLATFORM_LABELS[event.platform]}</button>;
                        })}
                        {dayEvents.length > 3 && <p className="px-2 text-[10px] font-bold text-slate-400">+{dayEvents.length - 3} içerik</p>}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-3 p-4 sm:p-5 md:hidden">
                {!sortedEvents.length && <EmptyState title="Bu ay için yayın yok" description="Taslaklardan birini seçerek planlamaya başlayın." />}
                {sortedEvents.map((event) => {
                  const meta = CONTENT_STATUS_META[event.status] || CONTENT_STATUS_META.DEFAULT;
                  return (
                    <button key={event.id} onClick={() => openEvent(event)} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-slate-700 dark:hover:bg-slate-900">
                      <div className="min-w-16 rounded-lg border border-slate-200 bg-slate-50 p-2 text-center dark:border-slate-700 dark:bg-slate-800"><p className="text-[10px] font-bold capitalize text-slate-500 dark:text-slate-400">{formatDay(new Date(event.scheduledAt)).split(' ')[0]}</p><p className="text-lg font-bold text-slate-900 dark:text-white">{new Date(event.scheduledAt).getDate()}</p><p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{formatTime(new Date(event.scheduledAt))}</p></div>
                      <div className="min-w-0">
                        <StatusBadge label={meta.label} tone={meta.tone} />
                        {event.title && <p className="mt-2 truncate text-sm font-bold text-slate-950 dark:text-white">{event.title}</p>}
                        <p className={`${event.title ? 'mt-0.5' : 'mt-2'} truncate text-xs font-semibold text-slate-500 dark:text-slate-400`}>{PLATFORM_LABELS[event.platform]} · {CONTENT_TYPE_LABELS[event.contentType]}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </Card>

        <Card className="h-fit overflow-hidden xl:sticky xl:top-8">
          <div className="border-b border-slate-200/80 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-900/30">
            <div className="flex items-center justify-between"><div><p className="eyebrow">Planlanmamış</p><h2 className="mt-1 font-bold text-slate-950 dark:text-white">Taslak kuyruğu</h2></div><span className="grid h-8 min-w-8 place-items-center rounded-lg border border-slate-200 bg-white px-2 text-sm font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">{drafts.length}</span></div>
            <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">Bir taslağı takvimde istediğiniz güne sürükleyin veya seçerek yayın tarihi belirleyin.</p>
          </div>
          <div className="max-h-[620px] space-y-2 overflow-y-auto p-3">
            {!drafts.length && !loading && <EmptyState title="Taslak yok" description="Üretim tamamlandığında taslaklar burada görünür." />}
            {drafts.map((draft) => (
              <button
                key={draft.id}
                draggable
                onDragStart={(event) => startDraftDrag(event, draft)}
                onDragEnd={finishDraftDrag}
                onClick={() => { setSelected(draft); setSelectedDay(null); }}
                className={`w-full cursor-grab rounded-lg border p-3 text-left transition active:cursor-grabbing ${draggedDraftId === draft.id ? 'border-blue-300 bg-blue-50 opacity-60 dark:border-blue-700 dark:bg-blue-950/40' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-slate-700 dark:hover:bg-slate-900'}`}
              >
                <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-bold uppercase tracking-[0.08em] text-blue-600 dark:text-blue-400">{PLATFORM_LABELS[draft.platform]}</span><span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{CONTENT_TYPE_LABELS[draft.contentType]}</span></div>
                {draft.title && <p className="mt-2 truncate text-sm font-bold text-slate-950 dark:text-white">{draft.title}</p>}
                <p className={`${draft.title ? 'mt-1' : 'mt-2'} text-xs leading-5 text-slate-500 dark:text-slate-400`}>{truncate(draft.text, 95)}</p>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <Modal open={Boolean(selected)} title={selected?.status === 'FAILED' ? 'Yayınlamayı yeniden dene' : selected?.status === 'SCHEDULED' ? 'Yayını yeniden planla' : 'Taslağı planla'} description={selected ? `${selected.title ? `${selected.title} · ` : ''}${PLATFORM_LABELS[selected.platform]} · ${CONTENT_TYPE_LABELS[selected.contentType]}` : ''} onClose={() => { setSelected(null); setSelectedDay(null); }} size="md">
        {selected && <>
          <ScheduleEditor content={selected} initialDay={selectedDay} notify={notify} onSaved={changed} />
          {selected.status === 'SCHEDULED' && <div className="mt-4 flex justify-end border-t border-slate-100 pt-4"><Button variant="danger" disabled={cancelBusy} onClick={cancel}>{cancelBusy ? 'İptal ediliyor…' : 'Yayın planını iptal et'}</Button></div>}
        </>}
      </Modal>

      <Modal open={Boolean(dayPlannerDay)} title={t('Yeni yayın planla', 'Schedule a new publication')} description={dayPlannerDay ? `${formatDate(dayPlannerDay, locale)} · ${t('Seçilen gün değiştirilemez', 'The selected day cannot be changed')}` : ''} onClose={() => setDayPlannerDay(null)} size="md">
        {dayPlannerDay && (
          <DayPlanner
            day={dayPlannerDay}
            drafts={drafts}
            notify={notify}
            onSaved={() => { setDayPlannerDay(null); load(); }}
          />
        )}
      </Modal>

      <Modal open={Boolean(dayOverviewDay)} title={t('Günün yayınları', 'Publications for the day')} description={dayOverviewDay ? formatDate(dayOverviewDay, locale) : ''} onClose={() => setDayOverviewDay(null)} size="md">
        {dayOverviewDay && (
          <DayOverview
            events={eventsByDay[dateKey(dayOverviewDay)] || []}
            onOpenDetails={openContentDetails}
            canPlan={dateKey(dayOverviewDay) >= dateKey(new Date())}
            onPlanNew={() => {
              const selectedDate = dayOverviewDay;
              setDayOverviewDay(null);
              setDayPlannerDay(selectedDate);
            }}
          />
        )}
      </Modal>
    </>
  );
}
