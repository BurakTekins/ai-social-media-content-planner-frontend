import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { Button, Card, ErrorState, Field, Input, PageHeader, Spinner } from '../components/ui';
import { useI18n } from '../i18n';

function toForm(settings) {
  return {
    confirmationTimeoutMinutes: String(settings.publicationConfirmationTimeoutSeconds / 60),
    confirmationIntervalSeconds: String(settings.publicationConfirmationIntervalSeconds),
    maxItemsPerRun: String(settings.publishingMaxItemsPerRun),
  };
}

export default function SettingsPage({ notify }) {
  const { t } = useI18n();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setForm(toForm(await api.getGeneralSettings()));
      setError(null);
    } catch (loadError) {
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setValue = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const updated = await api.updateGeneralSettings({
        publicationConfirmationTimeoutSeconds: Number(form.confirmationTimeoutMinutes) * 60,
        publicationConfirmationIntervalSeconds: Number(form.confirmationIntervalSeconds),
        publishingMaxItemsPerRun: Number(form.maxItemsPerRun),
      });
      setForm(toForm(updated));
      notify(t('Genel ayarlar kaydedildi. Yeni değerler bir sonraki yayınlama işleminde kullanılacak.', 'General settings were saved. The new values will be used on the next publishing run.'));
    } catch (saveError) {
      notify(saveError.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={t('Sistem', 'System')}
        title={t('Genel ayarlar', 'General settings')}
        description={t('Otomatik yayın doğrulamasının çalışma zamanı sınırlarını yönetin. Değişiklik için uygulamayı yeniden başlatmanız gerekmez.', 'Manage runtime limits for automatic publication verification. Changes do not require an application restart.')}
      />

      {loading && <Card><Spinner label={t('Ayarlar yükleniyor', 'Loading settings')} /></Card>}
      {!loading && error && <ErrorState error={error} onRetry={load} />}
      {!loading && !error && form && (
        <form onSubmit={save} className="max-w-3xl space-y-5">
          <Card className="p-6 sm:p-7">
            <div className="mb-6">
              <p className="eyebrow">{t('Yayın güvenilirliği', 'Publication reliability')}</p>
              <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">{t('Platform doğrulaması', 'Platform verification')}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {t('İçerik platformda doğrulanana kadar “Doğrulanıyor” durumunda kalır. Süre aşılırsa yeniden gönderilmez ve “İnceleme gerekli” durumuna alınır.', 'Content remains “Verifying” until confirmed on the platform. If verification times out, it is not sent again and is moved to “Review required”.')}
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t('Doğrulama zaman aşımı', 'Verification timeout')} hint={t('1–1440 dakika', '1–1440 minutes')} required>
                <Input
                  type="number"
                  min="1"
                  max="1440"
                  step="1"
                  required
                  value={form.confirmationTimeoutMinutes}
                  onChange={(event) => setValue('confirmationTimeoutMinutes', event.target.value)}
                />
              </Field>
              <Field label={t('GET kontrol aralığı', 'GET check interval')} hint={t('5–300 saniye', '5–300 seconds')} required>
                <Input
                  type="number"
                  min="5"
                  max="300"
                  step="1"
                  required
                  value={form.confirmationIntervalSeconds}
                  onChange={(event) => setValue('confirmationIntervalSeconds', event.target.value)}
                />
              </Field>
              <Field label={t('Her çalışmada işlenecek içerik', 'Contents per run')} hint={t('1–100 içerik', '1–100 contents')} required>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  required
                  value={form.maxItemsPerRun}
                  onChange={(event) => setValue('maxItemsPerRun', event.target.value)}
                />
              </Field>
            </div>

            <div className="mt-7 flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? t('Kaydediliyor…', 'Saving…') : t('Ayarları kaydet', 'Save settings')}
              </Button>
            </div>
          </Card>
        </form>
      )}
    </>
  );
}
