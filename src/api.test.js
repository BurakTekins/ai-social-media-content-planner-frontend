import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from './api';

describe('API contract', () => {
  let fetchMock;
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('encodes identifiers and sends scheduling timestamps as JSON', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { headers: { 'content-type': 'application/json' } }));
    await api.scheduleContent('id/with space', '2026-11-01T10:00:00Z');
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/contents/id%2Fwith%20space/schedule');
    expect(options.method).toBe('PUT');
    expect(options.headers.get('Content-Type')).toBe('application/json');
    expect(JSON.parse(options.body)).toEqual({ scheduledAt: '2026-11-01T10:00:00Z' });
  });

  it('keeps repeated query filters and excludes absent values', async () => {
    fetchMock.mockResolvedValue(new Response('[]'));
    await api.listContents({ status: ['DRAFT', 'SCHEDULED'], page: 0, search: '', platform: null });
    const url = new URL(fetchMock.mock.calls[0][0], 'http://localhost');
    expect(url.searchParams.getAll('status')).toEqual(['DRAFT', 'SCHEDULED']);
    expect(url.searchParams.get('page')).toBe('0');
    expect(url.searchParams.has('search')).toBe(false);
    expect(url.searchParams.has('platform')).toBe(false);
  });

  it('accepts an empty successful delete response', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(api.deleteContent('123')).resolves.toBeNull();
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE');
  });

  it('preserves conflict details and provides localized state guidance', async () => {
    localStorage.setItem('social-plan-language', 'en');
    const payload = { code: 'INVALID_CONTENT_STATE_TRANSITION' };
    fetchMock.mockResolvedValue(new Response(JSON.stringify(payload), { status: 409 }));
    await expect(api.cancelSchedule('123')).rejects.toMatchObject({
      name: 'ApiError', status: 409, payload, method: 'DELETE', url: '/api/contents/123/schedule',
      message: expect.stringContaining('Refresh and check'),
    });
  });

  it('does not display an upstream HTML error page as a user message', async () => {
    fetchMock.mockResolvedValue(new Response('<html>private proxy info</html>', {
      status: 502, headers: { 'content-type': 'text/html' },
    }));
    try {
      await api.listContents();
      expect.unreachable('Expected an API error');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error.status).toBe(502);
      expect(error.payload).toBeNull();
      expect(error.message).not.toContain('private proxy info');
    }
  });

  it('wraps network failures while preserving the cause', async () => {
    const cause = new TypeError('offline');
    fetchMock.mockRejectedValue(cause);
    await expect(api.listContents()).rejects.toMatchObject({ name: 'ApiError', status: 0, cause });
  });

  it('preserves cancellation instead of presenting it as a connection failure', async () => {
    const aborted = new DOMException('cancelled', 'AbortError');
    fetchMock.mockRejectedValue(aborted);
    await expect(api.listContents()).rejects.toBe(aborted);
  });
});
