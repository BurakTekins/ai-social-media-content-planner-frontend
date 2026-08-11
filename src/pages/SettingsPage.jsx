import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { Button, Card, ErrorState, Field, Input, PageHeader, Spinner } from '../components/ui';
import { useI18n } from '../i18n';

function toForm(settings) {
  return {
    confirmationTimeoutMinutes: String(settings.publicationConfirmationTimeoutSeconds / 60),
    confirmationIntervalSeconds: String(settings.publicationConfirmationIntervalSeconds),
    maxItemsPerRun: String(settings.publishingMaxItemsPerRun),
    generationMaxContentsPerBatch: String(settings.generationMaxContentsPerBatch),
    generationMaxImagesPerBatch: String(settings.generationMaxImagesPerBatch),
    generationMaxVideosPerBatch: String(settings.generationMaxVideosPerBatch),
    generationMaxEstimatedCostUsd: String(settings.generationMaxEstimatedCostUsd),
    generationEstimatedInputTokensPerItem: String(settings.generationEstimatedInputTokensPerItem),
    generationEstimatedOutputTokensPerItem: String(settings.generationEstimatedOutputTokensPerItem),
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
        generationMaxContentsPerBatch: Number(form.generationMaxContentsPerBatch),
        generationMaxImagesPerBatch: Number(form.generationMaxImagesPerBatch),
        generationMaxVideosPerBatch: Number(form.generationMaxVideosPerBatch),
        generationMaxEstimatedCostUsd: Number(form.generationMaxEstimatedCostUsd),
        generationEstimatedInputTokensPerItem: Number(form.generationEstimatedInputTokensPerItem),
        generationEstimatedOutputTokensPerItem: Number(form.generationEstimatedOutputTokensPerItem),
      });
      setForm(toForm(updated));
      notify(t('Genel ayarlar kaydedildi. Yeni sınırlar sonraki işlemlerde kullanılacak.', 'General settings were saved. The new limits will be used for subsequent operations.'));
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

      {loading && <Card className="max-w-4xl"><Spinner label={t('Ayarlar yükleniyor', 'Loading settings')} /></Card>}
      {!loading && error && <ErrorState error={error} onRetry={load} />}
      {!loading && !error && form && (
        <form onSubmit={save} className="max-w-4xl space-y-6">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-200/80 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-900/30 sm:p-6">
              <p className="eyebrow">{t('Yayın güvenilirliği', 'Publication reliability')}</p>
              <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-950 dark:text-white sm:text-xl">{t('Platform doğrulaması', 'Platform verification')}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                {t('İçerik platformda doğrulanana kadar “Doğrulanıyor” durumunda kalır. Süre aşılırsa yeniden gönderilmez ve “İnceleme gerekli” durumuna alınır.', 'Content remains “Verifying” until confirmed on the platform. If verification times out, it is not sent again and is moved to “Review required”.')}
              </p>
            </div>

            <div className="grid gap-4 p-5 sm:p-6 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
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
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
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
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
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
            </div>

          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-slate-200/80 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-900/30 sm:p-6">
              <p className="eyebrow">{t('Üretim bütçesi', 'Generation budget')}</p>
              <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-950 dark:text-white sm:text-xl">{t('Toplu üretim sınırları', 'Batch generation limits')}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                {t('İçerik ve medya adetleriyle tahmini maliyet ve token sınırlarını yönetin.', 'Manage content and media counts, estimated cost, and token limits.')}
              </p>
            </div>

            <div className="grid gap-4 p-5 sm:p-6 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
                <Field label={t('Maksimum içerik', 'Maximum contents')} hint="1–1000" required>
                  <Input type="number" min="1" max="1000" step="1" required value={form.generationMaxContentsPerBatch} onChange={(event) => setValue('generationMaxContentsPerBatch', event.target.value)} />
                </Field>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
                <Field label={t('Maksimum görsel', 'Maximum images')} hint="0–1000" required>
                  <Input type="number" min="0" max="1000" step="1" required value={form.generationMaxImagesPerBatch} onChange={(event) => setValue('generationMaxImagesPerBatch', event.target.value)} />
                </Field>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
                <Field label={t('Maksimum video', 'Maximum videos')} hint="0–1000" required>
                  <Input type="number" min="0" max="1000" step="1" required value={form.generationMaxVideosPerBatch} onChange={(event) => setValue('generationMaxVideosPerBatch', event.target.value)} />
                </Field>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
                <Field label={t('Maksimum tahmini maliyet', 'Maximum estimated cost')} hint="0.01–10000 USD" required>
                  <Input type="number" min="0.01" max="10000" step="0.01" required value={form.generationMaxEstimatedCostUsd} onChange={(event) => setValue('generationMaxEstimatedCostUsd', event.target.value)} />
                </Field>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
                <Field label={t('İçerik başına tahmini metin girdi tokenı', 'Estimated text input tokens per content')} hint={t('1–1.000.000', '1–1,000,000')} required>
                  <Input type="number" min="1" max="1000000" step="1" required value={form.generationEstimatedInputTokensPerItem} onChange={(event) => setValue('generationEstimatedInputTokensPerItem', event.target.value)} />
                </Field>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
                <Field label={t('İçerik başına tahmini metin çıktı tokenı', 'Estimated text output tokens per content')} hint={t('1–1.000.000', '1–1,000,000')} required>
                  <Input type="number" min="1" max="1000000" step="1" required value={form.generationEstimatedOutputTokensPerItem} onChange={(event) => setValue('generationEstimatedOutputTokensPerItem', event.target.value)} />
                </Field>
              </div>
            </div>
            <p className="border-t border-slate-200/80 px-5 py-4 text-xs leading-5 text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:px-6">
              {t('Token alanları yalnızca metin modelinin maliyet tahmininde kullanılır. Görsel ve video maliyetleri adet başına ayrı hesaplanır.', 'Token fields are used only to estimate text model cost. Image and video costs are calculated separately per item.')}
            </p>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" size="lg" disabled={saving}>
              {saving ? t('Kaydediliyor…', 'Saving…') : t('Ayarları kaydet', 'Save settings')}
            </Button>
          </div>
        </form>
      )}
    </>
  );
}
