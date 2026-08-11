import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import {
  CONTENT_STATUS_META,
  CONTENT_TYPE_LABELS,
  MEDIA_TYPE_LABELS,
  PLATFORM_LABELS,
  formatDateTime,
  normalizeHashtags,
  toDateTimeLocal,
  toIsoFromLocal,
  truncate,
} from '../constants';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LocalDateTimeInput,
  Modal,
  PageHeader,
  Pagination,
  Select,
  Spinner,
  StatusBadge,
  Textarea,
} from '../components/ui';

const SCHEDULABLE_STATUSES = new Set(['DRAFT', 'SCHEDULED', 'FAILED']);
function canScheduleContent(content) {
  return Boolean(content && SCHEDULABLE_STATUSES.has(content.status));
}

function ReviewDecisionButtons({ content, onChanged, notify }) {
  const [busy, setBusy] = useState('');

  if (content.status !== 'REVIEW_REQUIRED') {
    return null;
  }

  const decide = async (decision) => {
    setBusy(decision);
    try {
      const updated = decision === 'PUBLISHED'
        ? await api.markReviewPublished(content.id)
        : await api.markReviewFailed(content.id);
      notify(decision === 'PUBLISHED'
        ? 'İçerik yayınlandı olarak işaretlendi.'
        : 'İçerik başarısız olarak işaretlendi.');
      onChanged(updated);
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setBusy('');
    }
  };

  return (
    <>
      <Button size="sm" variant="soft" disabled={Boolean(busy)} onClick={() => decide('PUBLISHED')}>
        {busy === 'PUBLISHED' ? 'İşaretleniyor…' : 'Yayınlandı olarak işaretle'}
      </Button>
      <Button size="sm" variant="danger" disabled={Boolean(busy)} onClick={() => decide('FAILED')}>
        {busy === 'FAILED' ? 'İşaretleniyor…' : 'Başarısız olarak işaretle'}
      </Button>
    </>
  );
}

function MediaPreview({ content, media, compact = false }) {
  const source = media.resourcePath
    ? api.mediaUrl(content.id, media.mediaType)
    : media.publicUrl;
  const previewAvailable = source && /^(https?:|blob:|data:|\/)/.test(source);

  if (!previewAvailable) {
    return (
      <div className={`flex flex-col items-center justify-center border-dashed border-slate-200 bg-slate-50 px-4 text-center dark:border-slate-700 dark:bg-slate-900/60 ${compact ? 'h-full min-h-44' : 'aspect-video min-h-36 rounded-xl border'}`}>
        <span className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-base text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">{media.mediaType === 'IMAGE' ? '▧' : '▷'}</span>
        <p className="mt-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400">Önizleme bulunmuyor</p>
      </div>
    );
  }

  if (media.mediaType === 'VIDEO') {
    return <video className={`${compact ? 'h-full min-h-44 w-full object-cover' : 'aspect-video w-full rounded-lg object-contain'} bg-slate-950`} src={source} controls preload="metadata" />;
  }
  return <img className={`${compact ? 'h-full min-h-44 w-full object-cover' : 'aspect-video w-full rounded-lg object-contain'} bg-slate-100 dark:bg-slate-900`} src={source} alt="İçerik medyası" />;
}

function ScheduleForm({ content, onSaved, notify }) {
  const defaultValue = content.scheduledAt
    ? toDateTimeLocal(content.scheduledAt)
    : toDateTimeLocal(new Date(Date.now() + 10 * 60 * 1000).toISOString());
  const [scheduledAt, setScheduledAt] = useState(defaultValue);
  const [busy, setBusy] = useState(false);
  const action = content.status === 'FAILED' ? 'Yeniden dene' : content.status === 'SCHEDULED' ? 'Tarihi güncelle' : 'Planla';

  const submit = async (event) => {
    event.preventDefault();
    if (!canScheduleContent(content)) {
      notify('Bu içerik mevcut durumundayken planlanamaz. Sayfayı yenileyip durumunu kontrol edin.', 'error');
      return;
    }
    const scheduledIso = toIsoFromLocal(scheduledAt);
    if (!scheduledIso || new Date(scheduledIso) <= new Date()) {
      notify('Geçerli ve gelecekte bir tarih ve saat girin.', 'error');
      return;
    }
    setBusy(true);
    try {
      const updated = await api.scheduleContent(content.id, scheduledIso);
      notify(content.status === 'FAILED' ? 'İçerik yeniden yayın kuyruğuna alındı.' : 'Yayın zamanı kaydedildi.');
      onSaved(updated);
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      {content.status === 'FAILED' && (
        <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          <p className="font-semibold">Son yayınlama başarısız</p>
          <p className="mt-1 leading-6">{content.failureReason || 'Hata ayrıntısı bulunmuyor.'}</p>
        </div>
      )}
      <Field label="Yayın tarihi ve saati" hint="Yerel saat diliminiz" required>
        <LocalDateTimeInput required maxYearsAhead={5} value={scheduledAt} onChange={setScheduledAt} />
      </Field>
      <div className="mt-6 flex justify-end border-t border-slate-200 pt-5 dark:border-slate-800"><Button type="submit" className="w-full sm:w-auto" disabled={busy}>{busy ? 'Kaydediliyor…' : action}</Button></div>
    </form>
  );
}

function ContentDetail({ content, onChanged, onDelete, notify }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(content.title || '');
  const [text, setText] = useState(content.text);
  const [hashtags, setHashtags] = useState((content.hashtags || []).join(' '));
  const [busy, setBusy] = useState(false);
  const [mediaBusy, setMediaBusy] = useState('');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const statusMeta = CONTENT_STATUS_META[content.status] || CONTENT_STATUS_META.DEFAULT;
  const isDraft = content.status === 'DRAFT';

  useEffect(() => {
    setTitle(content.title || '');
    setText(content.text);
    setHashtags((content.hashtags || []).join(' '));
  }, [content]);

  const save = async () => {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      notify('İçerik başlığı zorunludur.', 'error');
      return;
    }
    setBusy(true);
    try {
      const updated = await api.updateContent(content.id, { title: normalizedTitle, text, hashtags: normalizeHashtags(hashtags) });
      notify('Taslak güncellendi.');
      setEditing(false);
      onChanged(updated);
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const uploadMedia = async (mediaType, file) => {
    if (!file) return;
    setMediaBusy(mediaType);
    try {
      const updated = await api.replaceMedia(content.id, mediaType, file);
      notify(`${MEDIA_TYPE_LABELS[mediaType]} kaydedildi.`);
      onChanged(updated);
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setMediaBusy('');
    }
  };

  const removeMedia = async (mediaType) => {
    setMediaBusy(mediaType);
    try {
      const updated = await api.deleteMedia(content.id, mediaType);
      notify(`${MEDIA_TYPE_LABELS[mediaType]} silindi.`);
      onChanged(updated);
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setMediaBusy('');
    }
  };

  const cancelSchedule = async () => {
    setBusy(true);
    try {
      const updated = await api.cancelSchedule(content.id);
      notify('Yayın planı iptal edildi.');
      onChanged(updated);
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const mediaByType = (type) => content.media?.find((item) => item.mediaType === type);

  return (
    <>
      <h2 className="mb-4 text-xl font-semibold tracking-tight text-slate-950 dark:text-white">{content.title || 'Başlıksız içerik'}</h2>
      <div className="mb-5 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-5 dark:border-slate-800">
        <StatusBadge label={statusMeta.label} tone={statusMeta.tone} />
        <StatusBadge label={PLATFORM_LABELS[content.platform] || content.platform} tone="slate" dot={false} />
        <StatusBadge label={CONTENT_TYPE_LABELS[content.contentType] || content.contentType} tone="slate" dot={false} />
        {content.textProvider && <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{content.textProvider} · {content.textModel}</span>}
      </div>

      <div className="space-y-6">
          <div>
            <div className="mb-3 flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Metin ve hashtag</h3>{isDraft && !editing && <Button size="sm" variant="soft" onClick={() => setEditing(true)}>Düzenle</Button>}</div>
            {editing ? (
              <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/50 sm:p-5">
                <Field label="İçerik başlığı" hint="En fazla 255 karakter" required><Input required maxLength={255} value={title} onChange={(event) => setTitle(event.target.value)} /></Field>
                <Field label="İçerik metni" required><Textarea className="min-h-44" value={text} onChange={(event) => setText(event.target.value)} /></Field>
                <Field label="Hashtag'ler" hint="Boşluk, virgül veya satır ile ayırın"><Textarea className="min-h-20" value={hashtags} onChange={(event) => setHashtags(event.target.value)} /></Field>
                <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 dark:border-slate-800 sm:flex-row sm:justify-end"><Button variant="secondary" size="sm" onClick={() => setEditing(false)}>Vazgeç</Button><Button size="sm" onClick={save} disabled={busy || !title.trim() || !text.trim()}>{busy ? 'Kaydediliyor…' : 'Kaydet'}</Button></div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-900/40">
                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-200">{content.text}</p>
                <div className="mt-4 flex flex-wrap gap-2">{content.hashtags?.map((tag) => <span key={tag} className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-300">{tag}</span>)}</div>
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Medya</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {['IMAGE', 'VIDEO'].map((mediaType) => {
                const media = mediaByType(mediaType);
                const accept = mediaType === 'IMAGE' ? 'image/png,image/jpeg,image/gif,image/webp' : 'video/mp4';
                return (
                  <div key={mediaType} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/30">
                    {media ? <MediaPreview content={content} media={media} /> : <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-xs font-medium text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500">{MEDIA_TYPE_LABELS[mediaType]} eklenmemiş</div>}
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div><p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{MEDIA_TYPE_LABELS[mediaType]}</p>{media?.modelProvider && <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">{media.modelProvider} · {media.modelId}</p>}</div>
                      {isDraft && (
                        <div className="flex flex-wrap gap-2">
                          {media && <Button variant="danger" size="sm" disabled={mediaBusy === mediaType} onClick={() => removeMedia(mediaType)}>Sil</Button>}
                          <label className="inline-flex min-h-9 cursor-pointer items-center rounded-lg bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/70">
                            <input type="file" className="sr-only" accept={accept} onChange={(event) => uploadMedia(mediaType, event.target.files?.[0])} />
                            {mediaBusy === mediaType ? 'Yükleniyor…' : media ? 'Değiştir' : 'Yükle'}
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Yayın planı</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{content.scheduledAt ? formatDateTime(content.scheduledAt) : content.status === 'PUBLISHED' ? `Yayınlandı: ${formatDateTime(content.publishedAt)}` : 'Henüz planlanmadı'}</p></div>
              <div className="flex flex-wrap gap-2">
                {content.status === 'SCHEDULED' && <Button variant="danger" size="sm" disabled={busy} onClick={cancelSchedule}>Planı iptal et</Button>}
                {canScheduleContent(content) && <Button size="sm" onClick={() => setScheduleOpen(true)}>{content.status === 'FAILED' ? 'Yeniden dene' : content.status === 'SCHEDULED' ? 'Yeniden planla' : 'Takvime ekle'}</Button>}
                <ReviewDecisionButtons content={content} onChanged={onChanged} notify={notify} />
              </div>
            </div>
          </div>

          {isDraft && <div className="flex justify-end border-t border-slate-200 pt-5 dark:border-slate-800"><Button variant="danger" className="w-full sm:w-auto" onClick={onDelete}>Taslağı sil</Button></div>}
      </div>

      <Modal open={scheduleOpen} title={content.status === 'FAILED' ? 'Yayınlamayı yeniden dene' : 'Yayın zamanı'} description={`${content.title || 'Başlıksız içerik'} · ${PLATFORM_LABELS[content.platform]} · ${CONTENT_TYPE_LABELS[content.contentType]}`} onClose={() => setScheduleOpen(false)} size="md">
        <ScheduleForm content={content} notify={notify} onSaved={(updated) => { setScheduleOpen(false); onChanged(updated); }} />
      </Modal>
    </>
  );
}

export default function ContentsPage({ notify }) {
  const statusFromHash = () => {
    const query = window.location.hash.split('?')[1] || '';
    const status = new URLSearchParams(query).get('status') || '';
    return CONTENT_STATUS_META[status] && status !== 'DEFAULT' ? status : '';
  };
  const [platforms, setPlatforms] = useState([]);
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ status: statusFromHash(), platform: '', title: '', page: 0, size: 20 });
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [content, setContent] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [scheduleTarget, setScheduleTarget] = useState(null);
  const [statusCounts, setStatusCounts] = useState(null);
  const [countRefresh, setCountRefresh] = useState(0);

  useEffect(() => { api.getPlatforms().then(setPlatforms).catch(() => {}); }, []);
  useEffect(() => {
    const applyHashFilter = () => setFilters((current) => ({ ...current, status: statusFromHash(), page: 0 }));
    window.addEventListener('hashchange', applyHashFilter);
    return () => window.removeEventListener('hashchange', applyHashFilter);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api.listContents(filters));
      setError(null);
    } catch (loadError) {
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let cancelled = false;
    setStatusCounts(null);
    api.getContentStatusCounts({
      platform: filters.platform,
      title: filters.title,
    }).then((counts) => {
      if (cancelled) return;
      setStatusCounts(counts);
    }).catch(() => {
      if (!cancelled) setStatusCounts({});
    });
    return () => { cancelled = true; };
  }, [countRefresh, filters.platform, filters.title]);

  const openDetail = useCallback(async (id) => {
    setSelectedId(id);
    setContent(null);
    setDetailLoading(true);
    try {
      const detail = await api.getContent(id);
      setContent(detail);
    } catch (detailError) {
      notify(detailError.message, 'error');
      setSelectedId(null);
    } finally {
      setDetailLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    const openContentFromHash = () => {
      const query = window.location.hash.split('?')[1] || '';
      const contentId = new URLSearchParams(query).get('contentId');
      if (contentId) openDetail(contentId);
    };
    openContentFromHash();
    window.addEventListener('hashchange', openContentFromHash);
    return () => window.removeEventListener('hashchange', openContentFromHash);
  }, [openDetail]);

  const closeDetail = () => {
    setSelectedId(null);
    setContent(null);
    const query = window.location.hash.split('?')[1] || '';
    const params = new URLSearchParams(query);
    params.delete('contentId');
    const nextQuery = params.toString();
    window.history.replaceState(null, '', `#/contents${nextQuery ? `?${nextQuery}` : ''}`);
  };

  const setFilter = (name, value) => setFilters((current) => ({ ...current, [name]: value, page: name === 'page' ? value : 0 }));

  const applySearchFilter = (event) => {
    event.preventDefault();
    setFilter('title', searchInput.trim());
  };

  const changed = (updated) => {
    setContent(updated);
    setData((current) => current ? { ...current, items: current.items.map((item) => item.id === updated.id ? updated : item) } : current);
    setCountRefresh((current) => current + 1);
  };

  const confirmDelete = async () => {
    setDeleteBusy(true);
    try {
      await api.deleteContent(deleteTarget.id);
      notify('Taslak silindi.');
      setDeleteTarget(null);
      setSelectedId(null);
      setContent(null);
      load();
      setCountRefresh((current) => current + 1);
    } catch (deleteError) {
      notify(deleteError.message, 'error');
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Taslak yönetimi" title="İçerik kütüphanesi" description="Üretilen içerikleri düzenleyin, medyalarını yönetin ve yayın akışına alın." />

      <div className="mb-5 grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        {Object.entries(CONTENT_STATUS_META).filter(([key]) => key !== 'DEFAULT').map(([key, meta]) => (
          <button
            key={key}
            aria-pressed={filters.status === key}
            onClick={() => setFilter('status', filters.status === key ? '' : key)}
            className={`rounded-xl border p-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 sm:p-4 ${filters.status === key ? 'border-blue-400 bg-blue-50/70 dark:border-blue-700 dark:bg-blue-950/30' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-slate-700 dark:hover:bg-slate-800/50'}`}
          >
            <p className={`text-xs font-semibold ${filters.status === key ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'}`}>{meta.label}</p><p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{statusCounts?.[key] ?? '—'}</p><p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">Toplam kayıt</p>
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="grid gap-3 border-b border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/35 sm:grid-cols-2 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(280px,1.35fr)]">
          <Select value={filters.status} onChange={(event) => setFilter('status', event.target.value)}><option value="">Tüm durumlar</option>{Object.entries(CONTENT_STATUS_META).filter(([key]) => key !== 'DEFAULT').map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}</Select>
          <Select value={filters.platform} onChange={(event) => setFilter('platform', event.target.value)}><option value="">Tüm platformlar</option>{platforms.map((item) => <option key={item.platform} value={item.platform}>{PLATFORM_LABELS[item.platform] || item.platform}</option>)}</Select>
          <form className="flex gap-2 sm:col-span-2 lg:col-span-1" onSubmit={applySearchFilter}>
            <Input maxLength={255} value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Başlık veya içerikte ara" />
            <Button type="submit" variant="secondary" className="shrink-0">Ara</Button>
          </form>
        </div>

        <div className="p-4 sm:p-6">
          {loading && <Spinner label="İçerikler yükleniyor" />}
          {!loading && error && <ErrorState error={error} onRetry={load} />}
          {!loading && !error && !data?.items?.length && <EmptyState title="İçerik bulunamadı" description="Filtreleri temizleyin veya üretim ekranından yeni bir toplu üretim başlatın." action={<Button onClick={() => { window.location.hash = '#/batches'; }}>Üretime git</Button>} />}
          {!loading && !error && data?.items?.length > 0 && (
            <div className="grid gap-4 xl:grid-cols-2">
              {data.items.map((item) => {
                const meta = CONTENT_STATUS_META[item.status] || CONTENT_STATUS_META.DEFAULT;
                const image = item.media?.find((media) => media.mediaType === 'IMAGE');
                return (
                  <article key={item.id} className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition-colors hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900/30 dark:hover:border-blue-800">
                    <button className="grid w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/30 sm:grid-cols-[170px_1fr]" onClick={() => openDetail(item.id)}>
                      <div className="min-h-44 overflow-hidden border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 sm:border-b-0 sm:border-r">
                        {image ? <MediaPreview content={item} media={image} compact /> : <div className="flex h-full min-h-44 items-center justify-center bg-slate-50 text-slate-300 dark:bg-slate-900 dark:text-slate-700"><span className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-lg dark:border-slate-700 dark:bg-slate-800">✦</span></div>}
                      </div>
                      <div className="flex min-w-0 flex-col p-4 sm:p-5">
                        <div className="flex flex-wrap items-center gap-2"><StatusBadge label={meta.label} tone={meta.tone} /><span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">{PLATFORM_LABELS[item.platform]} · {CONTENT_TYPE_LABELS[item.contentType]}</span></div>
                        <h2 className="mt-3 truncate text-base font-semibold text-slate-950 dark:text-white">{item.title || 'Başlıksız içerik'}</h2>
                        <p className="mt-3 text-sm font-medium leading-6 text-slate-700 dark:text-slate-200">{truncate(item.text, 145)}</p>
                        <div className="mt-3 flex flex-wrap gap-1.5">{item.hashtags?.slice(0, 3).map((tag) => <span key={tag} className="text-xs font-medium text-blue-600 dark:text-blue-400">{tag}</span>)}</div>
                        <p className="mt-auto pt-4 text-[11px] font-medium text-slate-400 dark:text-slate-500">{item.scheduledAt ? formatDateTime(item.scheduledAt) : formatDateTime(item.createdAt)}</p>
                      </div>
                    </button>
                    <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50/40 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60">
                      {canScheduleContent(item) && <Button size="sm" variant={item.status === 'FAILED' ? 'danger' : 'soft'} onClick={() => setScheduleTarget(item)}>{item.status === 'FAILED' ? 'Yeniden dene' : item.status === 'SCHEDULED' ? 'Yeniden planla' : 'Planla'}</Button>}
                      <ReviewDecisionButtons content={item} onChanged={changed} notify={notify} />
                      <Button size="sm" variant="ghost" onClick={() => openDetail(item.id)}>Ayrıntılar</Button>
                    </div>
                  </article>
                );
              })}
              <div className="xl:col-span-2">
                <Pagination
                  page={data.page}
                  size={data.size}
                  totalElements={data.totalElements}
                  totalPages={data.totalPages}
                  onChange={(page) => setFilter('page', page)}
                  onSizeChange={(size) => setFilter('size', size)}
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      <Modal open={Boolean(selectedId)} title={content?.title || 'İçerik ayrıntıları'} description={content ? `Oluşturulma: ${formatDateTime(content.createdAt)}` : 'İçerik yükleniyor'} onClose={closeDetail} size="xl">
        {detailLoading || !content ? <Spinner label="İçerik ayrıntıları yükleniyor" /> : <ContentDetail content={content} notify={notify} onChanged={changed} onDelete={() => setDeleteTarget(content)} />}
      </Modal>

      <Modal open={Boolean(scheduleTarget)} title={scheduleTarget?.status === 'FAILED' ? 'Yayınlamayı yeniden dene' : 'Yayın zamanı'} description={scheduleTarget ? `${scheduleTarget.title || 'Başlıksız içerik'} · ${PLATFORM_LABELS[scheduleTarget.platform]} · ${CONTENT_TYPE_LABELS[scheduleTarget.contentType]}` : ''} onClose={() => setScheduleTarget(null)} size="md">
        {scheduleTarget && <ScheduleForm content={scheduleTarget} notify={notify} onSaved={(updated) => { setScheduleTarget(null); changed(updated); load(); }} />}
      </Modal>

      <ConfirmDialog open={Boolean(deleteTarget)} title="Taslak silinsin mi?" description="Bu işlem taslağı ve yüklenmiş medyalarını kalıcı olarak siler." busy={deleteBusy} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete} />
    </>
  );
}
