import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import {
  CREDENTIAL_TYPE_LABELS,
  formatDateTime,
  toDateTimeLocal,
  toIsoFromLocal,
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
  Spinner,
  StatusBadge,
} from '../components/ui';

const providers = {
  AI_PROVIDER: [
    ['openai', 'OpenAI'],
    ['anthropic', 'Anthropic / Claude'],
    ['gemini', 'Google Gemini'],
    ['deepseek', 'DeepSeek'],
    ['qwen', 'Qwen'],
  ],
  SOCIAL_PLATFORM: [
    ['linkedin', 'LinkedIn'],
    ['instagram', 'Instagram'],
  ],
};

const providerLabels = {
  ...Object.values(providers).flat().reduce((labels, [key, label]) => ({ ...labels, [key]: label }), {}),
  twitter: 'X / Twitter',
};

const oauthProviders = [
  { key: 'twitter', route: 'x', title: 'X / Twitter', query: 'xConnection' },
  { key: 'linkedin', route: 'linkedin', title: 'LinkedIn', query: 'linkedinConnection' },
  { key: 'instagram', route: 'instagram', title: 'Instagram', query: 'instagramConnection' },
];

const oauthErrorMessages = {
  access_denied: 'Hesap bağlantısına izin verilmedi.',
  state_invalid: 'Bağlantı oturumu geçersiz veya süresi doldu. Tekrar deneyin.',
  token_exchange_failed: 'Platform erişim anahtarı alınamadı.',
  account_lookup_failed: 'Platform hesap bilgileri alınamadı.',
  permission_missing: 'Gerekli platform izinleri verilmemiş.',
  configuration_error: 'Platform uygulama ayarları eksik veya hatalı.',
  unknown_error: 'Hesap bağlantısı tamamlanamadı.',
};

function ProviderLogo({ provider, size = 'md' }) {
  const sizeClass = size === 'sm' ? 'h-10 w-10' : 'h-11 w-11';
  const iconClass = size === 'sm' ? 'h-6 w-6' : 'h-7 w-7';
  const common = `${sizeClass} grid shrink-0 place-items-center overflow-hidden rounded-xl border shadow-sm`;

  if (provider === 'instagram') {
    return (
      <span className={`${common} border-fuchsia-400/30 bg-gradient-to-br from-violet-600 via-fuchsia-500 to-amber-400 text-white`} aria-hidden="true">
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.7" r="1" fill="currentColor" stroke="none" />
        </svg>
      </span>
    );
  }

  if (provider === 'linkedin') {
    return (
      <span className={`${common} border-[#0a66c2]/30 bg-[#0a66c2] text-white`} aria-hidden="true">
        <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor">
          <circle cx="6.2" cy="6.1" r="2" />
          <path d="M4.4 9h3.7v10.6H4.4V9Zm5.8 0h3.5v1.5h.1c.5-.9 1.7-1.9 3.5-1.9 3.7 0 4.4 2.4 4.4 5.6v5.4H18v-4.8c0-1.2 0-2.7-1.7-2.7s-2 1.3-2 2.6v4.9h-3.7V9h-.4Z" />
        </svg>
      </span>
    );
  }

  if (provider === 'twitter') {
    return (
      <span className={`${common} border-slate-300 bg-slate-950 text-white dark:border-slate-700 dark:bg-white dark:text-slate-950`} aria-hidden="true">
        <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor">
          <path d="M4.3 3.8h4.9l3.8 5.1 4.5-5.1h2.1l-5.7 6.6 6.2 9.8h-4.9l-4.1-5.6-4.9 5.6H4.1l6-7L4.3 3.8Zm3.8 1.7 8 13h1.8l-8-13H8.1Z" />
        </svg>
      </span>
    );
  }

  if (provider === 'gemini') {
    return (
      <span className={`${common} border-blue-300/50 bg-gradient-to-br from-blue-50 to-violet-100 text-blue-600 dark:border-blue-800 dark:from-blue-950 dark:to-violet-950 dark:text-blue-300`} aria-hidden="true">
        <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.5C12.8 8.2 15.8 11.2 21.5 12 15.8 12.8 12.8 15.8 12 21.5 11.2 15.8 8.2 12.8 2.5 12 8.2 11.2 11.2 8.2 12 2.5Z" />
        </svg>
      </span>
    );
  }

  if (provider === 'openai') {
    return (
      <span className={`${common} border-slate-300 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white`} aria-hidden="true">
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
          <path d="M12 3.2a4.2 4.2 0 0 1 7.4 3.9 4.2 4.2 0 0 1 .4 7.7 4.2 4.2 0 0 1-6.9 4.4 4.2 4.2 0 0 1-7.3-3.9 4.2 4.2 0 0 1-.4-7.7A4.2 4.2 0 0 1 12 3.2Z" />
          <path d="m8.2 6.1 7.7 4.4v7.1M5.5 9.4l7.7 4.4 6.1-3.6M5.6 14.7l7.6-4.4V3.4" />
        </svg>
      </span>
    );
  }

  if (provider === 'anthropic') {
    return (
      <span className={`${common} border-stone-300 bg-[#d8c7a7] text-[#181714] dark:border-stone-600 dark:bg-[#b8a486]`} aria-hidden="true">
        <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor">
          <path d="M9.4 4h3.7l6.1 16h-3.7l-1.2-3.4H8.1L6.9 20H3.2L9.4 4Zm-.2 9.5h4l-2-5.8-2 5.8ZM17.4 4h3.4v16h-3.4V4Z" />
        </svg>
      </span>
    );
  }

  if (provider === 'deepseek') {
    return (
      <span className={`${common} border-blue-300 bg-blue-600 text-white dark:border-blue-700 dark:bg-blue-600`} aria-hidden="true">
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 13.3c2.2-4.6 6.2-7 10.7-6.1 2.7.5 4.7 2.3 6.3 4.6-1.8 4.3-5.2 7.1-9.5 7.1-3.3 0-5.9-1.8-7.5-5.6Z" />
          <path d="M13.9 7.2c1-1.7 2.5-2.7 4.5-2.8-.1 1.9-.9 3.4-2.5 4.5M7.2 14.2c1.6 1.4 4.1 1.7 6 .7" />
          <circle cx="15.7" cy="11.7" r=".9" fill="currentColor" stroke="none" />
        </svg>
      </span>
    );
  }

  if (provider === 'qwen') {
    return (
      <span className={`${common} border-violet-300 bg-gradient-to-br from-violet-600 to-indigo-700 text-white dark:border-violet-700`} aria-hidden="true">
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3.2 18.8 7v7.6L12 18.5l-6.8-3.9V7L12 3.2Z" />
          <path d="m8.5 9 3.5-2 3.5 2v4L12 15l-3.5-2V9Z" />
          <path d="m15.5 15.8 2.5 2.5" />
        </svg>
      </span>
    );
  }

  return <span className={`${common} border-slate-200 bg-slate-50 text-sm font-bold uppercase text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200`} aria-hidden="true">{provider.slice(0, 2)}</span>;
}

function oauthErrorMessage(errorCode) {
  return oauthErrorMessages[errorCode] || oauthErrorMessages.unknown_error;
}

function CredentialForm({ notify, onSaved }) {
  const [form, setForm] = useState({ credentialType: 'AI_PROVIDER', providerName: 'openai', accountIdentifier: '', accessToken: '', refreshToken: '', expiresAt: '' });
  const [busy, setBusy] = useState(false);
  const accountRequired = ['linkedin', 'instagram'].includes(form.providerName);
  const setValue = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  const changeType = (credentialType) => setForm((current) => ({ ...current, credentialType, providerName: providers[credentialType][0][0], accountIdentifier: '' }));

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const created = await api.createCredential({
        credentialType: form.credentialType,
        providerName: form.providerName,
        accountIdentifier: form.accountIdentifier.trim() || null,
        accessToken: form.accessToken,
        refreshToken: form.refreshToken.trim() || null,
        expiresAt: form.expiresAt ? toIsoFromLocal(form.expiresAt) : null,
      });
      notify('API anahtarı güvenli biçimde kaydedildi.');
      onSaved(created);
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Kayıt türü" required>
          <select className="control" value={form.credentialType} onChange={(event) => changeType(event.target.value)}>
            <option value="AI_PROVIDER">Yapay zeka sağlayıcısı</option>
          </select>
        </Field>
        <Field label="Sağlayıcı" required>
          <select className="control" value={form.providerName} onChange={(event) => setValue('providerName', event.target.value)}>
            {providers[form.credentialType].map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Hesap tanımlayıcısı" hint={accountRequired ? 'Bu sağlayıcı için zorunlu' : 'Opsiyonel'} required={accountRequired}>
        <Input value={form.accountIdentifier} required={accountRequired} onChange={(event) => setValue('accountIdentifier', event.target.value)} placeholder={form.providerName === 'instagram' ? 'Instagram user ID' : form.providerName === 'linkedin' ? 'LinkedIn owner URN' : 'Hesap veya tenant tanımı'} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="API anahtarı / erişim anahtarı" hint="Kaydettikten sonra gösterilmez" required>
          <Input type="password" autoComplete="new-password" required value={form.accessToken} onChange={(event) => setValue('accessToken', event.target.value)} />
        </Field>
        <Field label="Yenileme anahtarı" hint="Opsiyonel">
          <Input type="password" autoComplete="new-password" value={form.refreshToken} onChange={(event) => setValue('refreshToken', event.target.value)} />
        </Field>
      </div>
      <Field label="Geçerlilik sonu" hint="Opsiyonel"><LocalDateTimeInput value={form.expiresAt} onChange={(value) => setValue('expiresAt', value)} /></Field>
      <div className="flex justify-end border-t border-slate-100 pt-5 dark:border-slate-800"><Button type="submit" disabled={busy}>{busy ? 'Kaydediliyor…' : 'API anahtarı ekle'}</Button></div>
    </form>
  );
}

function RotateForm({ credential, notify, onSaved }) {
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [expiresAt, setExpiresAt] = useState(toDateTimeLocal(credential.expiresAt));
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const updated = await api.rotateCredentialTokens(credential.id, {
        accessToken,
        refreshToken: refreshToken.trim() || null,
        expiresAt: expiresAt ? toIsoFromLocal(expiresAt) : null,
      });
      notify('Erişim bilgileri güncellendi. Gizli değerler arayüzde saklanmadı.');
      onSaved(updated);
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field label="Yeni API anahtarı / erişim anahtarı" required><Input type="password" autoComplete="new-password" required value={accessToken} onChange={(event) => setAccessToken(event.target.value)} /></Field>
      <Field label="Yeni yenileme anahtarı" hint="Boş bırakılırsa kaldırılır"><Input type="password" autoComplete="new-password" value={refreshToken} onChange={(event) => setRefreshToken(event.target.value)} /></Field>
      <Field label="Yeni geçerlilik sonu" hint="Opsiyonel"><LocalDateTimeInput value={expiresAt} onChange={setExpiresAt} /></Field>
      <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">Mevcut gizli değerler sunucu yanıtında yer almadığı için burada görüntülenemez.</p>
      <div className="flex justify-end border-t border-slate-100 pt-5 dark:border-slate-800"><Button type="submit" disabled={busy}>{busy ? 'Güncelleniyor…' : 'Erişim bilgilerini güncelle'}</Button></div>
    </form>
  );
}

function AccountForm({ credential, notify, onSaved }) {
  const [value, setValue] = useState(credential.accountIdentifier || '');
  const [busy, setBusy] = useState(false);
  const required = ['linkedin', 'instagram'].includes(credential.providerName);
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const updated = await api.updateCredentialAccount(credential.id, value.trim() || null);
      notify('Hesap tanımlayıcısı güncellendi.');
      onSaved(updated);
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  return <form onSubmit={submit}><Field label="Hesap tanımlayıcısı" required={required}><Input required={required} value={value} onChange={(event) => setValue(event.target.value)} /></Field><div className="mt-6 flex justify-end border-t border-slate-100 pt-5 dark:border-slate-800"><Button type="submit" disabled={busy}>{busy ? 'Kaydediliyor…' : 'Kaydet'}</Button></div></form>;
}

export default function CredentialsPage({ notify }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [rotateTarget, setRotateTarget] = useState(null);
  const [accountTarget, setAccountTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [oauthBusy, setOauthBusy] = useState(null);
  const [aiValidationId, setAiValidationId] = useState(null);
  const [validationFeedback, setValidationFeedback] = useState({});
  const feedbackTimers = useRef(new Map());

  const showValidationFeedback = useCallback((providerKey, status) => {
    const currentTimer = feedbackTimers.current.get(providerKey);
    if (currentTimer) window.clearTimeout(currentTimer);
    setValidationFeedback((current) => ({ ...current, [providerKey]: status }));
    const timer = window.setTimeout(() => {
      setValidationFeedback((current) => {
        const next = { ...current };
        delete next[providerKey];
        return next;
      });
      feedbackTimers.current.delete(providerKey);
    }, 3000);
    feedbackTimers.current.set(providerKey, timer);
  }, []);

  useEffect(() => () => {
    feedbackTimers.current.forEach((timer) => window.clearTimeout(timer));
    feedbackTimers.current.clear();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api.listCredentials());
      setError(null);
    } catch (loadError) {
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const provider = oauthProviders.find((item) => searchParams.has(item.query));
    if (!provider) return;
    const connectionStatus = searchParams.get(provider.query);
    const errorCode = searchParams.get('errorCode');
    if (connectionStatus === 'success') {
      notify(`${provider.title} hesabı bağlandı ve doğrulandı.`);
      showValidationFeedback(provider.key, 'success');
    }
    if (connectionStatus === 'denied' || connectionStatus === 'error') {
      notify(`${provider.title}: ${oauthErrorMessage(errorCode)}`, 'error');
    }
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.hash}`);
  }, [notify, showValidationFeedback]);

  const replace = (updated) => setItems((current) => current.map((item) => item.id === updated.id ? updated : item));
  const grouped = useMemo(() => ({
    AI_PROVIDER: items.filter((item) => item.credentialType === 'AI_PROVIDER'),
    SOCIAL_PLATFORM: items.filter((item) => item.credentialType === 'SOCIAL_PLATFORM'),
  }), [items]);
  const unconnectedOauthProviders = oauthProviders.filter(
    (provider) => !grouped.SOCIAL_PLATFORM.some((credential) => credential.providerName === provider.key),
  );
  const connectSocial = (provider) => {
    window.location.assign(api.socialAuthorizationUrl(provider.route));
  };

  const validateSocial = async (provider) => {
    setOauthBusy(provider.key);
    try {
      await api.validateSocialConnection(provider.route);
      showValidationFeedback(provider.key, 'success');
      await load();
    } catch (validationError) {
      showValidationFeedback(provider.key, 'error');
      notify(`${provider.title}: ${oauthErrorMessage(validationError.payload?.errorCode)}`, 'error');
    } finally {
      setOauthBusy(null);
    }
  };

  const validateAi = async (credential) => {
    setAiValidationId(credential.id);
    try {
      const updated = await api.validateAiCredential(credential.id);
      replace(updated);
      const succeeded = updated.validationStatus === 'VALID';
      showValidationFeedback(credential.id, succeeded ? 'success' : 'error');
      notify(
        succeeded
          ? `${providerLabels[credential.providerName]} API anahtarı doğrulandı.`
          : `${providerLabels[credential.providerName]}: ${updated.validationError || 'API anahtarı doğrulanamadı.'}`,
        succeeded ? 'success' : 'error',
      );
    } catch (validationError) {
      showValidationFeedback(credential.id, 'error');
      notify(validationError.message, 'error');
    } finally {
      setAiValidationId(null);
    }
  };

  const toggle = async (credential) => {
    setActionId(credential.id);
    try {
      const updated = await api.setCredentialActive(credential.id, !credential.active);
      replace(updated);
      notify(updated.active ? 'Erişim kaydı etkinleştirildi.' : 'Erişim kaydı devre dışı bırakıldı.');
    } catch (toggleError) {
      notify(toggleError.message, 'error');
    } finally {
      setActionId(null);
    }
  };

  const remove = async () => {
    setDeleteBusy(true);
    try {
      await api.deleteCredential(deleteTarget.id);
      setItems((current) => current.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      notify('Erişim kaydı silindi.');
    } catch (deleteError) {
      notify(deleteError.message, 'error');
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <>
      <PageHeader eyebrow="API ve platform erişimi" title="Hesaplar ve API Anahtarları" description="Yapay zekâ servislerinin API anahtarlarını ve sosyal medya hesap yetkilerini tek yerden yönetin." action={<Button size="lg" onClick={() => setCreateOpen(true)}>＋ API anahtarı ekle</Button>} />

      {!loading && !error && unconnectedOauthProviders.length > 0 && (
        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {unconnectedOauthProviders.map((provider) => (
            <Card key={provider.key} className="flex min-h-52 flex-col p-5 transition hover:border-slate-300 hover:shadow-sm dark:hover:border-slate-700">
              <div className="flex items-start justify-between gap-3">
                <ProviderLogo provider={provider.key} size="sm" />
                <span className="rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:border-slate-700 dark:text-slate-400">OAuth 2.0</span>
              </div>
              <h2 className="mt-4 text-base font-bold text-slate-950 dark:text-white">{provider.title}</h2>
              <p className="mt-1.5 flex-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Platformun izin ekranına yönlendirilirsiniz. Erişim bilgileri tarayıcıda gösterilmez.
              </p>
              <div className="mt-5 flex">
                <Button className="w-full sm:w-auto" onClick={() => connectSocial(provider)}>Hesabı bağla</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {loading && <Card><Spinner label="API anahtarları ve hesaplar yükleniyor" /></Card>}
      {!loading && error && <ErrorState error={error} onRetry={load} />}
      {!loading && !error && !items.length && <Card className="p-4 sm:p-5"><EmptyState title="Henüz API anahtarı veya bağlı hesap yok" description="Yapay zekâ üretimi için bir API anahtarı ekleyebilir veya yayınlama için sosyal medya hesabınızı bağlayabilirsiniz." action={<Button onClick={() => setCreateOpen(true)}>İlk API anahtarını ekle</Button>} /></Card>}

      {!loading && !error && items.length > 0 && (
        <div className="grid items-start gap-6 xl:grid-cols-2">
          {Object.entries(grouped).map(([type, credentials]) => (
            <Card key={type} className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-50/50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/30"><div><p className="eyebrow">{type === 'AI_PROVIDER' ? 'Üretim' : 'Yayınlama'}</p><h2 className="mt-1 font-bold text-slate-950 dark:text-white">{CREDENTIAL_TYPE_LABELS[type]}</h2></div><span className="grid h-8 min-w-8 place-items-center rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">{credentials.length}</span></div>
              <div className="divide-y divide-slate-200/80 dark:divide-slate-800">
                {!credentials.length && <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">Bu grupta kayıt yok.</div>}
                {credentials.map((credential) => {
                  const oauthProvider = oauthProviders.find((provider) => provider.key === credential.providerName);
                  const oauthValidationBusy = oauthProvider && oauthBusy === oauthProvider.key;
                  const feedbackKey = oauthProvider?.key || credential.id;
                  const validationState = validationFeedback[feedbackKey];
                  const validationBusy = oauthValidationBusy || aiValidationId === credential.id;
                  const statusLabel = credential.expired
                    ? 'Süresi doldu'
                    : credential.validationStatus === 'INVALID'
                      ? 'Geçersiz'
                      : !credential.active
                        ? 'Pasif'
                        : credential.validationStatus === 'VALID'
                          ? 'Doğrulandı'
                          : 'Doğrulanmadı';
                  const statusTone = credential.expired || credential.validationStatus === 'INVALID'
                    ? 'rose'
                    : credential.validationStatus === 'VALID' && credential.active
                      ? 'emerald'
                      : 'slate';
                  return (
                    <article key={credential.id} className="p-5 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-900/30">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3"><ProviderLogo provider={credential.providerName} /><div className="min-w-0"><h3 className="truncate font-semibold text-slate-950 dark:text-white">{providerLabels[credential.providerName] || credential.providerName}</h3><p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{credential.accountIdentifier || 'Hesap tanımlayıcısı yok'}</p></div></div>
                        <StatusBadge label={statusLabel} tone={statusTone} />
                      </div>
                      <div className="mt-4 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 text-xs dark:border-slate-800 dark:bg-slate-800 sm:grid-cols-2">
                        <div className="bg-slate-50 px-3 py-2.5 dark:bg-slate-900/70"><p className="font-medium text-slate-500 dark:text-slate-400">Yenileme anahtarı</p><p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{credential.hasRefreshToken ? 'Kayıtlı' : 'Yok'}</p></div>
                        <div className="bg-slate-50 px-3 py-2.5 dark:bg-slate-900/70"><p className="font-medium text-slate-500 dark:text-slate-400">Geçerlilik</p><p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{credential.expiresAt ? formatDateTime(credential.expiresAt) : 'Süresiz'}</p></div>
                      </div>
                      {credential.validationError && <p className="mt-3 rounded-lg border border-rose-100 bg-rose-50 p-3 text-xs leading-5 text-rose-700 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300">{credential.validationError}</p>}
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800 sm:justify-end">
                        {credential.credentialType === 'AI_PROVIDER' && (
                          <Button
                            variant={validationState === 'success' ? 'soft' : validationState === 'error' ? 'danger' : 'secondary'}
                            size="sm"
                            disabled={validationBusy || validationState === 'success' || !credential.active}
                            onClick={() => validateAi(credential)}
                          >
                            {validationBusy ? 'Doğrulanıyor…' : validationState === 'success' ? '✓ Doğrulandı' : validationState === 'error' ? 'Doğrulanamadı' : 'Doğrula'}
                          </Button>
                        )}
                        {oauthProvider && (
                          <Button
                            variant={validationState === 'success' ? 'soft' : validationState === 'error' ? 'danger' : 'secondary'}
                            size="sm"
                            disabled={validationBusy || validationState === 'success'}
                            onClick={() => validateSocial(oauthProvider)}
                          >
                            {validationBusy ? 'Doğrulanıyor…' : validationState === 'success' ? '✓ Doğrulandı' : validationState === 'error' ? 'Doğrulanamadı' : 'Doğrula'}
                          </Button>
                        )}
                        {oauthProvider && <Button size="sm" onClick={() => connectSocial(oauthProvider)}>Yeniden bağla</Button>}
                        {credential.providerName !== 'twitter' && <Button variant="ghost" size="sm" onClick={() => setAccountTarget(credential)}>Hesap</Button>}
                        {credential.providerName !== 'twitter' && <Button variant="soft" size="sm" onClick={() => setRotateTarget(credential)}>Erişimi güncelle</Button>}
                        <Button variant="secondary" size="sm" disabled={actionId === credential.id} onClick={() => toggle(credential)}>{credential.active ? 'Pasifleştir' : 'Etkinleştir'}</Button>
                        <Button variant="danger" size="sm" onClick={() => setDeleteTarget(credential)}>Sil</Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={createOpen} title="Yeni API anahtarı" description="Gizli değerler kaydedildikten sonra tekrar gösterilmez." onClose={() => setCreateOpen(false)} size="lg"><CredentialForm notify={notify} onSaved={(created) => { setItems((current) => [...current, created]); setCreateOpen(false); }} /></Modal>
      <Modal open={Boolean(rotateTarget)} title="Erişim bilgilerini güncelle" description={rotateTarget ? providerLabels[rotateTarget.providerName] : ''} onClose={() => setRotateTarget(null)} size="md">{rotateTarget && <RotateForm credential={rotateTarget} notify={notify} onSaved={(updated) => { replace(updated); setRotateTarget(null); }} />}</Modal>
      <Modal open={Boolean(accountTarget)} title="Hesap tanımlayıcısı" description={accountTarget ? providerLabels[accountTarget.providerName] : ''} onClose={() => setAccountTarget(null)} size="md">{accountTarget && <AccountForm credential={accountTarget} notify={notify} onSaved={(updated) => { replace(updated); setAccountTarget(null); }} />}</Modal>
      <ConfirmDialog open={Boolean(deleteTarget)} title="Erişim kaydı silinsin mi?" description="Bu sağlayıcı için üretim veya yayınlama, yeni bir erişim kaydı eklenene kadar çalışmaz." busy={deleteBusy} onClose={() => setDeleteTarget(null)} onConfirm={remove} />
    </>
  );
}
