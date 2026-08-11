import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'social-plan-language';
const I18nContext = createContext(null);

export const VIDEO_GENERATION_COPY = {
  durationLabel: { tr: 'Desteklenen video süresi', en: 'Supported video duration' },
  durationHint: { tr: 'Seçilen modele göre', en: 'Based on the selected model' },
  durationPlaceholder: { tr: 'Video süresi seçin', en: 'Select video duration' },
  durationUnit: { tr: 'saniye', en: 'seconds' },
  invalidDuration: { tr: 'Seçilen modelin desteklediği bir video süresi seçin.', en: 'Select a video duration supported by the selected model.' },
  instagramPostVideoHint: { tr: 'Instagram gönderilerinde video kullanılamaz. Video üretmek için Reels formatını seçin.', en: 'Video is not available for Instagram posts. Select the Reels format to generate video.' },
};

export const GENERATION_ATTEMPT_COPY = {
  sectionTitle: { tr: 'Video üretim süreci', en: 'Video generation progress' },
  loading: { tr: 'Video üretim durumları yükleniyor', en: 'Loading video generation statuses' },
  contentSlot: { tr: 'İçerik', en: 'Content' },
  nextRetry: { tr: 'Sonraki indirme denemesi', en: 'Next download retry' },
  retryCount: { tr: 'İndirme denemesi', en: 'Download attempts' },
  automaticRetry: { tr: 'İndirme otomatik olarak yeniden denenecek.', en: 'Download will be retried automatically.' },
  consentWarning: { tr: 'Üretilen video artık provider üzerinde bulunmuyor. Yeniden üretim yeni bir ücret oluşturabilir.', en: 'The generated video is no longer available from the provider. Regeneration may create an additional charge.' },
  approve: { tr: 'Yeniden üretimi onayla', en: 'Approve regeneration' },
  approving: { tr: 'Onaylanıyor…', en: 'Approving…' },
  approved: { tr: 'Video yeniden üretimi onaylandı.', en: 'Video regeneration was approved.' },
  statuses: {
    STARTED: { label: { tr: 'Video üretimi başlatılıyor', en: 'Starting video generation' }, description: { tr: 'Video üretim isteği hazırlanıyor.', en: 'The video generation request is being prepared.' } },
    SUBMITTED: { label: { tr: 'Video isteği gönderildi', en: 'Video request submitted' }, description: { tr: 'Provider üzerinde video üretim görevi oluşturuldu.', en: 'The video generation task was created at the provider.' } },
    PROCESSING: { label: { tr: 'Video üretiliyor', en: 'Generating video' }, description: { tr: 'Video provider tarafından üretiliyor veya sonuç yeniden sorgulanıyor.', en: 'The provider is generating the video or the result is being checked again.' } },
    PROVIDER_SUCCEEDED: { label: { tr: 'Video üretildi', en: 'Video generated' }, description: { tr: 'Provider videoyu üretti; indirme işlemi bekleniyor.', en: 'The provider generated the video; download is pending.' } },
    DOWNLOAD_FAILED: { label: { tr: 'İndirme yeniden denenecek', en: 'Download retry scheduled' }, description: { tr: 'İndirme veya depolama tamamlanamadı. Backend otomatik olarak yeniden deneyecek.', en: 'Download or storage did not complete. The backend will retry automatically.' } },
    DOWNLOADED: { label: { tr: 'Video indiriliyor', en: 'Downloading video' }, description: { tr: 'Video depolamaya indirildi; kayıt tamamlanıyor.', en: 'The video was downloaded to storage; the record is being finalized.' } },
    SUCCEEDED: { label: { tr: 'Video tamamlandı', en: 'Video completed' }, description: { tr: 'Video başarıyla üretildi ve kaydedildi.', en: 'The video was generated and saved successfully.' } },
    AWAITING_REGENERATION_CONSENT: { label: { tr: 'Yeniden üretim onayı gerekiyor', en: 'Regeneration approval required' }, description: { tr: 'Provider artifact süresi dolduğu için kullanıcı onayı bekleniyor.', en: 'User approval is required because the provider artifact expired.' } },
    REGENERATION_APPROVED: { label: { tr: 'Yeniden üretim onaylandı', en: 'Regeneration approved' }, description: { tr: 'Yeni ücretli video üretimi onaylandı.', en: 'A new paid video generation was approved.' } },
    FAILED: { label: { tr: 'Video üretimi başarısız', en: 'Video generation failed' }, description: { tr: 'Video üretimi kalıcı olarak başarısız oldu.', en: 'Video generation failed permanently.' } },
    UNKNOWN: { label: { tr: 'Video sonucu belirsiz', en: 'Video result unknown' }, description: { tr: 'Provider sonucunun oluşup oluşmadığı doğrulanamadı.', en: 'It could not be confirmed whether the provider produced a result.' } },
  },
};

const EN = {
  'Üretim': 'Generation', 'İçerikler': 'Contents', 'İçerik': 'Content', 'Takvim': 'Calendar', 'Bağlantılar': 'Connections', 'Bağlantı': 'Connection', 'Entegrasyonlar': 'Integrations', 'Entegrasyon': 'Integrations', 'Ayarlar': 'Settings',
  'Sağlayıcı': 'Provider', 'Sağlayıcı seçin': 'Select provider', 'Model seçin': 'Select model', 'Model ID': 'Model ID', 'Metin modeli': 'Text model', 'Görsel modeli': 'Image model', 'Video modeli': 'Video model', 'Platform': 'Platform', 'Format': 'Format', 'Durum': 'Status',
  'Gönderi': 'Post', 'Görsel': 'Image', 'Video': 'Video', 'Metin': 'Text', 'Belge': 'Document', 'Tweet': 'Tweet', 'Reel': 'Reel',
  'Taslak': 'Draft', 'Planlandı': 'Scheduled', 'Doğrulanıyor': 'Verifying', 'İnceleme gerekli': 'Review required', 'Yayınlandı': 'Published', 'Başarısız': 'Failed', 'Bilinmiyor': 'Unknown', 'İşleniyor': 'Processing', 'Tamamlandı': 'Completed', 'Bekliyor': 'Pending',
  'Yapay zekâ sağlayıcısı': 'AI provider', 'Yapay zeka sağlayıcısı': 'AI provider', 'Sosyal medya platformu': 'Social media platform',
  '1 · Format': '1 · Format', '2 · Yapay zeka modelleri': '2 · AI models', '3 · Kaynaklar': '3 · Sources', 'İçerik türü': 'Content type', 'İçerik adedi': 'Content count', 'En az 1': 'At least 1',
  'İçerik başlığı': 'Content title', 'En fazla 240 karakter': 'Up to 240 characters', 'En fazla 255 karakter': 'Up to 255 characters', 'Örn. Odak Haftası': 'E.g. Focus Week', 'İçerik başlığı zorunludur.': 'Content title is required.',
  'Üretilen içeriklerin sonuna otomatik olarak 1, 2, 3… eklenir.': '1, 2, 3… are appended automatically to generated content titles.', 'Üretim başlığı': 'Generation title', 'Başlıksız üretim': 'Untitled generation', 'Başlıksız içerik': 'Untitled content', 'Başlık veya içerikte ara': 'Search titles or content', 'Ara': 'Search',
  'Görsel üret': 'Generate image', 'Her taslağa bir görsel eklenir.': 'Adds an image to every draft.', 'Video üret': 'Generate video', 'Her taslağa bir video eklenir.': 'Adds a video to every draft.',
  'Zorunlu': 'Required', 'Kullanılamaz': 'Unavailable', 'Instagram gönderisi için zorunlu.': 'Required for an Instagram post.', 'İsteğe bağlı Reels kapak görseli.': 'Optional Reels cover image.', 'Instagram Reels için zorunlu.': 'Required for Instagram Reels.', 'Instagram gönderisinde video desteklenmiyor.': 'Video is not supported in an Instagram post.',
  'Instagram gönderisi için bir görsel zorunludur; video desteklenmez.': 'An image is required for an Instagram post; video is not supported.', 'Instagram Reels için video zorunludur; görsel isteğe bağlı kapak olarak kullanılabilir.': 'Video is required for Instagram Reels; an image may be used as an optional cover.',
  'Instagram gönderisi için görsel üretimi zorunludur ve video üretimi desteklenmez.': 'Image generation is required for an Instagram post, and video generation is not supported.', 'Instagram Reels için video üretimi zorunludur; görsel isteğe bağlı kapak olarak eklenebilir.': 'Video generation is required for Instagram Reels; an image may be added as an optional cover.',
  'LinkedIn gönderisinde görsel ve video aynı anda seçilemez.': 'An image and a video cannot be selected together for a LinkedIn post.', 'X gönderisinde görsel ve video aynı anda seçilemez.': 'An image and a video cannot be selected together for an X post.', 'Bir görsel veya bir video seçebilirsiniz; ikisi aynı anda kullanılamaz.': 'You can select one image or one video; they cannot be used together.',
  'Metin ve hashtag': 'Text and hashtags', 'Üretim stratejisi': 'Generation strategy', 'Otomatik': 'Automatic', 'Kaynak bazlı': 'Source-based', 'Birleşik': 'Combined',
  'Her içerik bir birincil kaynağa atanır; diğer kaynaklar destekleyici bağlam olarak kullanılır.': 'Each content item is assigned a primary source; other sources are used as supporting context.',
  'Tüm kaynaklar ortak havuz olarak kullanılır; içerikler farklı açılarla üretilir.': 'All sources are used as a shared pool; content is generated from different angles.',
  'Kaynak ve içerik sayıları eşitse kaynak bazlı, diğer durumlarda birleşik strateji seçilir.': 'Source-based strategy is selected when source and content counts match; otherwise combined strategy is used.',
  'Kaynak sayısı içerik sayısından az. Bazı kaynaklar round-robin ile birden fazla içerikte birincil olarak kullanılacak.': 'There are fewer sources than content items. Some sources will be reused as primary sources in round-robin order.',
  'Kaynak linkleri': 'Source links', 'Her satıra bir link': 'One link per line', 'Dökümanlar': 'Documents', 'PDF, DOCX veya TXT': 'PDF, DOCX, or TXT', 'Dosya seçin': 'Choose files', 'Başka dosya ekle': 'Add more files', 'Bir veya birden fazla dosya seçebilirsiniz': 'You can select one or multiple files', 'Kaldır': 'Remove',
  'İstek arka planda işlenecek; ilerlemeyi listeden izleyebilirsiniz.': 'The request will be processed in the background; you can track progress in the list.', 'Kuyruğa alınıyor…': 'Queuing…', 'Üretimi başlat': 'Start generation',
  'Model seçimi': 'Model selection', 'Kaynaklar': 'Sources', 'Kaynak eklenmemiş.': 'No sources added.', 'Son hata': 'Last error', 'Belirtilmedi': 'Not specified', 'Tekrar dene': 'Try again', 'Kapat': 'Close', 'Başlatılıyor…': 'Starting…',
  'Toplu üretim': 'Batch generation', 'İçerik üretim merkezi': 'Content generation center', 'Kaynaklarınızı, platform formatını ve yapay zeka modellerini seçin; batch ilerlemesini tek ekrandan izleyin.': 'Choose your sources, platform format, and AI models; track batch progress on one screen.',
  '＋ Yeni üretim': '＋ New generation', 'Üretim geçmişi': 'Generation history', "Devam eden batch'ler otomatik yenilenir.": 'Active batches refresh automatically.', 'Tüm durumlar': 'All statuses', 'Tüm platformlar': 'All platforms', 'Tüm formatlar': 'All formats',
  'Üretimler yükleniyor': 'Loading generations', 'Henüz üretim yok': 'No generations yet', 'İlk toplu içerik üretiminizi başlatarak batch ilerlemesini burada izleyin.': 'Start your first batch generation to track its progress here.', 'Yeni üretim': 'New generation', 'Yalnızca metin': 'Text only', 'Detayı görüntüle →': 'View details →',
  'Yeni toplu üretim': 'New batch generation', 'Üretim ayarlarını ve ortak kaynakları belirleyin.': 'Set generation options and shared sources.', 'Platformlar ve modeller hazırlanıyor': 'Preparing platforms and models', 'Üretim detayı': 'Generation details', 'Batch bilgileri': 'Batch information', 'Üretimi tekrar dene': 'Retry generation',
  'Yayın planı': 'Publication plan', 'İçerik takvimi': 'Content calendar', 'Bugün': 'Today', 'Takvim yükleniyor': 'Loading calendar', 'Bu ay için yayın yok': 'No publications this month', 'Taslaklardan birini seçerek planlamaya başlayın.': 'Select a draft to start scheduling.', 'Planlanmamış': 'Unscheduled', 'Taslak kuyruğu': 'Draft queue', 'Bir taslağı seçerek yayın tarihi belirleyin.': 'Select a draft to set its publication date.', 'Taslak yok': 'No drafts', 'Üretim tamamlandığında taslaklar burada görünür.': 'Drafts appear here when generation is complete.',
  'Yayın tarihi ve saati': 'Publication date and time', 'Gelecekte bir zaman seçin': 'Choose a future time', 'Yerel saat diliminiz': 'Your local time zone', 'Kaydediliyor…': 'Saving…', 'Yeniden dene': 'Retry', 'Yeniden planla': 'Reschedule', 'Takvime ekle': 'Add to calendar', 'İptal ediliyor…': 'Canceling…', 'Yayın planını iptal et': 'Cancel publication schedule',
  'Önizleme bulunmuyor': 'No preview available', 'İçerik medyası': 'Content media', 'Planla': 'Schedule', 'Tarihi güncelle': 'Update date', 'Son yayınlama başarısız': 'Last publication failed', 'Hata ayrıntısı bulunmuyor.': 'No error details are available.',
  'Düzenle': 'Edit', 'İçerik metni': 'Content text', "Hashtag'ler": 'Hashtags', 'Boşluk, virgül veya satır ile ayırın': 'Separate with spaces, commas, or lines', 'Vazgeç': 'Cancel', 'Kaydet': 'Save', 'Medya': 'Media', 'Sil': 'Delete', 'Yükleniyor…': 'Uploading…', 'Değiştir': 'Replace', 'Yükle': 'Upload', 'Henüz planlanmadı': 'Not scheduled yet', 'Planı iptal et': 'Cancel schedule', 'Taslağı sil': 'Delete draft', 'Yayın zamanı': 'Publication time',
  'Taslak yönetimi': 'Draft management', 'İçerik kütüphanesi': 'Content library', 'Üretilen içerikleri düzenleyin, medyalarını yönetin ve yayın akışına alın.': 'Edit generated content, manage media, and move it into the publication flow.', 'Toplam kayıt': 'Total records', 'Batch UUID ile filtrele': 'Filter by batch UUID', 'Uygula': 'Apply', 'İçerikler yükleniyor': 'Loading contents', 'İçerik bulunamadı': 'No content found', 'Filtreleri temizleyin veya üretim ekranından yeni bir batch başlatın.': 'Clear the filters or start a new batch from the generation screen.', 'Üretime git': 'Go to generation', 'İçerik detayı': 'Content details', 'İçerik yükleniyor': 'Loading content', 'İçerik detayı yükleniyor': 'Loading content details',
  'Güvenli bağlantılar': 'Secure connections', 'Credential yönetimi': 'Credential management', 'Credential türü': 'Credential type', 'Hesap tanımlayıcısı': 'Account identifier', 'Opsiyonel': 'Optional', 'Bu sağlayıcı için zorunlu': 'Required for this provider', 'Access token / API key': 'Access token / API key', 'Kaydettikten sonra gösterilmez': 'Not shown after saving', 'Refresh token': 'Refresh token', 'Geçerlilik sonu': 'Expiration', 'Credential ekle': 'Add credential', 'Güncelleniyor…': 'Updating…', 'Tokenları yenile': 'Rotate tokens',
  'Token güvenliği:': 'Token security:', 'Hesabı bağla': 'Connect account', 'Credential kayıtları yükleniyor': 'Loading credentials', 'Credential kaydı yok': 'No credentials', "İlk credential'ı ekle": 'Add the first credential', 'Yayınlama': 'Publication', 'Bu grupta kayıt yok.': 'No records in this group.', 'Süresi doldu': 'Expired', 'Geçersiz': 'Invalid', 'Pasif': 'Inactive', 'Doğrulandı': 'Verified', 'Doğrulanmadı': 'Not verified', 'Hesap tanımlayıcısı yok': 'No account identifier', 'Kayıtlı': 'Saved', 'Yok': 'None', 'Geçerlilik': 'Validity', 'Süresiz': 'No expiration', 'Doğrulanamadı': 'Verification failed', 'Doğrula': 'Verify', 'Yeniden bağla': 'Reconnect', 'Hesap': 'Account', 'Token yenile': 'Rotate token', 'Pasifleştir': 'Deactivate', 'Etkinleştir': 'Activate', 'Yeni credential': 'New credential', 'Credential silinsin mi?': 'Delete credential?',
  'Yapay zeka sağlayıcıları ve sosyal platform hesapları için şifreli erişim bilgilerini yönetin.': 'Manage encrypted access information for AI providers and social platform accounts.',
  "Access ve refresh token değerleri backend response'larında dönmez. Bu ekran yalnız refresh token varlığını ve credential durumunu gösterir.": 'Access and refresh token values are not returned in backend responses. This screen only shows refresh token availability and credential status.',
  'Hesaba yönlendirilerek güvenli izin alınır; tokenlar tarayıcıya dönmez.': 'Secure authorization is obtained by redirecting to the account; tokens are never returned to the browser.',
  'Token değerleri kaydedildikten sonra tekrar gösterilmez.': 'Token values are not shown again after saving.',
  'Bu sağlayıcı için üretim veya yayınlama, yeni bir credential eklenene kadar çalışmaz.': 'Generation or publication for this provider will not work until a new credential is added.',
  'Hesap bağlantısına izin verilmedi.': 'Account connection was denied.', 'Bağlantı oturumu geçersiz veya süresi doldu. Tekrar deneyin.': 'The connection session is invalid or expired. Try again.', 'Platform erişim anahtarı alınamadı.': 'The platform access token could not be obtained.', 'Platform hesap bilgileri alınamadı.': 'Platform account details could not be retrieved.', 'Gerekli platform izinleri verilmemiş.': 'Required platform permissions were not granted.', 'Platform uygulama ayarları eksik veya hatalı.': 'Platform application settings are missing or invalid.', 'Hesap bağlantısı tamamlanamadı.': 'Account connection could not be completed.',
  'Genel ayarlar': 'General settings', 'Sistem': 'System', 'Ayarlar yükleniyor': 'Loading settings', 'Yayın güvenilirliği': 'Publication reliability', 'Platform doğrulaması': 'Platform verification', 'Doğrulama zaman aşımı': 'Verification timeout', 'GET kontrol aralığı': 'GET check interval', 'Job başına işlem limiti': 'Items per job', 'Ayarları kaydet': 'Save settings',
  'Katalog boş: model ID girin': 'Catalog empty: enter a model ID', 'Yapay zeka modelleri': 'AI models', 'Otomatik (Kaynak bazlı)': 'Automatic (Source-based)', 'Otomatik (Birleşik)': 'Automatic (Combined)',
  'Yalnızca eksik içerikler üretilecek; tamamlanan içerikler, alınmış AI çıktıları ve hazırlanmış kaynaklar korunacak. Provider yanıtı uygulamaya hiç ulaşmadıysa yeni çağrı tekrar ücret doğurabilir. Devam edilsin mi?': 'Only missing content will be generated; completed content, received AI outputs, and prepared sources will be preserved. If the provider response never reached the application, a new call may incur another charge. Continue?',
  'Taslakları yayın sırasına alın; planlanmış içerikleri taşıyın, iptal edin veya başarısız yayınları yeniden deneyin.': 'Queue drafts for publication; move or cancel scheduled content, or retry failed publications.',
  'Yayınlamayı yeniden dene': 'Retry publication', 'Yayını yeniden planla': 'Reschedule publication', 'Taslağı planla': 'Schedule draft',
  'Yayınlandı olarak işaretle': 'Mark as published', 'Başarısız olarak işaretle': 'Mark as failed', 'İşaretleniyor…': 'Updating…',
  'İçerik yayınlandı olarak işaretlendi.': 'Content was marked as published.', 'İçerik başarısız olarak işaretlendi.': 'Content was marked as failed.',
  'Yeni access token / API key': 'New access token / API key', 'Yeni refresh token': 'New refresh token', 'Boş bırakılırsa kaldırılır': 'Removed if left blank', 'Yeni geçerlilik sonu': 'New expiration',
  'Mevcut token backend tarafından response içinde dönmediği için burada görüntülenemez veya korunamaz.': 'The current token cannot be displayed or retained here because the backend does not return it in the response.',
  'Otomatik yayın doğrulamasının çalışma zamanı sınırlarını yönetin. Değişiklik için uygulamayı yeniden başlatmanız gerekmez.': 'Manage runtime limits for automatic publication verification. Changes do not require an application restart.',
  "İçerik platformun GET endpoint'inden doğrulanana kadar PUBLISHING kalır. Süre aşılırsa tekrar gönderilmez ve REVIEW_REQUIRED durumuna alınır.": "Content remains PUBLISHING until verified through the platform's GET endpoint. If it times out, it is not sent again and is moved to REVIEW_REQUIRED.",
  '1–1440 dakika': '1–1440 minutes', '5–300 saniye': '5–300 seconds', '1–100 içerik': '1–100 contents',
  'İşlem tamamlanamadı': 'Operation could not be completed', 'Beklenmeyen bir hata oluştu.': 'An unexpected error occurred.', 'Pencereyi kapat': 'Close dialog', 'Sayfa': 'Page', 'Önceki': 'Previous', 'Sonraki': 'Next',
  'Pzt': 'Mon', 'Sal': 'Tue', 'Çar': 'Wed', 'Per': 'Thu', 'Cum': 'Fri', 'Cmt': 'Sat', 'Paz': 'Sun',
  'Üretim isteği kuyruğa alındı.': 'Generation request was queued.', 'Üretim tekrar başlatıldı.': 'Generation restarted.',
  'Takvim güncellendi.': 'Calendar updated.', 'İçerik yeniden yayın kuyruğuna alındı.': 'Content was queued for publication again.', 'Yayın planı iptal edildi; içerik taslağa döndü.': 'Publication schedule was canceled; content returned to draft.',
  'Yayın zamanı kaydedildi.': 'Publication time saved.', 'Taslak güncellendi.': 'Draft updated.', 'Yayın planı iptal edildi.': 'Publication schedule canceled.', 'Taslak silindi.': 'Draft deleted.', 'Geçerli bir batch UUID girin.': 'Enter a valid batch UUID.',
  'Credential güvenli biçimde kaydedildi.': 'Credential saved securely.', 'Tokenlar yenilendi. Değerler arayüzde saklanmadı.': 'Tokens rotated. Values were not stored in the interface.', 'Hesap tanımlayıcısı güncellendi.': 'Account identifier updated.', 'Credential etkinleştirildi.': 'Credential activated.', 'Credential pasifleştirildi.': 'Credential deactivated.', 'Credential silindi.': 'Credential deleted.',
  '✓ Doğrulandı': '✓ Verified', 'Görsel eklenmemiş': 'No image added', 'Video eklenmemiş': 'No video added',
  'Geçerli bir tarih ve saat girin.': 'Enter a valid date and time.', 'Geçerli ve gelecekte bir tarih ve saat girin.': 'Enter a valid future date and time.', 'Yayın tarihi': 'Publication date', 'Yayın saati': 'Publication time',
  'Bu içerik mevcut durumundayken planlanamaz. Sayfayı yenileyip durumunu kontrol edin.': 'This content cannot be scheduled in its current status. Refresh and check its status.',
  'API ve platform erişimi': 'API and platform access', 'Hesaplar ve API Anahtarları': 'Accounts and API Keys', 'Yapay zekâ servislerinin API anahtarlarını ve sosyal medya hesap yetkilerini tek yerden yönetin.': 'Manage AI service API keys and social media account permissions in one place.',
  'Kayıt türü': 'Record type', 'API anahtarı / erişim anahtarı': 'API key / access token', 'API anahtarı ekle': 'Add API key', '＋ API anahtarı ekle': '＋ Add API key', 'Yeni API anahtarı / erişim anahtarı': 'New API key / access token', 'Yeni yenileme anahtarı': 'New refresh token',
  'API anahtarları ve hesaplar yükleniyor': 'Loading API keys and accounts', 'Henüz API anahtarı veya bağlı hesap yok': 'No API keys or connected accounts yet', 'Yapay zekâ üretimi için bir API anahtarı ekleyebilir veya yayınlama için sosyal medya hesabınızı bağlayabilirsiniz.': 'Add an API key for AI generation or connect a social media account for publishing.', 'İlk API anahtarını ekle': 'Add the first API key',
  'Yenileme anahtarı': 'Refresh token', 'Erişimi güncelle': 'Update access', 'Yeni API anahtarı': 'New API key', 'Gizli değerler kaydedildikten sonra tekrar gösterilmez.': 'Secret values are not shown again after saving.', 'Erişim bilgilerini güncelle': 'Update access details', 'Erişim kaydı silinsin mi?': 'Delete access record?', 'Bu sağlayıcı için üretim veya yayınlama, yeni bir erişim kaydı eklenene kadar çalışmaz.': 'Generation or publishing for this provider will not work until a new access record is added.',
  'API anahtarı güvenli biçimde kaydedildi.': 'API key saved securely.', 'Erişim kaydı etkinleştirildi.': 'Access record enabled.', 'Erişim kaydı devre dışı bırakıldı.': 'Access record disabled.', 'Erişim kaydı silindi.': 'Access record deleted.',
  'Dokümanlar': 'Documents', 'Model kataloğu boş. Sağlayıcıyı seçip sunucunun kabul ettiği model kimliğini elle girebilirsiniz.': 'The model catalog is empty. Select a provider and manually enter a model ID accepted by the server.', 'Kaynak sayısı içerik sayısından az. Bazı kaynaklar sırayla birden fazla içerikte ana kaynak olarak kullanılacak.': 'There are fewer sources than content items. Some sources will be reused as the primary source in sequence.',
  'Üretim ayrıntıları yükleniyor': 'Loading generation details', 'Kaynakları, yayın biçimini ve yapay zekâ modellerini seçin; üretim sürecini tek ekrandan izleyin.': 'Choose sources, publishing format, and AI models; track the generation process on one screen.', 'Devam eden üretimler otomatik yenilenir.': 'Active generations refresh automatically.', 'İlk toplu içerik üretiminizi başlatın; ilerlemeyi buradan takip edin.': 'Start your first batch generation and track its progress here.', 'Üretim ayrıntıları': 'Generation details', 'Üretim bilgileri': 'Generation information',
  'Yalnızca eksik içerikler üretilecek; tamamlanan içerikler, alınmış yapay zekâ çıktıları ve hazırlanmış kaynaklar korunacak. Sağlayıcının yanıtı uygulamaya hiç ulaşmadıysa yeni istek yeniden ücretlendirilebilir. Devam edilsin mi?': 'Only missing content will be generated; completed content, received AI outputs, and prepared sources will be preserved. If the provider response never reached the application, the new request may be charged again. Continue?',
  'Geçerli bir üretim kimliği girin.': 'Enter a valid generation ID.', 'Üretim kimliğiyle filtrele': 'Filter by generation ID', 'Filtreleri temizleyin veya üretim ekranından yeni bir toplu üretim başlatın.': 'Clear the filters or start a new batch generation from the generation screen.',
  'Genel ayarlar kaydedildi. Yeni değerler bir sonraki yayınlama işleminde kullanılacak.': 'General settings were saved. The new values will be used on the next publishing run.', 'İçerik platformda doğrulanana kadar “Doğrulanıyor” durumunda kalır. Süre aşılırsa yeniden gönderilmez ve “İnceleme gerekli” durumuna alınır.': 'Content remains “Verifying” until confirmed on the platform. If verification times out, it is not sent again and is moved to “Review required”.', 'Her çalışmada işlenecek içerik': 'Contents per run',
  'Genel ayarlar kaydedildi. Yeni sınırlar sonraki işlemlerde kullanılacak.': 'General settings were saved. The new limits will be used for subsequent operations.',
  'Erişim bilgileri güncellendi. Gizli değerler arayüzde saklanmadı.': 'Access details updated. Secret values were not stored in the interface.', 'Mevcut gizli değerler sunucu yanıtında yer almadığı için burada görüntülenemez.': 'Existing secret values cannot be displayed because they are not included in the server response.', 'Platformun izin ekranına yönlendirilirsiniz. Erişim bilgileri tarayıcıda gösterilmez.': 'You will be redirected to the platform authorization screen. Access details are not shown in the browser.',
  'Ayrıntıları görüntüle →': 'View details →', 'Ayrıntılar': 'Details', 'İçerik ayrıntıları': 'Content details', 'İçerik ayrıntıları yükleniyor': 'Loading content details',
  'İncele →': 'Review →',
  'Bir taslağı takvimde istediğiniz güne sürükleyin veya seçerek yayın tarihi belirleyin.': 'Drag a draft to the desired day on the calendar, or select it to set a publication date.', 'Geçmiş bir güne yayın planlanamaz.': 'A publication cannot be scheduled for a past date.',
  'Seçilen gün': 'Selected day', 'Seçilen gün değiştirilemez': 'The selected day cannot be changed',
  'Planlanabilecek taslak yok': 'No drafts available to schedule', 'Yeni bir içerik ürettiğinizde taslaklar burada seçilebilir.': 'Drafts can be selected here after you generate new content.', 'Yayınlanacak taslak': 'Draft to publish', 'Taslak seçin': 'Select a draft', 'Yeni yayın planla': 'Schedule a new publication',
  'Bu güne planlanmış yayın yok.': 'There are no publications scheduled for this day.', '＋ Yeni yayın planla': '＋ Schedule a new publication', 'Günün yayınları': 'Publications for the day',
};

const reverseEn = Object.fromEntries(Object.entries(EN).map(([tr, en]) => [en, tr]));

function translateText(value, language) {
  const trimmed = value.trim();
  const translated = language === 'en' ? EN[trimmed] : reverseEn[trimmed];
  if (translated) return value.replace(trimmed, translated);
  const patterns = language === 'en' ? [
    [/^(\d+) dosya seçildi$/, '$1 files selected'], [/^(\d+) kaynak · (\d+) içerik$/, '$1 sources · $2 contents'], [/^(\d+) \/ (\d+) hazır$/, '$1 / $2 ready'], [/^(\d+) \/ (\d+) içerik hazır$/, '$1 / $2 contents ready'], [/^\+(\d+) içerik$/, '+$1 contents'], [/^Üretim tamamlandı: (\d+) \/ (\d+) içerik hazır\.$/, 'Generation completed: $1 / $2 contents ready.'], [/^Üretim başarısız oldu: (\d+) \/ (\d+) içerik hazır\.$/, 'Generation failed: $1 / $2 contents ready.'], [/^Yayınlandı: (.+)$/, 'Published: $1'], [/^Oluşturulma: (.+)$/, 'Created: $1'], [/^Üretim kimliği: (.+)$/, 'Generation ID: $1'], [/^Üretim başladı ancak ayrıntılar yenilenemedi: (.+)$/, 'Generation started, but details could not be refreshed: $1'], [/^(.+) kaydedildi\.$/, '$1 saved.'], [/^(.+) silindi\.$/, '$1 deleted.'], [/^(.+) hesabı bağlandı ve doğrulandı\.$/, '$1 account connected and verified.'], [/^(.+) API anahtarı doğrulandı\.$/, '$1 API key verified.'],
  ] : [];
  for (const [pattern, replacement] of patterns) if (pattern.test(trimmed)) return value.replace(trimmed, trimmed.replace(pattern, replacement));
  return value;
}

function localizeDom(language) {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const translated = translateText(walker.currentNode.nodeValue, language);
    if (translated !== walker.currentNode.nodeValue) walker.currentNode.nodeValue = translated;
  }
  document.querySelectorAll('[placeholder],[aria-label],[alt],[title]').forEach((element) => {
    ['placeholder', 'aria-label', 'alt', 'title'].forEach((attribute) => {
      if (element.hasAttribute(attribute)) {
        const current = element.getAttribute(attribute);
        const translated = translateText(current, language);
        if (translated !== current) element.setAttribute(attribute, translated);
      }
    });
  });
}

export function getLanguage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'en' ? 'en' : 'tr';
}

export function getLocale() {
  return getLanguage() === 'en' ? 'en-US' : 'tr-TR';
}

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(getLanguage);
  const setLanguage = useCallback((nextLanguage) => {
    const next = nextLanguage === 'en' ? 'en' : 'tr';
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
    setLanguageState(next);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
    document.title = language === 'en' ? 'Content Planner' : 'İçerik Planlayıcı';
    document.querySelector('meta[name="description"]')?.setAttribute(
      'content',
      language === 'en'
        ? 'AI-powered social media content generation and planning dashboard'
        : 'Yapay zeka destekli sosyal medya içerik üretim ve planlama paneli',
    );
    queueMicrotask(() => localizeDom(language));
    const observer = new MutationObserver(() => localizeDom(language));
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [language]);

  const value = useMemo(() => ({
    language,
    locale: language === 'en' ? 'en-US' : 'tr-TR',
    setLanguage,
    t: (tr, en) => language === 'en' ? en : tr,
  }), [language, setLanguage]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
