import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import {
  BATCH_STATUS_META,
  CONTENT_TYPE_LABELS,
  PLATFORM_LABELS,
  SOURCE_STATUS_META,
  formatDateTime,
} from '../constants';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Modal,
  PageHeader,
  Pagination,
  Progress,
  Select,
  Spinner,
  StatusBadge,
  Textarea,
} from '../components/ui';
import { GENERATION_ATTEMPT_COPY, VIDEO_GENERATION_COPY, useI18n } from '../i18n';

const initialForm = {
  title: '',
  platform: '',
  contentType: '',
  requestedCount: 5,
  generationStrategy: '',
  includeImage: false,
  includeVideo: false,
  textProvider: '',
  textModel: '',
  imageProvider: '',
  imageModel: '',
  videoProvider: '',
  videoModel: '',
  videoDurationSeconds: '',
  links: '',
};

const GENERATION_STRATEGY_LABELS = {
  SOURCE_BASED: 'Kaynak bazlı',
  COMBINED: 'Birleşik',
};

const MEDIA_SELECTION_POLICIES = {
  LINKEDIN: {
    POST: { image: 'optional', video: 'optional', exclusive: true },
  },
  INSTAGRAM: {
    POST: { image: 'required', video: 'forbidden' },
    REEL: { image: 'optional', video: 'required' },
  },
  TWITTER: {
    TWEET: { image: 'optional', video: 'optional', exclusive: true },
  },
};

function mediaSelectionPolicy(platform, contentType) {
  return MEDIA_SELECTION_POLICIES[platform]?.[contentType] || { image: 'optional', video: 'optional', exclusive: false };
}

function applyMediaSelectionPolicy(current, platform, contentType) {
  const policy = mediaSelectionPolicy(platform, contentType);
  const includeImage = policy.image === 'required' ? true : policy.image === 'forbidden' ? false : current.includeImage;
  let includeVideo = policy.video === 'required' ? true : policy.video === 'forbidden' ? false : current.includeVideo;
  if (policy.exclusive && includeImage && includeVideo) includeVideo = false;
  return {
    ...current,
    platform,
    contentType,
    includeImage,
    includeVideo,
    imageProvider: includeImage ? current.imageProvider : '',
    imageModel: includeImage ? current.imageModel : '',
    videoProvider: includeVideo ? current.videoProvider : '',
    videoModel: includeVideo ? current.videoModel : '',
    videoDurationSeconds: includeVideo ? current.videoDurationSeconds : '',
  };
}

function mediaSelectionError(form) {
  if (['LINKEDIN', 'TWITTER'].includes(form.platform) && form.includeImage && form.includeVideo) {
    return form.platform === 'LINKEDIN'
      ? 'LinkedIn gönderisinde görsel ve video aynı anda seçilemez.'
      : 'X gönderisinde görsel ve video aynı anda seçilemez.';
  }
  if (form.platform !== 'INSTAGRAM') return null;
  if (form.contentType === 'POST' && (!form.includeImage || form.includeVideo)) {
    return 'Instagram gönderisi için görsel üretimi zorunludur ve video üretimi desteklenmez.';
  }
  if (form.contentType === 'REEL' && !form.includeVideo) {
    return 'Instagram Reels için video üretimi zorunludur; görsel isteğe bağlı kapak olarak eklenebilir.';
  }
  return null;
}

function linksExist(value) {
  return value.split('\n').some((item) => item.trim());
}

function CustomSelect({ value, options, placeholder, onChange, disabled = false, required = false, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef(null);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  useEffect(() => {
    const close = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  const show = () => {
    if (disabled) return;
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };

  const choose = (option) => {
    onChange(option.value);
    setOpen(false);
  };

  const onKeyDown = (event) => {
    if (disabled) return;
    if (!open && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      show();
      return;
    }
    if (!open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % options.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + options.length) % options.length);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(options[activeIndex]);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-required={required}
        disabled={disabled}
        onClick={() => open ? setOpen(false) : show()}
        onKeyDown={onKeyDown}
        className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border bg-white px-3.5 text-left text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 dark:bg-slate-950 dark:focus-visible:ring-offset-slate-950 ${open ? 'border-blue-400 ring-2 ring-blue-500/15 dark:border-blue-500' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-900'} disabled:cursor-not-allowed disabled:opacity-45`}
      >
        <span className={selected ? 'truncate font-medium text-slate-800 dark:text-slate-100' : 'truncate text-slate-400 dark:text-slate-500'}>{selected?.label || placeholder}</span>
        <svg className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180 text-blue-500' : ''}`} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && options.length > 0 && (
        <div role="listbox" className="absolute z-50 mt-2 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-950/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/35">
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isActive = index === activeIndex;
            return (
              <button
                key={`${option.value}-${option.label}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(option)}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm outline-none transition-colors ${isSelected ? 'bg-blue-50 font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' : isActive ? 'bg-slate-100 text-slate-950 dark:bg-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && <span className="text-blue-600 dark:text-blue-400" aria-hidden="true">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ number, title, state }) {
  const active = state === 'active';
  return (
    <div className="mb-5 flex items-center gap-2.5 border-b border-slate-200/80 pb-3 dark:border-slate-800">
      <span className={`text-[10px] font-bold tabular-nums tracking-[0.14em] ${active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-600'}`}>0{number}</span>
      <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">/</span>
      <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${active ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500 dark:text-slate-500'}`}>{title}</p>
    </div>
  );
}

function formatUsd(value, locale) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(amount);
}

function ModelPicker({ capability, models, provider, model, onChange, required }) {
  const providers = useMemo(
    () => {
      const available = [...new Set(models.map((item) => item.providerName))];
      return (available.length ? available : ['openai', 'anthropic', 'gemini', 'deepseek', 'qwen'])
        .sort((a, b) => a.localeCompare(b));
    },
    [models],
  );
  const providerModels = useMemo(
    () => models.filter((item) => item.providerName === provider),
    [models, provider],
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Sağlayıcı" required={required}>
        <CustomSelect
          value={provider}
          required={required}
          ariaLabel="Sağlayıcı"
          placeholder="Sağlayıcı seçin"
          options={providers.map((item) => ({ value: item, label: item }))}
          onChange={(nextProvider) => onChange(nextProvider, '')}
        />
      </Field>
      <Field label={`${capability} modeli`} hint={!models.length ? 'Katalog boş: model ID girin' : undefined} required={required}>
        {models.length ? (
          <CustomSelect
            value={model}
            required={required}
            disabled={!provider}
            ariaLabel={`${capability} modeli`}
            placeholder="Model seçin"
            options={providerModels.map((item) => ({ value: item.modelId, label: item.displayName || item.modelId }))}
            onChange={(nextModel) => onChange(provider, nextModel)}
          />
        ) : (
          <Input
            value={model}
            required={required}
            disabled={!provider}
            placeholder="Model ID"
            onChange={(event) => onChange(provider, event.target.value)}
          />
        )}
      </Field>
    </div>
  );
}

function BatchForm({ platforms, models, limits, onCreated, notify }) {
  const { locale, t } = useI18n();
  const [form, setForm] = useState(initialForm);
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [budgetEstimate, setBudgetEstimate] = useState(null);
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [budgetError, setBudgetError] = useState(null);

  useEffect(() => {
    if (form.platform || !platforms.length) return;
    const first = platforms[0];
    const contentType = first.contentTypes?.[0] || '';
    setForm((current) => applyMediaSelectionPolicy(current, first.platform, contentType));
  }, [form.platform, platforms]);

  const supportedTypes = platforms.find((item) => item.platform === form.platform)?.contentTypes || [];
  const mediaPolicy = mediaSelectionPolicy(form.platform, form.contentType);
  const selectedVideoModel = models.find((item) => item.capability === 'VIDEO'
    && item.providerName === form.videoProvider
    && item.modelId === form.videoModel);
  const supportedVideoDurations = selectedVideoModel?.supportedVideoDurationSeconds || [];
  const mediaOptions = [
    {
      name: 'includeImage',
      label: 'Görsel üret',
      state: mediaPolicy.image,
      description: mediaPolicy.image === 'required'
        ? 'Instagram gönderisi için zorunlu.'
        : form.platform === 'INSTAGRAM' && form.contentType === 'REEL'
          ? 'İsteğe bağlı Reels kapak görseli.'
          : 'Her taslağa bir görsel eklenir.',
    },
    {
      name: 'includeVideo',
      label: 'Video üret',
      state: mediaPolicy.video,
      description: mediaPolicy.video === 'required'
        ? 'Instagram Reels için zorunlu.'
        : mediaPolicy.video === 'forbidden'
          ? 'Instagram gönderisinde video desteklenmiyor.'
          : 'Her taslağa bir video eklenir.',
    },
  ];
  const byCapability = (capability) => models.filter((item) => item.capability === capability);
  const linkCount = form.links.split('\n').filter((item) => item.trim()).length;
  const sourceCount = linkCount + files.length;
  const requestedCount = Number(form.requestedCount);
  const requestedCountLimit = Math.min(
    limits?.generationMaxContentsPerBatch ?? 1000,
    form.includeImage ? limits?.generationMaxImagesPerBatch ?? 1000 : Infinity,
    form.includeVideo ? limits?.generationMaxVideosPerBatch ?? 1000 : Infinity,
  );
  const automaticStrategy = sourceCount > 0 && sourceCount === requestedCount
    ? 'SOURCE_BASED'
    : 'COMBINED';
  const sourceReuseWarning = form.generationStrategy === 'SOURCE_BASED'
    && sourceCount > 0
    && sourceCount < requestedCount;
  const formatComplete = Boolean(form.title.trim() && form.platform && form.contentType && requestedCount >= 1 && requestedCount <= requestedCountLimit);
  const modelsComplete = Boolean(
    form.textProvider
    && form.textModel
    && (!form.includeImage || (form.imageProvider && form.imageModel))
    && (!form.includeVideo || (form.videoProvider && form.videoModel && form.videoDurationSeconds)),
  );
  const sourcesComplete = sourceCount > 0;
  const currentStep = !formatComplete ? 1 : !modelsComplete ? 2 : 3;
  const stepState = (step, completed) => completed ? 'completed' : currentStep === step ? 'active' : 'pending';
  const sectionClass = (state) => `rounded-2xl border p-5 transition-all duration-200 sm:p-6 ${state === 'completed' ? 'border-slate-300/80 bg-slate-50/60 dark:border-slate-700/80 dark:bg-slate-900/45' : state === 'active' ? 'border-slate-400 bg-white shadow-md shadow-slate-950/5 dark:border-slate-600 dark:bg-slate-900/70 dark:shadow-black/15' : 'border-slate-200/70 bg-slate-50/25 opacity-65 dark:border-slate-800/70 dark:bg-slate-950/20'}`;

  useEffect(() => {
    let cancelled = false;
    const canEstimate = Number.isInteger(requestedCount)
      && requestedCount >= 1
      && requestedCount <= requestedCountLimit
      && form.textProvider
      && form.textModel
      && (!form.includeImage || (form.imageProvider && form.imageModel))
      && (!form.includeVideo || (form.videoProvider && form.videoModel && form.videoDurationSeconds));
    if (!canEstimate) {
      setBudgetEstimate(null);
      setBudgetError(null);
      setBudgetLoading(false);
      return undefined;
    }

    const timeout = window.setTimeout(async () => {
      setBudgetLoading(true);
      setBudgetError(null);
      try {
        const estimate = await api.estimateGenerationBudget({
          requestedCount,
          includeImage: form.includeImage,
          includeVideo: form.includeVideo,
          textModel: { provider: form.textProvider, model: form.textModel },
          imageModel: form.includeImage ? { provider: form.imageProvider, model: form.imageModel } : null,
          videoModel: form.includeVideo ? { provider: form.videoProvider, model: form.videoModel } : null,
          videoDurationSeconds: form.includeVideo ? Number(form.videoDurationSeconds) : null,
        });
        if (!cancelled) setBudgetEstimate(estimate);
      } catch (estimateError) {
        if (!cancelled) {
          setBudgetEstimate(null);
          setBudgetError(estimateError);
        }
      } finally {
        if (!cancelled) setBudgetLoading(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [form.imageModel, form.imageProvider, form.includeImage, form.includeVideo, form.textModel, form.textProvider, form.videoDurationSeconds, form.videoModel, form.videoProvider, requestedCount, requestedCountLimit]);

  const setValue = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const setMediaValue = (name, value) => setForm((current) => {
    const policy = mediaSelectionPolicy(current.platform, current.contentType);
    const clearMedia = (next, mediaName) => mediaName === 'includeImage'
      ? { ...next, imageProvider: '', imageModel: '' }
      : { ...next, videoProvider: '', videoModel: '', videoDurationSeconds: '' };
    if (!value) return clearMedia({ ...current, [name]: false }, name);
    if (!policy.exclusive) return { ...current, [name]: true };
    const otherName = name === 'includeImage' ? 'includeVideo' : 'includeImage';
    return clearMedia({ ...current, [name]: true, [otherName]: false }, otherName);
  });
  const addFiles = (selectedFiles) => {
    const selected = Array.from(selectedFiles);
    setFiles((current) => {
      const next = [...current];
      selected.forEach((file) => {
        const exists = next.some((item) => (
          item.name === file.name
          && item.size === file.size
          && item.lastModified === file.lastModified
        ));
        if (!exists) next.push(file);
      });
      return next;
    });
  };
  const removeFile = (index) => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
  const setModel = (prefix, provider, model) => setForm((current) => {
    const next = {
      ...current,
      [`${prefix}Provider`]: provider,
      [`${prefix}Model`]: model,
    };
    if (prefix !== 'video') return next;
    const selectedModel = models.find((item) => item.capability === 'VIDEO'
      && item.providerName === provider
      && item.modelId === model);
    const supportedDurations = selectedModel?.supportedVideoDurationSeconds || [];
    return {
      ...next,
      videoDurationSeconds: supportedDurations.includes(Number(current.videoDurationSeconds))
        ? current.videoDurationSeconds
        : '',
    };
  });

  const handlePlatform = (platform) => {
    const contentTypes = platforms.find((item) => item.platform === platform)?.contentTypes || [];
    const contentType = contentTypes[0] || '';
    setForm((current) => applyMediaSelectionPolicy(current, platform, contentType));
  };

  const handleContentType = (contentType) => {
    setForm((current) => applyMediaSelectionPolicy(current, current.platform, contentType));
  };

  const submit = async (event) => {
    event.preventDefault();
    const title = form.title.trim();
    if (!title) {
      notify('İçerik başlığı zorunludur.', 'error');
      return;
    }
    const selectionError = mediaSelectionError(form);
    if (selectionError) {
      notify(selectionError, 'error');
      return;
    }
    if (!Number.isInteger(requestedCount) || requestedCount < 1 || requestedCount > requestedCountLimit) {
      notify(t(`İçerik adedi 1–${requestedCountLimit} arasında olmalıdır.`, `Content count must be between 1 and ${requestedCountLimit}.`), 'error');
      return;
    }
    if (!linksExist(form.links) && files.length === 0) {
      notify('En az bir kaynak linki veya döküman ekleyin.', 'error');
      return;
    }
    if (!form.textProvider || !form.textModel) {
      notify('Metin sağlayıcısı ve modeli zorunlu.', 'error');
      return;
    }
    if (form.includeImage && (!form.imageProvider || !form.imageModel)) {
      notify('Görsel üretimi için sağlayıcı ve model seçin.', 'error');
      return;
    }
    if (form.includeVideo && (!form.videoProvider || !form.videoModel)) {
      notify('Video üretimi için sağlayıcı ve model seçin.', 'error');
      return;
    }
    if (form.includeVideo && !supportedVideoDurations.includes(Number(form.videoDurationSeconds))) {
      notify(t(VIDEO_GENERATION_COPY.invalidDuration.tr, VIDEO_GENERATION_COPY.invalidDuration.en), 'error');
      return;
    }
    if (budgetEstimate && Number(budgetEstimate.totalCostUsd) > Number(limits?.generationMaxEstimatedCostUsd)) {
      notify(
        t(`Tahmini maliyet ${limits.generationMaxEstimatedCostUsd} USD sınırını aşıyor.`, `Estimated cost exceeds the ${limits.generationMaxEstimatedCostUsd} USD limit.`),
        'error',
      );
      return;
    }

    const links = form.links.split('\n').map((item) => item.trim()).filter(Boolean);
    const payload = {
      title,
      platform: form.platform,
      contentType: form.contentType,
      requestedCount: Number(form.requestedCount),
      includeImage: form.includeImage,
      includeVideo: form.includeVideo,
      textModel: { provider: form.textProvider, model: form.textModel },
      imageModel: form.includeImage ? { provider: form.imageProvider, model: form.imageModel } : null,
      videoModel: form.includeVideo ? { provider: form.videoProvider, model: form.videoModel } : null,
      videoDurationSeconds: form.includeVideo ? Number(form.videoDurationSeconds) : null,
      generationStrategy: form.generationStrategy || null,
      links,
    };

    setBusy(true);
    try {
      const created = await api.createBatch(payload, files);
      notify('Üretim isteği kuyruğa alındı.');
      onCreated(created);
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-8">
      <section className={sectionClass(stepState(1, formatComplete))}>
        <SectionHeader number="1" title="Format" state={stepState(1, formatComplete)} />
        <div className="mt-4">
          <Field label="İçerik başlığı" hint="En fazla 240 karakter" required>
            <Input
              value={form.title}
              required
              maxLength={240}
              placeholder="Örn. Odak Haftası"
              onChange={(event) => setValue('title', event.target.value)}
            />
          </Field>
          <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Üretilen içeriklerin sonuna otomatik olarak 1, 2, 3… eklenir.
          </p>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Platform" required>
            <Select value={form.platform} required onChange={(event) => handlePlatform(event.target.value)}>
              {platforms.map((item) => (
                <option key={item.platform} value={item.platform}>{PLATFORM_LABELS[item.platform] || item.platform}</option>
              ))}
            </Select>
          </Field>
          <Field label="İçerik türü" required>
            <Select value={form.contentType} required onChange={(event) => handleContentType(event.target.value)}>
              {supportedTypes.map((item) => <option key={item} value={item}>{CONTENT_TYPE_LABELS[item] || item}</option>)}
            </Select>
          </Field>
          <Field label="İçerik adedi" hint={`${t('En fazla', 'Up to')} ${requestedCountLimit}`} required>
            <Input
              type="number"
              min="1"
              max={requestedCountLimit}
              required
              value={form.requestedCount}
              onChange={(event) => setValue('requestedCount', event.target.value)}
            />
          </Field>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {mediaOptions.map(({ name, label, state, description }) => {
            const otherName = name === 'includeImage' ? 'includeVideo' : 'includeImage';
            const locked = state !== 'optional' || (mediaPolicy.exclusive && form[otherName]);
            return (
              <label key={name} className={`group relative flex min-h-28 items-start gap-3 overflow-hidden rounded-xl border p-4 transition-all duration-150 focus-within:ring-2 focus-within:ring-blue-500/35 ${locked ? 'cursor-not-allowed' : 'cursor-pointer active:scale-[0.995]'} ${form[name] ? 'border-blue-400 bg-blue-50 shadow-sm ring-1 ring-blue-500/10 dark:border-blue-600 dark:bg-blue-950/35' : locked ? 'border-slate-200 bg-slate-100/70 opacity-60 dark:border-slate-800 dark:bg-slate-900/60' : 'border-slate-200 bg-slate-50/50 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-md dark:border-slate-700 dark:bg-slate-950/35 dark:hover:border-slate-600 dark:hover:bg-slate-900'}`}>
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border transition-colors ${form[name] ? 'border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-800 dark:bg-blue-900/70 dark:text-blue-300' : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'}`} aria-hidden="true">
                  {name === 'includeImage'
                    ? <svg className="h-4.5 w-4.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2.5" y="3" width="15" height="14" rx="2" /><circle cx="7" cy="7.5" r="1.5" /><path d="m4.5 15 4-4 2.6 2.4 1.8-1.7 2.6 3.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    : <svg className="h-4.5 w-4.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2.5" y="4" width="11.5" height="12" rx="2" /><path d="m14 8 3.5-2v8L14 12V8Z" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {label}
                    {state === 'required' && <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:bg-blue-950 dark:text-blue-300">Zorunlu</span>}
                    {state === 'forbidden' && <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-400">Kullanılamaz</span>}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</span>
                </span>
                <input
                  type="checkbox"
                  className="ml-auto mt-1 h-4 w-4 shrink-0 rounded border-slate-300 accent-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                  checked={form[name]}
                  disabled={locked}
                  onChange={(event) => setMediaValue(name, event.target.checked)}
                />
                {form[name] && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-500" aria-hidden="true" />}
              </label>
            );
          })}
        </div>
        {form.platform === 'INSTAGRAM' && (
          <p className="mt-3 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2.5 text-xs leading-5 text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
            {form.contentType === 'POST'
              ? t(VIDEO_GENERATION_COPY.instagramPostVideoHint.tr, VIDEO_GENERATION_COPY.instagramPostVideoHint.en)
              : 'Instagram Reels için video zorunludur; görsel isteğe bağlı kapak olarak kullanılabilir.'}
          </p>
        )}
        {mediaPolicy.exclusive && (
          <div className="relative mt-4 flex items-start gap-3 overflow-hidden rounded-r-xl border border-l-0 border-blue-200 bg-blue-50/50 px-4 py-3 text-xs leading-5 text-blue-900 dark:border-blue-900/80 dark:bg-blue-950/20 dark:text-blue-300">
            <span className="absolute inset-y-0 left-0 w-1 bg-blue-500" aria-hidden="true" />
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-blue-300 text-[11px] font-bold text-blue-700 dark:border-blue-700 dark:text-blue-300" aria-hidden="true">i</span>
            <p>Bir görsel veya bir video seçebilirsiniz; ikisi aynı anda kullanılamaz.</p>
          </div>
        )}
      </section>

      <section className={sectionClass(stepState(2, modelsComplete))}>
        <SectionHeader number="2" title="Yapay zeka modelleri" state={stepState(2, modelsComplete)} />
        {!models.length && (
          <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">
            Model kataloğu boş. Sağlayıcıyı seçip sunucunun kabul ettiği model kimliğini elle girebilirsiniz.
          </p>
        )}
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950/40 sm:p-5">
            <p className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-100">Metin ve hashtag</p>
            <ModelPicker capability="Metin" models={byCapability('TEXT')} provider={form.textProvider} model={form.textModel} required onChange={(provider, model) => setModel('text', provider, model)} />
          </div>
          {form.includeImage && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950/40 sm:p-5">
              <p className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-100">Görsel</p>
              <ModelPicker capability="Görsel" models={byCapability('IMAGE')} provider={form.imageProvider} model={form.imageModel} required onChange={(provider, model) => setModel('image', provider, model)} />
            </div>
          )}
          {form.includeVideo && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950/40 sm:p-5">
              <p className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-100">Video</p>
              <ModelPicker capability="Video" models={byCapability('VIDEO')} provider={form.videoProvider} model={form.videoModel} required onChange={(provider, model) => setModel('video', provider, model)} />
              <div className="mt-4">
                <Field label={t(VIDEO_GENERATION_COPY.durationLabel.tr, VIDEO_GENERATION_COPY.durationLabel.en)} hint={t(VIDEO_GENERATION_COPY.durationHint.tr, VIDEO_GENERATION_COPY.durationHint.en)} required>
                  <CustomSelect
                    value={form.videoDurationSeconds}
                    disabled={!form.videoModel || supportedVideoDurations.length === 0}
                    required
                    ariaLabel={t(VIDEO_GENERATION_COPY.durationLabel.tr, VIDEO_GENERATION_COPY.durationLabel.en)}
                    placeholder={t(VIDEO_GENERATION_COPY.durationPlaceholder.tr, VIDEO_GENERATION_COPY.durationPlaceholder.en)}
                    options={supportedVideoDurations.map((seconds) => ({ value: String(seconds), label: `${seconds} ${t(VIDEO_GENERATION_COPY.durationUnit.tr, VIDEO_GENERATION_COPY.durationUnit.en)}` }))}
                    onChange={(duration) => setValue('videoDurationSeconds', duration)}
                  />
                </Field>
              </div>
            </div>
          )}
          <div className={`rounded-xl border p-4 transition-colors sm:p-5 ${budgetEstimate ? 'border-amber-300 bg-amber-50/70 shadow-sm dark:border-amber-800 dark:bg-amber-950/25' : 'border-amber-200/80 bg-amber-50/35 dark:border-amber-900/70 dark:bg-amber-950/10'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-sm font-semibold text-amber-950 dark:text-amber-100"><span className="grid h-6 w-6 place-items-center rounded-md bg-amber-100 text-xs text-amber-700 dark:bg-amber-900/60 dark:text-amber-300" aria-hidden="true">$</span>{t('Tahmini üretim maliyeti', 'Estimated generation cost')}</p>
              {budgetLoading && <span className="text-xs font-medium text-amber-600 dark:text-amber-400">{t('Hesaplanıyor…', 'Calculating…')}</span>}
            </div>
            {!form.textProvider || !form.textModel ? (
              <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{t('Maliyet tahmini için metin sağlayıcısı ve modeli seçin.', 'Select a text provider and model to estimate cost.')}</p>
            ) : budgetError ? (
              <p className="mt-2 text-xs leading-5 text-rose-600 dark:text-rose-400">{budgetError.message}</p>
            ) : budgetEstimate ? (
              <div className="mt-4 space-y-4">
                <div className="flex items-end justify-between gap-4">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('Toplam tahmin', 'Estimated total')}</span>
                  <strong className="text-2xl tracking-tight text-slate-950 dark:text-white">{formatUsd(budgetEstimate.totalCostUsd, locale)}</strong>
                </div>
                {Number(budgetEstimate.totalCostUsd) > Number(limits?.generationMaxEstimatedCostUsd) && (
                  <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                    {t(`Tahmini maliyet ${limits.generationMaxEstimatedCostUsd} USD sınırını aşıyor.`, `Estimated cost exceeds the ${limits.generationMaxEstimatedCostUsd} USD limit.`)}
                  </p>
                )}
                <div className="grid gap-2 text-xs sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/60"><span className="text-slate-500 dark:text-slate-400">{t('Metin girdisi', 'Text input')}</span><strong className="mt-1 block text-slate-800 dark:text-slate-200">{formatUsd(budgetEstimate.textInputCostUsd, locale)}</strong></div>
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/60"><span className="text-slate-500 dark:text-slate-400">{t('Metin çıktısı', 'Text output')}</span><strong className="mt-1 block text-slate-800 dark:text-slate-200">{formatUsd(budgetEstimate.textOutputCostUsd, locale)}</strong></div>
                  {form.includeImage && <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/60"><span className="text-slate-500 dark:text-slate-400">{t('Görsel maliyeti', 'Image cost')}</span><strong className="mt-1 block text-slate-800 dark:text-slate-200">{formatUsd(budgetEstimate.imageCostUsd, locale)}</strong></div>}
                  {form.includeVideo && <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/60"><span className="text-slate-500 dark:text-slate-400">{t('Video maliyeti', 'Video cost')}</span><strong className="mt-1 block text-slate-800 dark:text-slate-200">{formatUsd(budgetEstimate.videoCostUsd, locale)}</strong></div>}
                </div>
                <div className="border-t border-slate-200 pt-3 text-xs leading-5 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <p>{t('Tahmini token kullanımı', 'Estimated token usage')}: {Number(budgetEstimate.estimatedInputTokens).toLocaleString(locale)} {t('girdi', 'input')} · {Number(budgetEstimate.estimatedOutputTokens).toLocaleString(locale)} {t('çıktı', 'output')}</p>
                  <p>{t('Güncel metin fiyatı', 'Current text pricing')}: {formatUsd(budgetEstimate.textInputCostUsdPerMillionTokens, locale)} / 1M {t('girdi', 'input')} · {formatUsd(budgetEstimate.textOutputCostUsdPerMillionTokens, locale)} / 1M {t('çıktı', 'output')}</p>
                  <p>{t('Fiyat kaynağı', 'Pricing source')}: {budgetEstimate.textPricingSource || '—'}</p>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{t('Geçerli bir içerik adedi girin.', 'Enter a valid content count.')}</p>
            )}
          </div>
        </div>
      </section>

      <section className={sectionClass(stepState(3, sourcesComplete))}>
        <SectionHeader number="3" title="Kaynaklar" state={stepState(3, sourcesComplete)} />
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950/40 sm:p-5">
          <Field label="Üretim stratejisi" hint={`${sourceCount} kaynak · ${requestedCount || 0} içerik`}>
            <CustomSelect
              value={form.generationStrategy}
              ariaLabel="Üretim stratejisi"
              placeholder="Otomatik"
              options={[
                { value: '', label: sourceCount > 0 ? `Otomatik (${GENERATION_STRATEGY_LABELS[automaticStrategy]})` : 'Otomatik' },
                { value: 'SOURCE_BASED', label: 'Kaynak bazlı' },
                { value: 'COMBINED', label: 'Birleşik' },
              ]}
              onChange={(nextStrategy) => setValue('generationStrategy', nextStrategy)}
            />
          </Field>
          <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {form.generationStrategy === 'SOURCE_BASED'
              ? 'Her içerik bir birincil kaynağa atanır; diğer kaynaklar destekleyici bağlam olarak kullanılır.'
              : form.generationStrategy === 'COMBINED'
                ? 'Tüm kaynaklar ortak havuz olarak kullanılır; içerikler farklı açılarla üretilir.'
                : 'Kaynak ve içerik sayıları eşitse kaynak bazlı, diğer durumlarda birleşik strateji seçilir.'}
          </p>
          {sourceReuseWarning && (
            <p className="mt-3 rounded-lg border border-blue-200 bg-blue-50/60 px-3 py-2.5 text-xs leading-5 text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
              Kaynak sayısı içerik sayısından az. Bazı kaynaklar sırayla birden fazla içerikte ana kaynak olarak kullanılacak.
            </p>
          )}
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <Field label="Kaynak linkleri" hint="Her satıra bir link">
            <Textarea
              value={form.links}
              onChange={(event) => setValue('links', event.target.value)}
              placeholder={'https://ornek.com/yazi\nhttps://ornek.com/urun'}
            />
          </Field>
          <Field label="Dokümanlar" hint="PDF, DOCX veya TXT">
            <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50/70 px-4 text-center transition-colors hover:border-blue-400 hover:bg-blue-50/50 dark:border-slate-700 dark:bg-slate-950/40 dark:hover:border-blue-600 dark:hover:bg-blue-950/20">
              <input
                className="sr-only"
                type="file"
                multiple
                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                onChange={(event) => {
                  addFiles(event.target.files);
                  event.target.value = '';
                }}
              />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{files.length ? 'Başka dosya ekle' : 'Dosya seçin'}</span>
              <span className="mt-1 text-xs text-slate-400 dark:text-slate-500">Bir veya birden fazla dosya seçebilirsiniz</span>
              {files.length > 0 && <span className="mt-3 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">{files.length} dosya seçildi</span>}
            </label>
            {files.length > 0 && (
              <ul className="mt-3 space-y-2">
                {files.map((file, index) => (
                  <li key={`${file.name}-${file.size}-${file.lastModified}`} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900">
                    <span className="min-w-0 truncate font-medium text-slate-600 dark:text-slate-300">{file.name}</span>
                    <button type="button" onClick={() => removeFile(index)} className="shrink-0 font-bold text-rose-600 transition hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300">Kaldır</button>
                  </li>
                ))}
              </ul>
            )}
          </Field>
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-lg text-xs leading-5 text-slate-500 dark:text-slate-400">İstek arka planda işlenecek; ilerlemeyi listeden izleyebilirsiniz.</p>
        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={busy || !platforms.length}>
          {busy ? 'Kuyruğa alınıyor…' : 'Üretimi başlat'}
        </Button>
      </div>
    </form>
  );
}

const ACTIVE_GENERATION_ATTEMPT_STATUSES = new Set([
  'STARTED',
  'SUBMITTED',
  'PROCESSING',
  'PROVIDER_SUCCEEDED',
  'DOWNLOAD_FAILED',
  'REGENERATION_APPROVED',
]);

const GENERATION_ATTEMPT_TONES = {
  STARTED: 'indigo',
  SUBMITTED: 'indigo',
  PROCESSING: 'indigo',
  PROVIDER_SUCCEEDED: 'sky',
  DOWNLOAD_FAILED: 'amber',
  DOWNLOADED: 'sky',
  SUCCEEDED: 'emerald',
  AWAITING_REGENERATION_CONSENT: 'amber',
  REGENERATION_APPROVED: 'indigo',
  FAILED: 'rose',
  UNKNOWN: 'slate',
};

function BatchDetail({ batch, loading, attempts, attemptsLoading, consentBusyId, retryBusy, onConsent, onRetry, onClose }) {
  const { t } = useI18n();
  if (loading || !batch) return <Spinner label="Üretim ayrıntıları yükleniyor" />;
  const meta = BATCH_STATUS_META[batch.status] || BATCH_STATUS_META.DEFAULT;
  const progress = batch.requestedCount ? (batch.completedCount / batch.requestedCount) * 100 : 0;
  const videoAttempts = attempts.filter((attempt) => attempt.capability === 'VIDEO');

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Üretim başlığı</p>
        <h2 className="mt-1.5 text-xl font-semibold text-slate-950 dark:text-slate-100">{batch.title || 'Başlıksız üretim'}</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/50"><p className="text-xs font-medium text-slate-500 dark:text-slate-400">Platform</p><p className="mt-1.5 font-semibold text-slate-900 dark:text-slate-100">{PLATFORM_LABELS[batch.platform] || batch.platform}</p></div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/50"><p className="text-xs font-medium text-slate-500 dark:text-slate-400">Format</p><p className="mt-1.5 font-semibold text-slate-900 dark:text-slate-100">{CONTENT_TYPE_LABELS[batch.contentType] || batch.contentType}</p></div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/50"><p className="text-xs font-medium text-slate-500 dark:text-slate-400">Durum</p><div className="mt-1.5"><StatusBadge label={meta.label} tone={meta.tone} /></div></div>
      </div>
      <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 dark:bg-slate-900/30">
        <Progress value={progress} label={`${batch.completedCount} / ${batch.requestedCount} içerik hazır`} />
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/50">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Üretim stratejisi</p>
        <p className="mt-1.5 font-semibold text-slate-900 dark:text-slate-100">
          {GENERATION_STRATEGY_LABELS[batch.generationStrategy] || batch.generationStrategy || 'Belirtilmedi'}
        </p>
        {batch.strategySelectionReason && <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{batch.strategySelectionReason}</p>}
        {batch.strategyWarning && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            {batch.strategyWarning}
          </p>
        )}
      </div>
      {batch.status === 'FAILED' && batch.lastError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          <p className="font-semibold">Son hata</p>
          <p className="mt-1 break-words leading-6">{batch.lastError}</p>
        </div>
      )}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Model seçimi</h3>
        <div className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {[
            ['Metin', batch.textProvider, batch.textModel],
            ['Görsel', batch.imageProvider, batch.imageModel],
            ['Video', batch.videoProvider, batch.videoModel, batch.videoDurationSeconds ? `${batch.videoDurationSeconds} ${t(VIDEO_GENERATION_COPY.durationUnit.tr, VIDEO_GENERATION_COPY.durationUnit.en)}` : null],
          ].filter(([, provider]) => provider).map(([label, provider, model, detail]) => (
            <div key={label} className="flex items-center justify-between gap-4 bg-white px-4 py-3 text-sm dark:bg-slate-900/30">
              <span className="font-medium text-slate-500 dark:text-slate-400">{label}</span>
              <span className="text-right font-semibold text-slate-800 dark:text-slate-200">{provider} · {model}{detail ? ` · ${detail}` : ''}</span>
            </div>
          ))}
        </div>
      </div>
      {(attemptsLoading || videoAttempts.length > 0) && (
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t(GENERATION_ATTEMPT_COPY.sectionTitle.tr, GENERATION_ATTEMPT_COPY.sectionTitle.en)}</h3>
          {attemptsLoading && !videoAttempts.length ? (
            <div className="mt-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800"><Spinner label={t(GENERATION_ATTEMPT_COPY.loading.tr, GENERATION_ATTEMPT_COPY.loading.en)} /></div>
          ) : (
            <div className="mt-3 space-y-3">
              {videoAttempts.map((attempt) => {
                const copy = GENERATION_ATTEMPT_COPY.statuses[attempt.status] || GENERATION_ATTEMPT_COPY.statuses.UNKNOWN;
                const awaitingConsent = attempt.status === 'AWAITING_REGENERATION_CONSENT';
                const downloadFailed = attempt.status === 'DOWNLOAD_FAILED';
                return (
                  <article key={attempt.id} className={`rounded-xl border p-4 ${awaitingConsent ? 'border-amber-300 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/25' : 'border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/40'}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{t(GENERATION_ATTEMPT_COPY.contentSlot.tr, GENERATION_ATTEMPT_COPY.contentSlot.en)} #{attempt.generationIndex}</p>
                        <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{attempt.provider} · {attempt.model}</p>
                      </div>
                      <StatusBadge label={t(copy.label.tr, copy.label.en)} tone={GENERATION_ATTEMPT_TONES[attempt.status] || 'slate'} />
                    </div>
                    <p className="mt-3 text-xs leading-5 text-slate-600 dark:text-slate-300">{t(copy.description.tr, copy.description.en)}</p>
                    {downloadFailed && (
                      <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50/60 px-3 py-2.5 text-xs leading-5 text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
                        <p className="font-semibold">{t(GENERATION_ATTEMPT_COPY.automaticRetry.tr, GENERATION_ATTEMPT_COPY.automaticRetry.en)}</p>
                        {attempt.nextDownloadRetryAt && <p className="mt-1">{t(GENERATION_ATTEMPT_COPY.nextRetry.tr, GENERATION_ATTEMPT_COPY.nextRetry.en)}: {formatDateTime(attempt.nextDownloadRetryAt)}</p>}
                        <p className="mt-1">{t(GENERATION_ATTEMPT_COPY.retryCount.tr, GENERATION_ATTEMPT_COPY.retryCount.en)}: {attempt.downloadRetryCount}</p>
                      </div>
                    )}
                    {awaitingConsent && (
                      <div className="mt-3 border-t border-amber-200 pt-3 dark:border-amber-900">
                        <p className="text-xs font-medium leading-5 text-amber-900 dark:text-amber-200">{t(GENERATION_ATTEMPT_COPY.consentWarning.tr, GENERATION_ATTEMPT_COPY.consentWarning.en)}</p>
                        <Button className="mt-3 w-full sm:w-auto" size="sm" disabled={Boolean(consentBusyId)} onClick={() => onConsent(attempt.id)}>
                          {consentBusyId === attempt.id ? t(GENERATION_ATTEMPT_COPY.approving.tr, GENERATION_ATTEMPT_COPY.approving.en) : t(GENERATION_ATTEMPT_COPY.approve.tr, GENERATION_ATTEMPT_COPY.approve.en)}
                        </Button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Kaynaklar</h3>
        <div className="mt-3 space-y-2">
          {!batch.sources?.length && <p className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">Kaynak eklenmemiş.</p>}
          {batch.sources?.map((source) => {
            const sourceMeta = SOURCE_STATUS_META[source.status] || SOURCE_STATUS_META.DEFAULT;
            return (
              <div key={source.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900/30 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{source.sourceType}</p>
                  <p className="mt-1 truncate text-sm font-medium text-slate-700 dark:text-slate-200">{source.sourceValue}</p>
                  {source.errorMessage && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{source.errorMessage}</p>}
                </div>
                <StatusBadge label={sourceMeta.label} tone={sourceMeta.tone} />
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 dark:border-slate-800 sm:flex-row sm:justify-end">
        {batch.status === 'FAILED' && (
          <Button className="w-full sm:w-auto" onClick={onRetry} disabled={retryBusy}>
            {retryBusy ? 'Başlatılıyor…' : 'Tekrar dene'}
          </Button>
        )}
        <Button variant="secondary" className="w-full sm:w-auto" onClick={onClose} disabled={retryBusy || Boolean(consentBusyId)}>Kapat</Button>
      </div>
    </div>
  );
}

export default function BatchesPage({ notify }) {
  const { t } = useI18n();
  const [createOpen, setCreateOpen] = useState(false);
  const [platforms, setPlatforms] = useState([]);
  const [models, setModels] = useState([]);
  const [generationLimits, setGenerationLimits] = useState(null);
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [metadataError, setMetadataError] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ status: '', platform: '', contentType: '', page: 0, size: 20 });
  const [selectedId, setSelectedId] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [consentBusyId, setConsentBusyId] = useState(null);
  const [retryConfirmOpen, setRetryConfirmOpen] = useState(false);
  const [retryBusy, setRetryBusy] = useState(false);
  const loadMetadata = useCallback(async () => {
    setMetadataLoading(true);
    try {
      const [platformItems, text, image, video, generalSettings] = await Promise.all([
        api.getPlatforms(),
        api.getAiModels({ capability: 'TEXT' }),
        api.getAiModels({ capability: 'IMAGE' }),
        api.getAiModels({ capability: 'VIDEO' }),
        api.getGeneralSettings(),
      ]);
      setPlatforms(platformItems);
      setModels([...text, ...image, ...video]);
      setGenerationLimits(generalSettings);
      setMetadataError(null);
    } catch (metadataLoadError) {
      setMetadataError(metadataLoadError);
    } finally {
      setMetadataLoading(false);
    }
  }, []);

  const loadBatches = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      setData(await api.listBatches(filters));
      setError(null);
    } catch (loadError) {
      setError(loadError);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadMetadata(); }, [loadMetadata]);
  useEffect(() => { loadBatches(); }, [loadBatches]);

  useEffect(() => {
    const hasActive = data?.items?.some((item) => item.status === 'IN_PROGRESS');
    if (!hasActive) return undefined;
    const interval = window.setInterval(() => loadBatches(true), 3000);
    return () => window.clearInterval(interval);
  }, [data?.items, loadBatches]);

  useEffect(() => {
    if (!selectedId) return undefined;
    let cancelled = false;
    const loadDetail = async () => {
      setDetailLoading(true);
      setAttemptsLoading(true);
      try {
        const [detailResult, attemptsResult] = await Promise.allSettled([
          api.getBatch(selectedId),
          api.listGenerationAttempts(selectedId),
        ]);
        if (!cancelled) {
          if (detailResult.status === 'fulfilled') setSelectedBatch(detailResult.value);
          else notify(detailResult.reason.message, 'error');
          if (attemptsResult.status === 'fulfilled') setAttempts(attemptsResult.value || []);
          else notify(attemptsResult.reason.message, 'error');
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
          setAttemptsLoading(false);
        }
      }
    };
    loadDetail();
    return () => { cancelled = true; };
  }, [selectedId, notify]);

  useEffect(() => {
    const hasActiveAttempt = attempts.some((attempt) => ACTIVE_GENERATION_ATTEMPT_STATUSES.has(attempt.status));
    const waitingForFirstAttempt = selectedBatch?.status === 'IN_PROGRESS' && attempts.length === 0;
    if (!selectedId || (!hasActiveAttempt && !waitingForFirstAttempt)) return undefined;
    const interval = window.setInterval(async () => {
      try {
        const [detail, attemptItems] = await Promise.all([
          api.getBatch(selectedId),
          api.listGenerationAttempts(selectedId),
        ]);
        setSelectedBatch(detail);
        setAttempts(attemptItems || []);
      } catch { }
    }, 5000);
    return () => window.clearInterval(interval);
  }, [attempts, selectedId, selectedBatch?.status]);

  const setFilter = (name, value) => setFilters((current) => ({ ...current, [name]: value, page: name === 'page' ? value : 0 }));
  const contentTypes = filters.platform
    ? platforms.find((item) => item.platform === filters.platform)?.contentTypes || []
    : [...new Set(platforms.flatMap((item) => item.contentTypes || []))];

  const handleCreated = (created) => {
    setCreateOpen(false);
    setSelectedId(created.id);
    loadBatches();
  };

  const closeDetail = () => {
    if (retryBusy || consentBusyId) return;
    setRetryConfirmOpen(false);
    setSelectedId(null);
    setSelectedBatch(null);
    setAttempts([]);
  };

  const handleConsent = async (attemptId) => {
    if (!selectedId || consentBusyId) return;
    setConsentBusyId(attemptId);
    try {
      const updatedBatch = await api.approveGenerationRegeneration(selectedId, attemptId);
      setSelectedBatch(updatedBatch);
      notify(t(GENERATION_ATTEMPT_COPY.approved.tr, GENERATION_ATTEMPT_COPY.approved.en));
      const [detailResult, attemptsResult] = await Promise.allSettled([
        api.getBatch(selectedId),
        api.listGenerationAttempts(selectedId),
      ]);
      if (detailResult.status === 'fulfilled') setSelectedBatch(detailResult.value);
      else notify(detailResult.reason.message, 'error');
      if (attemptsResult.status === 'fulfilled') setAttempts(attemptsResult.value || []);
      else notify(attemptsResult.reason.message, 'error');
      await loadBatches(true);
    } catch (consentError) {
      notify(consentError.message, 'error');
    } finally {
      setConsentBusyId(null);
    }
  };

  const handleRetry = async () => {
    if (!selectedBatch || retryBusy) return;

    const batchId = selectedBatch.id;
    setRetryBusy(true);
    try {
      const retried = await api.retryBatch(batchId);
      if (retried && typeof retried === 'object') {
        setSelectedBatch(retried);
      }
      setRetryConfirmOpen(false);
      notify('Üretim tekrar başlatıldı.');

      try {
        const [detail, attemptItems] = await Promise.all([
          api.getBatch(batchId),
          api.listGenerationAttempts(batchId),
        ]);
        setSelectedBatch(detail);
        setAttempts(attemptItems || []);
      } catch (refreshError) {
        notify(`Üretim başladı ancak ayrıntılar yenilenemedi: ${refreshError.message}`, 'error');
      }
      await loadBatches(true);
    } catch (retryError) {
      notify(retryError.message, 'error');
    } finally {
      setRetryBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Toplu üretim"
        title="İçerik üretim merkezi"
        description="Kaynakları, yayın biçimini ve yapay zekâ modellerini seçin; üretim sürecini tek ekrandan izleyin."
        action={<Button size="lg" className="w-full sm:w-auto" onClick={() => setCreateOpen(true)}>＋ Yeni üretim</Button>}
      />

      {metadataError && <div className="mb-5"><ErrorState error={metadataError} onRetry={loadMetadata} /></div>}

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-5 border-b border-slate-200 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-900/35 lg:flex-row lg:items-end lg:justify-between sm:p-6">
          <div><h2 className="text-base font-semibold text-slate-950 dark:text-slate-100">Üretim geçmişi</h2><p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Devam eden üretimler otomatik yenilenir.</p></div>
          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[34rem]">
            <Select value={filters.status} onChange={(event) => setFilter('status', event.target.value)} className="min-w-36">
              <option value="">Tüm durumlar</option>
              {Object.entries(BATCH_STATUS_META).filter(([key]) => key !== 'DEFAULT').map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
            </Select>
            <Select value={filters.platform} onChange={(event) => setFilters((current) => ({ ...current, platform: event.target.value, contentType: '', page: 0 }))} className="min-w-36">
              <option value="">Tüm platformlar</option>
              {platforms.map((item) => <option key={item.platform} value={item.platform}>{PLATFORM_LABELS[item.platform] || item.platform}</option>)}
            </Select>
            <Select value={filters.contentType} onChange={(event) => setFilter('contentType', event.target.value)} className="min-w-36">
              <option value="">Tüm formatlar</option>
              {contentTypes.map((item) => <option key={item} value={item}>{CONTENT_TYPE_LABELS[item] || item}</option>)}
            </Select>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {loading && <Spinner label="Üretimler yükleniyor" />}
          {!loading && error && <ErrorState error={error} onRetry={() => loadBatches()} />}
          {!loading && !error && !data?.items?.length && (
            <EmptyState title="Henüz üretim yok" description="İlk toplu içerik üretiminizi başlatın; ilerlemeyi buradan takip edin." action={<Button onClick={() => setCreateOpen(true)}>Yeni üretim</Button>} />
          )}
          {!loading && !error && data?.items?.length > 0 && (
            <div className="space-y-2.5">
              {data.items.map((batch) => {
                const meta = BATCH_STATUS_META[batch.status] || BATCH_STATUS_META.DEFAULT;
                const progress = batch.requestedCount ? (batch.completedCount / batch.requestedCount) * 100 : 0;
                return (
                  <button
                    key={batch.id}
                    className="group grid w-full gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-blue-300 hover:bg-slate-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:border-slate-800 dark:bg-slate-900/30 dark:hover:border-blue-800 dark:hover:bg-slate-800/50 sm:p-5 lg:grid-cols-[minmax(0,1.2fr)_auto_minmax(180px,.8fr)_auto] lg:items-center"
                    onClick={() => setSelectedId(batch.id)}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><StatusBadge label={meta.label} tone={meta.tone} /><span className="text-xs font-medium text-slate-400 dark:text-slate-500">{formatDateTime(batch.createdAt)}</span></div>
                      <p className="mt-2.5 truncate font-semibold text-slate-950 dark:text-slate-100">{batch.title || 'Başlıksız üretim'}</p>
                      <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{PLATFORM_LABELS[batch.platform] || batch.platform} · {CONTENT_TYPE_LABELS[batch.contentType] || batch.contentType} · {batch.textProvider} · {batch.textModel}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                      {batch.includeImage && <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800">Görsel</span>}
                      {batch.includeVideo && <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800">Video</span>}
                      {!batch.includeImage && !batch.includeVideo && <span className="py-1.5">Yalnızca metin</span>}
                    </div>
                    <Progress value={progress} label={`${batch.completedCount} / ${batch.requestedCount} hazır`} />
                    <span className="text-xs font-semibold text-blue-600 transition-colors group-hover:text-blue-700 dark:text-blue-400 dark:group-hover:text-blue-300 lg:text-right">Ayrıntıları görüntüle →</span>
                  </button>
                );
              })}
              <Pagination page={data.page} totalPages={data.totalPages} onChange={(page) => setFilter('page', page)} />
            </div>
          )}
        </div>
      </Card>

      <Modal open={createOpen} title="Yeni toplu üretim" description="Üretim ayarlarını ve ortak kaynakları belirleyin." onClose={() => setCreateOpen(false)} size="xl">
        {metadataLoading ? (
          <Spinner label="Platformlar ve modeller hazırlanıyor" />
        ) : !platforms.length ? (
          <ErrorState error={metadataError || new Error('Platform metadata listesi boş döndü.')} onRetry={loadMetadata} />
        ) : (
          <BatchForm platforms={platforms} models={models} limits={generationLimits} onCreated={handleCreated} notify={notify} />
        )}
      </Modal>

      <Modal
        open={Boolean(selectedId)}
        title={selectedBatch?.title || 'Üretim ayrıntıları'}
        description={selectedBatch
          ? `${PLATFORM_LABELS[selectedBatch.platform] || selectedBatch.platform} · ${CONTENT_TYPE_LABELS[selectedBatch.contentType] || selectedBatch.contentType}`
          : 'Üretim bilgileri'}
        onClose={closeDetail}
        size="lg"
      >
        <BatchDetail
          batch={selectedBatch}
          loading={detailLoading}
          attempts={attempts}
          attemptsLoading={attemptsLoading}
          consentBusyId={consentBusyId}
          retryBusy={retryBusy}
          onConsent={handleConsent}
          onRetry={() => setRetryConfirmOpen(true)}
          onClose={closeDetail}
        />
      </Modal>

      <ConfirmDialog
        open={retryConfirmOpen}
        title="Üretimi tekrar dene"
        description="Yalnızca eksik içerikler üretilecek; tamamlanan içerikler, alınmış yapay zekâ çıktıları ve hazırlanmış kaynaklar korunacak. Sağlayıcının yanıtı uygulamaya hiç ulaşmadıysa yeni istek yeniden ücretlendirilebilir. Devam edilsin mi?"
        confirmLabel="Tekrar dene"
        busy={retryBusy}
        onConfirm={handleRetry}
        onClose={() => { if (!retryBusy) setRetryConfirmOpen(false); }}
      />
    </>
  );
}
