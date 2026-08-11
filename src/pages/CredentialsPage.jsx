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
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="API anahtarı / erişim anahtarı" hint="Kaydettikten sonra gösterilmez" required>
          <Input type="password" autoComplete="new-password" required value={form.accessToken} onChange={(event) => setValue('accessToken', event.target.value)} />
        </Field>
        <Field label="Yenileme anahtarı" hint="Opsiyonel">
          <Input type="password" autoComplete="new-password" value={form.refreshToken} onChange={(event) => setValue('refreshToken', event.target.value)} />
        </Field>
      </div>
      <Field label="Geçerlilik sonu" hint="Opsiyonel"><LocalDateTimeInput value={form.expiresAt} onChange={(value) => setValue('expiresAt', value)} /></Field>
      <div className="flex justify-end"><Button type="submit" disabled={busy}>{busy ? 'Kaydediliyor…' : 'API anahtarı ekle'}</Button></div>
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
    <form onSubmit={submit} className="space-y-4">
      <Field label="Yeni API anahtarı / erişim anahtarı" required><Input type="password" autoComplete="new-password" required value={accessToken} onChange={(event) => setAccessToken(event.target.value)} /></Field>
      <Field label="Yeni yenileme anahtarı" hint="Boş bırakılırsa kaldırılır"><Input type="password" autoComplete="new-password" value={refreshToken} onChange={(event) => setRefreshToken(event.target.value)} /></Field>
      <Field label="Yeni geçerlilik sonu" hint="Opsiyonel"><LocalDateTimeInput value={expiresAt} onChange={setExpiresAt} /></Field>
      <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">Mevcut gizli değerler sunucu yanıtında yer almadığı için burada görüntülenemez.</p>
      <div className="flex justify-end"><Button type="submit" disabled={busy}>{busy ? 'Güncelleniyor…' : 'Erişim bilgilerini güncelle'}</Button></div>
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
  return <form onSubmit={submit}><Field label="Hesap tanımlayıcısı" required={required}><Input required={required} value={value} onChange={(event) => setValue(event.target.value)} /></Field><div className="mt-6 flex justify-end"><Button type="submit" disabled={busy}>{busy ? 'Kaydediliyor…' : 'Kaydet'}</Button></div></form>;
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

      <div className="mb-5 rounded-2xl border border-amber-100 bg-amber-50/70 p-4 text-sm leading-6 text-amber-800">
        <strong>Güvenlik:</strong> API anahtarları ve erişim belirteçleri kaydedildikten sonra arayüzde gösterilmez. Burada yalnızca bağlantı ve doğrulama durumunu görürsünüz.
      </div>

      {!loading && !error && unconnectedOauthProviders.length > 0 && (
        <div className="mb-5 grid gap-4 xl:grid-cols-3">
          {unconnectedOauthProviders.map((provider) => (
            <Card key={provider.key} className="p-5">
              <p className="eyebrow">OAuth 2.0</p>
              <h2 className="mt-1 text-lg font-extrabold text-slate-900">{provider.title}</h2>
              <p className="mt-2 min-h-10 text-sm text-slate-500">
                Platformun izin ekranına yönlendirilirsiniz. Erişim bilgileri tarayıcıda gösterilmez.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={() => connectSocial(provider)}>Hesabı bağla</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {loading && <Card><Spinner label="API anahtarları ve hesaplar yükleniyor" /></Card>}
      {!loading && error && <ErrorState error={error} onRetry={load} />}
      {!loading && !error && !items.length && <Card className="p-5"><EmptyState title="Henüz API anahtarı veya bağlı hesap yok" description="Yapay zekâ üretimi için bir API anahtarı ekleyebilir veya yayınlama için sosyal medya hesabınızı bağlayabilirsiniz." action={<Button onClick={() => setCreateOpen(true)}>İlk API anahtarını ekle</Button>} /></Card>}

      {!loading && !error && items.length > 0 && (
        <div className="grid gap-5 xl:grid-cols-2">
          {Object.entries(grouped).map(([type, credentials]) => (
            <Card key={type} className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><p className="eyebrow">{type === 'AI_PROVIDER' ? 'Üretim' : 'Yayınlama'}</p><h2 className="mt-1 font-bold text-slate-900">{CREDENTIAL_TYPE_LABELS[type]}</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-600">{credentials.length}</span></div>
              <div className="divide-y divide-slate-100">
                {!credentials.length && <div className="p-5 text-sm text-slate-400">Bu grupta kayıt yok.</div>}
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
                    <article key={credential.id} className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-100 text-base font-extrabold uppercase text-slate-600">{credential.providerName.slice(0, 2)}</span><div className="min-w-0"><h3 className="truncate font-bold text-slate-900">{providerLabels[credential.providerName] || credential.providerName}</h3><p className="mt-1 truncate text-xs text-slate-400">{credential.accountIdentifier || 'Hesap tanımlayıcısı yok'}</p></div></div>
                        <StatusBadge label={statusLabel} tone={statusTone} />
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs">
                        <div><p className="font-semibold text-slate-400">Yenileme anahtarı</p><p className="mt-1 font-bold text-slate-700">{credential.hasRefreshToken ? 'Kayıtlı' : 'Yok'}</p></div>
                        <div><p className="font-semibold text-slate-400">Geçerlilik</p><p className="mt-1 font-bold text-slate-700">{credential.expiresAt ? formatDateTime(credential.expiresAt) : 'Süresiz'}</p></div>
                      </div>
                      {credential.validationError && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-xs leading-5 text-rose-700">{credential.validationError}</p>}
                      <div className="mt-4 flex flex-wrap justify-end gap-2">
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
