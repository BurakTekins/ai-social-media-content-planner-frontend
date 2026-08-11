const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || '/api';

export const API_BASE_URL =
  configuredBaseUrl === '/' ? '' : configuredBaseUrl.replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message, { status = 0, payload = null, method = null, url = null, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
    this.method = method;
    this.url = url;
  }
}

function appendQueryValue(searchParams, key, value) {
  if (value === undefined || value === null || value === '') {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => appendQueryValue(searchParams, key, item));
    return;
  }

  searchParams.append(key, value instanceof Date ? value.toISOString() : String(value));
}

function buildUrl(path, query) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const searchParams = new URLSearchParams();

  Object.entries(query || {}).forEach(([key, value]) => {
    appendQueryValue(searchParams, key, value);
  });

  const queryString = searchParams.toString();
  return `${API_BASE_URL}${normalizedPath}${queryString ? `?${queryString}` : ''}`;
}

function validationMessages(payload) {
  const errors = payload?.errors ?? payload?.violations;

  if (Array.isArray(errors)) {
    return errors
      .map((error) => {
        if (typeof error === 'string') {
          return error;
        }

        const message = error?.defaultMessage ?? error?.message ?? error?.reason;
        const field = error?.field ?? error?.propertyPath;
        return message ? (field ? `${field}: ${message}` : message) : null;
      })
      .filter(Boolean);
  }

  if (errors && typeof errors === 'object') {
    return Object.entries(errors).flatMap(([field, messages]) => {
      const values = Array.isArray(messages) ? messages : [messages];
      return values.filter(Boolean).map((message) => `${field}: ${message}`);
    });
  }

  return [];
}

const ERROR_MESSAGES = {
  INVALID_CONTENT_STATE_TRANSITION: ['Bu işlem içeriğin mevcut durumunda yapılamaz. İçerik durumunu yenileyip tekrar kontrol edin.', 'This action is not available in the content’s current status. Refresh and check the content status.'],
  access_denied: ['Hesap bağlantısına izin verilmedi.', 'Account connection was denied.'],
  state_invalid: ['Bağlantı oturumu geçersiz veya süresi doldu.', 'The connection session is invalid or expired.'],
  token_exchange_failed: ['Platform erişim anahtarı alınamadı.', 'The platform access token could not be obtained.'],
  account_lookup_failed: ['Platform hesap bilgileri alınamadı.', 'Platform account details could not be retrieved.'],
  permission_missing: ['Gerekli platform izinleri verilmemiş.', 'Required platform permissions were not granted.'],
  configuration_error: ['Platform uygulama ayarları eksik veya hatalı.', 'Platform application settings are missing or invalid.'],
};

function errorMessage(payload, status) {
  const language = getLanguage();
  const pick = ([tr, en]) => language === 'en' ? en : tr;
  if (payload && typeof payload === 'object') {
    const rawError = typeof payload.error === 'string' && /^[A-Z0-9_.-]+$/i.test(payload.error) ? payload.error : null;
    const code = payload.errorCode ?? payload.code ?? rawError;
    if (code && ERROR_MESSAGES[code]) return `${pick(ERROR_MESSAGES[code])} (${code})`;
    return language === 'en'
      ? `The request could not be completed${code ? ` (code: ${code})` : ''} (HTTP ${status}).`
      : `İstek tamamlanamadı${code ? ` (kod: ${code})` : ''} (HTTP ${status}).`;
  }
  return language === 'en' ? `The request failed (HTTP ${status}).` : `İstek başarısız oldu (HTTP ${status}).`;
}

async function readErrorPayload(response) {
  const text = await response.text();
  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    const contentType = response.headers.get('content-type') || '';
    return contentType.includes('text/html') ? null : text;
  }
}

async function readSuccessPayload(response, responseType) {
  if (response.status === 204 || response.status === 205) {
    return null;
  }

  if (responseType === 'blob') {
    return response.blob();
  }

  if (responseType === 'blob-url') {
    return URL.createObjectURL(await response.blob());
  }

  const text = await response.text();
  if (!text.trim()) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json') || contentType.includes('+json')) {
    return JSON.parse(text);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request(path, { query, responseType, ...options } = {}) {
  const url = buildUrl(path, query);
  const method = options.method || 'GET';
  const headers = new Headers(options.headers);

  if (!headers.has('Accept')) {
    headers.set('Accept', responseType ? '*/*' : 'application/json');
  }

  let response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (cause) {
    if (cause?.name === 'AbortError') {
      throw cause;
    }

    throw new ApiError(getLanguage() === 'en' ? 'The server could not be reached. Check the backend connection.' : 'Sunucuya ulaşılamadı. Backend bağlantısını kontrol edin.', {
      method,
      url,
      cause,
    });
  }

  if (!response.ok) {
    const payload = await readErrorPayload(response);
    throw new ApiError(errorMessage(payload, response.status), {
      status: response.status,
      payload,
      method,
      url,
    });
  }

  return readSuccessPayload(response, responseType);
}

function jsonRequest(path, { body, headers, ...options } = {}) {
  return request(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function segment(value) {
  return encodeURIComponent(String(value));
}

export const api = {
  getGeneralSettings() {
    return request('/settings/general');
  },

  updateGeneralSettings(payload) {
    return jsonRequest('/settings/general', { method: 'PUT', body: payload });
  },

  getPlatforms() {
    return request('/platforms');
  },

  getAiModels(filters = {}) {
    return request('/ai-models', { query: filters });
  },

  listBatches(filters = {}) {
    return request('/generation-batches', { query: filters });
  },

  getBatch(id) {
    return request(`/generation-batches/${segment(id)}`);
  },

  createBatch(payload, files = []) {
    const formData = new FormData();
    formData.append(
      'request',
      new Blob([JSON.stringify(payload)], { type: 'application/json' }),
    );

    Array.from(files || []).filter(Boolean).forEach((file) => {
      formData.append('files', file);
    });

    return request('/generation-batches', {
      method: 'POST',
      body: formData,
    });
  },

  retryBatch(id) {
    return request(`/generation-batches/${segment(id)}/retry`, {
      method: 'POST',
    });
  },

  estimateGenerationBudget(payload) {
    return jsonRequest('/generation-batches/budget/estimate', { method: 'POST', body: payload });
  },

  listContents(filters = {}) {
    return request('/contents', { query: filters });
  },

  getContentStatusCounts(filters = {}) {
    return request('/contents/status-counts', { query: filters });
  },

  getCalendar(filters = {}) {
    return request('/contents/calendar', { query: filters });
  },

  getContent(id) {
    return request(`/contents/${segment(id)}`);
  },

  updateContent(id, payload) {
    return jsonRequest(`/contents/${segment(id)}`, {
      method: 'PATCH',
      body: payload,
    });
  },

  deleteContent(id) {
    return request(`/contents/${segment(id)}`, { method: 'DELETE' });
  },

  replaceMedia(id, type, file) {
    const formData = new FormData();
    formData.append('file', file);
    return request(`/contents/${segment(id)}/media/${segment(type)}`, {
      method: 'PUT',
      body: formData,
    });
  },

  deleteMedia(id, type) {
    return request(`/contents/${segment(id)}/media/${segment(type)}`, {
      method: 'DELETE',
    });
  },

  mediaUrl(id, type) {
    return buildUrl(`/contents/${segment(id)}/media/${segment(type)}/file`);
  },

  scheduleContent(id, scheduledAt) {
    return jsonRequest(`/contents/${segment(id)}/schedule`, {
      method: 'PUT',
      body: { scheduledAt },
    });
  },

  cancelSchedule(id) {
    return request(`/contents/${segment(id)}/schedule`, { method: 'DELETE' });
  },

  markReviewPublished(id) {
    return request(`/contents/${segment(id)}/review/published`, { method: 'PUT' });
  },

  markReviewFailed(id) {
    return request(`/contents/${segment(id)}/review/failed`, { method: 'PUT' });
  },

  listCredentials() {
    return request('/credentials');
  },

  socialAuthorizationUrl(provider) {
    return buildUrl(`/integrations/${segment(provider)}/authorize`);
  },

  validateSocialConnection(provider) {
    return request(`/integrations/${segment(provider)}/validate`, { method: 'POST' });
  },

  validateAiCredential(id) {
    return request(`/credentials/${segment(id)}/validate`, { method: 'POST' });
  },

  createCredential(payload) {
    return jsonRequest('/credentials', { method: 'POST', body: payload });
  },

  updateCredentialAccount(id, accountIdentifier) {
    return jsonRequest(`/credentials/${segment(id)}/account-identifier`, {
      method: 'PATCH',
      body: { accountIdentifier },
    });
  },

  rotateCredentialTokens(id, payload) {
    return jsonRequest(`/credentials/${segment(id)}/tokens`, {
      method: 'PUT',
      body: payload,
    });
  },

  setCredentialActive(id, active) {
    return jsonRequest(`/credentials/${segment(id)}/active`, {
      method: 'PATCH',
      body: { active },
    });
  },

  deleteCredential(id) {
    return request(`/credentials/${segment(id)}`, { method: 'DELETE' });
  },
};
import { getLanguage } from './i18n';
